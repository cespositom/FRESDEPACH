'use client'
import { useState } from 'react'

type Config = { tipo_cambio_clp: number; recargo_pct: number; updated_at?: string }
type Tarifa = { id: number; transportista: 'FEDEX' | 'DHL'; valor_hasta_usd: number; honorario_usd: number; activo: boolean }

const CLP = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 2 })
const USD = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ConfiguracionImport({
  config: configInicial,
  tarifas: tarifasInicial,
}: {
  config: Config
  tarifas: Tarifa[]
}) {
  const [config, setConfig] = useState(configInicial)
  const [tipoCambio, setTipoCambio] = useState(String(configInicial.tipo_cambio_clp))
  const [recargo, setRecargo] = useState(String(configInicial.recargo_pct))
  const [savingCfg, setSavingCfg] = useState(false)
  const [msgCfg, setMsgCfg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [tarifas, setTarifas] = useState(tarifasInicial)
  const [nueva, setNueva] = useState({ transportista: 'FEDEX', valor_hasta_usd: '', honorario_usd: '' })
  const [savingNueva, setSavingNueva] = useState(false)

  async function guardarConfig(e: React.FormEvent) {
    e.preventDefault()
    setSavingCfg(true); setMsgCfg(null)
    const resp = await fetch('/api/admin/config-import', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_cambio_clp: Number(tipoCambio),
        recargo_pct: Number(recargo),
      }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      setMsgCfg({ tipo: 'error', texto: data.error || 'Error' })
    } else {
      setConfig(data.config)
      setMsgCfg({ tipo: 'ok', texto: 'Configuración guardada' })
    }
    setSavingCfg(false)
  }

  async function agregarTarifa(e: React.FormEvent) {
    e.preventDefault()
    setSavingNueva(true)
    const resp = await fetch('/api/admin/tarifas-desaduanamiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transportista: nueva.transportista,
        valor_hasta_usd: Number(nueva.valor_hasta_usd),
        honorario_usd: Number(nueva.honorario_usd),
      }),
    })
    const data = await resp.json()
    if (resp.ok) {
      setTarifas(prev => [...prev, data.tarifa].sort((a, b) =>
        a.transportista.localeCompare(b.transportista) || a.valor_hasta_usd - b.valor_hasta_usd
      ))
      setNueva({ transportista: nueva.transportista, valor_hasta_usd: '', honorario_usd: '' })
    } else {
      alert(data.error || 'Error')
    }
    setSavingNueva(false)
  }

  async function toggleActivo(t: Tarifa) {
    const resp = await fetch(`/api/admin/tarifas-desaduanamiento/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !t.activo }),
    })
    if (resp.ok) {
      setTarifas(prev => prev.map(x => x.id === t.id ? { ...x, activo: !x.activo } : x))
    }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este tramo?')) return
    const resp = await fetch(`/api/admin/tarifas-desaduanamiento/${id}`, { method: 'DELETE' })
    if (resp.ok) setTarifas(prev => prev.filter(t => t.id !== id))
  }

  const dhl = tarifas.filter(t => t.transportista === 'DHL')
  const fedex = tarifas.filter(t => t.transportista === 'FEDEX')

  return (
    <div className="space-y-5">
      {/* Configuración base */}
      <form onSubmit={guardarConfig} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Tipo de cambio y recargo</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de cambio USD → CLP</label>
            <input required type="number" step="0.01" min="0.01" value={tipoCambio} onChange={e => setTipoCambio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Actual: ${CLP(Number(config.tipo_cambio_clp))}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Recargo (%)</label>
            <input required type="number" step="0.01" min="0" value={recargo} onChange={e => setRecargo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Se suma al valor USD antes del honorario.</p>
          </div>
        </div>
        {msgCfg && (
          <p className={`text-sm px-3 py-2 rounded-lg ${msgCfg.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msgCfg.texto}
          </p>
        )}
        <button type="submit" disabled={savingCfg}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg text-sm transition disabled:opacity-50">
          {savingCfg ? 'Guardando...' : 'Guardar'}
        </button>
      </form>

      {/* Tramos por transportista */}
      <div className="grid md:grid-cols-2 gap-5">
        <TablaTramos titulo="DHL" tarifas={dhl} onToggle={toggleActivo} onEliminar={eliminar} />
        <TablaTramos titulo="FEDEX" tarifas={fedex} onToggle={toggleActivo} onEliminar={eliminar} />
      </div>

      {/* Agregar tramo */}
      <form onSubmit={agregarTarifa} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Agregar tramo</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Transportista</label>
            <select value={nueva.transportista} onChange={e => setNueva({ ...nueva, transportista: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="FEDEX">FEDEX</option>
              <option value="DHL">DHL</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Valor hasta (USD)</label>
            <input required type="number" step="0.01" min="0.01" value={nueva.valor_hasta_usd}
              onChange={e => setNueva({ ...nueva, valor_hasta_usd: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 100.00" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Honorario (USD)</label>
            <input required type="number" step="0.01" min="0" value={nueva.honorario_usd}
              onChange={e => setNueva({ ...nueva, honorario_usd: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 17.00" />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Cada tramo aplica si el valor del producto es ≤ <em>Valor hasta</em>. Para "Más de X" usa un número alto (ej: 99999999).
        </p>
        <button type="submit" disabled={savingNueva}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg text-sm transition disabled:opacity-50">
          {savingNueva ? 'Agregando...' : 'Agregar tramo'}
        </button>
      </form>
    </div>
  )
}

function TablaTramos({
  titulo, tarifas, onToggle, onEliminar,
}: {
  titulo: string
  tarifas: Tarifa[]
  onToggle: (t: Tarifa) => void
  onEliminar: (id: number) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{titulo}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-4 py-2 text-left font-medium text-gray-500">Hasta USD</th>
            <th className="px-4 py-2 text-right font-medium text-gray-500">Honorario</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">Estado</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tarifas.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-xs">Sin tramos</td></tr>
          ) : tarifas.map(t => (
            <tr key={t.id} className={`hover:bg-gray-50 ${!t.activo ? 'opacity-50' : ''}`}>
              <td className="px-4 py-2 font-mono text-xs">{USD(Number(t.valor_hasta_usd))}</td>
              <td className="px-4 py-2 text-right">USD {USD(Number(t.honorario_usd))}</td>
              <td className="px-4 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex gap-2 justify-end">
                  <button onClick={() => onToggle(t)} className="text-xs text-gray-400 hover:text-gray-600">
                    {t.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => onEliminar(t.id)} className="text-xs text-red-500 hover:text-red-700">
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
