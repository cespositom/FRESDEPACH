import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; guia?: string }>
}) {
  const params = await searchParams
  const perfil = await getPerfil()
  if (perfil?.perfil === 'logistica') redirect('/dashboard')
  const supabase = await createServerSupabase()

  let query = (supabase as any)
    .from('ordenes_con_vencimiento')
    .select('*')
    .order('fecha', { ascending: false })

  if (perfil?.perfil === 'ejecutivo') {
    query = query.eq('ejecutivo_id', perfil.id)
  }
  if (params.q) {
    query = query.or(
      `numero_orden.ilike.%${params.q}%,patente.ilike.%${params.q}%,numero_siniestro.ilike.%${params.q}%`
    )
  }
  if (params.guia) {
    query = query.ilike('guia', `%${params.guia}%`)
  }

  const { data: ordenes } = await query.limit(100)

  const esEjecutivo = perfil?.perfil === 'ejecutivo'
  const colSpan = esEjecutivo ? 7 : 9

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Órdenes</h1>
        <p className="text-gray-500 text-sm mt-1">{ordenes?.length ?? 0} órdenes encontradas</p>
      </div>

      {/* Búsqueda */}
      <form method="get" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={params.q}
          placeholder="N° orden, siniestro o patente..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input name="guia" defaultValue={params.guia}
          placeholder="N° guía..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          Buscar
        </button>
        {(params.q || params.guia) && (
          <Link href="/ordenes" className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">N° Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Siniestro</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Aseguradora</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Vehículo</th>
                {!esEjecutivo && <th className="px-4 py-3 text-left font-medium text-gray-500">Taller</th>}
                {!esEjecutivo && <th className="px-4 py-3 text-left font-medium text-gray-500">Ejecutivo</th>}
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(ordenes ?? []).map((o: any) => {
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium">{o.numero_orden}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.numero_siniestro ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(o.fecha).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[130px] truncate">{o.aseguradora_nombre}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.patente}</div>
                      <div className="text-xs text-gray-400">{o.marca} {o.modelo}</div>
                    </td>
                    {!esEjecutivo && <td className="px-4 py-3 text-gray-600 max-w-[130px] truncate">{o.taller_nombre}</td>}
                    {!esEjecutivo && <td className="px-4 py-3 text-gray-600">{o.ejecutivo_nombre ?? <span className="text-gray-300">—</span>}</td>}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        o.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' :
                        o.estado === 'Completado' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{o.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/ordenes/${o.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(!ordenes || ordenes.length === 0) && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400">
                    No hay órdenes
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
