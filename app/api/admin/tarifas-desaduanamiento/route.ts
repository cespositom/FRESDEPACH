import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const transportista = String(body.transportista || '').toUpperCase()
  const valor_hasta_usd = Number(body.valor_hasta_usd)
  const honorario_usd = Number(body.honorario_usd)

  if (!['FEDEX', 'DHL'].includes(transportista)) {
    return NextResponse.json({ error: 'Transportista inválido' }, { status: 400 })
  }
  if (!Number.isFinite(valor_hasta_usd) || valor_hasta_usd <= 0) {
    return NextResponse.json({ error: 'Valor hasta USD inválido' }, { status: 400 })
  }
  if (!Number.isFinite(honorario_usd) || honorario_usd < 0) {
    return NextResponse.json({ error: 'Honorario USD inválido' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data, error } = await db
    .from('tarifas_desaduanamiento')
    .insert({ transportista, valor_hasta_usd, honorario_usd, activo: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tarifa: data }, { status: 201 })
}
