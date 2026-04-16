'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function FiltroDespacho({
  regiones,
  comunas,
}: {
  regiones: string[]
  comunas: string[]
}) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const regionActual = searchParams.get('region') ?? ''
  const comunaActual = searchParams.get('comuna') ?? ''

  function setFiltro(key: 'region' | 'comuna', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/despacho${params.size > 0 ? `?${params}` : ''}`)
  }

  const hayFiltro = regionActual || comunaActual

  return (
    <div className="flex flex-wrap items-center gap-3">

      <select
        value={regionActual}
        onChange={e => setFiltro('region', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
      >
        <option value="">Todas las regiones</option>
        {regiones.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      <select
        value={comunaActual}
        onChange={e => setFiltro('comuna', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
      >
        <option value="">Todas las comunas</option>
        {comunas.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {hayFiltro && (
        <button
          onClick={() => router.push('/despacho')}
          className="text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
