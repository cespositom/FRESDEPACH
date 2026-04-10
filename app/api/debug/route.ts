import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/server'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const authCookies = allCookies.filter(c => c.name.includes('auth') || c.name.includes('sb-'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const anonKeyPreview = anonKey ? anonKey.substring(0, 20) + '...' : 'NO DEFINIDA'

  let user = null
  let userError = null
  try {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.getUser()
    user = data.user ? { id: data.user.id, email: data.user.email } : null
    userError = error?.message ?? null
  } catch (e: unknown) {
    userError = e instanceof Error ? e.message : 'Error desconocido'
  }

  return NextResponse.json({
    supabaseUrl,
    anonKeyPreview,
    authCookiesCount: authCookies.length,
    authCookieNames: authCookies.map(c => c.name),
    user,
    userError,
  })
}
