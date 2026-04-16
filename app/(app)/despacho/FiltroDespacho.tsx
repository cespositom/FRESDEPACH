'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function FiltroDespacho({
  regiones,
  comunasPorRegion,
}: {
  regiones: string[]
  comunasPorRegion: Record<string, string[]>
}) {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const regionActual = searchParams.get('region') ?? ''
  const comunaActual = searchParams.get('comuna') ?? ''

  function set(region: string, comuna: string) {
    const params = new URLSearchParams()
    if (region) params.set('region', region)
    if (comuna) params.set('comuna', comuna)
    router.push(`/despacho${params.size > 0 ? `?${params}` : ''}`)
  }

  const comunasDisponibles = regionActual ? (comunasPorRegion[regionActual] ?? []) : []

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Selector región */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Región</label>
        <select
          value={regionActual}
          onChange={e => set(e.target.value, '')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
        >
          <option value="">Todas las regiones</option>
          {regiones.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Selector comuna — solo visible si hay región seleccionada */}
      {regionActual && comunasDisponibles.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Comuna</label>
          <select
            value={comunaActual}
            onChange={e => set(regionActual, e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[160px]"
          >
            <option value="">Todas las comunas</option>
            {comunasDisponibles.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Limpiar filtro */}
      {(regionActual || comunaActual) && (
        <button
          onClick={() => set('', '')}
          className="text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
        >
          Limpiar filtro
        </button>
      )}
    </div>
  )
}
