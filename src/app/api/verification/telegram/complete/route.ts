import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      code,
      telegramId,
      telegramUsername,
      name,
      city,
      preferredMessenger,
      followersApprox,
      dailyTasksOptIn,
      checkOnly // Флаг только для проверки кода без завершения
    } = body

    if (!code) {
      return NextResponse.json({ error: 'code required' }, { status: 400 })
    }

    // Нормализуем код (верхний регистр, без пробелов) для поиска в БД
    const normalizedCode = code.trim().replace(/\s+/g, '').toUpperCase()
    
    console.log(`[VERIFY] Проверка кода: исходный="${code}", нормализованный="${normalizedCode}"`)

    // Проверяем код в базе данных (сначала точное совпадение, потом case-insensitive)
    let user = await prisma.user.findFirst({ where: { verificationCode: normalizedCode } })
    
    // Если не нашли, пробуем case-insensitive поиск (для старых кодов в нижнем регистре)
    if (!user) {
      const allUsers = await prisma.user.findMany({ 
        where: { verificationCode: { not: null } },
        select: { id: true, verificationCode: true }
      })
      const found = allUsers.find(u => u.verificationCode?.toUpperCase() === normalizedCode)
      if (found) {
        user = await prisma.user.findUnique({ where: { id: found.id } })
        console.log(`[VERIFY] Найден код case-insensitive для пользователя ${found.id}`)
      }
    }
    
    console.log(`[VERIFY] Результат поиска: ${user ? `найден пользователь ${user.id}` : 'не найден'}`)
    
    // Если только проверка кода
    if (checkOnly) {
      if (!user) {
        return NextResponse.json({ valid: false, error: 'Invalid code' }, { status: 200 })
      }
      return NextResponse.json({ valid: true, userId: user.id })
    }

    // Полное завершение верификации требует telegramId
    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId required' }, { status: 400 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Проверяем, не привязан ли этот telegramId уже к другому пользователю
    const existingUserWithTelegram = await prisma.user.findFirst({
      where: { 
        telegramId: String(telegramId),
        id: { not: user.id } // Не текущий пользователь
      }
    })

    // Если telegramId уже привязан к другому пользователю
    if (existingUserWithTelegram) {
      console.log(`[VERIFY] TelegramId ${telegramId} уже привязан к пользователю ${existingUserWithTelegram.id}, отвязываем`)
      
      // Отвязываем telegramId от старого пользователя
      await prisma.user.update({
        where: { id: existingUserWithTelegram.id },
        data: {
          telegramId: null,
          telegramUsername: null,
          isVerified: false
        }
      })
    }

    // Завершаем верификацию - обновляем данные текущего пользователя
    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramId: String(telegramId),
        telegramUsername: telegramUsername || null,
        name: name || user.name,
        city: city || user.city,
        preferredMessenger: preferredMessenger || null,
        followersApprox: typeof followersApprox === 'number' ? followersApprox : null,
        dailyTasksOptIn: !!dailyTasksOptIn,
        isVerified: true,
        verificationCode: null // Очищаем код после успешной верификации
      }
    })

    console.log(`[VERIFY] Верификация успешна для пользователя ${user.id}, telegramId ${telegramId} привязан`)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('telegram/complete error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}







