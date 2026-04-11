'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'

type Perfil = { nombre: string; perfil: string; email: string }

const BADGE: Record<string, string> = {
  admin:      'bg-red-100 text-red-700',
  supervisor: 'bg-purple-100 text-purple-700',
  logistica:  'bg-green-100 text-green-700',
  ejecutivo:  'bg-blue-100 text-blue-700',
}

export default function Navbar({ perfil }: { perfil: Perfil }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    const sb = createBrowserSupabase()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/dashboard',        label: 'Dashboard' },
    { href: '/repuestos',        label: 'Repuestos' },
    { href: '/despacho',         label: 'Despacho' },
    { href: '/despachados',      label: 'Despachados' },
    ...(perfil.perfil !== 'logistica' ? [{ href: '/ordenes', label: 'Órdenes' }] : []),
    ...(perfil.perfil === 'admin' ? [{ href: '/admin/usuarios', label: 'Usuarios' }] : []),
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-bold text-blue-600 text-lg shrink-0">
            Fresman
          </Link>

          {/* Links desktop */}
          <div className="hidden md:flex gap-1">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition uppercase tracking-wide ${
                  pathname.startsWith(l.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: user info + hamburger */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[perfil.perfil] || 'bg-gray-100 text-gray-600'}`}>
              {perfil.perfil}
            </span>
            <Link href="/perfil" className="text-sm text-gray-600 max-w-[120px] truncate hover:text-blue-600 transition">
              {perfil.nombre}
            </Link>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 transition">
              Salir
            </button>
          </div>

          {/* Hamburger mobile */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
            aria-label="Menú"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 px-4 py-3 space-y-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition uppercase tracking-wide ${
                pathname.startsWith(l.href)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[perfil.perfil] || 'bg-gray-100 text-gray-600'}`}>
                {perfil.perfil}
              </span>
              <Link href="/perfil" onClick={() => setOpen(false)}
                className="text-sm text-gray-600 hover:text-blue-600 transition">
                {perfil.nombre}
              </Link>
            </div>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition">
              Salir
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
