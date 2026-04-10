import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/server'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const authCookies = allCookies.filter(c => c.name.includes('auth') || c.name.includes('sb-'))

  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  let user = null, userError = null
  try {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.getUser()
    user      = data.user ? { id: data.user.id, email: data.user.email } : null
    userError = error?.message ?? null
  } catch (e: unknown) {
    userError = e instanceof Error ? e.message : 'Error desconocido'
  }

  return NextResponse.json({
    supabaseUrl:        process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKeyPreview:     anonKey  ? anonKey.substring(0, 25)  + '...' : 'NO DEFINIDA',
    serviceKeyPreview:  serviceKey ? serviceKey.substring(0, 25) + '...' : 'NO DEFINIDA',
    serviceKeyLength:   serviceKey.length,
    authCookiesCount:   authCookies.length,
    authCookieNames:    authCookies.map(c => c.name),
    user,
    userError,
  })
}
