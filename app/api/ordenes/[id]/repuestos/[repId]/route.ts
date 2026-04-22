import { NextRequest, NextResponse } from 'next/server'
import { getPerfil } from '@/lib/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; repId: string }> }
) {
  const { id, repId } = await params
  const perfil = await getPerfil()

  if (!perfil || !['admin', 'supervisor'].includes(perfil.perfil)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { nombre, codigo } = body

  const admin: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin.from('repuestos_orden').delete().eq('id', repId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('auditoria').insert({
    tabla: 'ordenes',
    registro_id: id,
    campo: 'repuesto_eliminado',
    valor_anterior: `${nombre ?? repId}${codigo ? ` (${codigo})` : ''}`,
    valor_nuevo: 'eliminado',
    usuario_nombre: perfil.nombre,
  })

  return NextResponse.json({ ok: true })
}
