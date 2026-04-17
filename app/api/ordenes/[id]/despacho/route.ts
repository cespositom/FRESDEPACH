import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await getPerfil()
  if (!perfil || !['admin', 'supervisor', 'logistica'].includes(perfil.perfil)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const admin: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verificar que todos los repuestos estén despachados
  const { data: repuestos } = await admin
    .from('repuestos_orden')
    .select('id, despachado_ok')
    .eq('orden_id', id)

  const todos = (repuestos ?? []).every((r: any) => r.despachado_ok)
  if (!todos) {
    return NextResponse.json({ error: 'No todos los repuestos están despachados' }, { status: 400 })
  }

  const hoy = new Date().toISOString().split('T')[0]

  const { error } = await admin
    .from('ordenes')
    .update({ fecha_despacho: hoy, estado: 'En Despacho' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Auditoría
  await admin.from('auditoria').insert({
    tabla: 'ordenes',
    registro_id: id,
    campo: 'fecha_despacho',
    valor_anterior: null,
    valor_nuevo: hoy,
    usuario_nombre: perfil.nombre,
  })

  return NextResponse.json({ ok: true, fecha_despacho: hoy })
}
