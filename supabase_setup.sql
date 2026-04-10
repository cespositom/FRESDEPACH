-- ═══════════════════════════════════════════════════════════════
-- FRESMAN APP - Setup Supabase
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabla de perfiles (id = auth.users.id directamente)
CREATE TABLE IF NOT EXISTS perfiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  email       text NOT NULL,
  perfil      text NOT NULL CHECK (perfil IN ('admin', 'supervisor', 'logistica', 'ejecutivo')),
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 2. Tabla de auditoría de cambios de estado
CREATE TABLE IF NOT EXISTS auditoria (
  id              bigserial PRIMARY KEY,
  tabla           text NOT NULL,
  registro_id     text NOT NULL,
  campo           text NOT NULL,
  valor_anterior  text,
  valor_nuevo     text,
  usuario_nombre  text,
  created_at      timestamptz DEFAULT now()
);

-- 3. Columna ejecutivo_id en ordenes (si no existe)
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS ejecutivo_id uuid REFERENCES perfiles(id);

-- 4. Columna despachado_ok en repuestos_orden (si no existe)
ALTER TABLE repuestos_orden ADD COLUMN IF NOT EXISTS despachado_ok boolean DEFAULT false;

-- 5. Función helper para obtener el perfil del usuario actual
CREATE OR REPLACE FUNCTION auth_perfil()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT perfil FROM perfiles WHERE id = auth.uid()
$$;

-- 6. RLS - Perfiles
-- Solo lectura para usuarios autenticados; escritura solo vía service_role (API routes)
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfiles_select" ON perfiles;
DROP POLICY IF EXISTS "perfiles_insert" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update" ON perfiles;
CREATE POLICY "perfiles_select" ON perfiles
  FOR SELECT TO authenticated USING (true);
-- INSERT y UPDATE solo desde service_role (API /api/usuarios usa supabaseAdmin)

-- 7. RLS - Auditoría
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditoria_select" ON auditoria;
DROP POLICY IF EXISTS "auditoria_insert" ON auditoria;
CREATE POLICY "auditoria_select" ON auditoria
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auditoria_insert" ON auditoria
  FOR INSERT TO authenticated WITH CHECK (true);

-- 8. RLS - Ordenes
-- SELECT: admin/supervisor/logistica ven todas; ejecutivo solo las suyas
-- UPDATE: admin/supervisor (asignación de ejecutivo)
-- INSERT/DELETE: solo service_role (n8n workflow)
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ordenes_all" ON ordenes;
DROP POLICY IF EXISTS "ordenes_select" ON ordenes;
DROP POLICY IF EXISTS "ordenes_update" ON ordenes;
CREATE POLICY "ordenes_select" ON ordenes
  FOR SELECT TO authenticated USING (
    auth_perfil() IN ('admin', 'supervisor', 'logistica')
    OR ejecutivo_id = auth.uid()
  );
CREATE POLICY "ordenes_update" ON ordenes
  FOR UPDATE TO authenticated USING (
    auth_perfil() IN ('admin', 'supervisor')
  );

-- 9. RLS - Repuestos
-- SELECT: todos los autenticados
-- UPDATE: admin/supervisor/ejecutivo pueden marcar listo_despacho
--         admin/logistica pueden marcar despachado_ok
--         (la restricción por columna se refuerza en la app con CAN_LISTO / CAN_DESPACHADO)
-- INSERT/DELETE: solo service_role (n8n workflow)
ALTER TABLE repuestos_orden ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repuestos_all" ON repuestos_orden;
DROP POLICY IF EXISTS "repuestos_select" ON repuestos_orden;
DROP POLICY IF EXISTS "repuestos_update" ON repuestos_orden;
CREATE POLICY "repuestos_select" ON repuestos_orden
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "repuestos_update" ON repuestos_orden
  FOR UPDATE TO authenticated USING (
    auth_perfil() IN ('admin', 'supervisor', 'logistica', 'ejecutivo')
  );

-- 9. Vista ordenes con vencimiento calculado
CREATE OR REPLACE VIEW ordenes_con_vencimiento AS
SELECT
  o.*,
  a.nombre  AS aseguradora_nombre,
  v.patente, v.marca, v.modelo, v.anio,
  t.nombre  AS taller_nombre,
  p.nombre  AS ejecutivo_nombre,
  p.email   AS ejecutivo_email,
  -- Vencimiento = fecha + max(dias_despacho) de sus repuestos
  (o.fecha + INTERVAL '1 day' * COALESCE(
    (SELECT MAX(dias_despacho) FROM repuestos_orden WHERE orden_id = o.id AND dias_despacho IS NOT NULL), 0
  )) AS fecha_vencimiento,
  -- Días restantes
  EXTRACT(DAY FROM (
    (o.fecha + INTERVAL '1 day' * COALESCE(
      (SELECT MAX(dias_despacho) FROM repuestos_orden WHERE orden_id = o.id AND dias_despacho IS NOT NULL), 0
    )) - CURRENT_DATE
  ))::int AS dias_restantes,
  -- Conteo repuestos
  (SELECT COUNT(*) FROM repuestos_orden WHERE orden_id = o.id) AS total_repuestos,
  (SELECT COUNT(*) FROM repuestos_orden WHERE orden_id = o.id AND listo_despacho = true) AS repuestos_listos,
  (SELECT COUNT(*) FROM repuestos_orden WHERE orden_id = o.id AND despachado_ok = true) AS repuestos_despachados
FROM ordenes o
LEFT JOIN aseguradoras a ON a.id = o.aseguradora_id
LEFT JOIN vehiculos    v ON v.id = o.vehiculo_id
LEFT JOIN talleres     t ON t.id = o.taller_id
LEFT JOIN perfiles     p ON p.id = o.ejecutivo_id;

SELECT 'Setup completado OK' AS resultado;
