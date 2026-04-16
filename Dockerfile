FROM node:20-alpine AS base

# ── Dependencias ──────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Build ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables embebidas en el bundle (NEXT_PUBLIC) — solo las que Next.js necesita en build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG ALLOWED_ORIGIN

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV ALLOWED_ORIGIN=$ALLOWED_ORIGIN
# SUPABASE_SERVICE_ROLE_KEY se inyecta en runtime por Easypanel, no en build
ENV NEXT_TELEMETRY_DISABLED=1

# Validar que las vars estén presentes antes de compilar
RUN test -n "$NEXT_PUBLIC_SUPABASE_URL" || (echo "ERROR: NEXT_PUBLIC_SUPABASE_URL no está definida" && exit 1)
RUN test -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" || (echo "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY no está definida" && exit 1)

RUN npm run build

# ── Imagen de producción ──────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# SUPABASE_SERVICE_ROLE_KEY y ALLOWED_ORIGIN son inyectadas en runtime por Easypanel
# No se declaran aquí para evitar que queden grabadas en las capas de la imagen

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid  1001 nextjs

RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
