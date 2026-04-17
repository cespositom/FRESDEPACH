import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; guia?: string }>
}) {
  const params = await searchParams
  const perfil = await getPerfil()
  if (perfil?.perfil === 'logistica') redirect('/dashboard')
  const supabase = await createServerSupabase()

  let query = (supabase as any)
    .from('ordenes_con_vencimiento')
    .select('*')
    .neq('estado', 'Anulada')
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

  function estadoBadge(estado: string) {
    switch (estado) {
      case 'Pendiente':          return 'bg-yellow-100 text-yellow-700'
      case 'Listo para Despacho':return 'bg-blue-100 text-blue-700'
      case 'En Despacho':        return 'bg-indigo-100 text-indigo-700'
      case 'Entregado':          return 'bg-green-100 text-green-700'
      case 'Incidencia':         return 'bg-red-100 text-red-700'
      default:                   return 'bg-gray-100 text-gray-600'
    }
  }

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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {(ordenes ?? []).map((o: any) => (
            <div key={o.id} className="px-4 py-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{o.numero_orden}</p>
                  <p className="text-xs text-gray-400">{o.aseguradora_nombre}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${estadoBadge(o.estado)}`}>
                  {o.estado}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="font-medium text-gray-700">{o.patente}</span>
                <span>{o.marca} {o.modelo}</span>
              </div>
              {!esEjecutivo && (
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {o.taller_nombre && <span className="truncate max-w-[160px]">{o.taller_nombre}</span>}
                  {o.ejecutivo_nombre && <span>{o.ejecutivo_nombre}</span>}
                </div>
              )}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-gray-400">{new Date(o.fecha).toLocaleDateString('es-CL')}</span>
                <Link href={`/ordenes/${o.id}`} className="text-blue-600 text-xs font-medium">Ver →</Link>
              </div>
            </div>
          ))}
          {(!ordenes || ordenes.length === 0) && (
            <p className="px-4 py-8 text-center text-gray-400 text-sm">No hay órdenes</p>
          )}
        </div>

        {/* Desktop: tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">N° Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Siniestro</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Vehículo</th>
                {!esEjecutivo && <th className="px-4 py-3 text-left font-medium text-gray-500">Taller</th>}
                {!esEjecutivo && <th className="px-4 py-3 text-left font-medium text-gray-500">Ejecutivo</th>}
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(ordenes ?? []).map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{o.numero_orden}</div>
                    <div className="text-xs text-gray-400">{o.aseguradora_nombre}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{o.numero_siniestro ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(o.fecha).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.patente}</div>
                    <div className="text-xs text-gray-400">{o.marca} {o.modelo}</div>
                  </td>
                  {!esEjecutivo && <td className="px-4 py-3 text-gray-600 max-w-[130px] truncate">{o.taller_nombre}</td>}
                  {!esEjecutivo && <td className="px-4 py-3 text-gray-600">{o.ejecutivo_nombre ?? <span className="text-gray-300">—</span>}</td>}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${estadoBadge(o.estado)}`}>
                      {o.estado}
                    </span>
                  </td>
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
                  <td colSpan={esEjecutivo ? 6 : 8} className="px-4 py-8 text-center text-gray-400">
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
