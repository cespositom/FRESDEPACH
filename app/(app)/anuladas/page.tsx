import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AnuladasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params   = await searchParams
  const perfil   = await getPerfil()

  if (!perfil || !['admin', 'supervisor'].includes(perfil.perfil)) {
    redirect('/dashboard')
  }

  const supabase = await createServerSupabase()

  let query = (supabase as any)
    .from('ordenes_con_vencimiento')
    .select('*')
    .eq('estado', 'Anulada')
    .order('fecha', { ascending: false })
    .limit(200)

  if (params.q) {
    query = query.or(
      `numero_orden.ilike.%${params.q}%,numero_siniestro.ilike.%${params.q}%,patente.ilike.%${params.q}%`
    )
  }

  const { data: ordenes } = await query

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Órdenes anuladas</h1>
        <p className="text-gray-500 text-sm mt-1">{ordenes?.length ?? 0} órdenes anuladas</p>
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
          <Link href="/anuladas" className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
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
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Anulada</span>
              </div>
              <p className="text-xs text-gray-500">Siniestro: {o.numero_siniestro ?? '—'}</p>
              <p className="text-xs text-gray-500">{o.patente} · {o.marca} {o.modelo}</p>
              <p className="text-xs text-gray-400 truncate">{o.taller_nombre}</p>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-gray-400">{o.ejecutivo_nombre ?? '—'}</span>
                <Link href={`/ordenes/${o.id}`} className="text-blue-600 text-xs font-medium">Ver →</Link>
              </div>
            </div>
          ))}
          {(!ordenes || ordenes.length === 0) && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">No hay órdenes anuladas</p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">N° Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Siniestro</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Vehículo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Taller</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ejecutivo</th>
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
                  <td className="px-4 py-3 text-gray-500 text-xs">{o.numero_siniestro ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(o.fecha).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.patente}</div>
                    <div className="text-xs text-gray-400">{o.marca} {o.modelo}</div>
                  </td>
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
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    No hay órdenes anuladas
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
