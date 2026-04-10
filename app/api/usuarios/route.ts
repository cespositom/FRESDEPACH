import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { nombre, email, password, perfil: rol } = await req.json()

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { data: perfilData, error: perfilError } = await admin
    .from('perfiles')
    .insert({ id: authData.user.id, nombre, email, perfil: rol, activo: true })
    .select()
    .single()

  if (perfilError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: perfilError.message }, { status: 400 })
  }

  return NextResponse.json({ perfil: perfilData }, { status: 201 })
}
