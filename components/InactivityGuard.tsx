'use client'
import { useEffect, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'

const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutos

export default function InactivityGuard() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function logout() {
      const sb = createBrowserSupabase()
      await sb.auth.signOut()
      window.location.href = '/login'
    }

    function reset() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(logout, TIMEOUT_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      if (timer.current) clearTimeout(timer.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [])

  return null
}
