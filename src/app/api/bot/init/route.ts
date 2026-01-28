import { NextResponse } from 'next/server'
import { initializeTelegramBot } from '@/lib/telegram-init'

// Глобальный флаг для предотвращения повторной инициализации
let initAttempted = false

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // Инициализируем бота только один раз при первом запросе
  if (!initAttempted && process.env.TELEGRAM_BOT_TOKEN) {
    initAttempted = true
    console.log('🤖 Инициализация Telegram бота через API route...')
    try {
      const bot = await initializeTelegramBot()
      if (bot) {
        return NextResponse.json({ success: true, message: 'Telegram бот инициализирован' })
      } else {
        return NextResponse.json({ success: false, message: 'Не удалось инициализировать бота' }, { status: 500 })
      }
    } catch (error) {
      console.error('Ошибка инициализации бота:', error)
      return NextResponse.json({ success: false, message: 'Ошибка инициализации бота' }, { status: 500 })
    }
  }
  
  return NextResponse.json({ success: true, message: 'Бот уже инициализирован или токен отсутствует' })
}

