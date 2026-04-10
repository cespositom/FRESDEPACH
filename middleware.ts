import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':      ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods':     'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function middleware(request: NextRequest) {
  // Preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders() })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Rutas API: agregar CORS headers, sin redirect
  if (path.startsWith('/api')) {
    Object.entries(corsHeaders()).forEach(([k, v]) => supabaseResponse.headers.set(k, v))
    return supabaseResponse
  }

  if (!user && !path.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
