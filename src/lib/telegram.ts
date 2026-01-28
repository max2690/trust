import TelegramBot from 'node-telegram-bot-api';
import { getBotInstance } from './telegram-init';

// Типы для Telegram Bot API
type TelegramMessage = {
  message_id: number;
  from?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  date: number;
};

type TelegramError = {
  code: number;
  description: string;
};

// Получаем экземпляр бота из telegram-init (без создания нового с polling)
// Если бот не инициализирован, создаём временный экземпляр только для отправки сообщений (без polling)
const getBot = (): TelegramBot | null => {
  const mainBot = getBotInstance();
  if (mainBot) {
    return mainBot;
  }
  
  // Fallback: создаём временный бот только для отправки (без polling)
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return null;
  }
  
  return new TelegramBot(token, { 
    polling: false, // ВАЖНО: без polling, только для отправки
    webHook: false
  });
};

// Заглушка для Telegram в development
const sendTelegramStub = async (telegramId: string, message: string, type: string) => {
  console.log(`
🤖 TELEGRAM ВЕРИФИКАЦИЯ (ЗАГЛУШКА)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      
📱 Telegram ID: ${telegramId}
📋 Сообщение: ${message.replace(/\*/g, '').replace(/`/g, '')}
👤 Тип: ${type}
⏰ Время: ${new Date().toLocaleString()}
💰 Стоимость: 0₽ (заглушка)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      
  `);
  
  return { success: true, cost: 0, method: 'stub' };
};

// Отправка кода верификации
export const sendVerificationCode = async (telegramId: string, code: string, type: 'admin' | 'user' = 'user') => {
  try {
    // Проверяем, что это не тестовый ID
    if (telegramId === '123456789' || !telegramId || telegramId.length < 5) {
      const message = type === 'admin' 
        ? `Код верификации MB-TRUST Admin: ${code}`
        : `Код верификации MB-TRUST: ${code}`;
      
      return await sendTelegramStub(telegramId, message, type);
    }

    const message = type === 'admin' 
      ? `
🔐 **Код верификации MB-TRUST Admin**

Ваш код: \`${code}\`

⏰ Действует: 2 минуты
🔒 Не передавайте код третьим лицам
      `
      : `
🔐 **Код верификации MB-TRUST**

Ваш код: \`${code}\`

⏰ Действует: 2 минуты
🔒 Не передавайте код третьим лицам
      `;

    const bot = getBot();
    if (!bot) {
      throw new Error('Telegram bot не инициализирован');
    }
    
    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    return { success: true };
  } catch (error) {
    console.error('Ошибка отправки Telegram сообщения:', error);
    
    // Fallback на заглушку при ошибке
    const message = type === 'admin' 
      ? `Код верификации MB-TRUST Admin: ${code}`
      : `Код верификации MB-TRUST: ${code}`;
    
    return await sendTelegramStub(telegramId, message, type);
  }
};

// Отправка уведомления о заказе
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendOrderNotification = async (telegramId: string, orderData: any) => {
  try {
    // Проверяем, что это не тестовый ID
    if (telegramId === '123456789' || !telegramId || telegramId.length < 5) {
      const message = `Новый заказ MB-TRUST: ${orderData.title}`;
      return await sendTelegramStub(telegramId, message, 'order');
    }

    const message = `
📢 **Новый заказ доступен!**

📋 **${orderData.title}**
💰 **Вознаграждение:** ${orderData.reward}₽
🌍 **Регион:** ${orderData.region}
📱 **Платформа:** ${orderData.socialNetwork}
⏰ **Дедлайн:** ${new Date(orderData.deadline).toLocaleString()}

🎯 **Описание:** ${orderData.description}

Перейдите в приложение для принятия заказа.
    `;
    
    const bot = getBot();
    if (!bot) {
      throw new Error('Telegram bot не инициализирован');
    }
    
    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    return { success: true };
  } catch (error) {
    console.error('Ошибка отправки уведомления о заказе:', error);
    
    // Fallback на заглушку при ошибке
    const message = `Новый заказ MB-TRUST: ${orderData.title}`;
    return await sendTelegramStub(telegramId, message, 'order');
  }
};

// Отправка уведомления о выполнении
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendExecutionNotification = async (telegramId: string, executionData: any) => {
  try {
    // Проверяем, что это не тестовый ID
    if (telegramId === '123456789' || !telegramId || telegramId.length < 5) {
      const message = `Выполнение заказа MB-TRUST: ${executionData.orderTitle}`;
      return await sendTelegramStub(telegramId, message, 'execution');
    }

    const message = `
✅ **Заказ выполнен!**

📋 **${executionData.order.title}**
💰 **Заработано:** ${executionData.reward}₽
📊 **Клики:** ${executionData.clicks}
📱 **Платформа:** ${executionData.order.socialNetwork}

Ваш баланс пополнен!
    `;
    
    const bot = getBot();
    if (!bot) {
      throw new Error('Telegram bot не инициализирован');
    }
    
    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    return { success: true };
  } catch (error) {
    console.error('Ошибка отправки уведомления о выполнении:', error);
    
    // Fallback на заглушку при ошибке
    const message = `Выполнение заказа MB-TRUST: ${executionData.orderTitle}`;
    return await sendTelegramStub(telegramId, message, 'execution');
  }
};

// Отправка уведомления о балансе
export const sendBalanceNotification = async (telegramId: string, balance: number, type: 'deposit' | 'withdrawal' | 'earning') => {
  try {
    // Проверяем, что это не тестовый ID
    if (telegramId === '123456789' || !telegramId || telegramId.length < 5) {
      const action = type === 'deposit' ? 'пополнен' : type === 'withdrawal' ? 'списан' : 'заработан';
      const message = `Баланс ${action}: ${balance}₽`;
      return await sendTelegramStub(telegramId, message, 'balance');
    }

    const emoji = type === 'deposit' ? '💰' : type === 'withdrawal' ? '💸' : '🎉';
    const action = type === 'deposit' ? 'пополнен' : type === 'withdrawal' ? 'списан' : 'заработан';
    
    const message = `
${emoji} **Баланс ${action}!**

💳 **Текущий баланс:** ${balance}₽

${type === 'earning' ? 'Поздравляем с успешным выполнением заказа!' : ''}
    `;
    
    const bot = getBot();
    if (!bot) {
      throw new Error('Telegram bot не инициализирован');
    }
    
    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    return { success: true };
  } catch (error) {
    console.error('Ошибка отправки уведомления о балансе:', error);
    
    // Fallback на заглушку при ошибке
    const action = type === 'deposit' ? 'пополнен' : type === 'withdrawal' ? 'списан' : 'заработан';
    const message = `Баланс ${action}: ${balance}₽`;
    return await sendTelegramStub(telegramId, message, 'balance');
  }
};

// Настройка обработчиков бота (УДАЛЕНО - используется telegram-init.ts)
// Эта функция больше не используется, так как вся логика обработки сообщений
// перенесена в telegram-init.ts для единого управления ботом
export const setupTelegramBot = () => {
  console.warn('⚠️ setupTelegramBot() устарела - используйте telegram-init.ts');
  // Функция оставлена для обратной совместимости, но ничего не делает
  return;
  
  /* УДАЛЕНО - логика перенесена в telegram-init.ts
  const bot = getBot();
  if (!bot) {
    console.error('❌ Бот не инициализирован');
    return;
  }
  
  bot.on('message', async (msg: TelegramMessage) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from?.id.toString();
    const username = msg.from?.username;
    
    if (!text || !userId) return;

    // Обработка ручного ввода кода (6 символов hex)
    const cleanText = text.trim().toUpperCase();
    // Проверяем, что это похоже на код (6 символов, 0-9 A-F) и не является командой
    if (!text.startsWith('/') && /^[0-9A-F]{6}$/.test(cleanText)) {
      console.log(`[BOT] Получен код вручную: ${cleanText} от пользователя ${userId}`);
      const tempUserId = findByCode(cleanText);

      if (tempUserId) {
        markAsAuthorized(tempUserId, userId);
        
        await bot.sendMessage(chatId, `
✅ **Авторизация успешна!**

Вы успешно вошли в MB-TRUST.
Можете вернуться в браузер.
        `, { parse_mode: 'Markdown' });
        console.log(`[BOT] Пользователь ${userId} успешно авторизован (manual code)`);
      } else {
        await bot.sendMessage(chatId, `
❌ **Код не найден**

Проверьте правильность кода или попробуйте сгенерировать новый на сайте.
        `, { parse_mode: 'Markdown' });
      }
      return;
    }

    // Обработка команды /start link_CODE
    if (text.startsWith('/start link_')) {
      const code = text.replace('/start link_', '').trim();
      console.log(`[BOT] Получен код верификации: ${code} от пользователя ${userId}`);

      const tempUserId = findByCode(code);

      if (tempUserId) {
        markAsAuthorized(tempUserId, userId);
        
        await bot.sendMessage(chatId, `
✅ **Авторизация успешна!**

Вы успешно вошли в MB-TRUST.
Можете вернуться в браузер.
        `, { parse_mode: 'Markdown' });
        console.log(`[BOT] Пользователь ${userId} успешно авторизован для tempUser ${tempUserId}`);
      } else {
        await bot.sendMessage(chatId, `
❌ **Ошибка авторизации**

Код не найден или истек. Попробуйте снова на сайте.
        `, { parse_mode: 'Markdown' });
        console.log(`[BOT] Код ${code} не найден`);
      }
      return;
    }
    
    if (text === '/start') {
      await bot.sendMessage(chatId, `
🤖 **MB-TRUST Bot**

Добро пожаловать! Этот бот используется для:
• Верификации аккаунтов
• Уведомлений о заказах
• Информации о балансе
• Поддержки

Для получения кода верификации используйте кнопку на сайте.
      `);
    }
    
    if (text === '/help') {
      await bot.sendMessage(chatId, `
📋 **Доступные команды:**

/start - Начать работу с ботом
/help - Показать эту справку
/balance - Проверить баланс (в разработке)
/orders - Мои заказы (в разработке)

💬 **Поддержка:** @mb_trust_support
      `);
    }
  });
  */
};

// Получение информации о пользователе
export const getTelegramUserInfo = async (telegramId: string) => {
  try {
    const bot = getBot();
    if (!bot) {
      return null;
    }
    
    const user = await bot.getChat(telegramId);
    return {
      id: user.id.toString(),
      username: 'username' in user ? user.username : null,
      firstName: 'first_name' in user ? user.first_name : null,
      lastName: 'last_name' in user ? user.last_name : null,
    };
  } catch (error) {
    console.error('Ошибка получения информации о пользователе:', error);
    return null;
  }
};

// Проверка валидности Telegram ID
export const isValidTelegramId = (telegramId: string): boolean => {
  return /^\d+$/.test(telegramId) && telegramId.length >= 8;
};

// Экспортируем функцию для получения бота (для обратной совместимости)
export default getBot;

