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

  return (
    <div className="space-y-4">
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
                  <button onClick={() => toggleActivo(u.id, u.activo)}
                    className="text-xs text-gray-400 hover:text-gray-600">
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
