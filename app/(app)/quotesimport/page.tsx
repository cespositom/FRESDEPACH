import { getPerfil } from '@/lib/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import QuotesImportCalculator from './QuotesImportCalculator'

export default async function QuotesImportPage() {
  const perfil = await getPerfil()
  if (!perfil) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any
  const { data: config } = await db
    .from('config_importacion')
    .select('tipo_cambio_clp, recargo_pct')
    .eq('id', 1)
    .single()

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cotización de importación</h1>
        <p className="text-gray-500 text-sm mt-1">
          Calcula el valor en pesos de un producto importado vía FEDEX o DHL.
          El cálculo sirve para productos con proveedores autorizados con valor de flete a Chile incluido.
          Productos de tamaño mediano y grande confirmar, ya que tienen recargos no considerados en esta calculadora.
        </p>
      </div>
      <QuotesImportCalculator
        config={config ?? { tipo_cambio_clp: 0, recargo_pct: 25 }}
        esAdmin={perfil.perfil === 'admin'}
      />
    </div>
  )
}
