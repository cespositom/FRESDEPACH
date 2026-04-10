'use client'
import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Repuesto = {
  id: number; nombre_repuesto: string; codigo_repuesto: string | null
  calidad: string; cantidad: number; dias_despacho: number | null
  precio_unitario: number; precio_embalaje: number; total: number
  listo_despacho: boolean; despachado_ok: boolean
}
type Perfil = { id: string; nombre: string; perfil: string }

const CAN_LISTO = ['admin', 'supervisor', 'ejecutivo']
const CAN_DESPACHADO = ['admin', 'logistica']
const CAN_ASIGNAR = ['admin', 'supervisor']

export default function OrdenDetalle({
  orden, repuestos, ejecutivos, auditoria, perfil
}: {
  orden: any; repuestos: Repuesto[]; ejecutivos: any[]; auditoria: any[]; perfil: Perfil
}) {
  const router = useRouter()
  const supabase = createBrowserSupabase()
  const [loading, setLoading] = useState<number | null>(null)
  const [ejLoading, setEjLoading] = useState(false)
  const [ejecutivoId, setEjecutivoId] = useState(orden.ejecutivo_id ?? '')
  const [localRep, setLocalRep] = useState<Repuesto[]>(repuestos)

  async function toggleField(rep: Repuesto, field: 'listo_despacho' | 'despachado_ok') {
    setLoading(rep.id)
    const newVal = !rep[field]
    const { error } = await supabase
      .from('repuestos_orden')
      .update({ [field]: newVal })
      .eq('id', rep.id)

    if (!error) {
      // Registrar auditoría
      await supabase.from('auditoria').insert({
        tabla: 'repuestos_orden',
        registro_id: rep.id,
        campo: field,
        valor_anterior: String(rep[field]),
        valor_nuevo: String(newVal),
        usuario_nombre: perfil.nombre,
      })
      setLocalRep(prev => prev.map(r => r.id === rep.id ? { ...r, [field]: newVal } : r))
    }
    setLoading(null)
  }

  async function asignarEjecutivo() {
    setEjLoading(true)
    const ejAnterior = orden.ejecutivo_nombre ?? 'Sin asignar'
    const ejNuevo = ejecutivos.find(e => e.id === ejecutivoId)?.nombre ?? 'Sin asignar'
    await supabase
      .from('ordenes')
      .update({ ejecutivo_id: ejecutivoId || null })
      .eq('id', orden.id)
    await supabase.from('auditoria').insert({
      tabla: 'ordenes',
      registro_id: orden.id,
      campo: 'ejecutivo_id',
      valor_anterior: ejAnterior,
      valor_nuevo: ejNuevo,
      usuario_nombre: perfil.nombre,
    })
    setEjLoading(false)
    router.refresh()
  }

  const canListo    = CAN_LISTO.includes(perfil.perfil)
  const canDespacho = CAN_DESPACHADO.includes(perfil.perfil)
  const canAsignar  = CAN_ASIGNAR.includes(perfil.perfil)

  const listos    = localRep.filter(r => r.listo_despacho).length
  const despachados = localRep.filter(r => r.despachado_ok).length

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orden {orden.numero_orden}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {orden.aseguradora_nombre} · {new Date(orden.fecha).toLocaleDateString('es-CL')}
            {orden.fecha_vencimiento && (
              <span className={`ml-2 font-medium ${orden.dias_restantes < 0 ? 'text-red-600' : orden.dias_restantes <= 3 ? 'text-orange-500' : 'text-gray-600'}`}>
                · Vence {new Date(orden.fecha_vencimiento).toLocaleDateString('es-CL')}
                {orden.dias_restantes < 0 ? ` (vencida ${Math.abs(orden.dias_restantes)}d)` : ` (${orden.dias_restantes}d)`}
              </span>
            )}
          </p>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${orden.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
          {orden.estado}
        </span>
      </div>

      {/* Info cards */}
      <div className={`grid gap-4 ${['admin','supervisor'].includes(perfil.perfil) ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Vehículo</p>
          <p className="font-semibold">{orden.patente}</p>
          <p className="text-sm text-gray-600">{orden.marca} {orden.modelo} {orden.anio}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Taller</p>
          <p className="font-semibold text-sm">{orden.taller_nombre}</p>
          <p className="text-xs text-gray-500">Siniestro: {orden.numero_siniestro}</p>
        </div>
        {['admin', 'supervisor'].includes(perfil.perfil) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
            <p className="font-semibold text-lg">${orden.total?.toLocaleString('es-CL')}</p>
            <p className="text-xs text-gray-500">Liquidador: {orden.liquidador}</p>
          </div>
        )}
      </div>

      {/* Asignar ejecutivo */}
      {canAsignar && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block mb-1">Ejecutivo asignado</label>
            <select
              value={ejecutivoId}
              onChange={e => setEjecutivoId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin asignar</option>
              {ejecutivos.map(e => <option key={e.id} value={e.id}>{e.nombre} ({e.email})</option>)}
            </select>
          </div>
          <button
            onClick={asignarEjecutivo} disabled={ejLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {ejLoading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}

      {/* Progreso repuestos */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-gray-500">Listos para despacho</p>
            <p className="text-xl font-bold text-blue-600">{listos}/{localRep.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Despachados</p>
            <p className="text-xl font-bold text-green-600">{despachados}/{localRep.length}</p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-gray-100 rounded-full">
          <div className="h-2 bg-blue-500 rounded-full transition-all"
            style={{ width: `${localRep.length > 0 ? listos / localRep.length * 100 : 0}%` }} />
        </div>
      </div>

      {/* Tabla repuestos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Repuestos</h2>
          <span className="text-xs text-gray-400">{localRep.length} ítems</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Repuesto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Calidad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cant.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Días</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Listo despacho</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Despachado OK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {localRep.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.nombre_repuesto}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.codigo_repuesto ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.calidad === 'ORIGINAL' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {r.calidad}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.cantidad}</td>
                  <td className="px-4 py-3 text-gray-600">{r.dias_despacho ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">${r.total?.toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      disabled={!canListo || loading === r.id}
                      onClick={() => canListo && toggleField(r, 'listo_despacho')}
                      className={`w-8 h-8 rounded-lg border-2 transition font-bold text-xs
                        ${r.listo_despacho
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 text-gray-300 hover:border-blue-400'}
                        ${!canListo ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {r.listo_despacho ? '✓' : ''}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      disabled={!canDespacho || loading === r.id}
                      onClick={() => canDespacho && toggleField(r, 'despachado_ok')}
                      className={`w-8 h-8 rounded-lg border-2 transition font-bold text-xs
                        ${r.despachado_ok
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 text-gray-300 hover:border-green-400'}
                        ${!canDespacho ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {r.despachado_ok ? '✓' : ''}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auditoría */}
      {auditoria.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Historial de cambios</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {auditoria.map((a: any) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-700">{a.usuario_nombre}</span>
                  <span className="text-gray-500"> cambió </span>
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{a.campo}</span>
                  <span className="text-gray-500"> de </span>
                  <span className={`font-medium ${a.valor_anterior === 'false' ? 'text-red-500' : 'text-green-500'}`}>
                    {a.valor_anterior === 'true' ? 'Sí' : a.valor_anterior === 'false' ? 'No' : a.valor_anterior}
                  </span>
                  <span className="text-gray-500"> a </span>
                  <span className={`font-medium ${a.valor_nuevo === 'true' ? 'text-green-500' : 'text-red-500'}`}>
                    {a.valor_nuevo === 'true' ? 'Sí' : a.valor_nuevo === 'false' ? 'No' : a.valor_nuevo}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleString('es-CL')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
