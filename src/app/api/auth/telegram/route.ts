import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Проверка подлинности данных от Telegram Login Widget
 * https://core.telegram.org/widgets/login#checking-authorization
 */
function verifyTelegramAuth(data: Record<string, string>): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.error('[TELEGRAM AUTH] TELEGRAM_BOT_TOKEN не установлен')
    return false
  }

  const { hash, ...authData } = data
  
  // Создаем строку для проверки
  const dataCheckString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key]}`)
    .join('\n')
  
  // Создаем секретный ключ
  const secretKey = crypto
    .createHash('sha256')
    .update(botToken)
    .digest()
  
  // Создаем хеш для проверки
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')
  
  return calculatedHash === hash
}

/**
 * POST /api/auth/telegram
 * Обработка авторизации через Telegram Login Widget
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    console.log('[TELEGRAM AUTH] Получены данные:', {
      id: data.id,
      username: data.username,
      first_name: data.first_name,
    })

    // Проверяем подлинность данных от Telegram
    if (!verifyTelegramAuth(data)) {
      console.error('[TELEGRAM AUTH] Проверка подлинности не прошла')
      return NextResponse.json(
        { success: false, error: 'invalid_auth' },
        { status: 401 }
      )
    }

    // Проверяем, что данные не устарели (не старше 1 минуты)
    const authDate = parseInt(data.auth_date)
    const currentTime = Math.floor(Date.now() / 1000)
    if (currentTime - authDate > 86400) { // 24 часа
      console.error('[TELEGRAM AUTH] Данные устарели')
      return NextResponse.json(
        { success: false, error: 'auth_expired' },
        { status: 401 }
      )
    }

    const telegramId = data.id.toString()

    // Ищем пользователя с таким telegramId
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        level: true,
        isBlocked: true,
        isVerified: true,
        telegramUsername: true,
      }
    })

    if (!user) {
      console.log('[TELEGRAM AUTH] Пользователь с telegramId не найден:', telegramId)
      return NextResponse.json(
        { 
          success: false, 
          error: 'user_not_found',
          message: 'Telegram аккаунт не привязан. Пожалуйста, зарегистрируйтесь или привяжите Telegram к существующему аккаунту.'
        },
        { status: 404 }
      )
    }

    // Проверяем, не заблокирован ли пользователь
    if (user.isBlocked) {
      console.log('[TELEGRAM AUTH] Пользователь заблокирован:', user.id)
      return NextResponse.json(
        { success: false, error: 'user_blocked' },
        { status: 403 }
      )
    }

    // Обновляем username если изменился
    if (data.username && data.username !== user.telegramUsername) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramUsername: data.username }
      })
    }

    console.log('[TELEGRAM AUTH] Успешная авторизация:', {
      userId: user.id,
      name: user.name,
      role: user.role
    })

    // Возвращаем данные пользователя для создания сессии
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        level: user.level,
        isVerified: user.isVerified,
      }
    })

  } catch (error) {
    console.error('[TELEGRAM AUTH] Ошибка:', error)
    return NextResponse.json(
      { success: false, error: 'internal_error' },
      { status: 500 }
    )
  }
}

