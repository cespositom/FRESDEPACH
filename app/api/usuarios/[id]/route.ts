import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const { error } = await getSupabaseAdmin()
    .from('perfiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ activo: body.activo } as any)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
