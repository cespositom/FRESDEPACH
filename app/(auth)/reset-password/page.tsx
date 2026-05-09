'use client'
import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [estado, setEstado] = useState<'verificando' | 'listo' | 'sin_token' | 'guardado'>('verificando')
  const [nueva, setNueva] = useState('')
  const [confirma, setConfirma] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const sb = createBrowserSupabase()

    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setEstado('listo')
      }
    })

    sb.auth.getSession().then(({ data }) => {
      if (data.session) setEstado('listo')
      else setTimeout(() => {
        sb.auth.getSession().then(({ data: d2 }) => {
          if (d2.session) setEstado('listo')
          else setEstado('sin_token')
        })
      }, 1500)
    })
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (nueva !== confirma) { setError('Las contraseñas no coinciden'); return }
    if (nueva.length < 6) { setError('Mínimo 6 caracteres'); return }
    startTransition(async () => {
      const sb = createBrowserSupabase()
      const { error } = await sb.auth.updateUser({ password: nueva })
      if (error) { setError(error.message); return }
      await sb.auth.signOut()
      setEstado('guardado')
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-3 flex items-center justify-center">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
        </div>

        {estado === 'verificando' && (
          <p className="text-sm text-gray-500 text-center">Validando link...</p>
        )}

        {estado === 'sin_token' && (
          <div className="space-y-4">
            <p className="text-sm bg-red-50 text-red-600 rounded-lg px-3 py-3">
              El link de recuperación es inválido o expiró. Solicita uno nuevo.
            </p>
            <Link
              href="/forgot-password"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition"
            >
              Solicitar nuevo link
            </Link>
          </div>
        )}

        {estado === 'listo' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password" value={nueva} onChange={e => setNueva(e.target.value)}
                required minLength={6} autoFocus
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
            {error && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit" disabled={pending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {pending ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}

        {estado === 'guardado' && (
          <div className="space-y-4">
            <p className="text-sm bg-green-50 text-green-700 rounded-lg px-3 py-3">
              Contraseña actualizada correctamente. Ya puedes iniciar sesión.
            </p>
            <Link
              href="/login"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition"
            >
              Ir al login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
