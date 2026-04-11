import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const perfil = await getPerfil()
  if (!perfil || perfil.perfil !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const admin: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Eliminar repuestos primero (si no hay cascade en BD)
  await admin.from('repuestos_orden').delete().eq('orden_id', id)
  // Eliminar auditoría de la orden
  await admin.from('auditoria').delete().eq('tabla', 'ordenes').eq('registro_id', id)

  const { error } = await admin.from('ordenes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
