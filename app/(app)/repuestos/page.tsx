import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'
import EncargadoToggle from './EncargadoToggle'

export default async function RepuestosPendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string; ejecutivo?: string }>
}) {
  const params  = await searchParams
  const perfil  = await getPerfil()
  const supabase = await createServerSupabase()

  const esAdminSup = ['admin', 'supervisor'].includes(perfil?.perfil ?? '')

  const { data: repuestos } = await (supabase as any)
    .from('repuestos_orden')
    .select(`
      id, nombre_repuesto, codigo_repuesto, cantidad, encargado,
      orden:ordenes_con_vencimiento (
        id, numero_orden, numero_siniestro, dias_restantes,
        ejecutivo_id, ejecutivo_nombre, estado,
        patente, marca, modelo
      )
    `)
    .eq('listo_despacho', false)
    .eq('despachado_ok', false)
    .order('id')

  // Base: excluir anuladas
  const base = (repuestos ?? []).filter((r: any) =>
    r.orden && r.orden.estado !== 'Anulada'
  )

  // Derivar ejecutivos con órdenes asignadas desde los datos reales
  const ejecutivos: { id: string; nombre: string }[] = esAdminSup
    ? Array.from(
        base
          .filter((r: any) => r.orden.ejecutivo_id && r.orden.ejecutivo_nombre)
          .reduce((map: Map<string, string>, r: any) => {
            map.set(r.orden.ejecutivo_id, r.orden.ejecutivo_nombre)
            return map
          }, new Map<string, string>())
          .entries()
      )
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    : []

  let lista = base

  if (perfil?.perfil === 'ejecutivo') {
    lista = lista.filter((r: any) => r.orden.ejecutivo_id === perfil.id)
  }
  if (esAdminSup && params.ejecutivo) {
    lista = lista.filter((r: any) => r.orden.ejecutivo_id === params.ejecutivo)
  }
  if (params.codigo) {
    const q = params.codigo.toLowerCase()
    lista = lista.filter((r: any) => r.codigo_repuesto?.toLowerCase().includes(q))
  }

  lista.sort((a: any, b: any) => (a.orden.dias_restantes ?? 999) - (b.orden.dias_restantes ?? 999))

  // Agrupar por orden (preservando el orden de urgencia)
  const gruposMap = new Map<number, { orden: any; items: any[] }>()
  for (const r of lista) {
    if (!gruposMap.has(r.orden.id)) {
      gruposMap.set(r.orden.id, { orden: r.orden, items: [] })
    }
    gruposMap.get(r.orden.id)!.items.push(r)
  }
  const grupos = Array.from(gruposMap.values())

  function diasColor(dias: number | null) {
    if (dias === null) return 'text-gray-400'
    if (dias < 0)  return 'text-red-600 font-semibold'
    if (dias <= 2) return 'text-orange-500 font-semibold'
    if (dias <= 4) return 'text-yellow-600'
    return 'text-green-600'
  }

  function diasLabel(dias: number | null) {
    if (dias === null) return '—'
    if (dias < 0)  return `Venc. ${Math.abs(dias)}d`
    if (dias === 0) return 'Hoy'
    return `${dias}d`
  }

  function quitarFiltro(key: string) {
    const p = new URLSearchParams()
    if (key !== 'codigo'    && params.codigo)    p.set('codigo',    params.codigo)
    if (key !== 'ejecutivo' && params.ejecutivo) p.set('ejecutivo', params.ejecutivo)
    return `/repuestos${p.size > 0 ? `?${p}` : ''}`
  }

  const ejecutivoFiltroNombre = ejecutivos.find(e => e.id === params.ejecutivo)?.nombre

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Repuestos pendientes</h1>
        <p className="text-gray-500 text-sm mt-1">
          {lista.length} repuestos · {grupos.length} {grupos.length === 1 ? 'vehículo' : 'vehículos'} · ordenados por urgencia
        </p>
      </div>

      {/* Filtros */}
      <form method="get" className="flex flex-wrap gap-2 items-center">
        <input
          name="codigo"
          defaultValue={params.codigo}
          placeholder="Filtrar por código repuesto..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px] max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {esAdminSup && ejecutivos.length > 0 && (
          <select
            name="ejecutivo"
            defaultValue={params.ejecutivo ?? ''}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[160px]"
          >
            <option value="">Todos los ejecutivos</option>
            {ejecutivos.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        )}

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          Buscar
        </button>

        {(params.codigo || params.ejecutivo) && (
          <Link href="/repuestos" className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
            Limpiar
          </Link>
        )}
      </form>

      {/* Tags de filtros activos */}
      {(params.codigo || ejecutivoFiltroNombre) && (
        <div className="flex flex-wrap gap-2">
          {params.codigo && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
              Código: {params.codigo}
              <Link href={quitarFiltro('codigo')} className="ml-1 hover:text-blue-900">✕</Link>
            </span>
          )}
          {ejecutivoFiltroNombre && (
            <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
              Ejecutivo: {ejecutivoFiltroNombre}
              <Link href={quitarFiltro('ejecutivo')} className="ml-1 hover:text-purple-900">✕</Link>
            </span>
          )}
        </div>
      )}

      {grupos.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-10 text-center text-gray-400 text-sm">
          No hay repuestos pendientes
        </div>
      )}

      {/* Grupos por vehículo */}
      <div className="space-y-4">
        {grupos.map(({ orden, items }) => (
          <div key={orden.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

            {/* Header del grupo */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="font-bold text-gray-900">{orden.patente}</span>
                <span className="text-gray-500 text-sm ml-2">{orden.marca} {orden.modelo}</span>
                <span className="text-xs text-gray-400 ml-3">Orden {orden.numero_orden}</span>
                {esAdminSup && orden.ejecutivo_nombre && (
                  <span className="text-xs text-gray-400 ml-3">· {orden.ejecutivo_nombre}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${diasColor(orden.dias_restantes)}`}>
                  {diasLabel(orden.dias_restantes)}
                </span>
                <Link href={`/ordenes/${orden.id}`}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap">
                  Ver orden →
                </Link>
              </div>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {items.map((r: any) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{r.nombre_repuesto}</p>
                    <p className="text-xs text-gray-400">{r.codigo_repuesto ?? '—'}</p>
                  </div>
                  <EncargadoToggle
                    repuestoId={r.id}
                    inicial={r.encargado ?? false}
                    editable={esAdminSup}
                  />
                </div>
              ))}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-400 text-xs">Repuesto</th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-400 text-xs">Encargado</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.nombre_repuesto}</div>
                        <div className="text-xs text-gray-400">{r.codigo_repuesto ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <EncargadoToggle
                          repuestoId={r.id}
                          inicial={r.encargado ?? false}
                          editable={esAdminSup}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/ordenes/${orden.id}`}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
