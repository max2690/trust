import { NextResponse } from 'next/server';
// next-auth v5 typings may not expose getToken as named export in our setup
 
import * as NextAuthJwt from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const ROLE_PATHS = [
  { prefix: '/executor', roles: ['EXECUTOR'] },
  { prefix: '/business', roles: ['CUSTOMER'] },
  { prefix: '/dashboard/customer', roles: ['CUSTOMER'] },
  { prefix: '/dashboard/executor', roles: ['EXECUTOR'] },
  { prefix: '/admin', roles: ['MODERATOR_ADMIN', 'SUPER_ADMIN'] },
];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Публичные маршруты не требуют токена — пропускаем раньше, чем getToken
  if (pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const token = await (NextAuthJwt as unknown as { getToken: (args: { req: NextRequest }) => Promise<Record<string, unknown> | null> }).getToken({ req });
  const isAuthed = !!token?.sub;

  if (pathname.startsWith('/take/')) {
    if (!isAuthed) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.search = `?role=executor&redirect=${encodeURIComponent(pathname + (search || ''))}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const rule = ROLE_PATHS.find(r => pathname.startsWith(r.prefix));
  if (rule) {
    if (!isAuthed) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      const expected = rule.prefix === '/executor' ? 'executor' : rule.prefix === '/business' ? 'business' : 'admin';
      url.search = `?role=${expected}`;
      return NextResponse.redirect(url);
    }
    const role = token.role as string | undefined;
    if (!role || !rule.roles.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.search = `?role=${rule.prefix.slice(1)}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};


