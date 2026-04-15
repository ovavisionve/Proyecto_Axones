-- ============================================================
-- Migration 006: Tabla BOBINAS como entidad unica
-- Cada bobina tiene ID propio, peso, historial, estado
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla principal de bobinas
CREATE TABLE IF NOT EXISTS public.bobinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,                    -- BOB-2026-00001 (autogenerado)
    tipo TEXT NOT NULL DEFAULT 'sustrato',          -- sustrato | tinta | quimico | producto_terminado

    -- Datos del material
    material TEXT,                                  -- BOPP NORMAL, CAST, METAL, etc.
    micras NUMERIC,
    ancho_mm NUMERIC,
    sku TEXT,                                       -- SKU del inventario (BN-20-610)

    -- Pesos
    peso_inicial_kg NUMERIC NOT NULL DEFAULT 0,     -- Peso cuando llego
    peso_actual_kg NUMERIC NOT NULL DEFAULT 0,      -- Peso disponible (puede disminuir si hay devoluciones parciales)

    -- Origen
    proveedor TEXT,
    orden_compra TEXT,                              -- N° OC asociada (ej: OC-2026-0005)
    referencia_proveedor TEXT,                      -- Lote/referencia que pone el proveedor
    fecha_recepcion DATE DEFAULT CURRENT_DATE,
    factura_recepcion TEXT,

    -- Tratamientos (para sustratos)
    tratamiento_interno NUMERIC,                    -- Dinas
    tratamiento_externo NUMERIC,

    -- Estado y trazabilidad
    estado TEXT NOT NULL DEFAULT 'disponible',      -- disponible | reservada | en_uso | consumida | rechazada | devuelta | despachada | muerta
    motivo_rechazo TEXT,                            -- Cuando estado = rechazada o devuelta
    motivo_muerte TEXT,                             -- Cuando estado = muerta (tinta muerta)

    -- Asignacion a OT
    orden_trabajo TEXT,                             -- N° OT (OT-2026-0123)
    fecha_asignacion TIMESTAMPTZ,
    fecha_consumo TIMESTAMPTZ,
    fase_produccion TEXT,                           -- impresion | laminacion | corte

    -- Para producto terminado (bobinas que salen de corte)
    paleta_numero INTEGER,
    despacho_numero TEXT,                           -- N° ND cuando se despacha

    -- Metadatos
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Indices para consultas rapidas
CREATE INDEX IF NOT EXISTS idx_bobinas_estado ON public.bobinas(estado);
CREATE INDEX IF NOT EXISTS idx_bobinas_material ON public.bobinas(material);
CREATE INDEX IF NOT EXISTS idx_bobinas_tipo ON public.bobinas(tipo);
CREATE INDEX IF NOT EXISTS idx_bobinas_ot ON public.bobinas(orden_trabajo);
CREATE INDEX IF NOT EXISTS idx_bobinas_proveedor ON public.bobinas(proveedor);
CREATE INDEX IF NOT EXISTS idx_bobinas_oc ON public.bobinas(orden_compra);
CREATE INDEX IF NOT EXISTS idx_bobinas_codigo ON public.bobinas(codigo);

-- RLS
ALTER TABLE public.bobinas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.bobinas;
CREATE POLICY "Acceso total autenticados" ON public.bobinas FOR ALL USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_bobinas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bobinas_updated_at ON public.bobinas;
CREATE TRIGGER trigger_bobinas_updated_at
    BEFORE UPDATE ON public.bobinas
    FOR EACH ROW EXECUTE FUNCTION public.update_bobinas_updated_at();

-- Trigger para generar codigo automatico si no se proporciona
CREATE OR REPLACE FUNCTION public.generar_codigo_bobina()
RETURNS TRIGGER AS $$
DECLARE
    year_actual TEXT;
    siguiente INTEGER;
    prefijo TEXT;
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
        year_actual := to_char(NOW(), 'YYYY');
        prefijo := CASE NEW.tipo
            WHEN 'sustrato' THEN 'BOB'
            WHEN 'tinta' THEN 'TIN'
            WHEN 'quimico' THEN 'QUI'
            WHEN 'producto_terminado' THEN 'PT'
            ELSE 'BOB'
        END;

        SELECT COALESCE(MAX(CAST(split_part(codigo, '-', 3) AS INTEGER)), 0) + 1
        INTO siguiente
        FROM public.bobinas
        WHERE codigo LIKE prefijo || '-' || year_actual || '-%';

        NEW.codigo := prefijo || '-' || year_actual || '-' || LPAD(siguiente::TEXT, 5, '0');
    END IF;

    -- Si peso_actual no se setea, usar peso_inicial
    IF NEW.peso_actual_kg = 0 AND NEW.peso_inicial_kg > 0 THEN
        NEW.peso_actual_kg := NEW.peso_inicial_kg;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bobinas_codigo ON public.bobinas;
CREATE TRIGGER trigger_bobinas_codigo
    BEFORE INSERT ON public.bobinas
    FOR EACH ROW EXECUTE FUNCTION public.generar_codigo_bobina();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bobinas;

-- ============================================================
-- Tabla de historial de movimientos de bobinas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bobinas_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bobina_id UUID NOT NULL REFERENCES public.bobinas(id) ON DELETE CASCADE,
    codigo_bobina TEXT NOT NULL,
    evento TEXT NOT NULL,                           -- recepcion | asignacion | consumo | rechazo | devolucion | despacho | estado_cambio
    estado_anterior TEXT,
    estado_nuevo TEXT,
    peso_antes NUMERIC,
    peso_despues NUMERIC,
    orden_trabajo TEXT,
    fase TEXT,                                      -- impresion | laminacion | corte
    usuario TEXT,
    observaciones TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_bobina ON public.bobinas_historial(bobina_id);
CREATE INDEX IF NOT EXISTS idx_historial_codigo ON public.bobinas_historial(codigo_bobina);
CREATE INDEX IF NOT EXISTS idx_historial_ot ON public.bobinas_historial(orden_trabajo);

ALTER TABLE public.bobinas_historial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.bobinas_historial;
CREATE POLICY "Acceso total autenticados" ON public.bobinas_historial FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.bobinas_historial;

-- Trigger que registra automaticamente cambios de estado
CREATE OR REPLACE FUNCTION public.registrar_cambio_bobina()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND
        (OLD.estado IS DISTINCT FROM NEW.estado OR
         OLD.peso_actual_kg IS DISTINCT FROM NEW.peso_actual_kg)) THEN
        INSERT INTO public.bobinas_historial (
            bobina_id, codigo_bobina, evento,
            estado_anterior, estado_nuevo,
            peso_antes, peso_despues,
            orden_trabajo, fase
        ) VALUES (
            NEW.id, NEW.codigo, 'estado_cambio',
            OLD.estado, NEW.estado,
            OLD.peso_actual_kg, NEW.peso_actual_kg,
            NEW.orden_trabajo, NEW.fase_produccion
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.bobinas_historial (
            bobina_id, codigo_bobina, evento,
            estado_nuevo, peso_despues,
            orden_trabajo
        ) VALUES (
            NEW.id, NEW.codigo, 'recepcion',
            NEW.estado, NEW.peso_inicial_kg,
            NEW.orden_trabajo
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bobinas_historial ON public.bobinas;
CREATE TRIGGER trigger_bobinas_historial
    AFTER INSERT OR UPDATE ON public.bobinas
    FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_bobina();

-- ============================================================
-- Vista para stock por material (suma de bobinas disponibles)
-- ============================================================
CREATE OR REPLACE VIEW public.vista_stock_bobinas AS
SELECT
    material,
    micras,
    ancho_mm,
    sku,
    COUNT(*) FILTER (WHERE estado = 'disponible') AS bobinas_disponibles,
    SUM(peso_actual_kg) FILTER (WHERE estado = 'disponible') AS kg_disponibles,
    COUNT(*) FILTER (WHERE estado = 'en_uso') AS bobinas_en_uso,
    SUM(peso_actual_kg) FILTER (WHERE estado = 'en_uso') AS kg_en_uso,
    COUNT(*) FILTER (WHERE estado = 'rechazada') AS bobinas_rechazadas,
    SUM(peso_actual_kg) FILTER (WHERE estado = 'rechazada') AS kg_rechazados
FROM public.bobinas
WHERE tipo = 'sustrato'
GROUP BY material, micras, ancho_mm, sku;

-- ============================================================
-- DONE
-- ============================================================
-- Para ejecutar:
--   1. Ir a Supabase SQL Editor
--   2. Pegar este archivo completo
--   3. Run
--   4. Verificar que las tablas aparecen en Table Editor
-- ============================================================
