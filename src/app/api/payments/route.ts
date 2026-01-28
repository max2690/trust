import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentStatus, UserRole } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined

    if (!sessionUser?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'MODERATOR_ADMIN'
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, amount, type, description } = body

    // Проверяем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Создаем платеж
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        type,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      payment
    })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined

    if (!sessionUser?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'MODERATOR_ADMIN'
    const { searchParams } = new URL(request.url)
    const userIdQuery = searchParams.get('userId')
    const status = searchParams.get('status') as PaymentStatus | null

    const where: { userId?: string; status?: PaymentStatus } = {}
    if (isAdmin) {
      if (userIdQuery) where.userId = userIdQuery
    } else {
      where.userId = sessionUser.id!
    }
    if (status) where.status = status

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: {
          select: { name: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, payments })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined

    if (!sessionUser?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'MODERATOR_ADMIN'
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const { paymentId, status, transactionId } = body as { paymentId: string; status: PaymentStatus; transactionId?: string }

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        transactionId
      }
    })

    // Если платеж успешен, обновляем баланс
    if (status === 'COMPLETED' && payment.type === 'DEPOSIT') {
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          balance: {
            increment: payment.amount
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      payment
    })
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}
