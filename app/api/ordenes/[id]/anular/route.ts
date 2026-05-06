import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await getPerfil()
  if (!perfil || !['admin', 'supervisor'].includes(perfil.perfil)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const admin: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: ordenInfo, error: ordenErr } = await admin
    .from('ordenes')
    .select('id, numero_orden')
    .eq('id', id)
    .single()
  if (ordenErr || !ordenInfo) {
    return NextResponse.json({ error: ordenErr?.message ?? 'Orden no encontrada' }, { status: 404 })
  }

  const { error } = await admin.from('ordenes').update({ estado: 'Anulada' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('auditoria').insert({
    tabla: 'ordenes',
    registro_id: id,
    campo: 'estado',
    valor_anterior: null,
    valor_nuevo: 'Anulada',
    usuario_nombre: perfil.nombre,
  })

  // Notificar a admins activos (excluyendo al actor si es admin)
  const { data: admins } = await admin
    .from('perfiles')
    .select('id')
    .eq('perfil', 'admin')
    .eq('activo', true)

  const destinatarios = (admins ?? [])
    .map((u: any) => u.id)
    .filter((uid: string) => uid !== perfil.id)

  if (destinatarios.length > 0) {
    await admin.from('notificaciones').insert(
      destinatarios.map((uid: string) => ({
        usuario_id:   uid,
        tipo:         'orden_anulada',
        mensaje:      `${perfil.nombre} anuló la orden ${ordenInfo.numero_orden}`,
        orden_id:     ordenInfo.id,
        orden_numero: ordenInfo.numero_orden,
      }))
    )
  }

  return NextResponse.json({ ok: true })
}
