import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'

export default async function PorRebajarPage() {
  const perfil   = await getPerfil()
  const supabase = await createServerSupabase()
  const esEjec   = perfil?.perfil === 'ejecutivo'

  let query = (supabase as any)
    .from('ordenes_con_vencimiento')
    .select('*')
    .not('fecha_despacho', 'is', null)
    .eq('rebajado', false)
    .neq('estado', 'Anulada')
    .order('fecha_despacho', { ascending: false })

  if (esEjec) {
    query = query.eq('ejecutivo_id', perfil!.id)
  }

  const { data: ordenes } = await query

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Por rebajar</h1>
        <p className="text-gray-500 text-sm mt-1">
          {(ordenes ?? []).length} órdenes despachadas pendientes de rebaje
        </p>
      </div>

      <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">

        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {(ordenes ?? []).map((o: any) => (
            <div key={o.id} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{o.numero_orden}</span>
                <span className="text-xs text-green-600 font-semibold">
                  {o.fecha_despacho ? new Date(o.fecha_despacho + 'T12:00:00').toLocaleDateString('es-CL') : '—'}
                </span>
              </div>
              <p className="text-xs text-gray-500">{o.patente} · {o.marca} {o.modelo}</p>
              <p className="text-xs text-gray-400">{o.aseguradora_nombre}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">{o.ejecutivo_nombre ?? '—'}</span>
                <Link href={`/ordenes/${o.id}`} className="text-blue-600 text-xs font-medium">Ver →</Link>
              </div>
            </div>
          ))}
          {(!ordenes || ordenes.length === 0) && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">No hay órdenes por rebajar</p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-purple-50 border-b border-purple-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha despacho</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">N° Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Vehículo</th>
                {!esEjec && <th className="px-4 py-3 text-left font-medium text-gray-500">Ejecutivo</th>}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(ordenes ?? []).map((o: any) => (
                <tr key={o.id} className="hover:bg-purple-50 transition">
                  <td className="px-4 py-3 text-green-600 font-semibold whitespace-nowrap">
                    {o.fecha_despacho ? new Date(o.fecha_despacho + 'T12:00:00').toLocaleDateString('es-CL') : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium">{o.numero_orden}</td>
                  <td className="px-4 py-3">
                    <div>{o.patente}</div>
                    <div className="text-xs text-gray-400">{o.marca} {o.modelo}</div>
                  </td>
                  {!esEjec && <td className="px-4 py-3 text-gray-600">{o.ejecutivo_nombre ?? <span className="text-gray-300">—</span>}</td>}
                  <td className="px-4 py-3">
                    <Link href={`/ordenes/${o.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
              {(!ordenes || ordenes.length === 0) && (
                <tr>
                  <td colSpan={esEjec ? 4 : 5} className="px-4 py-10 text-center text-gray-400">
                    No hay órdenes por rebajar
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
