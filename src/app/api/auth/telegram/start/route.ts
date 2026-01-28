import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { setAuthCode } from '@/lib/telegram-auth-codes'

export async function POST(request: NextRequest) {
  try {
    console.log('[AUTH TELEGRAM START] Генерация кода авторизации')

    // Генерируем уникальный код и временный ID
    const code = randomBytes(3).toString('hex').toUpperCase()
    const tempUserId = randomBytes(16).toString('hex')

    // Сохраняем в временное хранилище
    setAuthCode(tempUserId, {
      code,
      createdAt: Date.now(),
    })

    console.log('[AUTH TELEGRAM START] Код сгенерирован:', { code, tempUserId })

    // Получаем имя бота
    let botUsername = process.env.TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

    if (!botUsername && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`)
        const data = await response.json()
        if (data.ok && data.result?.username) {
          botUsername = data.result.username
        }
      } catch (e) {
        console.error('Failed to get bot username:', e)
      }
    }

    const deepLink = `https://t.me/${botUsername || 'MBTRUST_bot'}?start=auth_${code}`

    return NextResponse.json({
      success: true,
      code,
      deepLink,
      tempUserId,
    })
  } catch (error) {
    console.error('[AUTH TELEGRAM START] Ошибка:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}

