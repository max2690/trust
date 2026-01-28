import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Прокси-роут для отдачи файлов из public/uploads.
 * Нужен, чтобы гарантированно работать через /api, даже если nginx/статика настроены нестабильно.
 *
 * Пример:
 *   /api/uploads/LXK_1DNjljIwzR2q1L8Ab-processed.png
 *   /api/uploads/folder/subfolder/file.png
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const segments = resolvedParams.path;

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Собираем относительный путь внутри uploads
    const relativePath = segments.join('/');

    // Защита от выхода из директории uploads
    if (relativePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsDir, relativePath);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Определяем content-type по расширению
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[API /uploads] ❌ Error serving file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


