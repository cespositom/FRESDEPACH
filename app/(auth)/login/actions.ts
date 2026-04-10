'use server'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/server'

export async function loginAction(formData: FormData) {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const params = new URLSearchParams({ error: error.message })
    redirect(`/login?${params}`)
  }

  redirect('/dashboard')
}
