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

  return (
    <button
      onClick={editable ? toggle : undefined}
      disabled={loading}
      className={`w-7 h-7 rounded-md border-2 transition font-bold text-xs inline-flex items-center justify-center
        ${valor
          ? 'bg-green-500 border-green-500 text-white'
          : 'border-gray-300 text-gray-300 hover:border-green-400'}
        ${!editable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        disabled:opacity-50`}
    >
      {loading ? '·' : valor ? '✓' : ''}
    </button>
  )
}
