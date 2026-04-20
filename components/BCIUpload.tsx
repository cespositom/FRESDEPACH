'use client'
import { useRef, useState } from 'react'

type Estado = 'idle' | 'uploading' | 'success' | 'error'

type RespuestaExito = {
  numero_orden?: string
  message?: string
  [key: string]: unknown
}

export default function BCIUpload() {
  const [estado, setEstado] = useState<Estado>('idle')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [respuesta, setRespuesta] = useState<RespuestaExito | null>(null)
  const [error, setError] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function validar(file: File): string | null {
    const esPdf = file.name.toLowerCase().endsWith('.pdf') && file.type === 'application/pdf'
    if (!esPdf) return 'El archivo no corresponde'
    if (file.size > 10 * 1024 * 1024) return 'El archivo no puede superar 10 MB'
    return null
  }

  function seleccionar(file: File) {
    const err = validar(file)
    if (err) { setError(err); return }
    setArchivo(file)
    setError('')
    setEstado('idle')
    setRespuesta(null)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) seleccionar(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) seleccionar(f)
  }

  async function subir() {
    if (!archivo) return
    setEstado('uploading')
    setError('')
    setRespuesta(null)

    const form = new FormData()
    form.append('file', archivo, archivo.name)

    try {
      const res = await fetch('/api/bci/upload', { method: 'POST', body: form })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error al procesar el archivo')
        setEstado('error')
      } else {
        setRespuesta(json)
        setEstado('success')
        setArchivo(null)
        if (inputRef.current) inputRef.current.value = ''
      }
    } catch {
      setError('Error de conexión. Intente nuevamente.')
      setEstado('error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Zona de drop */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition
          ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onInputChange}
        />
        <svg className="mx-auto mb-3 w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {archivo ? (
          <p className="text-sm font-medium text-blue-600">{archivo.name}</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">Arrastra el PDF aquí o <span className="text-blue-600 font-medium">selecciona un archivo</span></p>
            <p className="text-xs text-gray-400 mt-1">Solo PDF · máx 10 MB</p>
          </>
        )}
      </div>

      {/* Error de validación */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {error}
        </div>
      )}

      {/* Éxito */}
      {estado === 'success' && respuesta && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-semibold">Orden cargada exitosamente</p>
            {respuesta.numero_orden && (
              <p className="text-green-600">N° Orden: <span className="font-bold">{respuesta.numero_orden}</span></p>
            )}
          </div>
        </div>
      )}

      {/* Botón */}
      <button
        onClick={subir}
        disabled={!archivo || estado === 'uploading'}
        className="w-full py-3 rounded-xl font-semibold text-sm transition
          bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {estado === 'uploading' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Procesando...
          </span>
        ) : 'Cargar orden'}
      </button>
    </div>
  )
}
