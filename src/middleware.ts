import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/admin')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    const role = (token as { role?: string } | null)?.role
    const isAdmin = role === 'SUPER_ADMIN' || role === 'MODERATOR_ADMIN'

    if (!token || !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав' },
        { status: token ? 403 : 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/admin/:path*'],
}


