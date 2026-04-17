'use client'
import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'

export default function EncargadoToggle({
  repuestoId,
  inicial,
  editable,
}: {
  repuestoId: number
  inicial: boolean
  editable: boolean
}) {
  const [valor, setValor]     = useState(inicial)
  const [loading, setLoading] = useState(false)
  const supabase              = createBrowserSupabase()

  async function toggle() {
    if (!editable || loading) return
    setLoading(true)
    const nuevo = !valor
    const { error } = await (supabase as any)
      .from('repuestos_orden')
      .update({ encargado: nuevo })
      .eq('id', repuestoId)
    if (!error) setValor(nuevo)
    setLoading(false)
  }

  if (!editable) {
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        valor ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
      }`}>
        {valor ? 'Sí' : 'No'}
      </span>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-semibold px-3 py-1 rounded-full border transition disabled:opacity-50 ${
        valor
          ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
          : 'bg-white text-gray-400 border-gray-300 hover:border-green-400 hover:text-green-600'
      }`}
    >
      {loading ? '...' : valor ? 'Sí' : 'No'}
    </button>
  )
}
