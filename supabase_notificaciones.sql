-- ═══════════════════════════════════════════════════════════════
-- FRESMAN APP - Sistema de Notificaciones
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notificaciones (
  id            bigserial PRIMARY KEY,
  usuario_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo          text NOT NULL CHECK (tipo IN ('orden_asignada', 'listo_despacho')),
  mensaje       text NOT NULL,
  orden_id      bigint REFERENCES ordenes(id) ON DELETE CASCADE,
  orden_numero  text,
  leida         boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notificaciones_usuario_leida
  ON notificaciones(usuario_id, leida);

-- RLS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve sus propias notificaciones
DROP POLICY IF EXISTS "notificaciones_select" ON notificaciones;
CREATE POLICY "notificaciones_select" ON notificaciones
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());

-- Cualquier usuario autenticado puede crear notificaciones (para otros)
DROP POLICY IF EXISTS "notificaciones_insert" ON notificaciones;
CREATE POLICY "notificaciones_insert" ON notificaciones
  FOR INSERT TO authenticated WITH CHECK (true);

-- Solo el dueño puede marcarla como leída
DROP POLICY IF EXISTS "notificaciones_update" ON notificaciones;
CREATE POLICY "notificaciones_update" ON notificaciones
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

SELECT 'notificaciones OK' AS resultado;
