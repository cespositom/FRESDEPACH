-- ═══════════════════════════════════════════════════════════════
-- FRESDEPACH - Fix: ejecutivo no puede marcar órdenes como rebajadas
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════
-- La política previa solo permitía UPDATE a admin/supervisor.
-- Se amplía para que ejecutivo pueda actualizar SUS órdenes
-- (necesario para el toggle "rebajado" desde la app).

DROP POLICY IF EXISTS "ordenes_update" ON ordenes;

CREATE POLICY "ordenes_update" ON ordenes
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('admin', 'supervisor')
    OR (auth_perfil() = 'ejecutivo' AND ejecutivo_id = auth.uid())
  )
  WITH CHECK (
    auth_perfil() IN ('admin', 'supervisor')
    OR (auth_perfil() = 'ejecutivo' AND ejecutivo_id = auth.uid())
  );
