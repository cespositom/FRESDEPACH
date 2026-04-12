import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'

export default async function RepuestosPendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>
}) {
  const params = await searchParams
  const perfil = await getPerfil()
  const supabase = await createServerSupabase()

  const { data: repuestos } = await (supabase as any)
    .from('repuestos_orden')
    .select(`
      id, nombre_repuesto, codigo_repuesto, cantidad,
      orden:ordenes_con_vencimiento (
        id, numero_orden, numero_siniestro, dias_restantes,
        ejecutivo_id
      )
    `)
    .eq('listo_despacho', false)
    .eq('despachado_ok', false)
    .order('id')

  let lista = (repuestos ?? []).filter((r: any) => r.orden)
  if (perfil?.perfil === 'ejecutivo') {
    lista = lista.filter((r: any) => r.orden.ejecutivo_id === perfil.id)
  }
  if (params.codigo) {
    const q = params.codigo.toLowerCase()
    lista = lista.filter((r: any) => r.codigo_repuesto?.toLowerCase().includes(q))
  }

  lista.sort((a: any, b: any) => (a.orden.dias_restantes ?? 999) - (b.orden.dias_restantes ?? 999))

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Repuestos pendientes</h1>
        <p className="text-gray-500 text-sm mt-1">
          {lista.length} repuestos sin marcar como listo · ordenados por urgencia
        </p>
      </div>

      {/* Filtro por código */}
      <form method="get" className="flex gap-2">
        <input name="codigo" defaultValue={params.codigo}
          placeholder="Filtrar por código repuesto..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          Buscar
        </button>
        {params.codigo && (
          <Link href="/repuestos" className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
            Limpiar
          </Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {lista.map((r: any) => (
            <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{r.nombre_repuesto}</p>
                <p className="text-xs text-gray-400">{r.codigo_repuesto ?? '—'} · x{r.cantidad}</p>
                <p className="text-xs text-gray-500">Orden {r.orden.numero_orden} · {r.orden.numero_siniestro ?? '—'}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs font-semibold ${diasColor(r.orden.dias_restantes)}`}>
                  {diasLabel(r.orden.dias_restantes)}
                </span>
                <Link href={`/ordenes/${r.orden.id}`} className="text-blue-600 text-xs font-medium">Ver →</Link>
              </div>
            </div>
          ))}
          {lista.length === 0 && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">No hay repuestos pendientes</p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Días venc.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Repuesto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cant.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">N° Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Siniestro</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lista.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className={`px-4 py-3 text-sm whitespace-nowrap ${diasColor(r.orden.dias_restantes)}`}>
                    {diasLabel(r.orden.dias_restantes)}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.nombre_repuesto}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.codigo_repuesto ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.cantidad}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.orden.numero_orden}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.orden.numero_siniestro ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/ordenes/${r.orden.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    No hay repuestos pendientes
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
