'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'

type Perfil = { nombre: string; perfil: string; email: string }

const BADGE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  supervisor: 'bg-purple-100 text-purple-700',
  logistica: 'bg-green-100 text-green-700',
  ejecutivo: 'bg-blue-100 text-blue-700',
}

export default function Navbar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    const sb = createBrowserSupabase()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/ordenes', label: 'Órdenes' },
    ...(perfil.perfil === 'admin' ? [{ href: '/admin/usuarios', label: 'Usuarios' }] : []),
  ]

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-blue-600 text-lg">Fresman</Link>
        <div className="flex gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname.startsWith(l.href)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[perfil.perfil] || 'bg-gray-100 text-gray-600'}`}>
          {perfil.perfil}
        </span>
        <span className="text-sm text-gray-600">{perfil.nombre}</span>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 transition">
          Salir
        </button>
      </div>
    </nav>
  )
}
