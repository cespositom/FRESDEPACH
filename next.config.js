/** @type {import('next').NextConfig} */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

const securityHeaders = [
  // Evita clickjacking
  { key: 'X-Frame-Options',              value: 'SAMEORIGIN' },
  // Evita MIME sniffing
  { key: 'X-Content-Type-Options',       value: 'nosniff' },
  // Protección XSS en navegadores legacy
  { key: 'X-XSS-Protection',             value: '1; mode=block' },
  // Controla información del referrer
  { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
  // Fuerza HTTPS por 1 año (activar solo cuando el dominio tenga HTTPS estable)
  { key: 'Strict-Transport-Security',    value: 'max-age=31536000; includeSubDomains' },
  // Restringe acceso a features del navegador
  { key: 'Permissions-Policy',           value: 'camera=(), microphone=(), geolocation=()' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Supabase API y Auth
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co'} https://*.supabase.co wss://*.supabase.co`,
      // Estilos inline de Tailwind
      "style-src 'self' 'unsafe-inline'",
      // Scripts: self + Next.js eval en dev
      process.env.NODE_ENV === 'development'
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
        : "script-src 'self'",
      "font-src 'self'",
      "img-src 'self' data: blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      // Security headers en todas las rutas
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // CORS solo en rutas API
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',      value: ALLOWED_ORIGIN },
          { key: 'Access-Control-Allow-Methods',     value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers',     value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
