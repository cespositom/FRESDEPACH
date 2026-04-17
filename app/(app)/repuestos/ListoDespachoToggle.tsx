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

  return (
    <button
      onClick={editable ? toggle : undefined}
      disabled={loading}
      className={`w-7 h-7 rounded-md border-2 transition font-bold text-xs inline-flex items-center justify-center
        ${valor
          ? 'bg-blue-500 border-blue-500 text-white'
          : 'border-gray-300 text-gray-300 hover:border-blue-400'}
        ${!editable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        disabled:opacity-50`}
    >
      {loading ? '·' : valor ? '✓' : ''}
    </button>
  )
}
