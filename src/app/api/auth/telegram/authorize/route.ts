import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findByCode, markAsAuthorized } from '@/lib/telegram-auth-codes'

export async function POST(request: NextRequest) {
  try {
    const { code, telegramId, telegramUsername } = await request.json()

    if (!code || !telegramId) {
      return NextResponse.json(
        { success: false, error: 'Code and telegramId required' },
        { status: 400 }
      )
    }

    console.log('[AUTH AUTHORIZE] Проверка кода:', { code, telegramId })

    // Ищем временный ID по коду
    const tempUserId = findByCode(code)

    if (!tempUserId) {
      console.log('[AUTH AUTHORIZE] Код не найден или истек:', code)
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired code',
      })
    }

    console.log('[AUTH AUTHORIZE] Код найден, tempUserId:', tempUserId)

    // Ищем пользователя с таким telegramId
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        name: true,
        role: true,
        isBlocked: true,
        isVerified: true,
        telegramUsername: true,
      }
    })

    if (!user) {
      console.log('[AUTH AUTHORIZE] Пользователь не найден с telegramId:', telegramId)
      return NextResponse.json({
        success: false,
        error: 'User not found with this Telegram account',
      })
    }

    if (user.isBlocked) {
      console.log('[AUTH AUTHORIZE] Пользователь заблокирован:', user.id)
      return NextResponse.json({
        success: false,
        error: 'User is blocked',
      })
    }

    // Обновляем username если изменился
    if (telegramUsername && telegramUsername !== user.telegramUsername) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramUsername }
      })
    }

    // Помечаем код как использованный для авторизации
    markAsAuthorized(tempUserId, telegramId)

    console.log('[AUTH AUTHORIZE] Авторизация успешна для пользователя:', user.id)

    return NextResponse.json({
      success: true,
      userId: user.id,
      role: user.role,
      telegramId,
      telegramUsername: telegramUsername || user.telegramUsername,
    })
  } catch (error) {
    console.error('[AUTH AUTHORIZE] Ошибка:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}

