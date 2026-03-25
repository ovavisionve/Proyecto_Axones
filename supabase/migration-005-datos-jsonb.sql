-- ============================================================
-- MIGRACION 005: Columna datos JSONB en ordenes_trabajo
-- Permite almacenar el objeto completo de la orden sin perder campos
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Columna JSONB para almacenar el objeto JS completo de la orden
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}';

-- Columnas faltantes que el formulario JS usa pero no existian en la tabla
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS maquina VARCHAR(30);
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS planchas TEXT;
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS fecha_orden DATE;
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS cliente_rif VARCHAR(20);
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS mpps VARCHAR(50);
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS obs_materia_prima TEXT;
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS num_pistas INTEGER;

-- Indice para buscar dentro del JSONB
CREATE INDEX IF NOT EXISTS idx_ordenes_datos ON ordenes_trabajo USING GIN (datos);

-- Columna datos JSONB en control_tiempo para almacenar objeto completo
ALTER TABLE control_tiempo ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}';

-- Columna datos JSONB en produccion_impresion
ALTER TABLE produccion_impresion ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}';

-- Columna datos JSONB en produccion_laminacion
ALTER TABLE produccion_laminacion ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}';

-- Columna datos JSONB en produccion_corte
ALTER TABLE produccion_corte ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}';

-- Verificar
SELECT table_name, column_name, data_type FROM information_schema.columns
WHERE column_name = 'datos' AND table_schema = 'public'
ORDER BY table_name;
