import { redirect } from 'next/navigation'
import { getPerfil } from '@/lib/server'
import BCIUpload from '@/components/BCIUpload'

export default async function BCIPage() {
  const perfil = await getPerfil()

  if (!perfil || !['admin', 'supervisor'].includes(perfil.perfil)) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-xl mx-auto mt-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cargar Orden BCI Seguros</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Sube el PDF de la orden. Se procesará automáticamente y quedará registrada en el sistema.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <BCIUpload />
      </div>
    </div>
  )
}
