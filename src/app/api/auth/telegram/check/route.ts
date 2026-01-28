import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthCode } from '@/lib/telegram-auth-codes'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tempUserId = searchParams.get('tempUserId')

    if (!tempUserId) {
      return NextResponse.json(
        { success: false, error: 'tempUserId required' },
        { status: 400 }
      )
    }

    const authData = getAuthCode(tempUserId)

    if (!authData) {
      return NextResponse.json({
        success: false,
        error: 'Code expired or invalid',
      })
    }

    if (authData.authorized && authData.telegramId) {
      // Получаем данные пользователя из БД
      const user = await prisma.user.findUnique({
        where: { telegramId: authData.telegramId },
        select: {
          id: true,
          name: true,
          role: true,
          telegramId: true,
          telegramUsername: true,
          isBlocked: true,
          isVerified: true,
        }
      })

      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'User not found',
        })
      }

      if (user.isBlocked) {
        return NextResponse.json({
          success: false,
          error: 'User is blocked',
        })
      }

      return NextResponse.json({
        success: true,
        authorized: true,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        role: user.role,
        userId: user.id,
      })
    }

    return NextResponse.json({
      success: true,
      authorized: false,
    })
  } catch (error) {
    console.error('[AUTH TELEGRAM CHECK] Ошибка:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}

