-- ============================================================
-- SEED DATA - Sistema Axones
-- Datos iniciales para poblar la base de datos
-- ============================================================

-- ============================================================
-- USUARIOS (23 usuarios reales)
-- Password temporal: axones2026 (en produccion usar hash bcrypt)
-- ============================================================
INSERT INTO usuarios (username, nombre, password_hash, rol, area) VALUES
('rparra', 'Rafael Parra', 'axones2026', 'jefe_operaciones', 'Gerencia'),
('ajaure', 'Angel Jaure', 'axones2026', 'supervisor', 'Produccion'),
('aanare', 'Argenis Anare', 'axones2026', 'planificador', 'Produccion'),
('rguape', 'Raul Guape', 'axones2026', 'supervisor', 'Produccion'),
('harzola', 'Hector Arzola', 'axones2026', 'supervisor', 'Produccion'),
('lgonzalez', 'Luis Gonzalez', 'axones2026', 'jefe_almacen', 'Almacen'),
('gmujica', 'Gabriel Mujica', 'axones2026', 'operador', 'Impresion'),
('ncamacaro', 'Nestor Camacaro', 'axones2026', 'operador', 'Impresion'),
('scobos', 'Simon Cobos', 'axones2026', 'operador', 'Impresion'),
('nnino', 'Nelson Nino', 'axones2026', 'operador', 'Impresion'),
('mnieves', 'Miguel Nieves', 'axones2026', 'operador', 'Impresion'),
('jcolmenares', 'Jose Colmenares', 'axones2026', 'operador', 'Laminacion'),
('arodriguez', 'Andres Rodriguez', 'axones2026', 'operador', 'Laminacion'),
('yaranguren', 'Yonathan Aranguren', 'axones2026', 'operador', 'Laminacion'),
('jguzman', 'Jesus Guzman', 'axones2026', 'operador', 'Corte'),
('apinero', 'Angel Pinero', 'axones2026', 'operador', 'Corte'),
('imonroy', 'Ivan Monroy', 'axones2026', 'operador', 'Corte'),
('fabarca', 'Franklin Abarca', 'axones2026', 'operador', 'Corte'),
('rpena', 'Ramon Pena', 'axones2026', 'operador', 'Corte'),
('emarquez', 'Eduardo Marquez', 'axones2026', 'operador', 'Corte'),
('jmartinez', 'Juan Martinez', 'axones2026', 'operador', 'Corte'),
('alaya', 'Antonio Laya', 'axones2026', 'colorista', 'Tintas'),
('admin', 'Administrador', 'admin123', 'administrador', 'Sistema');

-- ============================================================
-- PROVEEDORES
-- ============================================================

-- Sustratos
INSERT INTO proveedores (nombre, rif, tipo) VALUES
('Fabrica Siplast, C.A.', 'J-29586594-5', 'sustratos'),
('Plasticos la Dinastia, C.A.', 'J-50176198-1', 'sustratos'),
('Teleplastic, C.A.', 'J-00054015-2', 'sustratos'),
('Technofilm, S.A.', NULL, 'sustratos'),
('Total Flex, C.A.', 'J-50374325-5', 'sustratos'),
('Flexipack Solutions, C.A.', 'J-50519062-8', 'sustratos'),
('Inversiones J&D, C.A.', NULL, 'sustratos'),
('Venefoil, C.A.', 'J-06001261-9', 'sustratos');

-- Tintas
INSERT INTO proveedores (nombre, rif, tipo) VALUES
('Barnices Venezolanos, C.A.', 'J-07540293-6', 'tintas'),
('Favika, C.A.', 'J-29746614-2', 'tintas'),
('Inversiones Cabeoli, C.A.', 'J-40839412-0', 'tintas'),
('Tintas Venezolanas, C.A.', 'J-50576017-3', 'tintas');

-- Solventes y Adhesivos
INSERT INTO proveedores (nombre, rif, tipo) VALUES
('ALPHA Industrias Quimicas, C.A.', 'J-50180349-8', 'adhesivos'),
('A.J. Lara Suministros Quimicos, C.A.', 'J-30827597-2', 'solventes'),
('Quimicos la Barraca, C.A.', 'J-07544200-8', 'solventes'),
('Inversiones Venproquim, C.A.', 'J-40454107-1', 'solventes');

-- ============================================================
-- ADHESIVOS (productos de adhesivo disponibles)
-- ============================================================
INSERT INTO adhesivos (codigo, nombre, tipo, stock_kg) VALUES
('SL332', 'FLEXTRA SL332', 'adhesivo', 0),
('SL342', 'FLEXTRA SL342', 'adhesivo', 0),
('SL8314', 'FLEXTRA SL8314', 'adhesivo', 0),
('CAT-SL', 'Catalizador FLEXTRA', 'catalizador', 0),
('ACE-001', 'Acetato de Etilo', 'acetato', 0);

-- ============================================================
-- NOTA: Los 158 materiales del inventario se deben migrar
-- desde el inventario actual usando el script de migracion.
-- Ver: public/src/js/utils/migracion-supabase.js
-- ============================================================
