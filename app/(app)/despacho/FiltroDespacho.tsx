'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

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
  const guiaActual   = searchParams.get('guia') ?? ''

  const [ordenInput, setOrdenInput] = useState(ordenActual)
  const [guiaInput,  setGuiaInput]  = useState(guiaActual)

  useEffect(() => { setOrdenInput(ordenActual) }, [ordenActual])
  useEffect(() => { setGuiaInput(guiaActual) }, [guiaActual])

  function buildHref(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    return `/despacho${params.size > 0 ? `?${params}` : ''}`
  }

  function setFiltro(key: 'region' | 'comuna', value: string) {
    router.push(buildHref({ [key]: value }))
  }

  function buscar(e: FormEvent) {
    e.preventDefault()
    router.push(buildHref({ orden: ordenInput.trim(), guia: guiaInput.trim() }))
  }

  function limpiar() {
    setOrdenInput('')
    setGuiaInput('')
    router.push('/despacho')
  }

  const hayFiltro = regionActual || comunaActual || ordenActual || guiaActual

  return (
    <form onSubmit={buscar} className="flex flex-wrap items-center gap-3">

      <input
        type="text"
        value={ordenInput}
        onChange={e => setOrdenInput(e.target.value)}
        placeholder="N° orden…"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
      />

      <input
        type="text"
        value={guiaInput}
        onChange={e => setGuiaInput(e.target.value)}
        placeholder="N° guía…"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
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

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
      >
        Buscar
      </button>

      {hayFiltro && (
        <button
          type="button"
          onClick={limpiar}
          className="text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
        >
          Limpiar
        </button>
      )}
    </form>
  )
}
