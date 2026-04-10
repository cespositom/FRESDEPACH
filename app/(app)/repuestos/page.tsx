import { getPerfil, createServerSupabase } from '@/lib/server'
import Link from 'next/link'

export default async function RepuestosPendientesPage() {
  const perfil = await getPerfil()
  const supabase = await createServerSupabase()

  // Repuestos pendientes con info de orden y vencimiento
  const { data: repuestos } = await (supabase as any)
    .from('repuestos_orden')
    .select(`
      id, nombre_repuesto, codigo_repuesto, cantidad, calidad, dias_despacho,
      orden:ordenes_con_vencimiento (
        id, numero_orden, numero_siniestro, fecha_vencimiento, dias_restantes,
        patente, marca, modelo, taller_nombre, ejecutivo_id, ejecutivo_nombre
      )
    `)
    .eq('listo_despacho', false)
    .eq('despachado_ok', false)
    .order('id')

  // Filtrar por ejecutivo si corresponde
  let lista = (repuestos ?? []).filter((r: any) => r.orden)
  if (perfil?.perfil === 'ejecutivo') {
    lista = lista.filter((r: any) => r.orden.ejecutivo_id === perfil.id)
  }

  // Ordenar por dias_restantes ascendente (más urgente primero, vencidos primero)
  lista.sort((a: any, b: any) => {
    const da = a.orden.dias_restantes ?? 999
    const db = b.orden.dias_restantes ?? 999
    return da - db
  })

  function diasColor(dias: number | null) {
    if (dias === null) return 'text-gray-400'
    if (dias < 0) return 'text-red-600 font-semibold'
    if (dias <= 2) return 'text-orange-500 font-semibold'
    if (dias <= 5) return 'text-yellow-600'
    return 'text-green-600'
  }

  function diasLabel(dias: number | null) {
    if (dias === null) return '—'
    if (dias < 0) return `Vencida ${Math.abs(dias)}d`
    if (dias === 0) return 'Vence hoy'
    return `${dias}d`
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Repuestos pendientes</h1>
        <p className="text-gray-500 text-sm mt-1">
          {lista.length} repuestos sin marcar como listo · ordenados por urgencia
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Días venc.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Repuesto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cant.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">N° Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Siniestro</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Vehículo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Taller</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ejecutivo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lista.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className={`px-4 py-3 text-sm whitespace-nowrap ${diasColor(r.orden.dias_restantes)}`}>
                    {diasLabel(r.orden.dias_restantes)}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.nombre_repuesto}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.codigo_repuesto ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.cantidad}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.orden.numero_orden}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.orden.numero_siniestro ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.orden.patente}</div>
                    <div className="text-xs text-gray-400">{r.orden.marca} {r.orden.modelo}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{r.orden.taller_nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{r.orden.ejecutivo_nombre ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <Link href={`/ordenes/${r.orden.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    No hay repuestos pendientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
