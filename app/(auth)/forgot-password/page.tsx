'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from './actions'

export default function ForgotPasswordPage() {
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError('')
    startTransition(async () => {
      const result = await forgotPasswordAction(formData)
      if (result?.error) setError(result.error)
      else setSent(true)
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-3 flex items-center justify-center">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Te enviaremos un link a tu email</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm bg-green-50 text-green-700 rounded-lg px-3 py-3">
              Si el email está registrado, recibirás un link para restablecer tu contraseña en unos minutos. Revisa también tu carpeta de spam.
            </p>
            <Link
              href="/login"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition"
            >
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" name="email"
                required autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="usuario@email.com"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit" disabled={pending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {pending ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
            <Link
              href="/login"
              className="block text-center text-sm text-blue-600 hover:text-blue-700"
            >
              Volver al login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
