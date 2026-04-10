import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { nombre, email, password, perfil: rol } = await req.json()

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Crear usuario en auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insertar perfil
  const { data: perfilData, error: perfilError } = await supabaseAdmin
    .from('perfiles')
    .insert({ id: authData.user.id, nombre, email, perfil: rol, activo: true })
    .select()
    .single()

  if (perfilError) {
    // Rollback: borrar usuario auth
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: perfilError.message }, { status: 400 })
  }

  return NextResponse.json({ perfil: perfilData }, { status: 201 })
}
