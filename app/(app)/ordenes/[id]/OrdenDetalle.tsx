'use client'
import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Formatea fecha YYYY-MM-DD sin desfase de timezone
function fmtFecha(fecha: string) {
  const [y, m, d] = fecha.substring(0, 10).split('-')
  return `${d}/${m}/${y}`
}

type Repuesto = {
  id: number; nombre_repuesto: string; codigo_repuesto: string | null
  calidad: string; cantidad: number; dias_despacho: number | null
  precio_unitario: number; precio_embalaje: number; total: number
  listo_despacho: boolean; despachado_ok: boolean
  proveedor: string | null
}
type Perfil = { id: string; nombre: string; perfil: string }

const CAN_LISTO = ['admin', 'supervisor', 'ejecutivo']
const CAN_DESPACHADO = ['admin', 'supervisor', 'logistica']
const CAN_ASIGNAR = ['admin', 'supervisor']
const CAN_GUIA = ['admin', 'supervisor']
const CAN_REBAJADO = ['admin', 'supervisor', 'ejecutivo']
const CAN_ELIMINAR_REP = ['admin', 'supervisor']
const CAN_PROVEEDOR = ['admin', 'supervisor']

export default function OrdenDetalle({
  orden, repuestos, ejecutivos, auditoria, perfil, proveedores
}: {
  orden: any; repuestos: Repuesto[]; ejecutivos: any[]; auditoria: any[]; perfil: Perfil; proveedores: string[]
}) {
  const router = useRouter()
  const supabase = createBrowserSupabase()
  const [loading, setLoading] = useState<number | null>(null)
  const [ejLoading, setEjLoading] = useState(false)
  const [ejecutivoId, setEjecutivoId] = useState(orden.ejecutivo_id ?? '')
  const [localRep, setLocalRep] = useState<Repuesto[]>(repuestos)
  const [guia, setGuia] = useState<string>(orden.guia ?? '')
  const [guiaLoading, setGuiaLoading] = useState(false)
  const [nuevaObs, setNuevaObs] = useState<string>('')
  const [obsLoading, setObsLoading] = useState(false)
  const [rebajado, setRebajado] = useState<boolean>(orden.rebajado ?? false)
  const [rebajadoLoading, setRebajadoLoading] = useState(false)
  const [accionLoading, setAccionLoading] = useState<'anular' | 'eliminar' | null>(null)
  const [elimRepLoading, setElimRepLoading] = useState<number | null>(null)
  const [provLoading, setProvLoading] = useState<number | null>(null)

  async function toggleField(rep: Repuesto, field: 'listo_despacho' | 'despachado_ok') {
    setLoading(rep.id)
    const newVal = !rep[field]
    const { error } = await supabase
      .from('repuestos_orden')
      .update({ [field]: newVal })
      .eq('id', rep.id)

    if (!error) {
      await supabase.from('auditoria').insert({
        tabla: 'repuestos_orden',
        registro_id: rep.id,
        campo: field,
        valor_anterior: String(rep[field]),
        valor_nuevo: String(newVal),
        usuario_nombre: perfil.nombre,
      })
      const updated = localRep.map(r => r.id === rep.id ? { ...r, [field]: newVal } : r)
      setLocalRep(updated)

      // Todos listo_despacho → notificar a logística
      if (field === 'listo_despacho' && newVal && updated.every(r => r.listo_despacho)) {
        const { data: logistica } = await (supabase as any)
          .from('perfiles')
          .select('id')
          .eq('perfil', 'logistica')
          .eq('activo', true)
        if (logistica?.length) {
          await (supabase as any).from('notificaciones').insert(
            logistica.map((u: any) => ({
              usuario_id:   u.id,
              tipo:         'listo_despacho',
              mensaje:      `Orden ${orden.numero_orden} lista para despacho`,
              orden_id:     orden.id,
              orden_numero: orden.numero_orden,
            }))
          )
        }
      }

      // Si todos los repuestos están despachados, marcar fecha_despacho en la orden
      if (field === 'despachado_ok' && newVal && updated.every(r => r.despachado_ok)) {
        await fetch(`/api/ordenes/${orden.id}/despacho`, { method: 'POST' })
        router.refresh()
      }
    }
    setLoading(null)
  }

  async function guardarGuia() {
    setGuiaLoading(true)
    const { error } = await supabase.from('ordenes').update({ guia }).eq('id', orden.id)
    if (!error) {
      await supabase.from('auditoria').insert({
        tabla: 'ordenes',
        registro_id: orden.id,
        campo: 'guia',
        valor_anterior: orden.guia ?? '',
        valor_nuevo: guia,
        usuario_nombre: perfil.nombre,
      })
      router.refresh()
    }
    setGuiaLoading(false)
  }

  async function guardarObservaciones() {
    if (!nuevaObs.trim()) return
    setObsLoading(true)
    const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const entrada = `[${fecha} - ${perfil.nombre}]\n${nuevaObs.trim()}`
    const actual = orden.observaciones ?? ''
    const nuevo = actual ? `${entrada}\n\n${actual}` : entrada
    const { error } = await supabase.from('ordenes').update({ observaciones: nuevo }).eq('id', orden.id)
    if (!error) {
      setNuevaObs('')
      router.refresh()
    }
    setObsLoading(false)
  }

  async function toggleRebajado() {
    setRebajadoLoading(true)
    const nuevo = !rebajado
    const { data, error } = await supabase
      .from('ordenes')
      .update({ rebajado: nuevo })
      .eq('id', orden.id)
      .select('id')
    if (error || !data || data.length === 0) {
      alert('No se pudo actualizar el estado "rebajado". ' + (error?.message ?? 'La fila no fue modificada (revise permisos).'))
    } else {
      setRebajado(nuevo)
      await supabase.from('auditoria').insert({
        tabla: 'ordenes', registro_id: orden.id, campo: 'rebajado',
        valor_anterior: String(rebajado), valor_nuevo: String(nuevo),
        usuario_nombre: perfil.nombre,
      })
    }
    setRebajadoLoading(false)
  }

  async function anularOrden() {
    if (!confirm('¿Confirma que desea anular esta orden?')) return
    setAccionLoading('anular')
    await fetch(`/api/ordenes/${orden.id}/anular`, { method: 'POST' })
    setAccionLoading(null)
    router.refresh()
  }

  async function eliminarOrden() {
    if (!confirm('¿Confirma que desea ELIMINAR esta orden? Esta acción no se puede deshacer.')) return
    setAccionLoading('eliminar')
    await fetch(`/api/ordenes/${orden.id}/eliminar`, { method: 'DELETE' })
    setAccionLoading(null)
    router.push('/ordenes')
  }

  async function actualizarProveedor(rep: Repuesto, nuevoProveedor: string) {
    setProvLoading(rep.id)
    const valor = nuevoProveedor || null
    const { error } = await supabase
      .from('repuestos_orden')
      .update({ proveedor: valor })
      .eq('id', rep.id)
    if (!error) {
      await supabase.from('auditoria').insert({
        tabla: 'ordenes',
        registro_id: orden.id,
        campo: 'proveedor',
        valor_anterior: rep.proveedor ?? 'Sin proveedor',
        valor_nuevo: valor ?? 'Sin proveedor',
        usuario_nombre: perfil.nombre,
      })
      setLocalRep(prev => prev.map(r => r.id === rep.id ? { ...r, proveedor: valor } : r))
    }
    setProvLoading(null)
  }

  async function eliminarRepuesto(rep: Repuesto) {
    if (!confirm(`¿Eliminar el repuesto "${rep.nombre_repuesto}"? Esta acción no se puede deshacer.`)) return
    setElimRepLoading(rep.id)
    const res = await fetch(`/api/ordenes/${orden.id}/repuestos/${rep.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: rep.nombre_repuesto, codigo: rep.codigo_repuesto }),
    })
    if (res.ok) {
      setLocalRep(prev => prev.filter(r => r.id !== rep.id))
    }
    setElimRepLoading(null)
  }

  async function asignarEjecutivo() {
    setEjLoading(true)
    const ejAnterior = orden.ejecutivo_nombre ?? 'Sin asignar'
    const ejNuevo    = ejecutivos.find(e => e.id === ejecutivoId)?.nombre ?? 'Sin asignar'
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
    // Notificar al ejecutivo asignado (solo si es un usuario real)
    if (ejecutivoId) {
      await (supabase as any).from('notificaciones').insert({
        usuario_id:   ejecutivoId,
        tipo:         'orden_asignada',
        mensaje:      `Se te asignó la orden ${orden.numero_orden}`,
        orden_id:     orden.id,
        orden_numero: orden.numero_orden,
      })
    }
    setEjLoading(false)
    router.refresh()
  }

  const canListo       = CAN_LISTO.includes(perfil.perfil)
  const canDespacho    = CAN_DESPACHADO.includes(perfil.perfil)
  const canAsignar     = CAN_ASIGNAR.includes(perfil.perfil)
  const canGuia        = CAN_GUIA.includes(perfil.perfil)
  const canObs         = true
  const canRebajado    = CAN_REBAJADO.includes(perfil.perfil)
  const canEliminarRep = CAN_ELIMINAR_REP.includes(perfil.perfil)
  const canProveedor   = CAN_PROVEEDOR.includes(perfil.perfil)
  const esAdmin        = perfil.perfil === 'admin'

  const listos    = localRep.filter(r => r.listo_despacho).length
  const despachados = localRep.filter(r => r.despachado_ok).length

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orden {orden.numero_orden}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {orden.aseguradora_nombre} · {fmtFecha(orden.fecha)}
            {perfil.perfil !== 'ejecutivo' && (() => {
              const totalDespachados = localRep.length > 0 && localRep.every(r => r.despachado_ok)
              if (totalDespachados && orden.fecha_despacho) {
                return (
                  <span className="ml-2 font-medium text-green-600">
                    · Entregado {fmtFecha(orden.fecha_despacho)}
                  </span>
                )
              }
              if (orden.fecha_vencimiento) {
                return (
                  <span className={`ml-2 font-medium ${orden.dias_restantes < 0 ? 'text-red-600' : orden.dias_restantes <= 3 ? 'text-orange-500' : 'text-gray-600'}`}>
                    · Vence {fmtFecha(orden.fecha_vencimiento)}
                    {orden.dias_restantes < 0 ? ` (vencida ${Math.abs(orden.dias_restantes)}d)` : ` (${orden.dias_restantes}d)`}
                  </span>
                )
              }
              return null
            })()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            orden.estado === 'Pendiente'  ? 'bg-yellow-100 text-yellow-700' :
            orden.estado === 'Anulada'    ? 'bg-red-100 text-red-700' :
            'bg-green-100 text-green-700'
          }`}>
            {orden.estado}
          </span>
          {canRebajado && (
            <button
              onClick={toggleRebajado}
              disabled={rebajadoLoading}
              className={`text-xs px-3 py-1 rounded-full border transition disabled:opacity-50 ${
                rebajado
                  ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                  : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
              }`}
            >
              ¿Está rebajado? {rebajado ? 'Sí' : 'No'}
            </button>
          )}
          {esAdmin && orden.estado !== 'Anulada' && (
            <button
              onClick={anularOrden}
              disabled={accionLoading !== null}
              className="text-xs px-3 py-1 rounded-full border border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
            >
              {accionLoading === 'anular' ? '...' : 'Anular'}
            </button>
          )}
          {esAdmin && (
            <button
              onClick={eliminarOrden}
              disabled={accionLoading !== null}
              className="text-xs px-3 py-1 rounded-full border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {accionLoading === 'eliminar' ? '...' : 'Eliminar'}
            </button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className={`grid gap-4 ${['admin','supervisor'].includes(perfil.perfil) ? 'grid-cols-1 sm:grid-cols-3' : perfil.perfil === 'ejecutivo' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Vehículo</p>
          <p className="font-semibold">{orden.patente}</p>
          <p className="text-sm text-gray-600">{orden.marca} {orden.modelo} {orden.anio}</p>
          {perfil.perfil === 'ejecutivo' && (
            <p className="text-xs text-gray-500 pt-1">Siniestro: {orden.numero_siniestro}</p>
          )}
        </div>
        {perfil.perfil !== 'ejecutivo' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Taller</p>
            <p className="font-semibold text-sm">{orden.taller_nombre}</p>
            <p className="text-xs text-gray-500">Siniestro: {orden.numero_siniestro}</p>
          </div>
        )}
        {['admin', 'supervisor'].includes(perfil.perfil) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
            <p className="font-semibold text-lg">${orden.total?.toLocaleString('es-CL')}</p>
            <p className="text-xs text-gray-500">Liquidador: {orden.liquidador}</p>
          </div>
        )}
      </div>

      {/* Ejecutivo + Guía en la misma fila */}
      {(canAsignar || perfil.perfil !== 'ejecutivo') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {ejLoading ? '...' : 'Guardar'}
              </button>
            </div>
          )}
          {perfil.perfil !== 'ejecutivo' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">Guía de despacho</label>
                {canGuia ? (
                  <input
                    type="text"
                    value={guia}
                    onChange={e => setGuia(e.target.value)}
                    placeholder="N° de guía..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200">
                    {orden.guia ?? <span className="text-gray-400">Sin guía registrada</span>}
                  </p>
                )}
              </div>
              {canGuia && (
                <button
                  onClick={guardarGuia} disabled={guiaLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {guiaLoading ? '...' : 'Guardar'}
                </button>
              )}
            </div>
          )}
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
                {canProveedor && <th className="px-4 py-3 text-left font-medium text-gray-500">Proveedor</th>}
                <th className="px-4 py-3 text-left font-medium text-gray-500">Calidad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cant.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Días</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Listo despacho</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Despachado OK</th>
                {canEliminarRep && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {localRep.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.nombre_repuesto}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.codigo_repuesto ?? '—'}</td>
                  {canProveedor && (
                    <td className="px-4 py-3">
                      <select
                        value={r.proveedor ?? ''}
                        disabled={provLoading === r.id}
                        onChange={e => actualizarProveedor(r, e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 min-w-[130px]"
                      >
                        <option value="">Sin proveedor</option>
                        {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                  )}
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
                  {canEliminarRep && (
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={elimRepLoading === r.id}
                        onClick={() => eliminarRepuesto(r)}
                        className="w-8 h-8 rounded-lg border border-red-400 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition disabled:opacity-40 flex items-center justify-center mx-auto"
                        title="Eliminar repuesto"
                      >
                        {elimRepLoading === r.id ? (
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Observaciones */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Observaciones</h2>
        </div>
        {canObs && (
          <div className="px-5 py-4 border-b border-gray-100 flex gap-3">
            <textarea
              value={nuevaObs}
              onChange={e => setNuevaObs(e.target.value)}
              placeholder="Agregar observación..."
              rows={2}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={guardarObservaciones}
              disabled={obsLoading || !nuevaObs.trim()}
              className="self-end bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {obsLoading ? '...' : 'Agregar'}
            </button>
          </div>
        )}
        {orden.observaciones ? (
          <div className="px-5 py-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{orden.observaciones}</pre>
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Sin observaciones</p>
        )}
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historial de cambios</h2>
        </div>
        {auditoria.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">Sin cambios registrados</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {auditoria.map((a: any) => {
              const campoLabel: Record<string, string> = {
                listo_despacho:     'Listo para despacho',
                despachado_ok:      'Despachado OK',
                ejecutivo_id:       'Ejecutivo asignado',
                estado:             'Estado',
                guia:               'Guía de despacho',
                observaciones:      'Observaciones',
                repuesto_eliminado: 'Repuesto eliminado',
                proveedor:          'Proveedor',
              }
              const formatVal = (v: string) => {
                if (v === 'true')     return { txt: 'Sí',       cls: 'text-green-600' }
                if (v === 'false')    return { txt: 'No',       cls: 'text-red-500' }
                if (v === 'eliminado') return { txt: 'eliminado', cls: 'text-red-600 font-semibold' }
                if (!v || v === 'null') return { txt: 'Sin asignar', cls: 'text-gray-400' }
                return { txt: v, cls: 'text-gray-700' }
              }
              const ant = formatVal(a.valor_anterior)
              const nvo = formatVal(a.valor_nuevo)
              return (
                <div key={a.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-semibold text-gray-800">{a.usuario_nombre}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                      {campoLabel[a.campo] ?? a.campo}
                    </span>
                    <span className={`text-xs font-medium line-through ${ant.cls}`}>{ant.txt}</span>
                    <span className="text-gray-400">→</span>
                    <span className={`text-xs font-semibold ${nvo.cls}`}>{nvo.txt}</span>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString('es-CL')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
