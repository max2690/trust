import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // КРИТИЧНО: Берём executorId из сессии, а не из formData
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: string } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'EXECUTOR') {
      return NextResponse.json({ error: 'Только исполнители могут загружать скриншоты' }, { status: 403 });
    }

    const executorId = sessionUser.id; // Безопасно: из сессии, не из formData

    const formData = await request.formData();
    // Поддерживаем оба названия для совместимости
    const screenshotFile = (formData.get('file') || formData.get('screenshot')) as File;
    const orderId = formData.get('orderId') as string;
    
    if (!screenshotFile || !orderId) {
      return NextResponse.json({ error: 'Файл или ID заказа не найдены' }, { status: 400 });
    }

    // Проверка типа файла
    if (!screenshotFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Файл должен быть изображением' }, { status: 400 });
    }

    // Проверка размера (макс 10MB)
    if (screenshotFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Размер файла не должен превышать 10MB' }, { status: 400 });
    }

    // Проверяем, что выполнение существует И принадлежит текущему исполнителю
    const execution = await prisma.execution.findFirst({
      where: {
        orderId,
        executorId // Теперь безопасно: executorId из сессии
      }
    });

    if (!execution) {
      return NextResponse.json({ error: 'Выполнение не найдено или у вас нет прав на загрузку' }, { status: 404 });
    }

    // Создаем папку для скриншотов если её нет
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'screenshots');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Генерируем уникальное имя файла
    const fileExtension = screenshotFile.name.split('.').pop() || 'png';
    const fileName = `${execution.id}-${nanoid()}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Сохраняем файл
    const buffer = Buffer.from(await screenshotFile.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const screenshotUrl = `/uploads/screenshots/${fileName}`;

    // Обновляем выполнение с URL скриншота
    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        screenshotUrl,
        status: 'UPLOADED'
      }
    });

    // Автоматическая AI проверка скриншота
    try {
      const verifyResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/verify-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshotId: execution.id,
          orderId: orderId
        })
      });
      
      const verifyResult = await verifyResponse.json();
      
      if (verifyResult.success) {
        console.log(`✅ AI проверка завершена для выполнения ${execution.id}:`, verifyResult.verification.approved ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО');
      }
    } catch (error) {
      console.error('⚠️ Ошибка автоматической AI проверки:', error);
      // Не падаем, если AI проверка не удалась - модератор проверит вручную
    }

    return NextResponse.json({
      screenshotUrl,
      executionId: execution.id,
      success: true,
      message: 'Скриншот загружен. Идет автоматическая проверка...'
    });
    
  } catch (error) {
    console.error('Ошибка загрузки скриншота:', error);
    return NextResponse.json({ error: 'Ошибка загрузки скриншота' }, { status: 500 });
  }
}
