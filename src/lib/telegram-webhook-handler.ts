/* eslint-disable @typescript-eslint/no-explicit-any */
import TelegramBot from 'node-telegram-bot-api';
import { findByCode, markAsAuthorized } from './telegram-auth-codes';

// Импортируем функции и переменные из telegram-init.ts
// Для этого нам нужно будет их экспортировать из telegram-init.ts

const INTRO = [
  'Привет! 👋 Я помогу тебе зарегистрироваться в MB‑TRUST.',
  '',
  'Сейчас я задам тебе несколько вопросов о себе. Можешь отвечать в любой форме — я пойму! 😊',
  '',
  'Начнём?'
].join('\n');

// Rate limiting
const messageRateLimit = new Map<number, number[]>();
const MAX_MESSAGES_PER_MINUTE = 10;
const sessionLastActivity = new Map<number, number>();

function checkRateLimit(chatId: number): boolean {
  const now = Date.now();
  const userMessages = messageRateLimit.get(chatId) || [];
  const recentMessages = userMessages.filter(time => now - time < 60000);
  
  if (recentMessages.length >= MAX_MESSAGES_PER_MINUTE) {
    return false;
  }
  
  recentMessages.push(now);
  messageRateLimit.set(chatId, recentMessages);
  return true;
}

function validateMessage(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, reason: 'Пустое сообщение' };
  }
  if (text.length > 1000) {
    return { valid: false, reason: 'Сообщение слишком длинное (макс. 1000 символов)' };
  }
  if (/(.)\1{20,}/.test(text)) {
    return { valid: false, reason: 'Обнаружен спам (повторяющиеся символы)' };
  }
  const emojiCount = (text.match(/[\p{Emoji}]/gu) || []).length;
  if (emojiCount > 20) {
    return { valid: false, reason: 'Слишком много эмодзи' };
  }
  const spamPatterns = [
    /casino|казино|ставки|betting/i,
    /купи|продаж|скидк|sale|buy now/i,
    /(http|https):\/\/(?!t\.me|telegram\.me|mb-trust)/i,
  ];
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      return { valid: false, reason: 'Обнаружен запрещенный контент' };
    }
  }
  return { valid: true };
}

function updateSessionActivity(chatId: number) {
  sessionLastActivity.set(chatId, Date.now());
}

interface CollectedData {
  real?: string;
  messenger?: string;
  city?: string;
  followers?: number;
  daily?: boolean;
  name?: string;
}

const sessions = new Map<number, {
  code?: string;
  waitingForCode?: boolean;
  data: CollectedData;
  conversationHistory: Array<{role: string, content: string}>;
}>();

function isDataComplete(data: CollectedData): boolean {
  return !!(
    data.messenger &&
    data.city &&
    data.followers !== undefined &&
    data.daily !== undefined &&
    data.name
  );
}

function getMissingFields(data: CollectedData): string {
  const missing: string[] = [];
  const collected: string[] = [];
  
  if (!data.messenger) {
    missing.push('• предпочитаемый мессенджер (Telegram/VK/WhatsApp/TenChat)');
  } else {
    collected.push(`✓ Мессенджер: ${data.messenger}`);
  }
  
  if (!data.city) {
    missing.push('• город проживания');
  } else {
    collected.push(`✓ Город: ${data.city}`);
  }
  
  if (data.followers === undefined) {
    missing.push('• примерное количество подписчиков');
  } else {
    collected.push(`✓ Подписчики: ${data.followers}`);
  }
  
  if (data.daily === undefined) {
    missing.push('• хочешь ли получать задания ежедневно');
  } else {
    collected.push(`✓ Ежедневные задания: ${data.daily ? 'да' : 'нет'}`);
  }
  
  if (!data.name) {
    missing.push('• твоё имя');
  } else {
    collected.push(`✓ Имя: ${data.name}`);
  }
  
  if (missing.length === 0) return '';
  
  let result = '\n\n✅ Уже собрано:\n' + collected.join('\n');
  result += '\n\n📝 Ещё нужно:\n' + missing.join('\n');
  return result;
}

// Упрощенная версия processWithAI для webhook (можно импортировать из telegram-init если экспортировать)
async function processWithAI(
  userMessage: string,
  collectedData: CollectedData,
  conversationHistory: Array<{role: string, content: string}>
): Promise<{ response: string; extracted: Partial<CollectedData> }> {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    const missing = getMissingFields(collectedData);
    let fallbackResponse = 'Спасибо за ответ! ';
    
    if (!collectedData.messenger) {
      fallbackResponse = 'Какой мессенджер ты используешь чаще всего? (Telegram, VK, WhatsApp, TenChat)';
    } else if (!collectedData.city) {
      fallbackResponse = 'В каком городе ты живешь?';
    } else if (collectedData.followers === undefined) {
      fallbackResponse = 'Сколько у тебя примерно подписчиков? (напиши число)';
    } else if (collectedData.daily === undefined) {
      fallbackResponse = 'Хочешь получать задания каждый день? (да/нет)';
    } else if (!collectedData.name) {
      fallbackResponse = 'Как тебя зовут? (имя и фамилия)';
    } else {
      fallbackResponse = 'Отлично! Спасибо за информацию.';
    }
    
    return {
      response: fallbackResponse,
      extracted: {}
    };
  }

  try {
    const systemPrompt = `Ты — официальный помощник платформы MB-TRUST (доверительный маркетинг).

ТВОЯ ЗАДАЧА:
Собрать информацию о пользователе в естественном диалоге для регистрации на платформе.

СТРОГО СОБРАТЬ:
1. Предпочитаемый мессенджер → ТОЛЬКО: Telegram, VK, WhatsApp, TenChat
2. Город проживания → строка
3. Количество подписчиков → число
4. Ежедневные задания (да/нет) → true/false
5. Имя и фамилия → строка

УЖЕ СОБРАНО: ${JSON.stringify(collectedData)}

СТИЛЬ:
- Короткие ответы (1 предложение)
- По 1 вопросу за раз
- Эмодзи минимально`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 200
      })
    });

    const data = await response.json();
    const aiResponse = data?.choices?.[0]?.message?.content || 'Спасибо! Расскажи еще немного о себе.';

    // Простое извлечение данных (упрощенная версия)
    const extracted: Partial<CollectedData> = {};
    const lower = userMessage.toLowerCase();
    
    if (/telegram|телеграм|тг/i.test(userMessage)) extracted.messenger = 'Telegram';
    else if (/\bvk\b|вконтакт|вк/i.test(lower)) extracted.messenger = 'VK';
    else if (/whatsapp|ватсап/i.test(lower)) extracted.messenger = 'WhatsApp';
    else if (/tenchat|тенчат/i.test(lower)) extracted.messenger = 'TenChat';
    
    const cityMatch = userMessage.match(/(?:живу|город|из)\s+(?:в\s+)?([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i);
    if (cityMatch) extracted.city = cityMatch[1].trim();
    
    const numMatch = userMessage.match(/(\d[\d\s]{0,10})/g);
    if (numMatch) {
      const nums = numMatch.map(n => parseInt(n.replace(/\s/g, '')));
      const validNums = nums.filter(n => n > 0 && n < 100000000);
      if (validNums.length > 0) extracted.followers = validNums[0];
    }
    
    if (/\bда\b|хочу|каждый день/i.test(userMessage)) extracted.daily = true;
    if (/\bнет\b|не хочу/i.test(userMessage)) extracted.daily = false;
    
    const nameMatch = userMessage.match(/(?:меня зовут|мое имя|я)\s+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/i);
    if (nameMatch) extracted.name = nameMatch[1].trim();

    return { response: aiResponse, extracted };
  } catch (error) {
    console.error('OpenAI error:', error);
    return {
      response: 'Спасибо! Расскажи еще немного о себе.',
      extracted: {}
    };
  }
}

async function fetchUserByTelegramId(telegramId: number) {
  try {
    const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users?telegramId=${telegramId}`;
    const headers: Record<string, string> = {};
    if (process.env.INTERNAL_API_SECRET) {
      headers['x-internal-secret'] = process.env.INTERNAL_API_SECRET;
    }
    const resp = await fetch(url, { headers });
    const data = await resp.json();
    return data?.success ? data.user : null;
  } catch {
    return null;
  }
}

async function fetchAvailableTasks(userId?: string) {
  try {
    const base = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}`;
    const url = userId
      ? `${base}/api/orders?role=executor&userId=${encodeURIComponent(userId)}`
      : `${base}/api/orders?role=executor`;
    const resp = await fetch(url);
    const data = await resp.json();
    return Array.isArray(data?.orders) ? data.orders : [];
  } catch {
    return [];
  }
}

function detectIntent(text: string): 'tasks' | 'balance' | 'help' | null {
  const t = text.toLowerCase();
  if (/задани|работа|task|orders/.test(t)) return 'tasks';
  if (/баланс|вывод|деньг|wallet|balance/.test(t)) return 'balance';
  if (/help|помощ|что за платформ|faq/.test(t)) return 'help';
  return null;
}

function normalizeCode(code: string): string {
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

async function handleAuthCode(bot: InstanceType<typeof TelegramBot>, chatId: number, code: string, from: any) {
  const normalizedCode = normalizeCode(code);
  try {
    console.log(`[BOT AUTH] Получен код авторизации: ${normalizedCode} от ${chatId}`);
    
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/telegram/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: normalizedCode,
        telegramId: chatId.toString(),
        telegramUsername: from.username,
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      await bot.sendMessage(chatId, '❌ Неверный код авторизации или срок действия истек. Пожалуйста, получите новый код на сайте MB‑TRUST.');
      return;
    }

    await bot.sendMessage(chatId, '✅ Отлично! Авторизация прошла успешно. Можешь возвращаться на сайт! 🎉');
  } catch (error) {
    console.error('[BOT AUTH] Ошибка авторизации:', error);
    await bot.sendMessage(chatId, '⚠️ Ошибка при авторизации. Попробуй позже или обратись в поддержку.');
  }
}

async function startVerificationWithCode(bot: InstanceType<typeof TelegramBot>, chatId: number, code: string): Promise<boolean> {
  const normalizedCode = normalizeCode(code);
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/verification/telegram/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: normalizedCode,
        telegramId: chatId.toString(),
        checkOnly: true
      })
    });
    
    const result = await response.json();
    
    if (!result.valid) {
      await bot.sendMessage(chatId, '❌ Неверный код верификации. Пожалуйста, проверь код и попробуй снова.\n\nИли перейди в личный кабинет MB‑TRUST и получи новую ссылку для верификации.');
      return false;
    }

    sessions.set(chatId, { 
      code: normalizedCode, 
      data: {}, 
      conversationHistory: [
        { role: 'system', content: 'Начало диалога для сбора информации о пользователе для регистрации в MB-TRUST.' }
      ]
    });

    const session = sessions.get(chatId)!;
    const { response: aiResponse } = await processWithAI('Привет! Начинаем сбор информации.', session.data, session.conversationHistory);
    
    session.conversationHistory.push({ role: 'assistant', content: aiResponse });
    
    await bot.sendMessage(chatId, INTRO + '\n\n' + aiResponse + getMissingFields(session.data));
    return true;
  } catch (error) {
    console.error('Ошибка проверки кода:', error);
    await bot.sendMessage(chatId, '⚠️ Ошибка при проверке кода. Попробуй позже или обратись в поддержку.');
    return false;
  }
}

/**
 * Обработка обновления от Telegram (webhook)
 */
export async function handleTelegramUpdate(update: any, bot: InstanceType<typeof TelegramBot>) {
  try {
    // Обработка сообщений
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = String(msg.text || '').trim();

      // Команда /start
      if (text.startsWith('/start')) {
        const match = text.match(/\/start(?:\s+(.+))?/);
        const payload = match?.[1]?.trim() || '';
        
        const user = await fetchUserByTelegramId(chatId);
        const isRegistered = !!user;

        let code: string | undefined;
        let isAuthCode = false;
        
        if (payload.startsWith('link_')) {
          code = payload.substring('link_'.length).trim().toUpperCase();
          if (code && /^[0-9A-F]{6}$/.test(code)) {
            const isAuth = !!findByCode(code);
            if (isAuth) isAuthCode = true;
          }
        } else if (payload.startsWith('auth_')) {
          code = payload.substring('auth_'.length).trim().toUpperCase();
          isAuthCode = true;
        }

        if (code) {
          if (isAuthCode) {
            if (isRegistered) {
              await handleAuthCode(bot, chatId, code, msg.from);
            } else {
              await bot.sendMessage(chatId, '⚠️ Ваш аккаунт не найден в системе.\n\nПожалуйста, сначала пройдите регистрацию на сайте MB-TRUST.');
            }
          } else {
            if (isRegistered) {
              await bot.sendMessage(chatId, '✅ Ваш аккаунт уже привязан к Telegram.\n\nЕсли вы хотите войти в личный кабинет, используйте "Вход через Telegram" на странице входа.');
            } else {
              await startVerificationWithCode(bot, chatId, code);
            }
          }
          return;
        }

        if (isRegistered) {
          await bot.sendMessage(chatId, `👋 С возвращением, ${user.name}!\n\nВаш аккаунт успешно привязан.\n\nДоступные команды:\n/balance — Узнать баланс\n/help — Помощь`);
        } else {
          await bot.sendMessage(chatId, INTRO + '\n\n📝 Для начала введи код верификации, который ты получил на сайте MB‑TRUST.\n\nКод можно получить в личном кабинете в разделе "Верификация через Telegram".');
          sessions.set(chatId, {
            waitingForCode: true,
            data: {},
            conversationHistory: []
          });
        }
        return;
      }

      // Команда /help
      if (text === '/help') {
        await bot.sendMessage(chatId, [
          '📚 Помощь:',
          '',
          '1) Личный кабинет → "Верификация через Telegram"',
          '2) Нажми "Начать привязку" и перейди по ссылке',
          '3) Отвечай на мои вопросы в любой форме',
          '4) Вернись на сайт — статус обновится автоматически',
          '',
          '💡 Можешь отвечать сразу на несколько вопросов или рассказывать о себе свободно — я пойму! 😊'
        ].join('\n'));
        return;
      }

      // Проверка rate limit
      if (!checkRateLimit(chatId)) {
        await bot.sendMessage(chatId, '⚠️ Слишком много сообщений. Пожалуйста, подожди немного и попробуй снова.');
        return;
      }

      // Валидация сообщения
      const validation = validateMessage(text);
      if (!validation.valid) {
        await bot.sendMessage(chatId, `⚠️ ${validation.reason}. Пожалуйста, отправь нормальное текстовое сообщение.`);
        return;
      }

      updateSessionActivity(chatId);

      const user = await fetchUserByTelegramId(chatId);
      const isRegistered = !!user;

      // Проверка на код (6 hex)
      const cleanText = text.toUpperCase();
      const isHexCode = /^[0-9A-F]{6}$/.test(cleanText);

      if (isHexCode) {
        const tempUserId = findByCode(cleanText);
        
        if (tempUserId) {
          if (isRegistered) {
            markAsAuthorized(tempUserId, chatId.toString());
            await bot.sendMessage(chatId, '✅ **Авторизация успешна!**\n\nВы успешно вошли в MB-TRUST.\nМожете вернуться в браузер.', { parse_mode: 'Markdown' });
          } else {
            await bot.sendMessage(chatId, '⚠️ Этот код для входа, но ваш аккаунт не найден.\n\nПожалуйста, зарегистрируйтесь на сайте и привяжите Telegram в личном кабинете.');
          }
          return;
        }
        
        if (!isRegistered) {
          const success = await startVerificationWithCode(bot, chatId, cleanText);
          if (!success) {
            await bot.sendMessage(chatId, '❌ Неверный код верификации.\n\nЕсли вы регистрируетесь, проверьте код в личном кабинете.\nЕсли входите — убедитесь, что код скопирован верно со страницы входа.');
          }
          return;
        } else {
          await bot.sendMessage(chatId, '🤔 Вы прислали код, но вы уже зарегистрированы.\n\nЕсли это код для входа на другом устройстве — он истек или неверен.\nЕсли хотите проверить баланс — отправьте /balance');
          return;
        }
      }

      // Диалог для регистрации
      if (!isRegistered) {
        if (!sessions.has(chatId)) {
          await bot.sendMessage(chatId, 'Чтобы начать регистрацию, отправьте /start.');
          return;
        }
        
        const session = sessions.get(chatId)!;
        
        if (session.waitingForCode && !session.code) {
          await bot.sendMessage(chatId, '📝 Пожалуйста, отправьте код верификации из личного кабинета (6 символов).');
          return;
        }
        
        const { response, extracted } = await processWithAI(text, session.data, session.conversationHistory);
        
        session.conversationHistory.push({ role: 'user', content: text });
        const updatedData = { ...session.data, ...extracted };
        session.data = updatedData;
        sessions.set(chatId, session);
        session.conversationHistory.push({ role: 'assistant', content: response });
        
        const isComplete = isDataComplete(session.data);
        if (isComplete) {
          try {
            const resp = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/verification/telegram/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: session.code,
                telegramId: msg.from.id,
                telegramUsername: msg.from.username,
                name: session.data.name,
                city: session.data.city,
                preferredMessenger: session.data.messenger,
                followersApprox: session.data.followers,
                dailyTasksOptIn: !!session.data.daily
              })
            });
            const result = await resp.json();
            if (result.success) {
              await bot.sendMessage(chatId, '✅ Отлично! Регистрация завершена. Ваш аккаунт верифицирован! 🎉');
              sessions.delete(chatId);
            } else {
              await bot.sendMessage(chatId, `❌ Ошибка: ${result.error}`);
            }
          } catch (e) {
            await bot.sendMessage(chatId, '⚠️ Сервис временно недоступен.');
          }
        } else {
          const missingHint = getMissingFields(session.data);
          await bot.sendMessage(chatId, response + (missingHint ? missingHint : ''));
        }
        return;
      }

      // Обычное общение для зарегистрированных
      const intent = detectIntent(text);
      if (intent === 'balance') {
        if (user) await bot.sendMessage(chatId, `Ваш баланс: ${user.balance}₽`);
        return;
      }
      if (intent === 'tasks') {
        const tasks = await fetchAvailableTasks(user?.id);
        if (!tasks.length) await bot.sendMessage(chatId, 'Задач пока нет.');
        else await bot.sendMessage(chatId, `Доступно задач: ${tasks.length}`);
        return;
      }
      
      await bot.sendMessage(chatId, 'Я вас понимаю! Используйте меню или команды: /balance, /help.');
    }
  } catch (error) {
    console.error('❌ Ошибка обработки webhook update:', error);
  }
}
