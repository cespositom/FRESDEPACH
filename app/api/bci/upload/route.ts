import { NextRequest, NextResponse } from 'next/server'

const N8N_WEBHOOK = 'https://salbvador-fres-n8n.cysnsu.easypanel.host/webhook/bci-seguros/orden'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
  }

  const apiKey = process.env.N8N_WEBHOOK_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Configuración de API key faltante' }, { status: 500 })
  }

  const n8nForm = new FormData()
  n8nForm.append('data', file, file.name)

  const res = await fetch(N8N_WEBHOOK, {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey },
    body: n8nForm,
  })
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const mensaje = json.mensaje ?? json.message ?? 'Error al procesar la orden'
    return NextResponse.json({ error: mensaje }, { status: res.status })
  }

  return NextResponse.json(json)
}
