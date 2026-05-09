import { getPerfil } from '@/lib/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import CalculosLista from './CalculosLista'

export const dynamic = 'force-dynamic'

export default async function CalculosPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string; ejecutivo?: string }>
}) {
  const perfil = await getPerfil()
  if (!perfil) redirect('/login')

  const params = await searchParams
  const filtroCodigo = (params.codigo ?? '').trim()
  const filtroEjecutivo = (params.ejecutivo ?? '').trim()
  const esAdminOSup = ['admin', 'supervisor'].includes(perfil.perfil)
  const esAdmin = perfil.perfil === 'admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any

  let query = db
    .from('cotizaciones_importacion')
    .select('*, perfiles:usuario_id (id, nombre)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!esAdminOSup) {
    query = query.eq('usuario_id', perfil.id)
  } else if (filtroEjecutivo) {
    query = query.eq('usuario_id', filtroEjecutivo)
  }
  if (filtroCodigo) {
    query = query.ilike('codigo_producto', `%${filtroCodigo}%`)
  }

  const { data: calculos } = await query

  let ejecutivos: { id: string; nombre: string }[] = []
  if (esAdminOSup) {
    const { data } = await db
      .from('perfiles')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
    ejecutivos = data ?? []
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cálculos de importación</h1>
        <p className="text-gray-500 text-sm mt-1">
          {esAdminOSup
            ? 'Historial completo de cotizaciones generadas por todos los usuarios.'
            : 'Tu historial de cotizaciones generadas en /quotesimport.'}
        </p>
      </div>
      <CalculosLista
        calculos={calculos ?? []}
        ejecutivos={ejecutivos}
        esAdminOSup={esAdminOSup}
        esAdmin={esAdmin}
        filtroCodigo={filtroCodigo}
        filtroEjecutivo={filtroEjecutivo}
      />
    </div>
  )
}
