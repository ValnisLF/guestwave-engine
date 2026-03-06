import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const isPathAdmin = req.nextUrl.pathname.startsWith('/admin')
  const isPathLogin = req.nextUrl.pathname === '/admin/login'
  const isPathSetup = req.nextUrl.pathname === '/admin/setup'
  const isPathInvite = req.nextUrl.pathname.startsWith('/admin/invite/')
  const hasLocalSession = Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value)

  if (isPathAdmin && !hasLocalSession && !isPathLogin && !isPathSetup && !isPathInvite) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  if ((isPathLogin || isPathSetup) && hasLocalSession) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  return res
}

// Solo aplicar el middleware a las rutas de administración
export const config = {
  matcher: ['/admin/:path*'],
}