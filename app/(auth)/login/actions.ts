'use server'
import { createServerSupabase } from '@/lib/server'

export async function loginAction(formData: FormData) {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }
  return { success: true }
}
