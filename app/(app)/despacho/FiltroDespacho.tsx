'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

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
  const ordenActual  = searchParams.get('orden') ?? ''

  const [ordenInput, setOrdenInput] = useState(ordenActual)

  useEffect(() => { setOrdenInput(ordenActual) }, [ordenActual])

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (ordenInput.trim()) params.set('orden', ordenInput.trim())
      else params.delete('orden')
      router.push(`/despacho${params.size > 0 ? `?${params}` : ''}`)
    }, 400)
    return () => clearTimeout(timer)
  }, [ordenInput])

  function setFiltro(key: 'region' | 'comuna', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/despacho${params.size > 0 ? `?${params}` : ''}`)
  }

  const hayFiltro = regionActual || comunaActual || ordenActual

  return (
    <div className="flex flex-wrap items-center gap-3">

      <input
        type="text"
        value={ordenInput}
        onChange={e => setOrdenInput(e.target.value)}
        placeholder="Buscar N° orden…"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[160px]"
      />

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
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]">
        <option value="">Todas las comunas</option>
        {comunas.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {hayFiltro && (
        <button
          onClick={() => { setOrdenInput(''); router.push('/despacho') }}
          className="text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
