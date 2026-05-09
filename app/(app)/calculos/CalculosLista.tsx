'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

type Calculo = {
  id: number
  usuario_id: string
  usuario_nombre: string
  codigo_producto: string
  valor_usd: number
  transportista: string
  recargo_pct: number
  honorario_usd: number
  tipo_cambio_clp: number
  total_usd: number
  total_clp: number
  created_at: string
}

type Ejecutivo = { id: string; nombre: string }

const CLP = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 0 })
const USD = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CalculosLista({
  calculos,
  ejecutivos,
  esAdminOSup,
  esAdmin,
  filtroCodigo,
  filtroEjecutivo,
}: {
  calculos: Calculo[]
  ejecutivos: Ejecutivo[]
  esAdminOSup: boolean
  esAdmin: boolean
  filtroCodigo: string
  filtroEjecutivo: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [pending, start] = useTransition()
  const [codigo, setCodigo] = useState(filtroCodigo)
  const [ejecutivo, setEjecutivo] = useState(filtroEjecutivo)

  function aplicarFiltros(e?: React.FormEvent) {
    e?.preventDefault()
    const params = new URLSearchParams(sp.toString())
    if (codigo.trim()) params.set('codigo', codigo.trim()); else params.delete('codigo')
    if (ejecutivo)     params.set('ejecutivo', ejecutivo); else params.delete('ejecutivo')
    start(() => router.push(`/calculos${params.toString() ? '?' + params.toString() : ''}`))
  }

  function limpiar() {
    setCodigo(''); setEjecutivo('')
    start(() => router.push('/calculos'))
  }

  return (
    <div className="space-y-4">
      <form onSubmit={aplicarFiltros} className="bg-white rounded-xl border border-gray-200 p-4">
        <div className={`grid gap-3 ${esAdminOSup ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Código del repuesto</label>
            <input value={codigo} onChange={e => setCodigo(e.target.value)}
              placeholder="Búsqueda parcial"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {esAdminOSup && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Ejecutivo</label>
              <select value={ejecutivo} onChange={e => setEjecutivo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Todos —</option>
                {ejecutivos.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button type="submit" disabled={pending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50">
              {pending ? 'Filtrando...' : 'Aplicar'}
            </button>
            <button type="button" onClick={limpiar}
              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition">
              Limpiar
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Resultados</h3>
          <span className="text-xs text-gray-400">{calculos.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2 text-left font-medium text-gray-500">Fecha</th>
                {esAdminOSup && <th className="px-4 py-2 text-left font-medium text-gray-500">Ejecutivo</th>}
                <th className="px-4 py-2 text-left font-medium text-gray-500">Código</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">USD ingresado</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Transp.</th>
                {esAdmin && <th className="px-4 py-2 text-right font-medium text-gray-500">Honorario USD</th>}
                {esAdmin && <th className="px-4 py-2 text-right font-medium text-gray-500">TC</th>}
                <th className="px-4 py-2 text-right font-medium text-gray-500">Total CLP c/IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {calculos.length === 0 ? (
                <tr><td colSpan={esAdmin ? 8 : esAdminOSup ? 6 : 5} className="px-4 py-8 text-center text-gray-400 text-xs">
                  Sin cálculos registrados con esos filtros
                </td></tr>
              ) : calculos.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(c.created_at).toLocaleString('es-CL')}</td>
                  {esAdminOSup && <td className="px-4 py-2 text-gray-700">{c.usuario_nombre}</td>}
                  <td className="px-4 py-2 font-mono text-xs">{c.codigo_producto}</td>
                  <td className="px-4 py-2 text-right">{USD(Number(c.valor_usd))}</td>
                  <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{c.transportista}</span></td>
                  {esAdmin && <td className="px-4 py-2 text-right text-gray-600">{USD(Number(c.honorario_usd))}</td>}
                  {esAdmin && <td className="px-4 py-2 text-right text-gray-600">${CLP(Number(c.tipo_cambio_clp))}</td>}
                  <td className="px-4 py-2 text-right font-semibold">${CLP(Number(c.total_clp))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
