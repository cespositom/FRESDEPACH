'use server'
import { headers } from 'next/headers'
import { createServerSupabase } from '@/lib/server'

export async function forgotPasswordAction(formData: FormData) {
  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!email) return { error: 'Ingresa tu email' }

  const h = await headers()
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  if (error) return { error: error.message }
  return { success: true }
}
