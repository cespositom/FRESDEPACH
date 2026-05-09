import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const tipo_cambio_clp = Number(body.tipo_cambio_clp)
  const recargo_pct = body.recargo_pct !== undefined ? Number(body.recargo_pct) : undefined

  if (!Number.isFinite(tipo_cambio_clp) || tipo_cambio_clp <= 0) {
    return NextResponse.json({ error: 'Tipo de cambio inválido' }, { status: 400 })
  }
  if (recargo_pct !== undefined && (!Number.isFinite(recargo_pct) || recargo_pct < 0)) {
    return NextResponse.json({ error: 'Recargo % inválido' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const update: Record<string, unknown> = {
    tipo_cambio_clp,
    updated_at: new Date().toISOString(),
    updated_by: perfil.id,
  }
  if (recargo_pct !== undefined) update.recargo_pct = recargo_pct

  const { data, error } = await db
    .from('config_importacion')
    .update(update)
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ config: data })
}
