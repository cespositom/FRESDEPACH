import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'
import { Suspense } from 'react'
import FiltroDespacho from './FiltroDespacho'

export default async function DespachoPorComunaPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; comuna?: string }>
}) {
  const params   = await searchParams
  const perfil   = await getPerfil()
  const esEjec   = perfil?.perfil === 'ejecutivo'
  const supabase = await createServerSupabase()

  let q = (supabase as any)
    .from('ordenes_con_vencimiento')
    .select('*')
    .gt('total_repuestos', 0)
    .neq('estado', 'Entregado')
    .order('dias_restantes', { ascending: true })

  if (perfil?.perfil === 'ejecutivo') {
    q = q.eq('ejecutivo_id', perfil.id)
  }

  const { data: todas } = await q

  // Listos para despacho: todos los repuestos marcados listo_despacho
  // pero NO todos marcados despachado_ok (esos van a Despachados)
  const ordenes = (todas ?? []).filter((o: any) =>
    Number(o.repuestos_listos) >= Number(o.total_repuestos) &&
    Number(o.repuestos_despachados) < Number(o.total_repuestos)
  )

  const tallerIds = Array.from(new Set(ordenes.map((o: any) => o.taller_id)))
  const { data: talleres } = await (supabase as any)
    .from('talleres')
    .select('id, nombre, comuna, region, direccion')
    .in('id', tallerIds.length > 0 ? tallerIds : [0])

  const tallerMap: Record<number, any> = {}
  ;(talleres ?? []).forEach((t: any) => { tallerMap[t.id] = t })

  // Agrupar: región → comuna → órdenes (sin filtro, para construir los selectores)
  const porRegionFull: Record<string, Record<string, any[]>> = {}
  ordenes.forEach((o: any) => {
    const taller  = tallerMap[o.taller_id]
    const region  = taller?.region  ?? 'Sin región'
    const comuna  = taller?.comuna  ?? 'Sin comuna'
    if (!porRegionFull[region]) porRegionFull[region] = {}
    if (!porRegionFull[region][comuna]) porRegionFull[region][comuna] = []
    porRegionFull[region][comuna].push({
      ...o,
      taller_comuna:    comuna,
      taller_region:    region,
      taller_direccion: taller?.direccion ?? null,
    })
  })

  const todasRegiones = Object.keys(porRegionFull).sort()
  const todasComunas  = Array.from(
    new Set(todasRegiones.flatMap(r => Object.keys(porRegionFull[r])))
  ).sort()

  // Aplicar filtro de región / comuna
  const filtroRegion = params.region ?? ''
  const filtroComuna = params.comuna ?? ''

  const porRegion: Record<string, Record<string, any[]>> = {}
  for (const region of todasRegiones) {
    if (filtroRegion && region !== filtroRegion) continue
    for (const comuna of Object.keys(porRegionFull[region])) {
      if (filtroComuna && comuna !== filtroComuna) continue
      if (!porRegion[region]) porRegion[region] = {}
      porRegion[region][comuna] = porRegionFull[region][comuna]
    }
  }

  const regiones     = Object.keys(porRegion).sort()
  const totalOrdenes = regiones.reduce((s, r) =>
    s + Object.values(porRegion[r]).reduce((ss, arr) => ss + arr.length, 0), 0
  )

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
    <div className="space-y-6">
      {/* Título + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan de despacho</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalOrdenes} {totalOrdenes === 1 ? 'orden lista' : 'órdenes listas'}
            {regiones.length > 0 && ` · ${regiones.length} ${regiones.length === 1 ? 'región' : 'regiones'}`}
          </p>
        </div>
        {todasRegiones.length > 0 && (
          <Suspense>
            <FiltroDespacho
              regiones={todasRegiones}
              comunas={todasComunas}
            />
          </Suspense>
        )}
      </div>

      {regiones.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          No hay órdenes con todos los repuestos listos para despacho
        </div>
      )}

      {regiones.map(region => {
        const comunas = Object.keys(porRegion[region]).sort()
        const totalRegion = comunas.reduce((s, c) => s + porRegion[region][c].length, 0)

        return (
          <div key={region} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">

            {/* ── Header región ─────────────────────────────── */}
            <div className="px-5 py-3 bg-blue-600 flex items-center justify-between">
              <h2 className="font-bold text-white text-base tracking-wide">{region}</h2>
              <span className="text-sm font-semibold bg-white/20 text-white px-3 py-0.5 rounded-full">
                {totalRegion} {totalRegion === 1 ? 'orden' : 'órdenes'}
              </span>
            </div>

            {/* ── Comunas dentro de la región ───────────────── */}
            <div className="divide-y divide-gray-100 bg-white">
              {comunas.map(comuna => {
                const ords = porRegion[region][comuna]
                return (
                  <div key={comuna}>

                    {/* Header comuna */}
                    <div className="px-5 py-2.5 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                      <h3 className="font-semibold text-gray-700 text-sm">{comuna}</h3>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                        {ords.length} {ords.length === 1 ? 'orden' : 'órdenes'}
                      </span>
                    </div>

                    {/* Mobile: cards */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {ords.map((o: any) => (
                        <div key={o.id} className="px-4 py-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{o.numero_orden}</span>
                            <span className={`text-xs font-semibold ${diasColor(o.dias_restantes)}`}>
                              {diasLabel(o.dias_restantes)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{o.patente} · {o.marca} {o.modelo}</p>
                          {!esEjec && (
                            <p className="text-xs text-gray-400 truncate">
                              {o.taller_nombre}{o.taller_direccion ? ` · ${o.taller_direccion}` : ''}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              {o.repuestos_listos}/{o.total_repuestos} listos
                            </span>
                            <Link href={`/ordenes/${o.id}`} className="text-blue-600 text-xs font-medium">Ver →</Link>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: tabla */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="px-4 py-2.5 text-left font-medium text-gray-400 text-xs">Días venc.</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-400 text-xs">N° Orden</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-400 text-xs">Siniestro</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-400 text-xs">Vehículo</th>
                            {!esEjec && <th className="px-4 py-2.5 text-left font-medium text-gray-400 text-xs">Taller</th>}
                            <th className="px-4 py-2.5 text-left font-medium text-gray-400 text-xs">Repuestos</th>
                            <th className="px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {ords.map((o: any) => (
                            <tr key={o.id} className="hover:bg-gray-50 transition">
                              <td className={`px-4 py-3 text-sm whitespace-nowrap ${diasColor(o.dias_restantes)}`}>
                                {diasLabel(o.dias_restantes)}
                              </td>
                              <td className="px-4 py-3 font-medium">{o.numero_orden}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{o.numero_siniestro ?? '—'}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium">{o.patente}</div>
                                <div className="text-xs text-gray-400">{o.marca} {o.modelo}</div>
                              </td>
                              {!esEjec && (
                                <td className="px-4 py-3 max-w-[180px]">
                                  <div className="text-gray-600 truncate">{o.taller_nombre}</div>
                                  <div className="text-xs text-gray-400 truncate">{o.taller_direccion ?? '—'}</div>
                                </td>
                              )}
                              <td className="px-4 py-3">
                                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                  {o.repuestos_listos}/{o.total_repuestos} listos
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
                        </tbody>
                      </table>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
