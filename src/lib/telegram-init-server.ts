// Server-side initialization file
// This ensures the bot is initialized when Next.js server starts

import { initializeTelegramBot } from './telegram-init'

// Initialize bot ONLY when server is running, NOT during build
// Проверяем, что это не время сборки
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                    process.env.NEXT_PHASE === 'phase-development-build' ||
                    process.env.npm_lifecycle_event === 'build'

if (!isBuildTime && process.env.TELEGRAM_BOT_TOKEN) {
  console.log('🤖 Инициализация Telegram бота...')
  // Используем IIFE для async инициализации
  ;(async () => {
    try {
      const bot = await initializeTelegramBot()
      if (bot) {
        console.log('✅ Telegram бот успешно запущен')
      } else {
        console.error('❌ Не удалось запустить Telegram бота')
      }
    } catch (error) {
      console.error('❌ Ошибка инициализации Telegram бота:', error)
    }
  })()
} else if (isBuildTime) {
  // Тихая инициализация при сборке - не запускаем бота
} else if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN не найден в переменных окружения')
}





