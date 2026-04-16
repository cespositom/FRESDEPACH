'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'

type Notif = {
  id: number
  tipo: string
  mensaje: string
  orden_id: string | null
  orden_numero: string | null
  leida: boolean
  created_at: string
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifs, setNotifs]   = useState<Notif[]>([])
  const [open, setOpen]       = useState(false)
  const supabase              = createBrowserSupabase()
  const router                = useRouter()
  const ref                   = useRef<HTMLDivElement>(null)

  const noLeidas = notifs.filter(n => !n.leida).length

  async function cargar() {
    const { data } = await (supabase as any)
      .from('notificaciones')
      .select('id, tipo, mensaje, orden_id, orden_numero, leida, created_at')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data ?? [])
  }

  async function marcarLeida(id: number) {
    await (supabase as any)
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  async function marcarTodasLeidas() {
    await (supabase as any)
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', userId)
      .eq('leida', false)
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
  }

  // Cargar al montar y suscribir a Realtime
  useEffect(() => {
    cargar()
    const channel = (supabase as any)
      .channel(`notifs-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${userId}`,
      }, (payload: any) => {
        setNotifs(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleClick(n: Notif) {
    marcarLeida(n.id)
    setOpen(false)
    if (n.orden_id) router.push(`/ordenes/${n.orden_id}`)
  }

  function tipoIcon(tipo: string) {
    if (tipo === 'orden_asignada') return '📋'
    if (tipo === 'listo_despacho') return '📦'
    return '🔔'
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const min  = Math.floor(diff / 60000)
    if (min < 1)  return 'ahora'
    if (min < 60) return `${min}m`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        aria-label="Notificaciones"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-900">Notificaciones</span>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodasLeidas}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Sin notificaciones</p>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition ${!n.leida ? 'bg-blue-50/50' : ''}`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{tipoIcon(n.tipo)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.leida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {n.mensaje}
                    </p>
                    {n.orden_numero && (
                      <p className="text-xs text-gray-400 mt-0.5">Orden {n.orden_numero}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                    {!n.leida && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
