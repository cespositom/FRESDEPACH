'use client'
import { useState } from 'react'

const PERFILES = ['admin', 'supervisor', 'logistica', 'ejecutivo']
const BADGE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  supervisor: 'bg-purple-100 text-purple-700',
  logistica: 'bg-green-100 text-green-700',
  ejecutivo: 'bg-blue-100 text-blue-700',
}

export default function UsuariosCliente({ usuarios }: { usuarios: any[] }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', perfil: 'ejecutivo' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lista, setLista] = useState(usuarios)
  const [resetting, setResetting] = useState<string | null>(null)
  const [claveGenerada, setClaveGenerada] = useState<{ nombre: string; email: string; password: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const resp = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await resp.json()
    if (!resp.ok) {
      setError(data.error || 'Error al crear usuario')
    } else {
      setSuccess(`Usuario ${form.nombre} creado correctamente`)
      setLista(prev => [data.perfil, ...prev])
      setForm({ nombre: '', email: '', password: '', perfil: 'ejecutivo' })
      setShowForm(false)
    }
    setLoading(false)
  }

  async function toggleActivo(id: string, activo: boolean) {
    await fetch(`/api/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !activo })
    })
    setLista(prev => prev.map(u => u.id === id ? { ...u, activo: !activo } : u))
  }

  async function resetClave(u: { id: string; nombre: string; email: string }) {
    if (!confirm(`¿Generar nueva contraseña para ${u.nombre}?\n\nLa contraseña anterior dejará de funcionar.`)) return
    setResetting(u.id)
    try {
      const resp = await fetch(`/api/usuarios/${u.id}/reset-password`, { method: 'POST' })
      const data = await resp.json()
      if (!resp.ok) {
        alert(data.error || 'Error al resetear contraseña')
        return
      }
      setClaveGenerada({ nombre: u.nombre, email: u.email, password: data.password })
      setCopiado(false)
    } finally {
      setResetting(null)
    }
  }

  async function copiarClave() {
    if (!claveGenerada) return
    await navigator.clipboard.writeText(claveGenerada.password)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="space-y-4">
      {claveGenerada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-900 text-lg mb-2">Contraseña generada</h3>
            <p className="text-sm text-gray-600 mb-4">
              Para <strong>{claveGenerada.nombre}</strong> ({claveGenerada.email}). Cópiala y compártela por un canal seguro — no podrás verla de nuevo.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 font-mono text-base break-all select-all">
              {claveGenerada.password}
            </div>
            <div className="flex gap-2">
              <button onClick={copiarClave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition">
                {copiado ? '✓ Copiado' : 'Copiar al portapapeles'}
              </button>
              <button onClick={() => setClaveGenerada(null)}
                className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {success && <p className="bg-green-50 text-green-700 text-sm px-4 py-2 rounded-lg">{success}</p>}

      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={crearUsuario} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Crear nuevo usuario</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre completo</label>
              <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="juan@empresa.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Contraseña temporal</label>
              <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Perfil</label>
              <select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PERFILES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Perfil</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Creado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lista.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{u.nombre}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[u.perfil] || 'bg-gray-100 text-gray-600'}`}>
                    {u.perfil}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => resetClave(u)} disabled={resetting === u.id}
                      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50">
                      {resetting === u.id ? 'Reseteando...' : 'Resetear clave'}
                    </button>
                    <button onClick={() => toggleActivo(u.id, u.activo)}
                      className="text-xs text-gray-400 hover:text-gray-600">
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
