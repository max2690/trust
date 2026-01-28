import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RefundStatus, ExecutionStatus, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'MODERATOR_ADMIN';
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    const where: { status?: RefundStatus; customerId?: string } = {};
    if (status) where.status = status as RefundStatus;
    if (isAdmin) {
      if (customerId) where.customerId = customerId;
    } else if (sessionUser.role === 'CUSTOMER') {
      where.customerId = sessionUser.id!;
    } else {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const refunds = await prisma.refund.findMany({
      where,
      include: {
        order: {
          select: {
            title: true,
            socialNetwork: true,
            deadline: true
          }
        },
        customer: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ refunds, success: true });

  } catch (error) {
    console.error('Ошибка получения возвратов:', error);
    return NextResponse.json({ error: 'Ошибка получения возвратов' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, reason = 'Невыполнение заказа в срок' } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Не все поля заполнены' }, { status: 400 });
    }
    const customerId = sessionUser.id;

    // Получаем заказ
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        executions: {
          where: { status: ExecutionStatus.COMPLETED }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (order.customerId !== customerId) {
      return NextResponse.json({ error: 'Нет доступа к заказу' }, { status: 403 });
    }

    // Проверяем, что заказ не выполнен
    if (order.status === OrderStatus.COMPLETED || order.executions.length > 0) {
      return NextResponse.json({ error: 'Заказ уже выполнен' }, { status: 400 });
    }

    // Проверяем, что прошло 72 часа после дедлайна
    const now = new Date();
    const refundDeadline = order.refundDeadline || new Date(order.deadline.getTime() + 72 * 60 * 60 * 1000);
    
    if (now < refundDeadline) {
      return NextResponse.json({ 
        error: `Возврат возможен только через 72 часа после дедлайна (${refundDeadline.toLocaleString()})` 
      }, { status: 400 });
    }

    // Проверяем, что возврат еще не создан
    const existingRefund = await prisma.refund.findFirst({
      where: { orderId, status: { not: RefundStatus.CANCELLED } }
    });

    if (existingRefund) {
      return NextResponse.json({ error: 'Возврат уже создан' }, { status: 400 });
    }

    // Создаем возврат — используем totalReward (сумма заказа) если доступна, иначе reward
    const refundAmount = (order as { totalReward?: number }).totalReward ?? order.reward ?? 0;

    const refund = await prisma.refund.create({
      data: {
        orderId,
        customerId,
        amount: refundAmount,
        reason,
        status: RefundStatus.PENDING
      }
    });

    return NextResponse.json({ refund, success: true });

  } catch (error) {
    console.error('Ошибка создания возврата:', error);
    return NextResponse.json({ error: 'Ошибка создания возврата' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'MODERATOR_ADMIN';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await request.json();
    const { refundId, status, processedAt } = body;

    if (!refundId || !status) {
      return NextResponse.json({ error: 'Не все поля заполнены' }, { status: 400 });
    }

    const refund = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status,
        processedAt: status === 'COMPLETED' ? (processedAt || new Date()) : null
      },
      include: {
        order: true,
        customer: true
      }
    });

    // Если возврат завершен, возвращаем деньги на счет заказчика
    if (status === RefundStatus.COMPLETED) {
      await prisma.user.update({
        where: { id: refund.customerId },
        data: {
          balance: {
            increment: refund.amount
          }
        }
      });

      // Создаем запись о платеже
      await prisma.payment.create({
        data: {
          userId: refund.customerId,
          amount: refund.amount,
          type: 'DEPOSIT',
          status: PaymentStatus.COMPLETED,
          description: `Возврат за невыполненный заказ: ${refund.order.title}`
        }
      });
    }

    return NextResponse.json({ refund, success: true });

  } catch (error) {
    console.error('Ошибка обновления возврата:', error);
    return NextResponse.json({ error: 'Ошибка обновления возврата' }, { status: 500 });
  }
}

