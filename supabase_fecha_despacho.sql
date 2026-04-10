-- Ejecutar en Supabase SQL Editor
-- Agrega campo fecha_despacho a ordenes

ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS fecha_despacho date;

-- Actualizar vista para incluir fecha_despacho
CREATE OR REPLACE VIEW ordenes_con_vencimiento AS
SELECT
  o.*,
  a.nombre  AS aseguradora_nombre,
  v.patente, v.marca, v.modelo, v.anio,
  t.nombre  AS taller_nombre,
  t.comuna  AS taller_comuna,
  t.region  AS taller_region,
  t.direccion AS taller_direccion,
  p.nombre  AS ejecutivo_nombre,
  p.email   AS ejecutivo_email,
  (o.fecha + INTERVAL '1 day' * COALESCE(
    (SELECT MAX(dias_despacho) FROM repuestos_orden WHERE orden_id = o.id AND dias_despacho IS NOT NULL), 0
  )) AS fecha_vencimiento,
  EXTRACT(DAY FROM (
    (o.fecha + INTERVAL '1 day' * COALESCE(
      (SELECT MAX(dias_despacho) FROM repuestos_orden WHERE orden_id = o.id AND dias_despacho IS NOT NULL), 0
    )) - CURRENT_DATE
  ))::int AS dias_restantes,
  (SELECT COUNT(*) FROM repuestos_orden WHERE orden_id = o.id) AS total_repuestos,
  (SELECT COUNT(*) FROM repuestos_orden WHERE orden_id = o.id AND listo_despacho = true) AS repuestos_listos,
  (SELECT COUNT(*) FROM repuestos_orden WHERE orden_id = o.id AND despachado_ok = true) AS repuestos_despachados
FROM ordenes o
LEFT JOIN aseguradoras a ON a.id = o.aseguradora_id
LEFT JOIN vehiculos    v ON v.id = o.vehiculo_id
LEFT JOIN talleres     t ON t.id = o.taller_id
LEFT JOIN perfiles     p ON p.id = o.ejecutivo_id;

SELECT 'OK: fecha_despacho agregada y vista actualizada' AS resultado;
