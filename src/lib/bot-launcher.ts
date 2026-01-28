// Centralized bot launcher - ensures single instance with protection
import { initializeTelegramBot, getBotInstance, shutdownBot } from './telegram-init'

let launched = false
let lastLaunchTime = 0
let healthCheckInterval: NodeJS.Timeout | null = null

const MIN_LAUNCH_INTERVAL = 5000 // Минимум 5 секунд между запусками

/**
 * Запуск бота с защитой от конфликтов и дублирования
 */
export function launchBot() {
  const now = Date.now()
  
  // Защита от слишком частых вызовов
  if (launched && (now - lastLaunchTime) < MIN_LAUNCH_INTERVAL) {
    console.log('⚠️ Бот уже запущен недавно, пропускаем (защита от дублирования)')
    return
  }
  
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN не найден')
    return
  }
  
  // Проверяем, жив ли существующий инстанс
  const existingBot = getBotInstance()
  if (existingBot) {
    console.log('⚠️ Обнаружен существующий инстанс бота, проверяем его состояние...')
    try {
      // Пытаемся получить информацию о боте (проверка живости)
      existingBot.getMe().then(() => {
        console.log('✅ Существующий бот работает корректно')
      }).catch(() => {
        console.warn('⚠️ Существующий бот не отвечает, перезапускаем...')
        shutdownBot()
        setTimeout(() => launchBot(), 2000)
      })
      return
    } catch (_e: unknown) {
      console.warn('⚠️ Ошибка проверки существующего бота, останавливаем и перезапускаем')
      shutdownBot()
    }
  }
  
  lastLaunchTime = now
  launched = true
  console.log('🤖 Запуск Telegram бота...')
  
  // Используем async IIFE для запуска бота
  ;(async () => {
    try {
      const bot = await initializeTelegramBot()
      
      if (bot) {
        console.log('✅ Telegram бот успешно запущен')
        
        // Запускаем периодическую проверку здоровья бота
        startHealthCheck()
        
        // Graceful shutdown при завершении процесса
        process.once('SIGINT', gracefulShutdown)
        process.once('SIGTERM', gracefulShutdown)
      } else {
        console.error('❌ Не удалось запустить Telegram бота')
        launched = false
      }
    } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Критическая ошибка при запуске бота:', errorMessage)
    launched = false
    
    // Если 409 конфликт - пытаемся остановить старый инстанс
    if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
      console.log('🔄 Обнаружен конфликт (409), останавливаем старый инстанс и пробуем снова через 5 секунд...')
      shutdownBot()
      setTimeout(() => {
        launched = false
        launchBot()
      }, 5000)
    }
    }
  })()
}

/**
 * Периодическая проверка здоровья бота (каждые 2 минуты)
 */
function startHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
  }
  
  healthCheckInterval = setInterval(() => {
    const bot = getBotInstance()
    if (!bot) {
      console.warn('⚠️ Health check: бот пропал, перезапускаем...')
      launched = false
      launchBot()
      return
    }
    
    bot.getMe()
      .then(() => {
        console.log('✅ Health check: бот работает')
      })
      .catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('❌ Health check: бот не отвечает:', errorMessage)
        console.log('🔄 Перезапускаем бота...')
        shutdownBot()
        launched = false
        setTimeout(() => launchBot(), 3000)
      })
  }, 120000) // Каждые 2 минуты
}

/**
 * Graceful shutdown при завершении процесса
 */
function gracefulShutdown() {
  console.log('🛑 Получен сигнал остановки, завершаем работу бота...')
  
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
  
  shutdownBot()
  launched = false
  
  console.log('✅ Бот корректно остановлен')
  process.exit(0)
}

/**
 * Принудительный перезапуск бота (для использования в экстренных случаях)
 */
export function forceRestartBot() {
  console.log('🔄 Принудительный перезапуск бота...')
  shutdownBot()
  launched = false
  lastLaunchTime = 0
  
  setTimeout(() => {
    launchBot()
  }, 3000)
}

