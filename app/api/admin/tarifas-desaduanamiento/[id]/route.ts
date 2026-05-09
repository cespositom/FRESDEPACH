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
  const update: Record<string, unknown> = {}

  if (body.valor_hasta_usd !== undefined) {
    const v = Number(body.valor_hasta_usd)
    if (!Number.isFinite(v) || v <= 0) return NextResponse.json({ error: 'valor_hasta_usd inválido' }, { status: 400 })
    update.valor_hasta_usd = v
  }
  if (body.honorario_usd !== undefined) {
    const v = Number(body.honorario_usd)
    if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: 'honorario_usd inválido' }, { status: 400 })
    update.honorario_usd = v
  }
  if (body.activo !== undefined) update.activo = !!body.activo

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { error } = await db.from('tarifas_desaduanamiento').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { error } = await db.from('tarifas_desaduanamiento').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
