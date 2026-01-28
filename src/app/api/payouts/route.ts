import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PayoutMethod, PayoutStatus, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/payouts/create - Создание выплаты
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'EXECUTOR') {
      return NextResponse.json({ error: 'Выплаты доступны только исполнителям' }, { status: 403 });
    }

    const { amount, method } = await request.json();

    if (!amount || !method) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    const userId = sessionUser.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, balance: true, isSelfEmployed: true, nalogVerificationStatus: true, telegramWalletVerified: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверяем баланс пользователя
    if (user.balance < amount) {
      return NextResponse.json(
        { error: 'Недостаточно средств на балансе' },
        { status: 400 }
      );
    }

    // Проверяем способ выплаты
    if (method === 'BANK_SPB') {
      if (!user.isSelfEmployed || user.nalogVerificationStatus !== 'VERIFIED') {
        return NextResponse.json(
          { error: 'Для банковских выплат требуется статус самозанятого' },
          { status: 400 }
        );
      }
    }

    if (method === 'TELEGRAM_WALLET') {
      if (!user.telegramWalletVerified) {
        return NextResponse.json(
          { error: 'Telegram Wallet не верифицирован' },
          { status: 400 }
        );
      }
    }

    // Создаем выплату
    const payout = await prisma.payout.create({
      data: {
        userId: user.id,
        amount: parseFloat(amount),
        method: method as PayoutMethod,
        status: PayoutStatus.PENDING
      }
    });

    // Обрабатываем выплату
    await processPayout({ id: payout.id, userId: payout.userId, amount: Number(payout.amount) });

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
      message: 'Выплата создана и обрабатывается'
    });
  } catch (error) {
    console.error('Error creating payout:', error);
    return NextResponse.json(
      { error: 'Ошибка создания выплаты' },
      { status: 500 }
    );
  }
}

// GET /api/payouts - Получить список выплат
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'MODERATOR_ADMIN';
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const status = searchParams.get('status');

    const where: { userId?: string; status?: PayoutStatus } = {};
    if (isAdmin) {
      if (userIdParam) where.userId = userIdParam;
    } else {
      where.userId = sessionUser.id!;
    }
    if (status) where.status = status as PayoutStatus;

    const payouts = await prisma.payout.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      payouts
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Ошибка получения списка выплат' },
      { status: 500 }
    );
  }
}

// Обработка выплаты
type PayoutLite = { id: string; userId: string; amount: number };
async function processPayout(payout: PayoutLite) {
  try {
    // Обновляем статус на "Обрабатывается"
    await prisma.payout.update({
      where: { id: payout.id },
      data: { 
        status: 'PROCESSING',
        processedAt: new Date()
      }
    });

    // Имитируем обработку выплаты
    const success = Math.random() > 0.1; // 90% успешных выплат

    if (success) {
      // Успешная выплата
      await prisma.payout.update({
        where: { id: payout.id },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date(),
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      });

      // Списываем с баланса пользователя
      await prisma.user.update({
        where: { id: payout.userId },
        data: {
          balance: {
            decrement: payout.amount
          }
        }
      });

      console.log(`✅ Выплата ${payout.id} завершена успешно`);
    } else {
      // Неудачная выплата
      await prisma.payout.update({
        where: { id: payout.id },
        data: { 
          status: 'FAILED',
          completedAt: new Date()
        }
      });

      console.log(`❌ Выплата ${payout.id} не удалась`);
    }
  } catch (error) {
    console.error('Error processing payout:', error);
    
    // Обновляем статус на "Неудачная"
    await prisma.payout.update({
      where: { id: payout.id },
      data: { 
        status: 'FAILED',
        completedAt: new Date()
      }
    });
  }
}
