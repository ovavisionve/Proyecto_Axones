-- ============================================================
-- SCHEMA SUPABASE - Sistema Axones
-- Inversiones Axones 2008, C.A.
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USUARIOS
-- ============================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN (
        'operador', 'colorista', 'jefe_almacen', 'supervisor',
        'planificador', 'jefe_operaciones', 'administrador'
    )),
    area VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    email VARCHAR(150),
    telefono VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CLIENTES
-- ============================================================
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    rif VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(150),
    contacto_nombre VARCHAR(150),
    contacto_telefono VARCHAR(50),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PROVEEDORES
-- ============================================================
CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    rif VARCHAR(20),
    tipo VARCHAR(30) CHECK (tipo IN ('sustratos', 'tintas', 'solventes', 'adhesivos', 'otros')),
    direccion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(150),
    contacto_nombre VARCHAR(150),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. MATERIALES (Inventario de sustratos)
-- ============================================================
CREATE TABLE materiales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(30) UNIQUE,
    codigo_barras VARCHAR(20),
    material VARCHAR(50) NOT NULL,
    tipo VARCHAR(50),
    micras NUMERIC(6,1),
    ancho NUMERIC(8,1),
    densidad NUMERIC(4,2) DEFAULT 0.90,
    stock_kg NUMERIC(12,2) DEFAULT 0,
    stock_minimo_kg NUMERIC(12,2) DEFAULT 0,
    proveedor_id UUID REFERENCES proveedores(id),
    ubicacion VARCHAR(50),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. TINTAS
-- ============================================================
CREATE TABLE tintas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(30),
    nombre VARCHAR(150) NOT NULL,
    color VARCHAR(50),
    tipo VARCHAR(50),
    stock_kg NUMERIC(12,2) DEFAULT 0,
    stock_minimo_kg NUMERIC(12,2) DEFAULT 0,
    proveedor_id UUID REFERENCES proveedores(id),
    precio_kg NUMERIC(12,2),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. ADHESIVOS (adhesivo, catalizador, acetato)
-- ============================================================
CREATE TABLE adhesivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(30),
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(30) CHECK (tipo IN ('adhesivo', 'catalizador', 'acetato', 'solvente')),
    stock_kg NUMERIC(12,2) DEFAULT 0,
    stock_minimo_kg NUMERIC(12,2) DEFAULT 0,
    proveedor_id UUID REFERENCES proveedores(id),
    precio_kg NUMERIC(12,2),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ORDENES DE TRABAJO
-- ============================================================
CREATE TABLE ordenes_trabajo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_ot VARCHAR(20) UNIQUE NOT NULL,
    correlativo SERIAL,

    -- Info general
    cliente_id UUID REFERENCES clientes(id),
    cliente_nombre VARCHAR(200),
    producto VARCHAR(200),
    pedido_kg NUMERIC(12,2),
    cpe VARCHAR(30),
    codigo_barra VARCHAR(20),
    estructura_material TEXT,
    prioridad VARCHAR(20) DEFAULT 'normal' CHECK (prioridad IN ('urgente', 'alta', 'normal', 'baja')),
    estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN (
        'pendiente', 'montaje', 'impresion', 'laminacion', 'corte', 'calidad', 'despacho', 'completada', 'cancelada'
    )),

    -- Materia prima
    tipo_material VARCHAR(50),
    micras_material NUMERIC(6,1),
    ancho_material NUMERIC(8,1),
    kg_disponible NUMERIC(12,2),
    proveedor_material VARCHAR(200),

    -- Area Montaje
    frecuencia NUMERIC(8,2),
    ancho_corte NUMERIC(8,1),
    ancho_montaje NUMERIC(8,1),
    num_bandas INTEGER,
    num_repeticion INTEGER,
    figura_embobinado_montaje VARCHAR(10),
    tipo_impresion VARCHAR(20),
    desarrollo NUMERIC(10,3),
    num_colores INTEGER,
    obs_montaje TEXT,

    -- Area Impresion
    pinon NUMERIC(8,2),
    linea_corte VARCHAR(10),
    sustratos_virgen VARCHAR(50),
    kg_ingresado_imp NUMERIC(12,2),
    kg_salida_imp NUMERIC(12,2),
    merma_imp NUMERIC(12,2),
    metros_imp NUMERIC(14,0),

    -- Area Laminacion
    figura_embobinado_lam VARCHAR(10),
    gramaje_adhesivo VARCHAR(20),
    gramaje_adhesivo_hasta VARCHAR(20),
    relacion_mezcla VARCHAR(20),
    obs_laminacion TEXT,
    adhesivo_kg NUMERIC(12,2),
    catalizador_kg NUMERIC(12,2),
    bopp_kg NUMERIC(12,2),
    cast_kg NUMERIC(12,2),

    -- Area Corte/Embalaje
    ancho_corte_final NUMERIC(8,1),
    ubic_fotocelda_corte VARCHAR(30),
    tipo_empalme VARCHAR(30),
    max_empalmes INTEGER,
    peso_bobina NUMERIC(12,2),
    metros_bobina NUMERIC(14,0),
    diametro_bobina NUMERIC(8,1),
    diametro_core VARCHAR(10),
    cantidad_cores INTEGER,
    orientacion_embalaje VARCHAR(10),

    -- Ficha Tecnica
    ficha_tipo_mat1 VARCHAR(50),
    ficha_micras1 NUMERIC(6,1),
    ficha_densidad1 NUMERIC(4,2),
    ficha_kg1 NUMERIC(12,2),
    ficha_sku1 VARCHAR(30),
    ficha_ancho1 NUMERIC(8,1),
    ficha_tipo_adhesivo VARCHAR(50),
    ficha_gramaje_adhesivo VARCHAR(20),
    ficha_gramaje_adhesivo_hasta VARCHAR(20),
    ficha_relacion_catalizador VARCHAR(20),
    ficha_kg_adhesivo NUMERIC(12,2),
    ficha_kg_catalizador NUMERIC(12,2),
    ficha_tipo_mat2 VARCHAR(50),
    ficha_micras2 NUMERIC(6,1),
    ficha_densidad2 NUMERIC(4,2),
    ficha_kg2 NUMERIC(12,2),
    ficha_sku2 VARCHAR(30),

    -- Programacion
    fecha_inicio DATE,
    fecha_entrega DATE,
    observaciones_generales TEXT,

    -- Meta
    creado_por UUID REFERENCES usuarios(id),
    creado_por_nombre VARCHAR(150),
    editando_usuario_id UUID,
    editando_usuario_nombre VARCHAR(150),
    editando_desde TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. PRODUCCION - IMPRESION
-- ============================================================
CREATE TABLE produccion_impresion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_id UUID REFERENCES ordenes_trabajo(id),
    numero_ot VARCHAR(20),

    fecha DATE,
    turno VARCHAR(10),
    maquina VARCHAR(30),
    operador VARCHAR(100),
    ayudante VARCHAR(100),
    supervisor VARCHAR(100),

    hora_inicio TIME,
    hora_arranque TIME,
    hora_final TIME,

    -- Bobinas entrada (JSON array)
    bobinas_entrada JSONB DEFAULT '[]',
    total_entrada NUMERIC(12,2) DEFAULT 0,
    -- Restante
    bobinas_restante JSONB DEFAULT '[]',
    total_restante NUMERIC(12,2) DEFAULT 0,
    total_consumido NUMERIC(12,2) DEFAULT 0,

    -- Bobinas salida
    bobinas_salida JSONB DEFAULT '[]',
    num_bobinas INTEGER DEFAULT 0,
    peso_total NUMERIC(12,2) DEFAULT 0,

    -- Scrap
    total_scrap NUMERIC(12,2) DEFAULT 0,
    merma NUMERIC(12,2) DEFAULT 0,
    porcentaje_refil NUMERIC(6,2) DEFAULT 0,
    metraje NUMERIC(14,0) DEFAULT 0,

    -- Etiquetas
    etiquetas_entrada JSONB DEFAULT '{}',
    etiquetas_salida JSONB DEFAULT '{}',

    motivos_paradas TEXT,
    observaciones TEXT,

    registrado_por UUID REFERENCES usuarios(id),
    registrado_por_nombre VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. PRODUCCION - LAMINACION
-- ============================================================
CREATE TABLE produccion_laminacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_id UUID REFERENCES ordenes_trabajo(id),
    numero_ot VARCHAR(20),

    fecha DATE,
    turno VARCHAR(10),
    maquina VARCHAR(30),
    operador VARCHAR(100),
    ayudante VARCHAR(100),
    supervisor VARCHAR(100),

    hora_inicio TIME,
    hora_arranque TIME,
    hora_final TIME,

    -- Bobinas impresas (entrada)
    bobinas_entrada JSONB DEFAULT '[]',
    total_entrada NUMERIC(12,2) DEFAULT 0,
    bobinas_restante JSONB DEFAULT '[]',
    total_restante NUMERIC(12,2) DEFAULT 0,
    total_consumido NUMERIC(12,2) DEFAULT 0,

    -- Bobinas virgen (materia prima)
    bobinas_virgen JSONB DEFAULT '[]',
    total_entrada_virgen NUMERIC(12,2) DEFAULT 0,
    bobinas_restante_virgen JSONB DEFAULT '[]',
    total_restante_virgen NUMERIC(12,2) DEFAULT 0,
    total_consumido_virgen NUMERIC(12,2) DEFAULT 0,

    -- Adhesivo
    adhesivo_entrada NUMERIC(12,2) DEFAULT 0,
    adhesivo_sobro NUMERIC(12,2) DEFAULT 0,
    consumo_adhesivo NUMERIC(12,2) DEFAULT 0,
    catalizador_entrada NUMERIC(12,2) DEFAULT 0,
    catalizador_sobro NUMERIC(12,2) DEFAULT 0,
    consumo_catalizador NUMERIC(12,2) DEFAULT 0,
    acetato_entrada NUMERIC(12,2) DEFAULT 0,
    acetato_sobro NUMERIC(12,2) DEFAULT 0,
    consumo_acetato NUMERIC(12,2) DEFAULT 0,

    -- Bobinas salida
    bobinas_salida JSONB DEFAULT '[]',
    num_bobinas INTEGER DEFAULT 0,
    peso_total NUMERIC(12,2) DEFAULT 0,

    -- Scrap
    scrap_transparente NUMERIC(12,2) DEFAULT 0,
    scrap_impreso NUMERIC(12,2) DEFAULT 0,
    scrap_laminado NUMERIC(12,2) DEFAULT 0,
    total_scrap NUMERIC(12,2) DEFAULT 0,
    merma NUMERIC(12,2) DEFAULT 0,
    porcentaje_refil NUMERIC(6,2) DEFAULT 0,
    metraje NUMERIC(14,0) DEFAULT 0,

    etiquetas_entrada JSONB DEFAULT '{}',
    etiquetas_salida JSONB DEFAULT '{}',

    motivos_paradas TEXT,
    observaciones TEXT,

    registrado_por UUID REFERENCES usuarios(id),
    registrado_por_nombre VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. PRODUCCION - CORTE
-- ============================================================
CREATE TABLE produccion_corte (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_id UUID REFERENCES ordenes_trabajo(id),
    numero_ot VARCHAR(20),

    fecha DATE,
    turno VARCHAR(10),
    maquina VARCHAR(30),
    operador VARCHAR(100),
    ayudante VARCHAR(100),
    supervisor VARCHAR(100),

    hora_inicio TIME,
    hora_arranque TIME,
    hora_final TIME,

    -- Bobinas madre (entrada)
    bobinas_entrada JSONB DEFAULT '[]',
    total_entrada NUMERIC(12,2) DEFAULT 0,
    bobinas_restante JSONB DEFAULT '[]',
    total_restante NUMERIC(12,2) DEFAULT 0,
    total_consumido NUMERIC(12,2) DEFAULT 0,

    -- Paletas con bobinas de salida
    paletas JSONB DEFAULT '[]',
    num_bobinas_salida INTEGER DEFAULT 0,
    num_rollos_salida INTEGER DEFAULT 0,
    peso_total_salida NUMERIC(12,2) DEFAULT 0,
    num_paletas INTEGER DEFAULT 0,

    -- Scrap
    scrap_refile NUMERIC(12,2) DEFAULT 0,
    scrap_impreso NUMERIC(12,2) DEFAULT 0,
    total_scrap NUMERIC(12,2) DEFAULT 0,
    merma NUMERIC(12,2) DEFAULT 0,
    porcentaje_refil NUMERIC(6,2) DEFAULT 0,

    etiquetas_entrada JSONB DEFAULT '{}',

    motivos_paradas TEXT,
    observaciones TEXT,

    registrado_por UUID REFERENCES usuarios(id),
    registrado_por_nombre VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. DESPACHOS
-- ============================================================
CREATE TABLE despachos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_id UUID REFERENCES ordenes_trabajo(id),
    numero_ot VARCHAR(20),
    cliente_id UUID REFERENCES clientes(id),
    cliente_nombre VARCHAR(200),

    kg_despachados NUMERIC(12,2) NOT NULL,
    nota_entrega VARCHAR(50),
    observaciones TEXT,

    despachado_por UUID REFERENCES usuarios(id),
    despachado_por_nombre VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. ALERTAS
-- ============================================================
CREATE TABLE alertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(30) CHECK (tipo IN ('stock_bajo', 'produccion', 'calidad', 'mantenimiento', 'general')),
    nivel VARCHAR(20) CHECK (nivel IN ('info', 'warning', 'danger', 'success')),
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN DEFAULT FALSE,
    usuario_destino UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. CONTROL DE TIEMPO (Play/Pausa)
-- ============================================================
CREATE TABLE control_tiempo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_id UUID REFERENCES ordenes_trabajo(id),
    numero_ot VARCHAR(20),
    fase VARCHAR(20) CHECK (fase IN ('impresion', 'laminacion', 'corte')),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'pausada', 'completada')),

    operador VARCHAR(100),
    tiempo_acumulado_ms BIGINT DEFAULT 0,
    ultimo_inicio TIMESTAMPTZ,

    -- Historial de pausas (JSON array)
    pausas JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. PRESENCIA (quien esta conectado y donde)
-- ============================================================
CREATE TABLE presencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    usuario_nombre VARCHAR(150),
    pagina VARCHAR(50),
    orden_editando VARCHAR(20),
    ultimo_ping TIMESTAMPTZ DEFAULT NOW(),
    conectado BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- 15. MOVIMIENTOS DE INVENTARIO (trazabilidad)
-- ============================================================
CREATE TABLE movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID REFERENCES materiales(id),
    tipo VARCHAR(20) CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'devolucion')),
    cantidad_kg NUMERIC(12,2) NOT NULL,
    stock_anterior NUMERIC(12,2),
    stock_nuevo NUMERIC(12,2),
    referencia VARCHAR(50),
    motivo TEXT,
    usuario_id UUID REFERENCES usuarios(id),
    usuario_nombre VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDICES para rendimiento
-- ============================================================
CREATE INDEX idx_ordenes_estado ON ordenes_trabajo(estado);
CREATE INDEX idx_ordenes_cliente ON ordenes_trabajo(cliente_id);
CREATE INDEX idx_ordenes_numero ON ordenes_trabajo(numero_ot);
CREATE INDEX idx_ordenes_fecha ON ordenes_trabajo(fecha_entrega);
CREATE INDEX idx_produccion_imp_orden ON produccion_impresion(orden_id);
CREATE INDEX idx_produccion_lam_orden ON produccion_laminacion(orden_id);
CREATE INDEX idx_produccion_corte_orden ON produccion_corte(orden_id);
CREATE INDEX idx_materiales_sku ON materiales(sku);
CREATE INDEX idx_materiales_material ON materiales(material);
CREATE INDEX idx_alertas_usuario ON alertas(usuario_destino);
CREATE INDEX idx_alertas_leida ON alertas(leida);
CREATE INDEX idx_presencia_usuario ON presencia(usuario_id);
CREATE INDEX idx_presencia_ping ON presencia(ultimo_ping);
CREATE INDEX idx_despachos_orden ON despachos(orden_id);
CREATE INDEX idx_movimientos_material ON movimientos_inventario(material_id);
CREATE INDEX idx_control_tiempo_orden ON control_tiempo(orden_id);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Trigger para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_usuarios_updated BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_clientes_updated BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_proveedores_updated BEFORE UPDATE ON proveedores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_materiales_updated BEFORE UPDATE ON materiales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_ordenes_updated BEFORE UPDATE ON ordenes_trabajo FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_control_tiempo_updated BEFORE UPDATE ON control_tiempo FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Funcion para generar numero OT automatico
CREATE OR REPLACE FUNCTION generar_numero_ot()
RETURNS TRIGGER AS $$
DECLARE
    anio INTEGER;
    siguiente INTEGER;
BEGIN
    anio := EXTRACT(YEAR FROM NOW());
    SELECT COALESCE(MAX(correlativo), 0) + 1 INTO siguiente FROM ordenes_trabajo;
    NEW.numero_ot := 'OT-' || anio || '-' || LPAD(siguiente::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ordenes_numero BEFORE INSERT ON ordenes_trabajo
FOR EACH ROW WHEN (NEW.numero_ot IS NULL)
EXECUTE FUNCTION generar_numero_ot();

-- Funcion para limpiar presencia inactiva (> 2 minutos sin ping)
CREATE OR REPLACE FUNCTION limpiar_presencia_inactiva()
RETURNS void AS $$
BEGIN
    UPDATE presencia SET conectado = FALSE
    WHERE ultimo_ping < NOW() - INTERVAL '2 minutes' AND conectado = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tintas ENABLE ROW LEVEL SECURITY;
ALTER TABLE adhesivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion_impresion ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion_laminacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion_corte ENABLE ROW LEVEL SECURITY;
ALTER TABLE despachos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_tiempo ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- Politicas: permitir todo para usuarios autenticados (la app maneja permisos por rol)
-- En produccion se pueden hacer politicas mas granulares

CREATE POLICY "Acceso total autenticados" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON proveedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON materiales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON tintas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON adhesivos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON ordenes_trabajo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON produccion_impresion FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON produccion_laminacion FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON produccion_corte FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON despachos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON alertas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON control_tiempo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON presencia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total autenticados" ON movimientos_inventario FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- HABILITAR REALTIME para las tablas que necesitan sync en vivo
-- ============================================================
-- Esto se hace desde el dashboard de Supabase:
-- Database > Replication > supabase_realtime
-- Habilitar: ordenes_trabajo, presencia, alertas, control_tiempo,
--            materiales, produccion_impresion, produccion_laminacion,
--            produccion_corte

-- Alternativa via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE ordenes_trabajo;
ALTER PUBLICATION supabase_realtime ADD TABLE presencia;
ALTER PUBLICATION supabase_realtime ADD TABLE alertas;
ALTER PUBLICATION supabase_realtime ADD TABLE control_tiempo;
ALTER PUBLICATION supabase_realtime ADD TABLE materiales;
ALTER PUBLICATION supabase_realtime ADD TABLE produccion_impresion;
ALTER PUBLICATION supabase_realtime ADD TABLE produccion_laminacion;
ALTER PUBLICATION supabase_realtime ADD TABLE produccion_corte;
ALTER PUBLICATION supabase_realtime ADD TABLE despachos;
