import { getPerfil } from '@/lib/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import ConfiguracionImport from './ConfiguracionImport'

export default async function ConfiguracionPage() {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') redirect('/dashboard')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data: config } = await db
    .from('config_importacion')
    .select('*')
    .eq('id', 1)
    .single()

  const { data: tarifas } = await db
    .from('tarifas_desaduanamiento')
    .select('*')
    .order('transportista')
    .order('valor_hasta_usd')

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración importación</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tipo de cambio, recargo y tarifas de desaduanamiento usadas en /quotesimport.
        </p>
      </div>
      <ConfiguracionImport
        config={config ?? { tipo_cambio_clp: 0, recargo_pct: 25 }}
        tarifas={tarifas ?? []}
      />
    </div>
  )
}
