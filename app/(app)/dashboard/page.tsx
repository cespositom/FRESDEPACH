import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'

function badge(dias: number) {
  if (dias < 0)  return 'bg-red-100 text-red-700 border border-red-200'
  if (dias <= 2) return 'bg-orange-100 text-orange-700 border border-orange-200'
  if (dias <= 5) return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  return 'bg-green-100 text-green-700 border border-green-200'
}

function label(dias: number) {
  if (dias < 0)  return `Vencida (${Math.abs(dias)}d)`
  if (dias === 0) return 'Vence hoy'
  return `${dias}d`
}

export default async function DashboardPage() {
  const perfil = await getPerfil()
  const supabase = await createServerSupabase()

  let query = (supabase as any)
    .from('ordenes_con_vencimiento')
    .select('*')
    .lte('dias_restantes', 30)
    .order('dias_restantes', { ascending: true })
    .limit(20)

  if (perfil?.perfil === 'ejecutivo') {
    query = query.eq('ejecutivo_id', perfil.id)
  }

  const { data: ordenes } = await query

  const esEjecutivo = perfil?.perfil === 'ejecutivo'

  let qVencidas  = (supabase as any).from('ordenes_con_vencimiento').select('*', { count: 'exact', head: true }).lt('dias_restantes', 0).is('fecha_despacho', null)
  let qVencer2d  = (supabase as any).from('ordenes_con_vencimiento').select('*', { count: 'exact', head: true }).gte('dias_restantes', 0).lte('dias_restantes', 2)

  // Repuestos pendientes: solo de órdenes asignadas al ejecutivo si corresponde
  let qPendientes = (supabase as any)
    .from('repuestos_orden')
    .select('id, orden:ordenes!inner(ejecutivo_id)', { count: 'exact', head: true })
    .eq('listo_despacho', false)

  if (esEjecutivo) {
    qVencidas   = qVencidas.eq('ejecutivo_id', perfil!.id)
    qVencer2d   = qVencer2d.eq('ejecutivo_id', perfil!.id)
    qPendientes = qPendientes.eq('orden.ejecutivo_id', perfil!.id)
  }

  const { count: pendientes }  = await qPendientes
  const { count: vencidas }    = await qVencidas
  const { count: porVencer2d } = await qVencer2d

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de órdenes próximas a vencer</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <p className="text-sm text-orange-600">Repuestos pendientes</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{pendientes ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <p className="text-sm text-yellow-600">Vencen en 2 días</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{porVencer2d ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-sm text-red-600">Órdenes vencidas</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{vencidas ?? 0}</p>
        </div>
      </div>

      {/* Tabla próximas a vencer */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Órdenes próximas a vencer</h2>
          <p className="text-xs text-gray-400 mt-0.5">Próximos 30 días</p>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {(ordenes ?? []).map((o: any) => (
            <div key={o.id} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{o.numero_orden}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge(o.dias_restantes ?? 999)}`}>
                  {label(o.dias_restantes ?? 999)}
                </span>
              </div>
              <div className="text-xs text-gray-500">{o.patente} · {o.marca} {o.modelo}</div>
              <div className="text-xs text-gray-400">{o.taller_nombre}</div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-500">{o.repuestos_listos}/{o.total_repuestos} listos</span>
                <Link href={`/ordenes/${o.id}`} className="text-blue-600 text-xs font-medium">Ver →</Link>
              </div>
            </div>
          ))}
          {(!ordenes || ordenes.length === 0) && (
            <p className="px-4 py-8 text-center text-gray-400 text-sm">No hay órdenes próximas a vencer</p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Vehículo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ejecutivo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Repuestos</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Días</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(ordenes ?? []).map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.numero_orden}</div>
                    <div className="text-xs text-gray-400">{o.aseguradora_nombre}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{o.patente}</div>
                    <div className="text-xs text-gray-400">{o.marca} {o.modelo}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{o.ejecutivo_nombre ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{o.repuestos_listos}/{o.total_repuestos} listos</span>
                    <div className="mt-1 w-24 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${o.total_repuestos > 0 ? (o.repuestos_listos / o.total_repuestos * 100) : 0}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge(o.dias_restantes ?? 999)}`}>
                      {label(o.dias_restantes ?? 999)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/ordenes/${o.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
              {(!ordenes || ordenes.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No hay órdenes próximas a vencer
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
