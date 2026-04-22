import { getPerfil } from '@/lib/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import ProveedoresAdmin from './ProveedoresAdmin'

export default async function ProveedoresPage() {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') redirect('/dashboard')

  const db = getSupabaseAdmin() as any
  const { data: proveedores } = await db
    .from('proveedores')
    .select('*')
    .order('nombre')

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <p className="text-gray-500 text-sm mt-1">Gestión de proveedores de repuestos</p>
      </div>
      <ProveedoresAdmin proveedores={proveedores ?? []} />
    </div>
  )
}
