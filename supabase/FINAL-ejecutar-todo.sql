-- ============================================================
-- AXONES - SQL CONSOLIDADO (ejecutar UNA SOLA VEZ)
-- Consolida migrations 007 + 008 + garantiza persistencia completa
-- Copia TODO este archivo y pegalo en Supabase SQL Editor -> Run
-- ============================================================

-- ============================================================
-- 1. ORDENES_TRABAJO: ampliar estados validos (incluye 'nueva')
-- ============================================================
ALTER TABLE public.ordenes_trabajo
    DROP CONSTRAINT IF EXISTS ordenes_trabajo_estado_check;

ALTER TABLE public.ordenes_trabajo
    ADD CONSTRAINT ordenes_trabajo_estado_check
    CHECK (estado IN (
        'nueva', 'pendiente', 'en_proceso',
        'montaje', 'impresion', 'laminacion', 'corte',
        'calidad', 'despacho', 'completada', 'despachada',
        'cancelada', 'suspendida'
    ));

-- ============================================================
-- 2. ALERTAS: arreglar constraint y agregar columnas que usa el codigo
-- ============================================================
ALTER TABLE public.alertas
    DROP CONSTRAINT IF EXISTS alertas_tipo_check;

ALTER TABLE public.alertas
    ADD CONSTRAINT alertas_tipo_check
    CHECK (tipo IN (
        'stock_bajo', 'produccion', 'calidad', 'mantenimiento', 'general',
        'info', 'warning', 'danger', 'success', 'critical', 'error',
        'merma', 'montaje_lento', 'consumo_tinta', 'despacho_retrasado',
        'solicitud_material', 'bobina_rechazada', 'patron_merma',
        'stock_insuficiente_pedido', 'tiempo_muerto_alto', 'refil_alto',
        'refil_critico', 'produccion_baja'
    ));

ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS modulo VARCHAR(50);
ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS resuelta BOOLEAN DEFAULT FALSE;
ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';
ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS referencia VARCHAR(100);
ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS resuelta_por VARCHAR(100);
ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS fecha_resolucion TIMESTAMPTZ;
ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS datos JSONB;
ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS nivel VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_alertas_resuelta ON public.alertas(resuelta) WHERE resuelta = FALSE;
CREATE INDEX IF NOT EXISTS idx_alertas_modulo ON public.alertas(modulo);
CREATE INDEX IF NOT EXISTS idx_alertas_created_at ON public.alertas(created_at);

-- ============================================================
-- 3. CONTROL_TIEMPO: ampliar fase y estado (montaje incluido)
-- ============================================================
ALTER TABLE public.control_tiempo DROP CONSTRAINT IF EXISTS control_tiempo_fase_check;
ALTER TABLE public.control_tiempo
    ADD CONSTRAINT control_tiempo_fase_check
    CHECK (fase IN ('montaje', 'impresion', 'laminacion', 'corte', 'despacho'));

ALTER TABLE public.control_tiempo DROP CONSTRAINT IF EXISTS control_tiempo_estado_check;
ALTER TABLE public.control_tiempo
    ADD CONSTRAINT control_tiempo_estado_check
    CHECK (estado IN (
        'pendiente', 'en_progreso', 'pausada', 'completada',
        'pausada_con_motivo', 'reiniciada', 'cancelada'
    ));

-- ============================================================
-- 4. MOVIMIENTOS_INVENTARIO: permitir despacho/recepcion
-- ============================================================
ALTER TABLE public.movimientos_inventario
    DROP CONSTRAINT IF EXISTS movimientos_inventario_tipo_check;
ALTER TABLE public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_tipo_check
    CHECK (tipo IN (
        'entrada', 'salida', 'ajuste', 'devolucion',
        'despacho', 'recepcion', 'consumo', 'traspaso', 'misc'
    ));

-- ============================================================
-- 5. ADHESIVOS: ampliar tipo (soporta 'quimico')
-- ============================================================
ALTER TABLE public.adhesivos DROP CONSTRAINT IF EXISTS adhesivos_tipo_check;
ALTER TABLE public.adhesivos
    ADD CONSTRAINT adhesivos_tipo_check
    CHECK (tipo IN (
        'adhesivo', 'catalizador', 'acetato', 'solvente',
        'quimico', 'alcohol', 'otro'
    ));

-- ============================================================
-- 6. PROVEEDORES: ampliar tipo
-- ============================================================
ALTER TABLE public.proveedores DROP CONSTRAINT IF EXISTS proveedores_tipo_check;
ALTER TABLE public.proveedores
    ADD CONSTRAINT proveedores_tipo_check
    CHECK (tipo IN (
        'sustratos', 'tintas', 'solventes', 'adhesivos',
        'quimicos', 'miscelaneos', 'transporte', 'servicios', 'otros'
    ));

-- ============================================================
-- 7. SYNC_STORE: asegurar estructura correcta (key/value)
-- La tabla usa 'key' y 'value' (no 'clave' y 'valor')
-- El codigo JS se ajusto para usar los nombres correctos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sync_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT DEFAULT 'sistema'
);

-- RLS para sync_store (debe estar abierto para autenticados)
ALTER TABLE public.sync_store ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.sync_store;
CREATE POLICY "Acceso total autenticados" ON public.sync_store FOR ALL USING (true);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_sync_store_updated_at ON public.sync_store(updated_at DESC);

-- ============================================================
-- 8. PRODUCCION: asegurar que tengan created_at default
-- (a veces inserts fallan por triggers mal configurados)
-- ============================================================
ALTER TABLE public.produccion_impresion
    ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.produccion_laminacion
    ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.produccion_corte
    ALTER COLUMN created_at SET DEFAULT NOW();

-- Asegurar que RLS permite inserts
ALTER TABLE public.produccion_impresion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.produccion_impresion;
CREATE POLICY "Acceso total autenticados" ON public.produccion_impresion FOR ALL USING (true);

ALTER TABLE public.produccion_laminacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.produccion_laminacion;
CREATE POLICY "Acceso total autenticados" ON public.produccion_laminacion FOR ALL USING (true);

ALTER TABLE public.produccion_corte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.produccion_corte;
CREATE POLICY "Acceso total autenticados" ON public.produccion_corte FOR ALL USING (true);

-- ============================================================
-- 9. ORDENES_TRABAJO: politica RLS para guardar OTs
-- ============================================================
ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.ordenes_trabajo;
CREATE POLICY "Acceso total autenticados" ON public.ordenes_trabajo FOR ALL USING (true);

-- ============================================================
-- 10. INVENTARIO TABLAS: politica RLS
-- ============================================================
ALTER TABLE public.materiales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.materiales;
CREATE POLICY "Acceso total autenticados" ON public.materiales FOR ALL USING (true);

ALTER TABLE public.tintas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.tintas;
CREATE POLICY "Acceso total autenticados" ON public.tintas FOR ALL USING (true);

ALTER TABLE public.adhesivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.adhesivos;
CREATE POLICY "Acceso total autenticados" ON public.adhesivos FOR ALL USING (true);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.alertas;
CREATE POLICY "Acceso total autenticados" ON public.alertas FOR ALL USING (true);

ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.movimientos_inventario;
CREATE POLICY "Acceso total autenticados" ON public.movimientos_inventario FOR ALL USING (true);

ALTER TABLE public.control_tiempo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.control_tiempo;
CREATE POLICY "Acceso total autenticados" ON public.control_tiempo FOR ALL USING (true);

-- ============================================================
-- 11. VERIFICACION: mostrar constraints actualizados
-- ============================================================
SELECT
    conrelid::regclass::text AS tabla,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE contype = 'c'
  AND conrelid::regclass::text IN (
    'alertas', 'control_tiempo', 'movimientos_inventario',
    'ordenes_trabajo', 'adhesivos', 'proveedores'
  )
ORDER BY tabla, constraint_name;

-- ============================================================
-- LISTO! Despues de ejecutar:
--   - OTs guardaran con estado 'nueva' (columna "Por Revisar" del Kanban)
--   - Alertas se guardaran sin errores (badge del navbar funciona)
--   - Montajes podran usar control_tiempo
--   - Despachos registraran movimientos correctamente
--   - Recepciones guardaran foto + items
--   - Solicitudes de despacho persistiran
--   - Ordenes de compra persistiran
--   - Productos persistiran
--   - Recetario de tintas persistira
--   - Todos los modulos podran leer/escribir sync_store correctamente
--
-- Verificar: ir a cualquier modulo, crear un registro, refrescar la pagina.
-- Si el registro sigue ahi, todo funciona.
-- ============================================================
