import { createServerSupabase } from '@/lib/server'
import Link from 'next/link'

export default async function DespachosListosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params  = await searchParams
  const supabase = await createServerSupabase()

  let query = (supabase as any)
    .from('ordenes_con_vencimiento')
    .select('*')
    .gt('total_repuestos', 0)
    .order('fecha_despacho', { ascending: false })
    .limit(200)

  if (params.q) {
    query = query.or(
      `numero_orden.ilike.%${params.q}%,numero_siniestro.ilike.%${params.q}%,patente.ilike.%${params.q}%`
    )
  }

  const { data: todas } = await query

  // Despachados: todos los repuestos con despachado_ok O con fecha_despacho registrada
  const ordenes = (todas ?? []).filter((o: any) =>
    Number(o.repuestos_despachados) >= Number(o.total_repuestos) ||
    o.fecha_despacho != null
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Despachos realizados</h1>
        <p className="text-gray-500 text-sm mt-1">{ordenes?.length ?? 0} órdenes despachadas</p>
      </div>

      {/* Búsqueda */}
      <form method="get" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={params.q}
          placeholder="N° orden, siniestro o patente..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          Buscar
        </button>
        {params.q && (
          <Link href="/despachados" className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
            Limpiar
          </Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

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
              <p className="text-xs text-gray-500">Siniestro: {o.numero_siniestro ?? '—'}</p>
              <p className="text-xs text-gray-500">{o.patente} · {o.marca} {o.modelo}</p>
              <p className="text-xs text-gray-400 truncate">{o.taller_nombre}</p>
              <Link href={`/ordenes/${o.id}`} className="text-blue-600 text-xs font-medium">Ver orden →</Link>
            </div>
          ))}
          {(!ordenes || ordenes.length === 0) && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">No hay despachos registrados</p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha despacho</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">N° Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Siniestro</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Vehículo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Aseguradora</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Taller</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ejecutivo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(ordenes ?? []).map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-green-600 font-semibold whitespace-nowrap">
                    {o.fecha_despacho
                      ? new Date(o.fecha_despacho + 'T12:00:00').toLocaleDateString('es-CL')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium">{o.numero_orden}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{o.numero_siniestro ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.patente}</div>
                    <div className="text-xs text-gray-400">{o.marca} {o.modelo}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[130px] truncate">{o.aseguradora_nombre}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[130px] truncate">{o.taller_nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{o.ejecutivo_nombre ?? <span className="text-gray-300">—</span>}</td>
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
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No hay despachos registrados
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
