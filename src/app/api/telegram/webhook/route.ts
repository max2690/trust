import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { handleTelegramUpdate } from '@/lib/telegram-webhook-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Создаем экземпляр бота для отправки сообщений (без polling)
let botInstance: InstanceType<typeof TelegramBot> | null = null;

function getBot(): InstanceType<typeof TelegramBot> {
  if (!botInstance) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }
    // Создаем бота БЕЗ polling для webhook режима
    botInstance = new TelegramBot(token, { webHook: false });
  }
  return botInstance;
}

export async function POST(request: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error('⚠️ TELEGRAM_BOT_TOKEN не найден');
      return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });
    }

    const update = await request.json();
    
    // Получаем экземпляр бота
    const bot = getBot();
    
    // Обрабатываем обновление через общий обработчик
    await handleTelegramUpdate(update, bot);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ 
      error: 'Internal error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// GET для проверки webhook (Telegram может проверять endpoint)
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
