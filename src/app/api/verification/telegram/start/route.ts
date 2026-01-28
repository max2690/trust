import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { setAuthCode } from '@/lib/telegram-auth-codes'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    console.log(`[VERIFY-START] Запуск верификации для пользователя ${userId}`)

    // Генерируем код и нормализуем его (верхний регистр, без пробелов)
    const code = randomBytes(3).toString('hex').toUpperCase()
    console.log(`[VERIFY-START] Сгенерирован код: ${code} для пользователя ${userId}`)
    
    // Определяем тип операции по userId
    // Если userId начинается с temp_, это авторизация (Login) -> храним в памяти
    // Если userId похож на CUID (реальный ID), это привязка (Registration) -> храним в БД
    
    const isTempUser = userId.startsWith('temp_')
    
    if (isTempUser) {
        // Flow: Авторизация (Login)
        // Сохраняем код во временное хранилище (в памяти)
        setAuthCode(userId, {
          code,
          createdAt: Date.now(),
          authorized: false
        })
        console.log(`[VERIFY-START] Код сохранён в ПАМЯТИ для tempUserId ${userId} (Auth Flow)`)
    } else {
        // Flow: Привязка (Registration)
        // Сохраняем код в БД пользователя
        await prisma.user.update({ 
            where: { id: userId }, 
            data: { verificationCode: code } 
        })
        console.log(`[VERIFY-START] Код сохранён в БД для userId ${userId} (Reg Flow)`)
    }

    // Получаем имя бота из переменной окружения или через Telegram API
    let botUsername = process.env.TELEGRAM_BOT_USERNAME

    // Если username не указан, получаем через Telegram API
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

    // Для auth flow (Login) используем link_, для reg flow (привязка) тоже используем link_
    // Бот сам разберется по формату или наличию в базе
    const deepLink = `https://t.me/${botUsername || 'MBTRUST_bot'}?start=link_${code}`

    return NextResponse.json({
      success: true,
      code,
      deepLink
    })
  } catch (e) {
    console.error('telegram/start error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


