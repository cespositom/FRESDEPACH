import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error(`Faltan variables: URL=${!!url} KEY=${!!key}`)
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(req: NextRequest) {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { nombre, email, password, perfil: rol } = await req.json()
  if (!nombre || !email || !password || !rol) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  let admin: ReturnType<typeof createClient>
  try {
    admin = makeAdmin()
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de configuración' }, { status: 500 })
  }

  const { data: authData, error: authError } = await (admin as any).auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: `Auth: ${authError.message}` }, { status: 400 })
  }

  const { data: perfilData, error: perfilError } = await (admin as any)
    .from('perfiles')
    .insert({ id: authData.user.id, nombre, email, perfil: rol, activo: true })
    .select()
    .single()

  if (perfilError) {
    await (admin as any).auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: `Perfil: ${perfilError.message}` }, { status: 400 })
  }

  return NextResponse.json({ perfil: perfilData }, { status: 201 })
}
