import { NextRequest, NextResponse } from 'next/server'

const N8N_WEBHOOK = 'https://fresman-n8n.o56ldn.easypanel.host/webhook/bci-seguros/orden'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
  }

  const n8nForm = new FormData()
  n8nForm.append('data', file, file.name)

  const res = await fetch(N8N_WEBHOOK, { method: 'POST', body: n8nForm })
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    return NextResponse.json({ error: json.message ?? 'Error en n8n' }, { status: res.status })
  }

  return NextResponse.json(json)
}
