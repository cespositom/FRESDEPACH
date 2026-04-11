-- ═══════════════════════════════════════════════════════════════
-- FRESMAN - Reglas de vencimiento de órdenes
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Función: agrega N días hábiles (excluye sábado y domingo)
CREATE OR REPLACE FUNCTION add_business_days(start_date date, days integer)
RETURNS date AS $$
DECLARE
  result date := start_date;
  added  int  := 0;
BEGIN
  IF days <= 0 THEN RETURN start_date; END IF;
  WHILE added < days LOOP
    result := result + 1;
    -- DOW: 0 = Domingo, 6 = Sábado
    IF EXTRACT(DOW FROM result) NOT IN (0, 6) THEN
      added := added + 1;
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Vista ordenes_con_vencimiento con:
--    - Días hábiles (sin sábado ni domingo)
--    - ZURICH ASEGURADORA: si dias_despacho = 15 → se usa 7
CREATE OR REPLACE VIEW ordenes_con_vencimiento AS
SELECT
  o.*,
  a.nombre     AS aseguradora_nombre,
  v.patente, v.marca, v.modelo, v.anio,
  t.nombre     AS taller_nombre,
  t.comuna     AS taller_comuna,
  t.region     AS taller_region,
  t.direccion  AS taller_direccion,
  p.nombre     AS ejecutivo_nombre,
  p.email      AS ejecutivo_email,

  -- fecha_vencimiento = fecha + max(dias hábiles) aplicando reglas
  add_business_days(
    o.fecha::date,
    COALESCE(
      (SELECT MAX(
         CASE
           WHEN a.nombre ILIKE '%ZURICH%' AND r.dias_despacho = 15 THEN 7
           ELSE r.dias_despacho
         END
       )
       FROM repuestos_orden r
       WHERE r.orden_id = o.id AND r.dias_despacho IS NOT NULL
      ), 0
    )
  ) AS fecha_vencimiento,

  -- dias_restantes = días de calendario entre hoy y fecha_vencimiento
  (
    add_business_days(
      o.fecha::date,
      COALESCE(
        (SELECT MAX(
           CASE
             WHEN a.nombre ILIKE '%ZURICH%' AND r.dias_despacho = 15 THEN 7
             ELSE r.dias_despacho
           END
         )
         FROM repuestos_orden r
         WHERE r.orden_id = o.id AND r.dias_despacho IS NOT NULL
        ), 0
      )
    ) - CURRENT_DATE
  )::int AS dias_restantes,

  -- Conteo repuestos
  (SELECT COUNT(*)   FROM repuestos_orden WHERE orden_id = o.id)                            AS total_repuestos,
  (SELECT COUNT(*)   FROM repuestos_orden WHERE orden_id = o.id AND listo_despacho = true)  AS repuestos_listos,
  (SELECT COUNT(*)   FROM repuestos_orden WHERE orden_id = o.id AND despachado_ok = true)   AS repuestos_despachados

FROM ordenes o
LEFT JOIN aseguradoras a ON a.id = o.aseguradora_id
LEFT JOIN vehiculos    v ON v.id = o.vehiculo_id
LEFT JOIN talleres     t ON t.id = o.taller_id
LEFT JOIN perfiles     p ON p.id = o.ejecutivo_id;

SELECT 'OK: días hábiles y regla Zurich aplicados' AS resultado;
