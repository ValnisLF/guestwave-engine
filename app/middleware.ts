import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Comprobar si hay una sesión activa
  const { data: { session } } = await supabase.auth.getSession()

  const isPathAdmin = req.nextUrl.pathname.startsWith('/admin')
  const isPathLogin = req.nextUrl.pathname === '/admin/login'

  // 1. Protección de rutas de administración
  if (isPathAdmin && !session && !isPathLogin) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  // 2. Si ya está logueado e intenta ir al login, mandarlo al dashboard
  if (isPathLogin && session) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url))
  }

  return res
}

// Solo aplicar el middleware a las rutas de administración
export const config = {
  matcher: ['/admin/:path*'],
}