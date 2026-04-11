import { redirect } from 'next/navigation'
import { getPerfil } from '@/lib/server'
import Navbar from '@/components/Navbar'
import InactivityGuard from '@/components/InactivityGuard'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfil()
  if (!perfil) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <InactivityGuard />
      <Navbar perfil={perfil} />
      <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  )
}
