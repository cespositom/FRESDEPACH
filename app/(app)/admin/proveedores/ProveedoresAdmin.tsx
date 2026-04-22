'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Proveedor = { id: number; nombre: string; activo: boolean }

export default function ProveedoresAdmin({ proveedores }: { proveedores: Proveedor[] }) {
  const router = useRouter()
  const [nombre, setNombre]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError]       = useState('')

  async function agregar() {
    const val = nombre.trim().toUpperCase()
    if (!val) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/proveedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: val }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Error al agregar proveedor')
    } else {
      setNombre('')
      router.refresh()
    }
    setSaving(false)
  }

  async function eliminar(id: number, nombreProv: string) {
    if (!confirm(`¿Eliminar el proveedor "${nombreProv}"?`)) return
    setDeleting(id)
    await fetch(`/api/admin/proveedores/${id}`, { method: 'DELETE' })
    router.refresh()
    setDeleting(null)
  }

  return (
    <div className="space-y-5">
      {/* Formulario agregar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Agregar proveedor</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregar()}
            placeholder="Nombre del proveedor..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          />
          <button
            onClick={agregar}
            disabled={saving || !nombre.trim()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? '...' : 'Agregar'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Lista de proveedores */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Proveedores registrados</h2>
          <span className="text-xs text-gray-400">{proveedores.length} total</span>
        </div>
        {proveedores.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin proveedores registrados</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {proveedores.map(p => (
              <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <span className="font-medium text-gray-800 text-sm">{p.nombre}</span>
                <button
                  onClick={() => eliminar(p.id, p.nombre)}
                  disabled={deleting === p.id}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-lg px-3 py-1 transition disabled:opacity-40"
                >
                  {deleting === p.id ? '...' : 'Eliminar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
