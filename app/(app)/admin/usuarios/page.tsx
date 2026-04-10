import { getPerfil } from '@/lib/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import UsuariosCliente from './UsuariosCliente'

export default async function UsuariosPage() {
  const perfil = await getPerfil()
  if (perfil?.perfil !== 'admin') redirect('/dashboard')

  const { data: usuarios } = await supabaseAdmin
    .from('perfiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-500 text-sm mt-1">Gestión de accesos al sistema</p>
      </div>
      <UsuariosCliente usuarios={usuarios ?? []} />
    </div>
  )
}
