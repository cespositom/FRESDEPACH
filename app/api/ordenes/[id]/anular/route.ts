import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { error } = await admin.from('ordenes').update({ estado: 'Anulada' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('auditoria').insert({
    tabla: 'ordenes',
    registro_id: id,
    campo: 'estado',
    valor_anterior: null,
    valor_nuevo: 'Anulada',
    usuario_nombre: perfil.nombre,
  })

  return NextResponse.json({ ok: true })
}
