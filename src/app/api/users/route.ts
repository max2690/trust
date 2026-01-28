export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { issueSignupToken, validateSignupToken } from '@/lib/signup-tokens'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, country, region, role, password } = body

    // Нормализуем email: пустая строка преобразуется в null
    const normalizedEmail = email && email.trim() ? email.trim() : null

    // Проверяем, что телефон не занят
    const existingUserByPhone = await prisma.user.findUnique({
      where: { phone }
    })

    if (existingUserByPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone number already registered' },
        { status: 400 }
      )
    }

    // Проверяем, что email не занят (если email предоставлен)
    if (normalizedEmail) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })

      if (existingUserByEmail) {
        return NextResponse.json(
          { success: false, error: 'Email already registered' },
          { status: 400 }
        )
      }
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 12)

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email: normalizedEmail,
        country,
        region,
        role: role as UserRole,
        passwordHash: hashedPassword,
        level: 'NOVICE',
        balance: 0,
        isVerified: false,
        isBlocked: false
      }
    })

    // Убираем пароль из ответа
    const { passwordHash, ...userWithoutPassword } = user

    const signupToken = issueSignupToken(user.id)

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      signupToken
    })
  } catch (error: unknown) {
    console.error('Error creating user:', error)
    
    // Обработка ошибок уникальности Prisma
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError?.code === 'P2002') {
      const target = prismaError?.meta?.target || []
      if (target.includes('email')) {
        return NextResponse.json(
          { success: false, error: 'Email already registered' },
          { status: 400 }
        )
      }
      if (target.includes('phone')) {
        return NextResponse.json(
          { success: false, error: 'Phone number already registered' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'User with this data already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as UserRole | null
    const userId = searchParams.get('userId')
    const telegramId = searchParams.get('telegramId')
    const signupToken = searchParams.get('signupToken')
    const internalSecret = request.headers.get('x-internal-secret')
    const internalSecretValue = process.env.INTERNAL_API_SECRET
    const isInternalRequest = Boolean(internalSecret && internalSecretValue && internalSecret === internalSecretValue)

    const session = await getServerSession(authOptions)
    const sessionUser = session?.user as { id?: string; role?: string } | undefined
    const sessionUserId = sessionUser?.id
    const sessionUserRole = sessionUser?.role
    const isAdmin = sessionUserRole === 'SUPER_ADMIN' || sessionUserRole === 'MODERATOR_ADMIN'

    const where: { role?: UserRole; id?: string; telegramId?: string } = {}
    if (role) where.role = role
    if (userId) where.id = userId
    if (telegramId) where.telegramId = telegramId

    // Если указан userId или telegramId, возвращаем одного пользователя
    if (userId || telegramId) {
      if (telegramId && !isInternalRequest && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Недостаточно прав' },
          { status: 403 }
        )
      }

      const user = await prisma.user.findUnique({
        where: userId ? { id: userId } : { telegramId: telegramId! },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          country: true,
          region: true,
          role: true,
          level: true,
          balance: true,
          isVerified: true,
          isBlocked: true,
          createdAt: true,
          telegramId: true,
          telegramUsername: true
        }
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      const signupAccessGranted = Boolean(
        userId &&
        signupToken &&
        validateSignupToken(userId, signupToken)
      )

      if (signupAccessGranted) {
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified
          }
        })
      }

      if (!sessionUserId && !isInternalRequest) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }

      if (!isInternalRequest && !isAdmin) {
        const isSelfRequest = userId && sessionUserId === userId
        if (!isSelfRequest) {
          return NextResponse.json(
            { success: false, error: 'Недостаточно прав' },
            { status: 403 }
          )
        }
      }

      if (isInternalRequest) {
        return NextResponse.json({ success: true, user })
      }

      const safeUser = isAdmin || sessionUserId === user.id
        ? user
        : {
            id: user.id,
            name: user.name,
            role: user.role,
            level: user.level,
            isVerified: user.isVerified,
            telegramUsername: user.telegramUsername
          }

      return NextResponse.json({ success: true, user: safeUser })
    }

    if (!sessionUserId && !isInternalRequest) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!isAdmin && !isInternalRequest) {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав' },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        country: true,
        region: true,
        role: true,
        level: true,
        balance: true,
        isVerified: true,
        isBlocked: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
