import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'

function badge(dias: number) {
  if (dias < 0)  return 'bg-red-100 text-red-700 border border-red-200'
  if (dias <= 2) return 'bg-orange-100 text-orange-700 border border-orange-200'
  if (dias <= 4) return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
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

  const esEjecutivo = perfil?.perfil === 'ejecutivo'
  const esAdminOrSup = perfil?.perfil === 'admin' || perfil?.perfil === 'supervisor'

  let query = (supabase as any)
    .from('ordenes_con_vencimiento')
    .select('*')
    .neq('estado', 'Anulada')
    .lte('dias_restantes', 30)
    .is('fecha_despacho', null)
    .order('dias_restantes', { ascending: true })
    .limit(50)

  if (esEjecutivo) {
    query = query.eq('ejecutivo_id', perfil!.id)
  }

  const { data: ordenes } = await query

  let qVencidas    = (supabase as any).from('ordenes_con_vencimiento').select('*', { count: 'exact', head: true }).neq('estado', 'Anulada').lt('dias_restantes', 0).is('fecha_despacho', null)
  let qVencer2d    = (supabase as any).from('ordenes_con_vencimiento').select('*', { count: 'exact', head: true }).neq('estado', 'Anulada').gte('dias_restantes', 0).lte('dias_restantes', 2).is('fecha_despacho', null)
  let qSinDespacho = (supabase as any).from('ordenes').select('*', { count: 'exact', head: true }).is('fecha_despacho', null).neq('estado', 'Anulada')
  let qPorRebajar  = (supabase as any).from('ordenes').select('*', { count: 'exact', head: true }).not('fecha_despacho', 'is', null).eq('rebajado', false).neq('estado', 'Anulada')

  // Repuestos pendientes: solo de órdenes asignadas al ejecutivo si corresponde
  let qPendientes = (supabase as any)
    .from('repuestos_orden')
    .select('id, orden:ordenes!inner(ejecutivo_id, estado)', { count: 'exact', head: true })
    .eq('listo_despacho', false)
    .neq('orden.estado', 'Anulada')

  if (esEjecutivo) {
    qVencidas    = qVencidas.eq('ejecutivo_id', perfil!.id)
    qVencer2d    = qVencer2d.eq('ejecutivo_id', perfil!.id)
    qPendientes  = qPendientes.eq('orden.ejecutivo_id', perfil!.id)
    qSinDespacho = qSinDespacho.eq('ejecutivo_id', perfil!.id)
    qPorRebajar  = qPorRebajar.eq('ejecutivo_id', perfil!.id)
  }

  const [
    { count: pendientes },
    { count: vencidas },
    { count: porVencer2d },
    { count: sinDespacho },
    { count: porRebajar },
  ] = await Promise.all([qPendientes, qVencidas, qVencer2d, qSinDespacho, qPorRebajar])

  // ── Resumen por ejecutivo (solo admin/supervisor) ─────────────
  let resumenEjecutivos: {
    id: string; nombre: string
    vencidas: number; por2d: number; pendientes: number; totalMes: number
  }[] = []

  if (esAdminOrSup) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
      { data: ejecutivos },
      { data: todasOrdenes },
      { data: ordenesMes },
      { data: repsPendientes },
    ] = await Promise.all([
      (supabase as any).from('perfiles').select('id, nombre').eq('activo', true).order('nombre'),
      (supabase as any).from('ordenes_con_vencimiento').select('ejecutivo_id, dias_restantes, fecha_despacho').neq('estado', 'Anulada'),
      (supabase as any).from('ordenes').select('ejecutivo_id').neq('estado', 'Anulada').gte('created_at', startOfMonth.toISOString()),
      (supabase as any).from('repuestos_orden').select('id, orden:ordenes!inner(ejecutivo_id, estado)').eq('listo_despacho', false).neq('orden.estado', 'Anulada'),
    ])

    resumenEjecutivos = (ejecutivos ?? []).map((ej: any) => {
      const ords = (todasOrdenes ?? []).filter((o: any) => o.ejecutivo_id === ej.id)
      return {
        id:         ej.id,
        nombre:     ej.nombre,
        vencidas:   ords.filter((o: any) => o.dias_restantes < 0 && !o.fecha_despacho).length,
        por2d:      ords.filter((o: any) => o.dias_restantes >= 0 && o.dias_restantes <= 2 && !o.fecha_despacho).length,
        pendientes: (repsPendientes ?? []).filter((r: any) => r.orden?.ejecutivo_id === ej.id).length,
        totalMes:   (ordenesMes ?? []).filter((o: any) => o.ejecutivo_id === ej.id).length,
        totalOrdenes: ords.length,
      }
    }).filter((ej: any) => ej.totalOrdenes > 0 || ej.totalMes > 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de órdenes próximas a vencer</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <p className="text-sm text-orange-600">Repuestos pendientes</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{pendientes ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-600">Sin despacho OK</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{sinDespacho ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <p className="text-sm text-yellow-600">Vencen en 2 días</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{porVencer2d ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-sm text-red-600">Órdenes vencidas</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{vencidas ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-purple-200 p-4">
          <p className="text-sm text-purple-600">Por rebajar</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{porRebajar ?? 0}</p>
        </div>
      </div>

      {/* Resumen por ejecutivo — solo admin/supervisor */}
      {esAdminOrSup && resumenEjecutivos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Resumen por usuario</h2>
            <p className="text-xs text-gray-400 mt-0.5">Mes actual · órdenes y repuestos por usuario</p>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {resumenEjecutivos.map(ej => (
              <div key={ej.id} className="px-4 py-3 space-y-2">
                <p className="font-medium text-gray-900 text-sm">{ej.nombre}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-500">Vencen en 2d</span>
                  <span className={`font-semibold ${ej.por2d > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{ej.por2d}</span>
                  <span className="text-gray-500">Vencidas</span>
                  <span className={`font-semibold ${ej.vencidas > 0 ? 'text-red-600' : 'text-gray-400'}`}>{ej.vencidas}</span>
                  <span className="text-gray-500">Rep. pendientes</span>
                  <span className={`font-semibold ${ej.pendientes > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{ej.pendientes}</span>
                  <span className="text-gray-500">Órdenes del mes</span>
                  <span className="font-semibold text-gray-700">{ej.totalMes}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario</th>
                  <th className="px-4 py-3 text-center font-medium text-orange-500">Vencen en 2d</th>
                  <th className="px-4 py-3 text-center font-medium text-red-500">Vencidas</th>
                  <th className="px-4 py-3 text-center font-medium text-yellow-600">Rep. pendientes</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Órdenes del mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resumenEjecutivos.map(ej => (
                  <tr key={ej.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{ej.nombre}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${ej.por2d > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{ej.por2d}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${ej.vencidas > 0 ? 'text-red-600' : 'text-gray-300'}`}>{ej.vencidas}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${ej.pendientes > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>{ej.pendientes}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-gray-700">{ej.totalMes}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                {Number(o.repuestos_listos) >= Number(o.total_repuestos) && Number(o.total_repuestos) > 0
                  ? <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Pendiente despacho</span>
                  : <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Repuestos pendientes</span>
                }
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
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
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
                    {Number(o.repuestos_listos) >= Number(o.total_repuestos) && Number(o.total_repuestos) > 0
                      ? <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Pendiente despacho</span>
                      : <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Repuestos pendientes</span>
                    }
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
