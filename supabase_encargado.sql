-- ═══════════════════════════════════════════════════════════════
-- FRESMAN APP - Columna Encargado en repuestos_orden
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE repuestos_orden
  ADD COLUMN IF NOT EXISTS encargado boolean DEFAULT false;

SELECT 'encargado OK' AS resultado;
