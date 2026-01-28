/* eslint-disable @typescript-eslint/no-explicit-any */
import TelegramBot from 'node-telegram-bot-api'
import { findByCode, markAsAuthorized } from './telegram-auth-codes'

const INTRO = [
  'Привет! 👋 Я помогу тебе зарегистрироваться в MB‑TRUST.',
  '',
  'Сейчас я задам тебе несколько вопросов о себе. Можешь отвечать в любой форме — я пойму! 😊',
  '',
  'Начнём?'
].join('\n')

// ============= ЗАЩИТА ОТ СПАМА И ВАЛИДАЦИЯ =============

// Rate limiting: максимум сообщений в минуту на пользователя
const messageRateLimit = new Map<number, number[]>()
const MAX_MESSAGES_PER_MINUTE = 10
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 минут

// Хранение времени последней активности сессий
const sessionLastActivity = new Map<number, number>()

/**
 * Проверка rate limit для пользователя
 */
function checkRateLimit(chatId: number): boolean {
  const now = Date.now()
  const userMessages = messageRateLimit.get(chatId) || []
  
  // Удаляем сообщения старше 1 минуты
  const recentMessages = userMessages.filter(time => now - time < 60000)
  
  if (recentMessages.length >= MAX_MESSAGES_PER_MINUTE) {
    return false // Превышен лимит
  }
  
  recentMessages.push(now)
  messageRateLimit.set(chatId, recentMessages)
  return true
}

/**
 * Валидация сообщения (защита от мусора)
 */
function validateMessage(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, reason: 'Пустое сообщение' }
  }
  
  // Слишком длинное сообщение
  if (text.length > 1000) {
    return { valid: false, reason: 'Сообщение слишком длинное (макс. 1000 символов)' }
  }
  
  // Повторяющиеся символы (спам)
  if (/(.)\1{20,}/.test(text)) {
    return { valid: false, reason: 'Обнаружен спам (повторяющиеся символы)' }
  }
  
  // Слишком много эмодзи
  const emojiCount = (text.match(/[\p{Emoji}]/gu) || []).length
  if (emojiCount > 20) {
    return { valid: false, reason: 'Слишком много эмодзи' }
  }
  
  // Подозрительные паттерны (реклама, ссылки на конкурентов)
  const spamPatterns = [
    /casino|казино|ставки|betting/i,
    /купи|продаж|скидк|sale|buy now/i,
    /(http|https):\/\/(?!t\.me|telegram\.me|mb-trust)/i, // Ссылки не на telegram/mb-trust
  ]
  
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      return { valid: false, reason: 'Обнаружен запрещенный контент' }
    }
  }
  
  return { valid: true }
}

/**
 * Обновление времени последней активности сессии
 */
function updateSessionActivity(chatId: number) {
  sessionLastActivity.set(chatId, Date.now())
}

/**
 * Очистка старых сессий (вызывается периодически)
 */
function cleanupOldSessions() {
  const now = Date.now()
  let cleaned = 0
  
  for (const [chatId, lastActivity] of sessionLastActivity.entries()) {
    if (now - lastActivity > SESSION_TIMEOUT) {
      sessions.delete(chatId)
      sessionLastActivity.delete(chatId)
      messageRateLimit.delete(chatId)
      cleaned++
      console.log(`[CLEANUP] Удалена неактивная сессия для пользователя ${chatId}`)
    }
  }
  
  if (cleaned > 0) {
    console.log(`[CLEANUP] Очищено сессий: ${cleaned}`)
  }
}

// Запускаем очистку каждые 10 минут
setInterval(cleanupOldSessions, 10 * 60 * 1000)

// Тип для собранных данных
interface CollectedData {
  real?: string;          // yes/no
  messenger?: string;     // Telegram, VK, WhatsApp, TenChat
  city?: string;          // город
  followers?: number;     // количество подписчиков
  daily?: boolean;        // хочет ли получать задания ежедневно
  name?: string;          // имя и фамилия
}

// Проверка, что все данные собраны
function isDataComplete(data: CollectedData): boolean {
  return !!(
    data.messenger &&
    data.city &&
    data.followers !== undefined &&
    data.daily !== undefined &&
    data.name
  )
}

// Простой парсер по ключевым словам (fallback без OpenAI)
function extractFromTextSimple(text: string, collectedData: CollectedData): Partial<CollectedData> {
  const extracted: Partial<CollectedData> = {}
  const lower = text.toLowerCase()

  // Реальный человек
  if (!collectedData.real) {
    if (/я\s*(реал|настоящ|живой|человек)|да.*реал|подтвержд/i.test(text)) {
      extracted.real = 'yes'
    }
  }

  // Мессенджер
  if (!collectedData.messenger) {
    if (/telegram|телеграм|тг/i.test(text)) extracted.messenger = 'Telegram'
    else if (/\bvk\b|вконтакт|вк/i.test(lower)) extracted.messenger = 'VK'
    else if (/whatsapp|ватсап|вотсап/i.test(lower)) extracted.messenger = 'WhatsApp'
    else if (/tenchat|тенчат/i.test(lower)) extracted.messenger = 'TenChat'
  }

  // Город
  if (!collectedData.city) {
    const cityMatch = text.match(/(?:живу|город|из)\s+(?:в\s+)?([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i)
    if (cityMatch) extracted.city = cityMatch[1].trim()
  }

  // Подписчики
  if (collectedData.followers === undefined) {
    const numMatch = text.match(/(\d[\d\s]{0,10})/g)
    if (numMatch) {
      const nums = numMatch.map(n => parseInt(n.replace(/\s/g, '')))
      const validNums = nums.filter(n => n > 0 && n < 100000000)
      if (validNums.length > 0) extracted.followers = validNums[0]
    }
  }

  // Ежедневные задания
  if (collectedData.daily === undefined) {
    if (/\bда\b|хочу|каждый день|ежедневн/i.test(text)) extracted.daily = true
    if (/\bнет\b|не хочу|не нужн/i.test(text)) extracted.daily = false
  }

  // Имя
  if (!collectedData.name) {
    const nameMatch = text.match(/(?:меня зовут|мое имя|я)\s+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/i)
    if (nameMatch) extracted.name = nameMatch[1].trim()
  }

  return extracted
}

// Сообщение о том, чего не хватает
function getMissingFields(data: CollectedData): string {
  const missing: string[] = []
  const collected: string[] = []
  
  if (!data.messenger) {
    missing.push('• предпочитаемый мессенджер (Telegram/VK/WhatsApp/TenChat)')
  } else {
    collected.push(`✓ Мессенджер: ${data.messenger}`)
  }
  
  if (!data.city) {
    missing.push('• город проживания')
  } else {
    collected.push(`✓ Город: ${data.city}`)
  }
  
  if (data.followers === undefined) {
    missing.push('• примерное количество подписчиков')
  } else {
    collected.push(`✓ Подписчики: ${data.followers}`)
  }
  
  if (data.daily === undefined) {
    missing.push('• хочешь ли получать задания ежедневно')
  } else {
    collected.push(`✓ Ежедневные задания: ${data.daily ? 'да' : 'нет'}`)
  }
  
  if (!data.name) {
    missing.push('• твоё имя')
  } else {
    collected.push(`✓ Имя: ${data.name}`)
  }
  
  if (missing.length === 0) return ''
  
  let result = '\n\n✅ Уже собрано:\n' + collected.join('\n')
  result += '\n\n📝 Ещё нужно:\n' + missing.join('\n')
  return result
}

/**
 * Вызов OpenAI API с retry логикой
 */
async function callOpenAI(url: string, payload: any, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error: any) {
      console.error(`[AI] Попытка ${attempt + 1}/${retries + 1} не удалась:`, error.message)
      
      if (attempt === retries) {
        throw error // Последняя попытка не удалась
      }
      
      // Экспоненциальная задержка перед повтором
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
    }
  }
  
  throw new Error('OpenAI retry exhausted')
}

// Функция для работы с OpenAI
async function processWithAI(
  userMessage: string,
  collectedData: CollectedData,
  conversationHistory: Array<{role: string, content: string}>
): Promise<{ response: string; extracted: Partial<CollectedData> }> {
  const openaiKey = process.env.OPENAI_API_KEY
  
  if (!openaiKey) {
    // Fallback без AI - простые подсказки
    const missing = getMissingFields(collectedData)
    let fallbackResponse = 'Спасибо за ответ! '
    
    if (!collectedData.real) {
      fallbackResponse = 'Подтверди, пожалуйста, что ты реальный человек 😊'
    } else if (!collectedData.messenger) {
      fallbackResponse = 'Какой мессенджер ты используешь чаще всего? (Telegram, VK, WhatsApp, TenChat)'
    } else if (!collectedData.city) {
      fallbackResponse = 'В каком городе ты живешь?'
    } else if (collectedData.followers === undefined) {
      fallbackResponse = 'Сколько у тебя примерно подписчиков? (напиши число)'
    } else if (collectedData.daily === undefined) {
      fallbackResponse = 'Хочешь получать задания каждый день? (да/нет)'
    } else if (!collectedData.name) {
      fallbackResponse = 'Как тебя зовут? (имя и фамилия)'
    } else {
      fallbackResponse = 'Отлично! Спасибо за информацию.'
    }
    
    return {
      response: fallbackResponse,
      extracted: {}
    }
  }

  try {
    // Формируем промпт для AI
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

ПРАВИЛА ДИАЛОГА:
✅ МОЖНО (ТОЛЬКО ЭТО):
- Собирать данные для регистрации
- Уточнять ответы пользователя
- Коротко объяснять про MB-TRUST при прямом вопросе

❌ СТРОГО НЕЛЬЗЯ:
- Медицина, политика, право, религия
- Личные советы
- Общие разговоры
- ЛЮБЫЕ темы вне MB-TRUST

ПРИОРИТЕТ: Собрать 6 полей! Если пользователь уходит от темы — СРАЗУ возвращай к сбору.
НЕ СПРАШИВАЙ отдельно про "реальный человек" — это необязательная информация. Если человек сам напишет, можешь учитывать, но не задавай этот вопрос.

СТИЛЬ:
- Короткие ответы (1 предложение)
- По 1 вопросу за раз
- Эмодзи минимально

ЕСЛИ ВОПРОС ВНЕ ТЕМЫ:
"Я помогаю только с регистрацией на MB-TRUST 😊 [следующий вопрос из списка недостающих]"`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ]

    const data = await callOpenAI('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 200
    })
    
    console.log('[AI] OpenAI conversation response:', JSON.stringify(data).substring(0, 200))
    
    const aiResponse = (data && Array.isArray(data.choices) && data.choices[0]?.message?.content)
      ? data.choices[0].message.content
      : 'Спасибо! Расскажи еще немного о себе.'

    // Извлекаем данные из ответа пользователя с помощью AI
    // Используем последний ответ бота из истории для контекста
    // История содержит все предыдущие ответы бота, включая последний вопрос
    const lastAiMessage = conversationHistory.length > 0 
      ? conversationHistory[conversationHistory.length - 1]?.content || ''
      : ''
    
    const extractData = await callOpenAI('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Извлеки структурированные данные из сообщения пользователя.

ОБЯЗАТЕЛЬНО верни ТОЛЬКО валидный JSON без дополнительного текста.

Поля для извлечения (извлекай ВСЁ что найдёшь):
- real: "yes" | "no" | null (ТОЛЬКО если вопрос про реальность человека)
- messenger: "Telegram" | "VK" | "WhatsApp" | "TenChat" | null
- city: строка города или null (любое название города)
- followers: число или null (ЛЮБЫЕ числа в сообщении)
- daily: true | false | null (ТОЛЬКО если вопрос про ежедневные задания)
- name: строка имени и фамилии или null (имена собственные)

КОНТЕКСТ ВАЖЕН:
- Смотри на последний вопрос бота, чтобы понять, что спрашивали
- "да" на вопрос про реальность → real: "yes"
- "да" на вопрос про ежедневные задания → daily: true
- НЕ путай эти поля!

ПРАВИЛА:
- Если поля нет в сообщении → null
- Messenger ТОЛЬКО из списка
- Извлекай ТОЛЬКО то, что относится к КОНТЕКСТУ вопроса

Формат: {"real": "yes", "messenger": "VK", "city": "Москва", "followers": 123, "daily": true, "name": null}`
        },
        {
          role: 'user',
          content: `ПОСЛЕДНИЙ ВОПРОС БОТА: "${lastAiMessage}"

ОТВЕТ ПОЛЬЗОВАТЕЛЯ: "${userMessage}"

УЖЕ СОБРАНО: ${JSON.stringify(collectedData)}

ЗАДАЧА: Извлеки НОВУЮ информацию, учитывая КОНТЕКСТ вопроса. Верни JSON.`
        }
      ],
      temperature: 0.2,
      max_tokens: 150,
      response_format: { type: 'json_object' }
    })
    
    console.log('[AI] OpenAI extraction response:', JSON.stringify(extractData).substring(0, 300))
    
    const extracted: Partial<CollectedData> = {}
    
    try {
      const rawContent = (extractData && Array.isArray(extractData.choices) && extractData.choices[0]?.message?.content)
        ? extractData.choices[0].message.content
        : '{}'
      
      console.log('[AI] Raw extraction content:', rawContent)
      
      const parsed = JSON.parse(rawContent)
      console.log('[AI] Parsed extraction:', JSON.stringify(parsed))
      
      if (parsed.real && !collectedData.real) extracted.real = parsed.real
      if (parsed.messenger && !collectedData.messenger) extracted.messenger = parsed.messenger
      if (parsed.city && !collectedData.city) extracted.city = parsed.city
      if (parsed.followers !== null && parsed.followers !== undefined && collectedData.followers === undefined) {
        extracted.followers = Number(parsed.followers)
      }
      if (parsed.daily !== undefined && parsed.daily !== null && collectedData.daily === undefined) {
        extracted.daily = Boolean(parsed.daily)
      }
      if (parsed.name && !collectedData.name) extracted.name = parsed.name
      
      console.log('[AI] Extracted data from OpenAI:', JSON.stringify(extracted))
      
      // Всегда применяем fallback-парсер для доп. проверки
      const fallbackExtracted = extractFromTextSimple(userMessage, collectedData)
      // Объединяем: fallback заполняет только то, что OpenAI пропустил
      Object.keys(fallbackExtracted).forEach(key => {
        if (!(key in extracted)) {
          (extracted as any)[key] = (fallbackExtracted as any)[key]
        }
      })
      
      // Контекстная коррекция двусмысленного "да/нет"
      console.log(`[AI] Перед applyContextualYesNo: lastAiMessage="${lastAiMessage.substring(0, 200)}"`)
      const adjusted = applyContextualYesNo(userMessage, lastAiMessage, extracted, collectedData)
      console.log('[AI] После fallback и контекстной коррекции:', JSON.stringify(adjusted))
      Object.assign(extracted, adjusted)
    } catch (e) {
      console.error('Ошибка парсинга данных от AI:', e)
      // Fallback: простой парсинг по ключевым словам
      const fallbackExtracted = extractFromTextSimple(userMessage, collectedData)
      Object.assign(extracted, fallbackExtracted)
      console.log('[AI] Fallback extracted:', JSON.stringify(fallbackExtracted))
    }

    // Финальная контекстная коррекция (на случай обхода try)
    const finalExtracted = applyContextualYesNo(userMessage, lastAiMessage, extracted, collectedData)
    return { response: aiResponse, extracted: finalExtracted }
  } catch (error) {
    console.error('OpenAI error:', error)
    // Fallback: используем простой парсер
    const fallbackExtracted = extractFromTextSimple(userMessage, collectedData)
    console.log('[AI] Fallback (error) extracted:', JSON.stringify(fallbackExtracted))
    
    return {
      response: 'Спасибо! Расскажи еще немного о себе.',
      extracted: fallbackExtracted
    }
  }
}

const sessions = new Map<number, {
  code?: string;
  waitingForCode?: boolean; // Ожидаем ли ввод кода от пользователя
  data: CollectedData;
  conversationHistory: Array<{role: string, content: string}>;
}>()

let botInstance: InstanceType<typeof TelegramBot> | null = null;
let isInitialized = false;

export const initializeTelegramBot = async () => {
  // Предотвращаем дублирование инициализации
  if (isInitialized && botInstance) {
    console.log('⚠️ Telegram бот уже инициализирован, пропускаем повторный запуск')
    return botInstance
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.log('⚠️ TELEGRAM_BOT_TOKEN не найден, бот не запущен')
    return null
  }

  // Останавливаем предыдущий экземпляр если он был
  if (botInstance) {
    try {
      console.log('🛑 Останавливаем предыдущий экземпляр бота...')
      botInstance.stopPolling()
      botInstance.stopWebHook()
      botInstance.removeAllListeners()
      botInstance = null
      isInitialized = false
      // Небольшая задержка перед созданием нового экземпляра
      // чтобы Telegram API успел освободить соединение
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (e) {
      console.warn('⚠️ Ошибка при остановке предыдущего бота:', e)
      // Всё равно сбрасываем
      botInstance = null
      isInitialized = false
    }
  }

  try {
    console.log('🚀 Создание нового экземпляра Telegram бота...')
    const bot = new TelegramBot(token, { polling: true })
    botInstance = bot
    isInitialized = true

    // команды / описание
    bot.setMyCommands([
      { command: 'start', description: 'Начать верификацию/привязку' },
      { command: 'help', description: 'Краткая справка' },
    ]).catch(() => {})
    bot.setMyDescription('MB‑TRUST — платформа траст‑маркетинга. Задания, отчётность, автоматические выплаты.').catch(() => {})

    // Функция для нормализации кода (убираем пробелы, приводим к верхнему регистру)
    const normalizeCode = (code: string): string => {
      return code.trim().replace(/\s+/g, '').toUpperCase()
    }

    // Функция для обработки кода авторизации
    const handleAuthCode = async (chatId: number, code: string, from: any) => {
      const normalizedCode = normalizeCode(code)
      try {
        console.log(`[BOT AUTH] Получен код авторизации: ${normalizedCode} от ${chatId}`)
        
        // Вызываем API для авторизации
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/telegram/authorize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: normalizedCode,
            telegramId: chatId.toString(),
            telegramUsername: from.username,
          })
        })
        
        const result = await response.json()
        
        if (!result.success) {
          console.log(`[BOT AUTH] Код ${normalizedCode} неверный или истек`)
          await bot.sendMessage(chatId, '❌ Неверный код авторизации или срок действия истек. Пожалуйста, получите новый код на сайте MB‑TRUST.')
          return
        }

        console.log(`[BOT AUTH] Код ${normalizedCode} принят для пользователя ${result.userId}`)
        await bot.sendMessage(chatId, '✅ Отлично! Авторизация прошла успешно. Можешь возвращаться на сайт! 🎉')
      } catch (error) {
        console.error('[BOT AUTH] Ошибка авторизации:', error)
        await bot.sendMessage(chatId, '⚠️ Ошибка при авторизации. Попробуй позже или обратись в поддержку.')
      }
    }

    // Функция для проверки кода и начала диалога
    const startVerificationWithCode = async (chatId: number, code: string) => {
      const normalizedCode = normalizeCode(code)
      try {
        // Проверяем код в базе данных
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/verification/telegram/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: normalizedCode,
            telegramId: chatId.toString(),
            checkOnly: true // Только проверка, без завершения
          })
        })
        
        const result = await response.json()
        
        if (!result.valid) {
          console.log(`[BOT] Код ${normalizedCode} неверный для пользователя ${chatId}`)
          await bot.sendMessage(chatId, '❌ Неверный код верификации. Пожалуйста, проверь код и попробуй снова.\n\nИли перейди в личный кабинет MB‑TRUST и получи новую ссылку для верификации.')
          return false
        }

        console.log(`[BOT] Код ${normalizedCode} принят, начинаем диалог для пользователя ${chatId}`)

        // Код верный, начинаем диалог
        sessions.set(chatId, { 
          code: normalizedCode, 
          data: {}, 
          conversationHistory: [
            { role: 'system', content: 'Начало диалога для сбора информации о пользователе для регистрации в MB-TRUST.' }
          ]
        })

        // Начинаем диалог с AI
        const session = sessions.get(chatId)!
        const { response: aiResponse } = await processWithAI('Привет! Начинаем сбор информации.', session.data, session.conversationHistory)
        
        session.conversationHistory.push(
          { role: 'assistant', content: aiResponse }
        )
        
        await bot.sendMessage(chatId, INTRO + '\n\n' + aiResponse + getMissingFields(session.data))
        return true
      } catch (error) {
        console.error('Ошибка проверки кода:', error)
        await bot.sendMessage(chatId, '⚠️ Ошибка при проверке кода. Попробуй позже или обратись в поддержку.')
        return false
      }
    }

    bot.onText(/\/start(?:\s+(.+))?/, async (msg: any, match: any) => {
      const chatId = msg.chat.id
      const payload = match?.[1]?.trim() || ''
      
      // 1. Проверяем статус пользователя
      const user = await fetchUserByTelegramId(chatId)
      const isRegistered = !!user

      let code: string | undefined
      let isAuthCode = false // true = Login, false = Registration
      
      if (payload.startsWith('link_')) {
        code = payload.substring('link_'.length).trim().toUpperCase()
        // Эвристика: если код 6 символов hex - это скорее всего auth code (Login), 
        // но может быть и reg code (они тоже hex?).
        // В start/route.ts: Auth code = 6 hex. Reg code = ? (обычно тоже hex, но проверим).
        // Лучше полагаться на контекст: если юзер есть -> Auth, если нет -> Reg?
        // НО: Auth code лежит в memory, Reg code в DB.
        
        if (code && /^[0-9A-F]{6}$/.test(code)) {
           // Проверим в memory (Auth)
           const isAuth = !!findByCode(code)
           if (isAuth) isAuthCode = true
           else isAuthCode = false // Скорее всего Reg code из БД
        } else {
           isAuthCode = false
        }
      } else if (payload.startsWith('auth_')) {
        code = payload.substring('auth_'.length).trim().toUpperCase()
        isAuthCode = true
      }

      // 2. Логика обработки
      if (code) {
        if (isAuthCode) {
            // Попытка авторизации (Login)
            if (isRegistered) {
                await handleAuthCode(chatId, code, msg.from)
            } else {
                await bot.sendMessage(chatId, '⚠️ Ваш аккаунт не найден в системе.\n\nПожалуйста, сначала пройдите регистрацию на сайте MB-TRUST.')
            }
        } else {
            // Попытка регистрации/привязки (Link)
            if (isRegistered) {
                 await bot.sendMessage(chatId, '✅ Ваш аккаунт уже привязан к Telegram.\n\nЕсли вы хотите войти в личный кабинет, используйте "Вход через Telegram" на странице входа.')
            } else {
                 await startVerificationWithCode(chatId, code)
            }
        }
        return
      }

      // 3. Приветствие без кода
      if (isRegistered) {
        await bot.sendMessage(chatId, `👋 С возвращением, ${user.name}!\n\nВаш аккаунт успешно привязан.\n\nДоступные команды:\n/balance — Узнать баланс\n/help — Помощь`)
      } else {
        // Новый пользователь
        await bot.sendMessage(chatId, INTRO + '\n\n📝 Для начала введи код верификации, который ты получил на сайте MB‑TRUST.\n\nКод можно получить в личном кабинете в разделе "Верификация через Telegram".')
        
        // Устанавливаем флаг ожидания кода для регистрации
        sessions.set(chatId, {
          waitingForCode: true,
          data: {},
          conversationHistory: []
        })
      }
    })

    bot.onText(/\/help/, async (msg: any) => {
      const chatId = msg.chat.id
      await bot.sendMessage(chatId, [
        '📚 Помощь:',
        '',
        '1) Личный кабинет → "Верификация через Telegram"',
        '2) Нажми "Начать привязку" и перейди по ссылке',
        '3) Отвечай на мои вопросы в любой форме',
        '4) Вернись на сайт — статус обновится автоматически',
        '',
        '💡 Можешь отвечать сразу на несколько вопросов или рассказывать о себе свободно — я пойму! 😊'
      ].join('\n'))
    })

    // Простое распознавание интентов по ключевым словам
    const detectIntent = (text: string): 'tasks' | 'balance' | 'help' | null => {
      const t = text.toLowerCase()
      if (/задани|работа|task|orders/.test(t)) return 'tasks'
      if (/баланс|вывод|деньг|wallet|balance/.test(t)) return 'balance'
      if (/help|помощ|что за платформ|faq/.test(t)) return 'help'
      return null
    }

    const fetchUserByTelegramId = async (telegramId: number) => {
      try {
        const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users?telegramId=${telegramId}`
        const headers: Record<string, string> = {}
        if (process.env.INTERNAL_API_SECRET) {
          headers['x-internal-secret'] = process.env.INTERNAL_API_SECRET
        }
        const resp = await fetch(url, { headers })
        const data = await resp.json()
        return data?.success ? data.user : null
      } catch {
        return null
      }
    }

    const fetchAvailableTasks = async (userId?: string) => {
      try {
        const base = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}`
        const url = userId
          ? `${base}/api/orders?role=executor&userId=${encodeURIComponent(userId)}`
          : `${base}/api/orders?role=executor`
        const resp = await fetch(url)
        const data = await resp.json()
        return Array.isArray(data?.orders) ? data.orders : []
      } catch {
        return []
      }
    }

    bot.on('message', async (msg: any) => {
      const chatId = msg.chat.id
      const text = String(msg.text || '').trim()
      
      // ============= ЗАЩИТА ОТ СПАМА =============
      // ... (код защиты от спама пропускаем, он остаётся тем же, но для краткости в замене не дублирую весь блок если он не меняется) ...
      
      // Проверка rate limit
      if (!checkRateLimit(chatId)) {
        console.log(`[SPAM] Rate limit превышен для пользователя ${chatId}`)
        await bot.sendMessage(chatId, '⚠️ Слишком много сообщений. Пожалуйста, подожди немного и попробуй снова.')
        return
      }
      
      // Валидация сообщения
      const validation = validateMessage(text)
      if (!validation.valid) {
        console.log(`[SPAM] Невалидное сообщение от ${chatId}: ${validation.reason}`)
        await bot.sendMessage(chatId, `⚠️ ${validation.reason}. Пожалуйста, отправь нормальное текстовое сообщение.`)
        return
      }
      
      // Обновляем активность сессии
      updateSessionActivity(chatId)
      
      if (msg.text?.startsWith('/start') || msg.text?.startsWith('/help')) return

      // ============= ОСНОВНАЯ ЛОГИКА =============
      
      // 1. Проверяем статус пользователя
      const user = await fetchUserByTelegramId(chatId)
      const isRegistered = !!user

      // 2. Проверяем, является ли сообщение кодом (6 hex)
      const cleanText = text.toUpperCase()
      const isHexCode = /^[0-9A-F]{6}$/.test(cleanText)

      if (isHexCode) {
        // Это похоже на код. Проверяем, Auth это или Reg.
        
        // Попытка найти как Auth Code (Login)
        const tempUserId = findByCode(cleanText)
        
        if (tempUserId) {
            // Это Auth Code
            if (isRegistered) {
                markAsAuthorized(tempUserId, chatId.toString())
                await bot.sendMessage(chatId, '✅ **Авторизация успешна!**\n\nВы успешно вошли в MB-TRUST.\nМожете вернуться в браузер.', { parse_mode: 'Markdown' })
                return
            } else {
                await bot.sendMessage(chatId, '⚠️ Этот код для входа, но ваш аккаунт не найден.\n\nПожалуйста, зарегистрируйтесь на сайте и привяжите Telegram в личном кабинете.')
                return
            }
        } 
        
        // Если не Auth Code, возможно это Reg Code (Registration)
        if (!isRegistered) {
             // Пробуем использовать как Reg Code
             const success = await startVerificationWithCode(chatId, cleanText)
             if (success) return
             
             // Если не подошло ни туда, ни сюда
             await bot.sendMessage(chatId, '❌ Неверный код верификации.\n\nЕсли вы регистрируетесь, проверьте код в личном кабинете.\nЕсли входите — убедитесь, что код скопирован верно со страницы входа.')
             return
        } else {
             // Пользователь уже зарегистрирован, но прислал какой-то код (не Auth)
             await bot.sendMessage(chatId, '🤔 Вы прислали код, но вы уже зарегистрированы.\n\nЕсли это код для входа на другом устройстве — он истек или неверен.\nЕсли хотите проверить баланс — отправьте /balance')
             return
        }
      }

      // 3. Если не код, то диалог (только для регистрации)
      if (!isRegistered) {
          if (!sessions.has(chatId)) {
            await bot.sendMessage(chatId, 'Чтобы начать регистрацию, отправьте /start.')
            return
          }
          
          const session = sessions.get(chatId)!
          
          // Если ждем код, но пришло не hex (а мы уже проверили hex выше), то подсказываем
          if (session.waitingForCode && !session.code) {
             await bot.sendMessage(chatId, '📝 Пожалуйста, отправьте код верификации из личного кабинета (6 символов).')
             return
          }
          
          // ... далее логика AI диалога для регистрации ...
          // Копируем старую логику AI:
          
          // ВАЖНО: НЕ добавляем сообщение пользователя в историю ДО вызова processWithAI
          const { response, extracted } = await processWithAI(
            text,
            session.data,
            session.conversationHistory
          )
          
          session.conversationHistory.push({ role: 'user', content: text })
          const updatedData = { ...session.data, ...extracted }
          session.data = updatedData
          sessions.set(chatId, session)
          session.conversationHistory.push({ role: 'assistant', content: response })
          
          const isComplete = isDataComplete(session.data)
          if (isComplete) {
            // ... логика завершения (fetch complete) ...
            // Копируем блок завершения
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
              })
              const result = await resp.json()
              if (result.success) {
                await bot.sendMessage(chatId, '✅ Отлично! Регистрация завершена. Ваш аккаунт верифицирован! 🎉')
                sessions.delete(chatId)
              } else {
                await bot.sendMessage(chatId, `❌ Ошибка: ${result.error}`)
              }
            } catch (e) {
               await bot.sendMessage(chatId, '⚠️ Сервис временно недоступен.')
            }
          } else {
            const missingHint = getMissingFields(session.data)
            await bot.sendMessage(chatId, response + (missingHint ? missingHint : ''))
          }
          return
      }

      // 4. Если зарегистрирован и не код -> обычное общение (Help/Balance/Tasks)
      const intent = detectIntent(text)
      if (intent === 'balance') {
        if (user) await bot.sendMessage(chatId, `Ваш баланс: ${user.balance}₽`)
        return
      }
      if (intent === 'tasks') {
        const tasks = await fetchAvailableTasks(user?.id)
        // ... вывод задач ...
        if (!tasks.length) await bot.sendMessage(chatId, 'Задач пока нет.')
        else await bot.sendMessage(chatId, `Доступно задач: ${tasks.length}`)
        return
      }
      
      // Default response for registered users
      await bot.sendMessage(chatId, 'Я вас понимаю! Используйте меню или команды: /balance, /help.')
    })

    console.log('✅ Telegram бот инициализирован с OpenAI поддержкой')
    return bot
  } catch (error) {
    console.error('❌ Ошибка создания Telegram бота:', error)
    isInitialized = false
    botInstance = null
    return null
  }
}

/**
 * Получить текущий инстанс бота (для проверки живости)
 */
export function getBotInstance(): InstanceType<typeof TelegramBot> | null {
  return botInstance
}

/**
 * Корректная остановка бота
 */
export function shutdownBot() {
  if (botInstance) {
    try {
      console.log('🛑 Остановка Telegram бота...')
      botInstance.stopPolling()
      botInstance.removeAllListeners()
      botInstance = null
      isInitialized = false
      console.log('✅ Telegram бот остановлен')
    } catch (error) {
      console.error('⚠️ Ошибка при остановке бота:', error)
      // Всё равно сбрасываем инстанс
      botInstance = null
      isInitialized = false
    }
  }
}

// Инициализация происходит через telegram-init-server.ts
// ===================== КОНТЕКСТНАЯ ФИЛЬТРАЦИЯ ДА/НЕТ =====================
// Короткий ответ без контекста?
function isGenericYesNo(text: string): { isYesNo: boolean; value?: boolean } {
  const t = text.trim().toLowerCase()
  // Только короткие подтверждения/отрицания
  const yes = /^(да|ага|угу|конечно|верно|подтверждаю)[!.… ]*$/i
  const no = /^(нет|неа|не|отмена|не хочу)[!.… ]*$/i
  if (yes.test(t)) return { isYesNo: true, value: true }
  if (no.test(t)) return { isYesNo: true, value: false }
  return { isYesNo: false }
}

// Классифицируем последний вопрос ассистента (о чём он спрашивал)
function classifyLastQuestion(lastAssistant: string): 'real' | 'daily' | 'messenger' | 'city' | 'followers' | 'name' | null {
  const t = (lastAssistant || '').toLowerCase()
  
  // Проверяем в порядке приоритета (более специфичные паттерны первыми)
  if (/ежедневн|каждый день|каждые.*дн|желание.*выполнять.*задани|хочешь.*получать.*задани/i.test(t)) {
    console.log(`[CONTEXT] Классифицирован как 'daily': "${lastAssistant.substring(0, 100)}"`)
    return 'daily'
  }
  if (/реал|настоящ|живой|человек/.test(t)) {
    console.log(`[CONTEXT] Классифицирован как 'real': "${lastAssistant.substring(0, 100)}"`)
    return 'real'
  }
  if (/мессенджер|messenger|telegram|vk|whatsapp|tenchat|тенчат|вк/.test(t)) {
    console.log(`[CONTEXT] Классифицирован как 'messenger': "${lastAssistant.substring(0, 100)}"`)
    return 'messenger'
  }
  if (/город|где.*живё|живешь|живёшь|откуда/.test(t)) {
    console.log(`[CONTEXT] Классифицирован как 'city': "${lastAssistant.substring(0, 100)}"`)
    return 'city'
  }
  if (/подписчик|сколько.*подпис/.test(t)) {
    console.log(`[CONTEXT] Классифицирован как 'followers': "${lastAssistant.substring(0, 100)}"`)
    return 'followers'
  }
  if (/как.*зовут|имя|фамили/.test(t)) {
    console.log(`[CONTEXT] Классифицирован как 'name': "${lastAssistant.substring(0, 100)}"`)
    return 'name'
  }
  
  console.log(`[CONTEXT] Не удалось классифицировать вопрос: "${lastAssistant.substring(0, 100)}"`)
  return null
}

// Применяем контекст к извлечённым данным
function applyContextualYesNo(
  userText: string,
  lastAssistant: string,
  extracted: Partial<CollectedData>,
  collectedData: CollectedData
): Partial<CollectedData> {
  console.log(`[CONTEXT] applyContextualYesNo вызвана:`)
  console.log(`[CONTEXT]   userText: "${userText}"`)
  console.log(`[CONTEXT]   lastAssistant: "${lastAssistant.substring(0, 150)}"`)
  console.log(`[CONTEXT]   extracted: ${JSON.stringify(extracted)}`)
  console.log(`[CONTEXT]   collectedData.daily: ${collectedData.daily}`)
  
  const { isYesNo, value } = isGenericYesNo(userText)
  console.log(`[CONTEXT]   isGenericYesNo: isYesNo=${isYesNo}, value=${value}`)
  
  if (!isYesNo) {
    console.log(`[CONTEXT]   Не является yes/no ответом, возвращаем как есть`)
    return extracted
  }
  
  const topic = classifyLastQuestion(lastAssistant)
  console.log(`[CONTEXT]   Классифицированный topic: ${topic}`)
  
  if (!topic) {
    console.log(`[CONTEXT]   Не удалось классифицировать вопрос, возвращаем как есть`)
    return extracted
  }
  
  // Создаём копию извлечённых данных
  const result = { ...extracted }
  
  console.log(`[CONTEXT] Обнаружен короткий ответ "${userText}" на вопрос типа: ${topic}`)
  
  // Применяем по контексту вопроса ТОЛЬКО если поле ещё НЕ собрано
  if (topic === 'daily' && collectedData.daily === undefined) {
    // Удаляем ошибочный real если попал
    delete (result as any).real
    result.daily = Boolean(value)
    console.log(`[CONTEXT] ✅ Установлен daily = ${value}`)
  } else if (topic === 'real' && !collectedData.real) {
    // Удаляем ошибочный daily если попал
    delete (result as any).daily
    result.real = value ? 'yes' : 'no'
    console.log(`[CONTEXT] ✅ Установлен real = ${result.real}`)
  } else {
    console.log(`[CONTEXT] ⚠️ Поле уже собрано или topic не подходит: topic=${topic}, daily=${collectedData.daily}, real=${collectedData.real}`)
  }
  
  console.log(`[CONTEXT]   Результат: ${JSON.stringify(result)}`)
  return result
}