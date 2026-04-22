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

  const { data: proveedoresDB } = await (supabase as any)
    .from('proveedores')
    .select('nombre')
    .eq('activo', true)
    .order('nombre')
  const proveedores: string[] = (proveedoresDB ?? []).map((p: any) => p.nombre)

  // Ejecutivos disponibles (para asignar) - todos los usuarios activos
  const { data: ejecutivos } = await supabase
    .from('perfiles')
    .select('id, nombre, email')
    .eq('activo', true)
    .order('nombre')

  // Auditoría: cambios en repuestos + cambios en la orden misma
  const repuestoIds = (repuestos ?? []).map((r: any) => String(r.id))

  const { data: auditoriaRepuestos } = await (supabase as any)
    .from('auditoria')
    .select('*')
    .eq('tabla', 'repuestos_orden')
    .in('registro_id', repuestoIds.length > 0 ? repuestoIds : ['0'])
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: auditoriaOrdenDirecta } = await (supabase as any)
    .from('auditoria')
    .select('*')
    .eq('tabla', 'ordenes')
    .eq('registro_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  const auditoriaOrden = [
    ...(auditoriaOrdenDirecta ?? []),
    ...(auditoriaRepuestos ?? []),
  ].sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <OrdenDetalle
      orden={orden}
      repuestos={repuestos ?? []}
      ejecutivos={ejecutivos ?? []}
      auditoria={auditoriaOrden}
      perfil={perfil!}
      proveedores={proveedores}
    />
  )
}
