'use client'
import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'

const PROVEEDORES = ['ALSACIA', 'REFAX', '4RUEDAS', 'BICIMOTO', 'MANNHEIM', 'OTRO PROVEEDOR']

export default function ProveedorSelect({
  repuestoId,
  inicial,
}: {
  repuestoId: number
  inicial: string | null
}) {
  const [valor, setValor]     = useState(inicial ?? '')
  const [loading, setLoading] = useState(false)
  const supabase              = createBrowserSupabase()

  async function cambiar(nuevo: string) {
    setLoading(true)
    const val = nuevo || null
    const { error } = await (supabase as any)
      .from('repuestos_orden')
      .update({ proveedor: val })
      .eq('id', repuestoId)
    if (!error) setValor(nuevo)
    setLoading(false)
  }

  return (
    <select
      value={valor}
      disabled={loading}
      onChange={e => cambiar(e.target.value)}
      className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 min-w-[130px]"
    >
      <option value="">Sin proveedor</option>
      {PROVEEDORES.map(p => <option key={p} value={p}>{p}</option>)}
    </select>
  )
}
