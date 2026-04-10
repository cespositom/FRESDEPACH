import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente para el browser (autenticado con el usuario)
export const createBrowserSupabase = () =>
  createBrowserClient(SUPA_URL, SUPA_ANON)

// Cliente admin con service_role (solo en server) - lazy para evitar error en build
let _admin: ReturnType<typeof createClient> | null = null
export function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _admin
}
