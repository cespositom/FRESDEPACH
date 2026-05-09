'use client'
import { useState } from 'react'

type Config = { tipo_cambio_clp: number; recargo_pct: number }
type Desglose = {
  valor_usd: number
  recargo_pct: number
  monto_recargo_usd: number
  valor_con_recargo_usd: number
  honorario_usd: number
  total_usd: number
  tipo_cambio_clp: number
  total_clp: number
}
type Registro = {
  id: number
  codigo_producto: string
  valor_usd: number
  transportista: string
  total_usd: number
  total_clp: number
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  perfiles?: { nombre: string } | null
}

const CLP = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 0 })
const USD = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function QuotesImportCalculator({
  config,
  historial: historialInicial,
  esAdminOSup,
  esAdmin,
}: {
  config: Config
  historial: Registro[]
  esAdminOSup: boolean
  esAdmin: boolean
}) {
  const [codigo, setCodigo] = useState('')
  const [valorUsd, setValorUsd] = useState('')
  const [transportista, setTransportista] = useState<'FEDEX' | 'DHL'>('FEDEX')
  const [resultado, setResultado] = useState<Desglose | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [historial, setHistorial] = useState<Registro[]>(historialInicial)

  async function calcular(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setResultado(null)
    const resp = await fetch('/api/quotesimport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo_producto: codigo.trim(),
        valor_usd: Number(valorUsd),
        transportista,
      }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      setError(data.error || 'Error al calcular')
    } else {
      setResultado(data.desglose)
      setHistorial(prev => [{ ...data.registro, perfiles: null }, ...prev].slice(0, 50))
    }
    setLoading(false)
  }

  function limpiar() {
    setCodigo(''); setValorUsd(''); setResultado(null); setError('')
  }

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        {/* Formulario */}
        <form onSubmit={calcular} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Datos del producto</h3>
            {esAdmin && (
              <span className="text-xs text-gray-500">
                TC: ${CLP(config.tipo_cambio_clp)} · Recargo: {config.recargo_pct}%
              </span>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Código original del repuesto</label>
            <input required value={codigo} onChange={e => setCodigo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 12345-AB" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Valor del producto (USD)</label>
            <input required type="number" step="0.01" min="0.01" value={valorUsd} onChange={e => setValorUsd(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Transportista</label>
            <div className="grid grid-cols-2 gap-2">
              {(['FEDEX', 'DHL'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTransportista(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                    transportista === t
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? 'Calculando...' : 'Calcular'}
            </button>
            <button type="button" onClick={limpiar}
              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition">
              Limpiar
            </button>
          </div>
        </form>

        {/* Resultado */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Resultado</h3>
          {!resultado ? (
            <p className="text-sm text-gray-400">Ingresa los datos y presiona <strong>Calcular</strong>.</p>
          ) : esAdmin ? (
            <div className="space-y-3 text-sm">
              <Row label="Valor producto" value={`USD ${USD(resultado.valor_usd)}`} />
              <Row label={`Recargo ${resultado.recargo_pct}%`} value={`USD ${USD(resultado.monto_recargo_usd)}`} />
              <Row label="Subtotal con recargo" value={`USD ${USD(resultado.valor_con_recargo_usd)}`} bold />
              <Row label="Honorarios desaduanamiento" value={`USD ${USD(resultado.honorario_usd)}`} />
              <div className="border-t border-gray-200 pt-3 space-y-1.5">
                <Row label="Total USD" value={`USD ${USD(resultado.total_usd)}`} bold />
                <Row label={`Tipo de cambio`} value={`$${CLP(resultado.tipo_cambio_clp)}`} muted />
              </div>
              <div className="bg-blue-50 rounded-lg px-4 py-3 mt-2">
                <div className="text-xs text-blue-700 uppercase tracking-wide">Total final C/IVA Chile</div>
                <div className="text-2xl font-bold text-blue-900">${CLP(resultado.total_clp)} CLP</div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg px-4 py-6 text-center">
              <div className="text-xs text-blue-700 uppercase tracking-wide">Total final C/IVA Chile</div>
              <div className="text-3xl font-bold text-blue-900 mt-1">${CLP(resultado.total_clp)} CLP</div>
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            {esAdminOSup ? 'Historial de cotizaciones' : 'Tus últimas cotizaciones'}
          </h3>
          <span className="text-xs text-gray-400">{historial.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2 text-left font-medium text-gray-500">Fecha</th>
                {esAdminOSup && <th className="px-4 py-2 text-left font-medium text-gray-500">Usuario</th>}
                <th className="px-4 py-2 text-left font-medium text-gray-500">Código</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">USD</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Transp.</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Total CLP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historial.length === 0 ? (
                <tr><td colSpan={esAdminOSup ? 6 : 5} className="px-4 py-6 text-center text-gray-400 text-xs">Sin cotizaciones todavía</td></tr>
              ) : historial.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500">{new Date(h.created_at).toLocaleString('es-CL')}</td>
                  {esAdminOSup && <td className="px-4 py-2 text-gray-700">{h.perfiles?.nombre ?? '—'}</td>}
                  <td className="px-4 py-2 font-mono text-xs">{h.codigo_producto}</td>
                  <td className="px-4 py-2 text-right">{USD(Number(h.valor_usd))}</td>
                  <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{h.transportista}</span></td>
                  <td className="px-4 py-2 text-right font-semibold">${CLP(Number(h.total_clp))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-gray-400 text-xs' : 'text-gray-600'}>{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${muted ? 'text-gray-500 text-xs' : 'text-gray-900'}`}>{value}</span>
    </div>
  )
}
