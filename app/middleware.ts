import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Intentar usar createMiddlewareClient si está disponible; si no, usar stub seguro
  let supabase: any = {
    auth: { getSession: async () => ({ data: { session: null } }) },
  }

  try {
    // Dynamic import para evitar errores de tipos cuando la API del paquete cambia
    // y para que la build no falle si la función no existe.
    const mod: any = await import('@supabase/auth-helpers-nextjs')
    if (typeof mod.createMiddlewareClient === 'function') {
      supabase = mod.createMiddlewareClient({ req, res })
    }
  } catch (e) {
    // noop: mantener el stub
  }

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