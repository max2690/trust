import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('x-forwarded-host') 
    ? `https://${request.headers.get('x-forwarded-host')}`
    : null;

  if (!token) {
    return NextResponse.json({ 
      error: 'TELEGRAM_BOT_TOKEN not set in environment variables' 
    }, { status: 500 });
  }

  if (!baseUrl) {
    return NextResponse.json({ 
      error: 'NEXTAUTH_URL not set. Please set it in Vercel environment variables to your domain (e.g., https://your-app.vercel.app)' 
    }, { status: 500 });
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  try {
    // Устанавливаем webhook
    const setWebhookResponse = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    
    const setWebhookData = await setWebhookResponse.json();
    
    // Проверяем текущий webhook
    const getWebhookResponse = await fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );
    
    const getWebhookData = await getWebhookResponse.json();
    
    return NextResponse.json({
      success: setWebhookData.ok,
      webhookUrl,
      setWebhookResponse: setWebhookData,
      currentWebhook: getWebhookData.result,
      message: setWebhookData.ok 
        ? `✅ Webhook успешно установлен на ${webhookUrl}`
        : `❌ Ошибка установки webhook: ${setWebhookData.description || 'Unknown error'}`
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to set webhook',
      details: error instanceof Error ? error.message : String(error),
      webhookUrl
    }, { status: 500 });
  }
}
