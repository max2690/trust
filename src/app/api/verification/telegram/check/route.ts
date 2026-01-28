import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthCode } from '@/lib/telegram-auth-codes'

export async function POST(req: NextRequest) {
  try {
    const { code, tempUserId } = await req.json()
    
    if (!code || !tempUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Проверяем код во временном хранилище
    const authData = getAuthCode(tempUserId)

    if (!authData || authData.code !== code) {
      return NextResponse.json({ verified: false })
    }

    // Если авторизация через бота прошла
    if (authData.authorized && authData.telegramId) {
      console.log(`[TELEGRAM AUTH CHECK] Пользователь авторизован в боте: ${authData.telegramId}`)
      
      // Ищем пользователя в БД по telegramId
      const user = await prisma.user.findUnique({
        where: { telegramId: authData.telegramId }
      })

      return NextResponse.json({
        verified: true,
        telegramId: authData.telegramId,
        telegramUsername: user?.telegramUsername,
        userRole: user?.role,
      })
    }

    return NextResponse.json({ verified: false })
  } catch (error) {
    console.error('[TELEGRAM AUTH CHECK] Ошибка:', error)
    return NextResponse.json(
      { error: 'Internal error', verified: false },
      { status: 500 }
    )
  }
}

