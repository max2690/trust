import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExecutionStatus, OrderStatus, UserRole } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'EXECUTOR') {
      return NextResponse.json({ error: 'Только исполнители могут брать задания' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, screenshotUrl, notes } = body;
    const executorId = sessionUser.id;

    if (!orderId) {
      return NextResponse.json({ error: 'Не все поля заполнены' }, { status: 400 });
    }

    const executor = await prisma.user.findUnique({
      where: { id: executorId },
      select: { 
        id: true, 
        level: true, 
        role: true,
        createdAt: true 
      }
    });

    if (!executor || executor.role !== 'EXECUTOR') {
      return NextResponse.json({ error: 'Исполнитель не найден' }, { status: 404 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        executions: {
          where: { executorId }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (order.executions.length > 0) {
      return NextResponse.json({ error: 'Вы уже взяли этот заказ' }, { status: 400 });
    }

    if (order.status !== OrderStatus.PENDING) {
      return NextResponse.json({ error: 'Заказ уже принят' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyLimit = await prisma.executorDailyLimit.findUnique({
      where: {
        executorId_date: {
          executorId,
          date: today
        }
      }
    });

    const levelLimits: Record<string, number> = {
      NOVICE: 5,
      VERIFIED: 10,
      REFERRAL: 15,
      TOP: 20
    };

    const currentExecutions = dailyLimit?.executionsCount || 0;
    const maxExecutions = levelLimits[executor.level || 'NOVICE'] || 5;

    if (currentExecutions >= maxExecutions) {
      return NextResponse.json({ 
        error: `Достигнут дневной лимит (${maxExecutions} заказов для уровня ${executor.level})` 
      }, { status: 400 });
    }

    const platformLimits = (dailyLimit?.platformLimits as Record<string, number> | undefined) || {};
    const currentPlatformExecutions = platformLimits[order.socialNetwork] || 0;
    const maxPlatformExecutions = 3;

    if (currentPlatformExecutions >= maxPlatformExecutions) {
      return NextResponse.json({ 
        error: `Достигнут лимит по площадке ${order.socialNetwork} (${maxPlatformExecutions} заказов в день)` 
      }, { status: 400 });
    }

    const execution = await prisma.execution.create({
      data: {
        id: nanoid(),
        orderId,
        executorId,
        screenshotUrl: screenshotUrl || '',
        notes: notes || '',
        status: ExecutionStatus.PENDING,
        reward: order.reward
      }
    });

    // Проверяем, сколько исполнителей уже взяли задание
    const totalExecutions = await prisma.execution.count({
      where: { orderId }
    });

    // Меняем статус на IN_PROGRESS только если это первый исполнитель
    // Если quantity > 1, заказ остаётся PENDING для других исполнителей
    if (totalExecutions === 1) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.IN_PROGRESS }
      });
    }
    
    // Если все слоты заполнены (например, quantity=10, и это 10-й исполнитель)
    // НЕ переводим сразу в COMPLETED, это делается только после проверки скриншотов

    const newPlatformLimits = {
      ...platformLimits,
      [order.socialNetwork]: currentPlatformExecutions + 1
    };

    await prisma.executorDailyLimit.upsert({
      where: {
        executorId_date: {
          executorId,
          date: today
        }
      },
      update: {
        executionsCount: currentExecutions + 1,
        platformLimits: newPlatformLimits
      },
      create: {
        executorId,
        date: today,
        executionsCount: 1,
        platformLimits: newPlatformLimits
      }
    });

    return NextResponse.json({ execution, success: true });
    
  } catch (error) {
    console.error('Ошибка создания выполнения:', error);
    return NextResponse.json({ error: 'Ошибка создания выполнения' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: UserRole } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status') as ExecutionStatus | null;
    const isAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'MODERATOR_ADMIN';

    if (sessionUser.role === 'EXECUTOR') {
      const where: { executorId: string; status?: ExecutionStatus; orderId?: string } = {
        executorId: sessionUser.id
      };
      if (status) where.status = status;
      if (orderId) where.orderId = orderId;

      const executions = await prisma.execution.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              title: true,
              description: true,
              reward: true,
              status: true,
              processedImageUrl: true,
              qrCodeUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ executions, success: true });
    }

    if (sessionUser.role === 'CUSTOMER') {
      if (!orderId) {
        return NextResponse.json({ error: 'orderId обязателен' }, { status: 400 });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { customerId: true }
      });

      if (!order || order.customerId !== sessionUser.id) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
      }

      const executions = await prisma.execution.findMany({
        where: { orderId },
        include: {
          executor: {
            select: {
              name: true,
              level: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ executions, success: true });
    }

    if (isAdmin) {
      const where: { orderId?: string; status?: ExecutionStatus } = {};
      if (orderId) where.orderId = orderId;
      if (status) where.status = status;

      const executions = await prisma.execution.findMany({
        where,
        include: {
          order: {
            select: {
              title: true,
              description: true,
              reward: true,
              status: true
            }
          },
          executor: {
            select: {
              name: true,
              level: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ executions, success: true });
    }

    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    
  } catch (error) {
    console.error('Ошибка получения выполнений:', error);
    return NextResponse.json({ error: 'Ошибка получения выполнений' }, { status: 500 });
  }
}