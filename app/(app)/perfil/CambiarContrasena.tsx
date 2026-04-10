'use client'
import { useState, useTransition } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'

export default function CambiarContrasena() {
  const [nueva,    setNueva]    = useState('')
  const [confirma, setConfirma] = useState('')
  const [msg,      setMsg]      = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [pending,  start]       = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (nueva !== confirma) {
      setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden' })
      return
    }
    if (nueva.length < 6) {
      setMsg({ tipo: 'error', texto: 'Mínimo 6 caracteres' })
      return
    }
    setMsg(null)
    start(async () => {
      const sb = createBrowserSupabase()
      const { error } = await sb.auth.updateUser({ password: nueva })
      if (error) {
        setMsg({ tipo: 'error', texto: error.message })
      } else {
        setMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente' })
        setNueva('')
        setConfirma('')
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Cambiar contraseña</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
          <input
            type="password" value={nueva} onChange={e => setNueva(e.target.value)}
            required minLength={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
          <input
            type="password" value={confirma} onChange={e => setConfirma(e.target.value)}
            required minLength={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Repite la contraseña"
          />
        </div>
        {msg && (
          <p className={`text-sm px-3 py-2 rounded-lg ${msg.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg.texto}
          </p>
        )}
        <button
          type="submit" disabled={pending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
        >
          {pending ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
