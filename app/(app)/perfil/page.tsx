import { getPerfil } from '@/lib/server'
import CambiarContrasena from './CambiarContrasena'

export default async function PerfilPage() {
  const perfil = await getPerfil()
  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Información de tu cuenta</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Nombre</p>
          <p className="font-semibold text-gray-900 mt-0.5">{perfil?.nombre}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
          <p className="text-gray-700 mt-0.5">{perfil?.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Perfil</p>
          <p className="text-gray-700 mt-0.5 capitalize">{perfil?.perfil}</p>
        </div>
      </div>

      <CambiarContrasena />
    </div>
  )
}
