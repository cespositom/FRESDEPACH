'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import NotificationBell from './NotificationBell'

type Perfil = { id: string; nombre: string; perfil: string; email: string }
type MenuItem = { href: string; label: string }
type MenuGroup = { label: string; children: MenuItem[] }
type MenuEntry = MenuItem | MenuGroup

const isGroup = (e: MenuEntry): e is MenuGroup => 'children' in e

const BADGE: Record<string, string> = {
  admin:      'bg-red-100 text-red-700',
  supervisor: 'bg-purple-100 text-purple-700',
  logistica:  'bg-green-100 text-green-700',
  ejecutivo:  'bg-blue-100 text-blue-700',
}

export default function Navbar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function logout() {
    const sb = createBrowserSupabase()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const esAdmin = perfil.perfil === 'admin'
  const esSup = perfil.perfil === 'supervisor'
  const esLog = perfil.perfil === 'logistica'
  const verAdmonSup = esAdmin || esSup

  const menu: MenuEntry[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/repuestos', label: 'Repuestos' },
    {
      label: 'Logística',
      children: [
        { href: '/despacho',    label: 'Despacho' },
        { href: '/despachados', label: 'Despachados' },
      ],
    },
    ...(!esLog ? [{
      label: 'Seguimiento',
      children: [
        { href: '/ordenes',    label: 'Órdenes' },
        { href: '/porrebajar', label: 'Por Rebajar' },
        ...(verAdmonSup ? [{ href: '/anuladas', label: 'Anuladas' }] : []),
      ],
    } as MenuGroup] : []),
    ...(verAdmonSup ? [{ href: '/bci', label: 'Cargar' } as MenuItem] : []),
    {
      label: 'Importación',
      children: [
        { href: '/quotesimport', label: 'Cotizar' },
        { href: '/calculos',     label: 'Cálculos' },
      ],
    },
    ...(esAdmin ? [{
      label: 'Admin',
      children: [
        { href: '/admin/usuarios',      label: 'Usuarios' },
        { href: '/admin/proveedores',   label: 'Proveedores' },
        { href: '/admin/configuracion', label: 'Configuración' },
      ],
    } as MenuGroup] : []),
  ]

  const itemActivo = (href: string) => pathname.startsWith(href)
  const grupoActivo = (g: MenuGroup) => g.children.some(c => itemActivo(c.href))

  return (
    <nav className="bg-white border-b border-gray-200">
      <div ref={navRef} className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-bold text-blue-600 text-lg shrink-0 tracking-wide">
            FRESMAN
          </Link>

          {/* Menú desktop */}
          <div className="hidden md:flex gap-1">
            {menu.map(entry => isGroup(entry) ? (
              <div key={entry.label} className="relative">
                <button
                  onClick={() => setOpenMenu(openMenu === entry.label ? null : entry.label)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition uppercase tracking-wide flex items-center gap-1 ${
                    grupoActivo(entry)
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-gray-700 font-semibold hover:bg-gray-100'
                  }`}>
                  {entry.label}
                  <svg className={`w-3 h-3 transition-transform ${openMenu === entry.label ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openMenu === entry.label && (
                  <div className="absolute left-0 mt-1 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                    {entry.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpenMenu(null)}
                        className={`block px-4 py-2 text-sm transition ${
                          itemActivo(child.href)
                            ? 'bg-blue-50 text-blue-600 font-bold'
                            : 'text-gray-700 font-medium hover:bg-gray-100'
                        }`}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={entry.href}
                href={entry.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition uppercase tracking-wide ${
                  itemActivo(entry.href)
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-gray-700 font-semibold hover:bg-gray-100'
                }`}>
                {entry.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: campana + user info + hamburger */}
        <div className="flex items-center gap-2">
          <NotificationBell userId={perfil.id} />

          <div className="hidden sm:flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[perfil.perfil] || 'bg-gray-100 text-gray-600'}`}>
              {perfil.perfil}
            </span>
            <Link href="/perfil" className="text-sm font-black uppercase text-gray-900 max-w-[120px] truncate hover:text-blue-600 transition">
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
          {menu.map(entry => isGroup(entry) ? (
            <div key={entry.label}>
              <button
                onClick={() => setOpenMobileGroup(openMobileGroup === entry.label ? null : entry.label)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition uppercase tracking-wide ${
                  grupoActivo(entry)
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-gray-700 font-semibold hover:bg-gray-100'
                }`}>
                <span>{entry.label}</span>
                <svg className={`w-3 h-3 transition-transform ${openMobileGroup === entry.label ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openMobileGroup === entry.label && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                  {entry.children.map(child => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => { setOpen(false); setOpenMobileGroup(null) }}
                      className={`block px-3 py-2 rounded-lg text-sm transition ${
                        itemActivo(child.href)
                          ? 'bg-blue-50 text-blue-600 font-bold'
                          : 'text-gray-700 font-medium hover:bg-gray-100'
                      }`}>
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm transition uppercase tracking-wide ${
                itemActivo(entry.href)
                  ? 'bg-blue-50 text-blue-600 font-bold'
                  : 'text-gray-700 font-semibold hover:bg-gray-100'
              }`}>
              {entry.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[perfil.perfil] || 'bg-gray-100 text-gray-600'}`}>
                {perfil.perfil}
              </span>
              <Link href="/perfil" onClick={() => setOpen(false)}
                className="text-sm font-black uppercase text-gray-900 hover:text-blue-600 transition">
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
