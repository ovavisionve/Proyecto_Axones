-- ============================================================
-- Migration 007: Agregar estado 'nueva' a ordenes_trabajo
-- Soluciona error: "violates check constraint ordenes_trabajo_estado_check"
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Eliminar constraint viejo (tiene lista de estados sin 'nueva')
ALTER TABLE public.ordenes_trabajo
    DROP CONSTRAINT IF EXISTS ordenes_trabajo_estado_check;

-- Crear constraint nuevo con todos los estados validos
ALTER TABLE public.ordenes_trabajo
    ADD CONSTRAINT ordenes_trabajo_estado_check
    CHECK (estado IN (
        'nueva',        -- Recien creada, por revisar (Fase 10)
        'pendiente',    -- Confirmada, esperando montaje
        'montaje',      -- En proceso de montaje
        'impresion',    -- En impresion
        'laminacion',   -- En laminacion
        'corte',        -- En corte
        'completada',   -- Lista para despacho
        'despachada',   -- Despachada al cliente
        'cancelada'     -- Cancelada
    ));

-- Verificacion (debe devolver 1 fila)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.ordenes_trabajo'::regclass
  AND conname = 'ordenes_trabajo_estado_check';

-- ============================================================
-- DONE
-- Despues de ejecutar: crear nuevas OTs pasara estado='nueva' por defecto
-- ============================================================
