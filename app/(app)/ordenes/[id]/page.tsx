import { getPerfil, createServerSupabase } from '@/lib/server'
import { notFound } from 'next/navigation'
import OrdenDetalle from './OrdenDetalle'

export default async function OrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await getPerfil()
  const supabase = await createServerSupabase()

  const { data: orden } = await supabase
    .from('ordenes_con_vencimiento')
    .select('*')
    .eq('id', id)
    .single()

  if (!orden) notFound()

  // Repuestos
  const { data: repuestos } = await supabase
    .from('repuestos_orden')
    .select('*')
    .eq('orden_id', id)
    .order('id')

  // Ejecutivos disponibles (para asignar)
  const { data: ejecutivos } = await supabase
    .from('perfiles')
    .select('id, nombre, email')
    .in('perfil', ['ejecutivo', 'supervisor'])
    .eq('activo', true)
    .order('nombre')

  // Auditoría de esta orden
  const { data: auditoria } = await supabase
    .from('auditoria')
    .select('*')
    .eq('tabla', 'repuestos_orden')
    .order('created_at', { ascending: false })
    .limit(50)

  // Filtrar auditoría solo de repuestos de esta orden
  const repuestoIds = (repuestos ?? []).map((r: any) => r.id)
  const auditoriaOrden = (auditoria ?? []).filter((a: any) =>
    repuestoIds.includes(a.registro_id) || a.registro_id === parseInt(id)
  )

  return (
    <OrdenDetalle
      orden={orden}
      repuestos={repuestos ?? []}
      ejecutivos={ejecutivos ?? []}
      auditoria={auditoriaOrden}
      perfil={perfil!}
    />
  )
}
