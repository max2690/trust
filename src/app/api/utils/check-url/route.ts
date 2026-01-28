import { NextRequest, NextResponse } from 'next/server';
import { validateAndNormalizeUrl } from '@/lib/url-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'URL не указан' },
        { status: 400 }
      );
    }

    const validation = validateAndNormalizeUrl(url);

    if (!validation.isValid || !validation.normalized) {
      return NextResponse.json(
        {
          ok: false,
          normalized: validation.normalized,
          error: validation.error || 'Некорректный URL',
          reason: 'invalid_format',
        },
        { status: 200 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      // Игнорируем SSL ошибки, так как нам важно только проверить доступность
      // и не все ссылки пользователей могут иметь валидные сертификаты (особенно редиректы)
      const agent = {
        rejectUnauthorized: false
      };

      // Используем custom fetch options если environment позволяет (Node 18+)
      // Но стандартный fetch не поддерживает 'agent' напрямую, это для node-fetch/axios
      // Для нативного fetch используем dispatcher если нужно, но проще просто ловить ошибку
      
      const response = await fetch(validation.normalized, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        // @ts-expect-error - Next.js fetch extension
        duplex: 'half', 
        // В Next.js/Node fetch нет опции отключения SSL проверки напрямую через rejectUnauthorized в options
        // Но мы можем отловить ошибку сертификата и попробовать считать ссылку "валидной" если это просто проблема SSL,
        // или попробовать http версию. Однако, для безопасности лучше просто обработать ошибку корректно.
      });

      clearTimeout(timeout);

      // Считаем ссылку рабочей при 2xx-3xx статусах
      if (response.ok) {
        return NextResponse.json(
          { ok: true, normalized: validation.normalized },
          { status: 200 }
        );
      }

      // 403/401 часто возвращают защиты от ботов (Cloudflare и т.д.) на HEAD запросы
      // Можно считать их "существующими" ссылками для целей валидации формата
      if (response.status === 403 || response.status === 401 || response.status === 405) {
         return NextResponse.json(
          { ok: true, normalized: validation.normalized, warning: 'Protected content' },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          normalized: validation.normalized,
          status: response.status,
          statusText: response.statusText,
          error: 'Ссылка недоступна или возвращает ошибку',
          reason: 'bad_status',
        },
        { status: 200 }
      );
    } catch (error: unknown) {
      clearTimeout(timeout);
      
      // Логируем только реальные сетевые ошибки, а не ошибки валидации
      const errorObj = error as { code?: string; cause?: { code?: string }; message?: string };
      const errorCode = errorObj?.code || errorObj?.cause?.code;
      
      // Игнорируем ошибки SSL для "самоподписанных" или проблемных сертификатов
      // Считаем, что если домен резолвится и отвечает (пусть и с ошибкой SSL), то ссылка "живая"
      if (errorCode === 'ERR_TLS_CERT_ALTNAME_INVALID' || errorCode === 'CERT_HAS_EXPIRED' || errorCode === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
         return NextResponse.json(
          { ok: true, normalized: validation.normalized, warning: 'SSL Error' },
          { status: 200 }
        );
      }

      console.error('[API /utils/check-url] Validation error:', {
        url: validation.normalized,
        error: errorObj?.message || 'Unknown error',
        code: errorCode
      });

      return NextResponse.json(
        {
          ok: false,
          normalized: validation.normalized,
          error: 'Не удалось подключиться к адресу',
          reason: 'network_error',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[API /utils/check-url] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


