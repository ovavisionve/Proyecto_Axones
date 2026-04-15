-- ============================================================
-- Migration 008: Hardening preventivo de constraints y columnas
-- Elimina limitaciones viejas para evitar errores "violates check constraint"
-- en inserts legitimos del sistema.
--
-- Auditoria hecha 2026-04-15 detecto los siguientes problemas:
--   1. alertas.tipo permite solo stock_bajo/produccion/calidad/mantenimiento/general
--      pero el codigo envia warning/danger/info (porque usa tipo como nivel)
--   2. alertas carece de columnas 'modulo', 'resuelta', 'estado', 'referencia'
--      que el codigo usa para tracking
--   3. control_tiempo.fase permite solo impresion/laminacion/corte
--      pero montaje tambien es una fase
--   4. control_tiempo.estado muy restrictivo
--   5. movimientos_inventario.tipo no permite 'despacho'
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. ALERTAS: ampliar tipo + agregar columnas faltantes
-- ============================================================
ALTER TABLE public.alertas
    DROP CONSTRAINT IF EXISTS alertas_tipo_check;

ALTER TABLE public.alertas
    ADD CONSTRAINT alertas_tipo_check
    CHECK (tipo IN (
        -- Legacy (mantener compat)
        'stock_bajo', 'produccion', 'calidad', 'mantenimiento', 'general',
        -- Niveles usados como tipo por el codigo actual
        'info', 'warning', 'danger', 'success', 'critical', 'error',
        -- Categorias del sistema
        'merma', 'montaje_lento', 'consumo_tinta', 'despacho_retrasado',
        'solicitud_material', 'bobina_rechazada', 'patron_merma'
    ));

-- Agregar columnas que el codigo usa pero no existian
ALTER TABLE public.alertas
    ADD COLUMN IF NOT EXISTS modulo VARCHAR(50);

ALTER TABLE public.alertas
    ADD COLUMN IF NOT EXISTS resuelta BOOLEAN DEFAULT FALSE;

ALTER TABLE public.alertas
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';

ALTER TABLE public.alertas
    ADD COLUMN IF NOT EXISTS referencia VARCHAR(100);

ALTER TABLE public.alertas
    ADD COLUMN IF NOT EXISTS resuelta_por VARCHAR(100);

ALTER TABLE public.alertas
    ADD COLUMN IF NOT EXISTS fecha_resolucion TIMESTAMPTZ;

-- Indice para consultas de alertas no resueltas (dashboard)
CREATE INDEX IF NOT EXISTS idx_alertas_resuelta ON public.alertas(resuelta) WHERE resuelta = FALSE;
CREATE INDEX IF NOT EXISTS idx_alertas_modulo ON public.alertas(modulo);

-- ============================================================
-- 2. CONTROL_TIEMPO: ampliar fase para incluir montaje
-- ============================================================
ALTER TABLE public.control_tiempo
    DROP CONSTRAINT IF EXISTS control_tiempo_fase_check;

ALTER TABLE public.control_tiempo
    ADD CONSTRAINT control_tiempo_fase_check
    CHECK (fase IN ('montaje', 'impresion', 'laminacion', 'corte', 'despacho'));

ALTER TABLE public.control_tiempo
    DROP CONSTRAINT IF EXISTS control_tiempo_estado_check;

ALTER TABLE public.control_tiempo
    ADD CONSTRAINT control_tiempo_estado_check
    CHECK (estado IN (
        'pendiente', 'en_progreso', 'pausada', 'completada',
        'pausada_con_motivo', 'reiniciada', 'cancelada'
    ));

-- ============================================================
-- 3. MOVIMIENTOS_INVENTARIO: permitir 'despacho' y 'recepcion'
-- ============================================================
ALTER TABLE public.movimientos_inventario
    DROP CONSTRAINT IF EXISTS movimientos_inventario_tipo_check;

ALTER TABLE public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_tipo_check
    CHECK (tipo IN (
        'entrada', 'salida', 'ajuste', 'devolucion',
        'despacho', 'recepcion', 'consumo', 'traspaso'
    ));

-- ============================================================
-- 4. ORDENES_TRABAJO: incluir 'en_proceso' por compatibilidad
-- (migration 007 ya agrego 'nueva', aqui ampliamos mas)
-- ============================================================
ALTER TABLE public.ordenes_trabajo
    DROP CONSTRAINT IF EXISTS ordenes_trabajo_estado_check;

ALTER TABLE public.ordenes_trabajo
    ADD CONSTRAINT ordenes_trabajo_estado_check
    CHECK (estado IN (
        'nueva',
        'pendiente',
        'en_proceso',
        'montaje',
        'impresion',
        'laminacion',
        'corte',
        'calidad',
        'despacho',
        'completada',
        'despachada',
        'cancelada',
        'suspendida'
    ));

-- ============================================================
-- 5. ADHESIVOS: ampliar tipo (se usa como 'quimico' a veces)
-- ============================================================
ALTER TABLE public.adhesivos
    DROP CONSTRAINT IF EXISTS adhesivos_tipo_check;

ALTER TABLE public.adhesivos
    ADD CONSTRAINT adhesivos_tipo_check
    CHECK (tipo IN (
        'adhesivo', 'catalizador', 'acetato', 'solvente',
        'quimico', 'alcohol', 'otro'
    ));

-- ============================================================
-- 6. PROVEEDORES: ampliar tipo (por si crean categorias)
-- ============================================================
ALTER TABLE public.proveedores
    DROP CONSTRAINT IF EXISTS proveedores_tipo_check;

ALTER TABLE public.proveedores
    ADD CONSTRAINT proveedores_tipo_check
    CHECK (tipo IN (
        'sustratos', 'tintas', 'solventes', 'adhesivos',
        'quimicos', 'miscelaneos', 'transporte', 'servicios', 'otros'
    ));

-- ============================================================
-- VERIFICACION: listar constraints modificados
-- ============================================================
SELECT
    conrelid::regclass AS tabla,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE contype = 'c'
  AND conrelid::regclass::text IN (
    'alertas', 'control_tiempo', 'movimientos_inventario',
    'ordenes_trabajo', 'adhesivos', 'proveedores'
  )
ORDER BY conrelid::regclass::text, conname;

-- ============================================================
-- DONE
-- Despues de ejecutar:
--   - AlertasEngine funcionara sin errores
--   - Montajes podran usar control_tiempo
--   - Despachos registraran movimientos correctamente
--   - OTs en todos los estados posibles
-- ============================================================
