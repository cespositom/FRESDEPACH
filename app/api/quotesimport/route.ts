import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const IVA_PCT = 19
const MARGENES_VENTA = [30, 40, 50] as const

export async function POST(req: NextRequest) {
  const perfil = await getPerfil()
  if (!perfil) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const codigo_producto = String(body.codigo_producto || '').trim()
  const valor_usd = Number(body.valor_usd)
  const transportista = String(body.transportista || '').toUpperCase()

  if (!codigo_producto) return NextResponse.json({ error: 'Código del producto requerido' }, { status: 400 })
  if (!Number.isFinite(valor_usd) || valor_usd <= 0) return NextResponse.json({ error: 'Monto USD inválido' }, { status: 400 })
  if (!['FEDEX', 'DHL'].includes(transportista)) return NextResponse.json({ error: 'Transportista inválido' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any

  const { data: config, error: cfgErr } = await db
    .from('config_importacion')
    .select('tipo_cambio_clp, recargo_pct')
    .eq('id', 1)
    .single()
  if (cfgErr || !config) return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 500 })

  const { data: tarifa, error: tarErr } = await db
    .from('tarifas_desaduanamiento')
    .select('honorario_usd, valor_hasta_usd')
    .eq('transportista', transportista)
    .eq('activo', true)
    .gte('valor_hasta_usd', valor_usd)
    .order('valor_hasta_usd', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (tarErr) return NextResponse.json({ error: tarErr.message }, { status: 500 })
  if (!tarifa) return NextResponse.json({ error: `Sin tramo definido en ${transportista} para USD ${valor_usd}. Pide al admin agregar el tramo.` }, { status: 400 })

  const recargo_pct = Number(config.recargo_pct)
  const tipo_cambio_clp = Number(config.tipo_cambio_clp)
  const honorario_usd = Number(tarifa.honorario_usd)

  const monto_recargo_usd = valor_usd * recargo_pct / 100
  const monto_iva_usd     = honorario_usd * IVA_PCT / 100   // IVA solo sobre honorario
  const honorario_con_iva = honorario_usd + monto_iva_usd
  const total_usd         = valor_usd + monto_recargo_usd + honorario_con_iva
  const total_clp         = Math.round(total_usd * tipo_cambio_clp)

  const precios_venta = MARGENES_VENTA.map(margen => {
    const neto    = Math.round(total_clp * (1 + margen / 100))
    const con_iva = Math.round(neto * (1 + IVA_PCT / 100))
    return { margen_pct: margen, neto_clp: neto, con_iva_clp: con_iva }
  })

  const { data: registro, error: insErr } = await db
    .from('cotizaciones_importacion')
    .insert({
      usuario_id: perfil.id,
      codigo_producto,
      valor_usd,
      transportista,
      recargo_pct,
      honorario_usd,
      tipo_cambio_clp,
      total_usd: Number(total_usd.toFixed(2)),
      total_clp,
    })
    .select()
    .single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })

  return NextResponse.json({
    registro,
    desglose: {
      valor_usd,
      recargo_pct,
      monto_recargo_usd: Number(monto_recargo_usd.toFixed(2)),
      honorario_usd,
      iva_pct: IVA_PCT,
      monto_iva_usd: Number(monto_iva_usd.toFixed(2)),
      honorario_con_iva_usd: Number(honorario_con_iva.toFixed(2)),
      total_usd: Number(total_usd.toFixed(2)),
      tipo_cambio_clp,
      total_clp,
      precios_venta,
    },
  })
}
