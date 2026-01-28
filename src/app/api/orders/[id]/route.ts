import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/orders/[id] - Удалить заказ
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  console.log('[API DELETE /orders/:id] Удаление заказа:', resolvedParams.id);
  
  try {
    const { id } = resolvedParams;
    
    if (!id) {
      console.error('[API DELETE /orders/:id] Отсутствует ID заказа');
      return NextResponse.json({ error: 'ID заказа обязателен' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: string } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    // Проверяем существование заказа
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        executions: true,
      },
    });

    if (!order) {
      console.error('[API DELETE /orders/:id] Заказ не найден:', id);
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // Проверяем, имеет ли пользователь право удалять этот заказ
    const isOwner = order.customerId === sessionUser.id;
    const isAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'MODERATOR_ADMIN';

    if (!isOwner && !isAdmin) {
      console.warn('[API DELETE /orders/:id] Пользователь не является владельцем заказа и не админ');
      return NextResponse.json({ error: 'Недостаточно прав для удаления этого заказа' }, { status: 403 });
    }

    console.log('[API DELETE /orders/:id] Заказ найден:', {
      id: order.id,
      title: order.title,
      status: order.status,
      executionsCount: order.executions.length,
    });

    // Проверяем можно ли удалить заказ
    if (order.status === 'IN_PROGRESS' && order.executions.length > 0) {
      console.warn('[API DELETE /orders/:id] Заказ в работе, есть исполнители');
      return NextResponse.json(
        { error: 'Нельзя удалить заказ, который находится в работе' },
        { status: 400 }
      );
    }

    if (order.status === 'COMPLETED') {
      console.warn('[API DELETE /orders/:id] Заказ уже завершен');
      return NextResponse.json(
        { error: 'Нельзя удалить завершенный заказ' },
        { status: 400 }
      );
    }

    // Удаляем связанные executions (если они есть и заказ еще не начат)
    if (order.executions.length > 0) {
      console.log('[API DELETE /orders/:id] Удаление связанных executions:', order.executions.length);
      await prisma.execution.deleteMany({
        where: { orderId: id },
      });
    }

    // Удаляем заказ
    console.log('[API DELETE /orders/:id] Удаление заказа');
    await prisma.order.delete({
      where: { id },
    });

    console.log('[API DELETE /orders/:id] ✅ Заказ успешно удален:', id);

    return NextResponse.json({
      success: true,
      message: 'Заказ успешно удален',
    });
  } catch (error) {
    console.error('[API DELETE /orders/:id] ❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    console.error('[API DELETE /orders/:id] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      {
        error: 'Ошибка удаления заказа',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

