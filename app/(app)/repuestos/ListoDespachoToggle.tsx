'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'

export default function ListoDespachoToggle({
  repuestoId,
  ordenId,
  ordenNumero,
  inicial,
  editable,
}: {
  repuestoId: number
  ordenId: number
  ordenNumero: string
  inicial: boolean
  editable: boolean
}) {
  const [valor, setValor]     = useState(inicial)
  const [loading, setLoading] = useState(false)
  const supabase              = createBrowserSupabase()
  const router                = useRouter()

  async function toggle() {
    if (!editable || loading) return
    setLoading(true)
    const nuevo = !valor

    const { error } = await (supabase as any)
      .from('repuestos_orden')
      .update({ listo_despacho: nuevo })
      .eq('id', repuestoId)

    if (!error) {
      setValor(nuevo)

      // Si se marcó como listo, verificar si todos los de la orden están listos
      if (nuevo) {
        const { data: todos } = await (supabase as any)
          .from('repuestos_orden')
          .select('listo_despacho')
          .eq('orden_id', ordenId)

        const todosListos = (todos ?? []).every((r: any) => r.listo_despacho)
        if (todosListos) {
          const { data: logistica } = await (supabase as any)
            .from('perfiles')
            .select('id')
            .eq('perfil', 'logistica')
          if (logistica?.length) {
            await (supabase as any).from('notificaciones').insert(
              logistica.map((u: any) => ({
                usuario_id:   u.id,
                tipo:         'listo_despacho',
                mensaje:      `Orden ${ordenNumero} lista para despacho`,
                orden_id:     ordenId,
                orden_numero: ordenNumero,
              }))
            )
          }
        }
      }

      router.refresh()
    }

    setLoading(false)
  }

  if (!editable) {
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        valor ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
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
          ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
          : 'bg-white text-gray-400 border-gray-300 hover:border-blue-400 hover:text-blue-600'
      }`}
    >
      {loading ? '...' : valor ? 'Sí' : 'No'}
    </button>
  )
}
