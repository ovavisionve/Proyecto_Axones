/**
 * Datos de Prueba - Sistema Axones
 * Genera datos realistas para desarrollo y demostracion
 * Sincroniza con Google Sheets API automaticamente
 */

const DemoData = {
    // Inicializar datos de prueba
    init() {
        console.log('Inicializando datos de prueba...');
        // NO sobrescribir inventario - el real viene de inventario.js con 158 productos
        // this.generarInventario();
        this.generarProduccion();
        this.generarAlertas();
        this.generarTintas();
        this.generarEstadoMaquinas();
        this.generarOrdenesTrabajo();
        console.log('Datos de prueba generados en localStorage');

        // Sincronizar con API en background
        this.syncToAPI();
    },

    // Limpiar todos los datos
    limpiar() {
        localStorage.removeItem('axones_inventario');
        localStorage.removeItem('axones_produccion');
        localStorage.removeItem('axones_impresion');
        localStorage.removeItem('axones_alertas');
        localStorage.removeItem('axones_tintas');
        localStorage.removeItem('axones_maquinas_estado');
        localStorage.removeItem('axones_ordenes_trabajo');
        console.log('Datos limpiados');
    },

    // Sincronizar TODOS los datos de localStorage a Google Sheets
    // Regla: localStorage = fuente de verdad, Sheets = espejo
    async syncToAPI() {
        if (typeof AxonesAPI === 'undefined') {
            console.warn('AxonesAPI no disponible, saltando sync');
            return;
        }

        console.log('Sincronizando localStorage completo a Google Sheets...');
        let synced = 0;
        let errors = 0;

        // 1. INVENTARIO COMPLETO (158 productos) via syncInventarioCompleto
        try {
            const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
            if (inventario.length > 0) {
                const result = await AxonesAPI.syncInventarioCompleto(inventario, 'sistema');
                if (result && result.success) { synced++; console.log('[Sync] Inventario: ' + inventario.length + ' items'); }
            }
        } catch (e) { errors++; console.warn('[Sync] Error inventario:', e.message); }

        // 2. ORDENES DE TRABAJO (todas)
        try {
            const ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
            for (const orden of ordenes) {
                try {
                    await AxonesAPI.createOrden(orden);
                    synced++;
                } catch (e) { errors++; }
            }
            if (ordenes.length > 0) console.log('[Sync] Ordenes: ' + ordenes.length);
        } catch (e) { errors++; }

        // 3. ALERTAS (todas las pendientes)
        try {
            const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
            for (const alerta of alertas) {
                try {
                    await AxonesAPI.createAlerta({
                        tipo: alerta.tipo,
                        nivel: alerta.nivel,
                        mensaje: alerta.mensaje,
                        referencia_id: alerta.ot || null,
                        referencia_tipo: alerta.tipo
                    });
                    synced++;
                } catch (e) { errors++; }
            }
            if (alertas.length > 0) console.log('[Sync] Alertas: ' + alertas.length);
        } catch (e) { errors++; }

        // 4. PRODUCCION (todos los registros)
        try {
            const produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');
            for (const reg of produccion) {
                try {
                    await AxonesAPI.createProduccion({
                        fecha: reg.fecha, turno: reg.turno, maquina: reg.maquina,
                        proceso: reg.tipo || 'impresion', cliente: reg.cliente,
                        producto: reg.producto, ot: reg.ordenTrabajo,
                        kilos_producidos: reg.pesoTotal || reg.totalSalida || 0,
                        kilos_entrada: reg.totalMaterialEntrada || reg.totalEntrada || 0,
                        refil_kg: reg.merma || 0,
                        tiempo_trabajo_min: reg.tiempoEfectivo || 0,
                        tiempo_muerto_min: reg.tiempoMuerto || 0,
                        operador: reg.operador, observaciones: reg.observaciones || ''
                    });
                    synced++;
                } catch (e) { errors++; }
            }
            if (produccion.length > 0) console.log('[Sync] Produccion: ' + produccion.length);
        } catch (e) { errors++; }

        console.log(`Sync completo: ${synced} registros enviados a Sheets, ${errors} errores`);
    },

    // Generar inventario de sustratos
    generarInventario() {
        const inventario = [
            // BOPP Transparente
            { id: 'INV_001', material: 'BOPP', micras: '20', ancho: '620', kg: 450, producto: 'Bolsa Snacks', cliente: 'PEPSICO ALIMENTOS' },
            { id: 'INV_002', material: 'BOPP', micras: '20', ancho: '520', kg: 280, producto: 'Empaque Galletas', cliente: 'KRAFT HEINZ' },
            { id: 'INV_003', material: 'BOPP', micras: '25', ancho: '720', kg: 180, producto: 'Bolsa Cereales', cliente: 'NESTLE VENEZUELA' },
            { id: 'INV_004', material: 'BOPP', micras: '20', ancho: '420', kg: 320, producto: 'Flow Pack', cliente: 'EMPRESAS POLAR' },
            { id: 'INV_005', material: 'BOPP', micras: '30', ancho: '800', kg: 95, producto: '', cliente: '' },

            // BOPP Mate
            { id: 'INV_006', material: 'BOPP MATE', micras: '20', ancho: '620', kg: 220, producto: 'Etiqueta Premium', cliente: 'ALFONZO RIVAS' },
            { id: 'INV_007', material: 'BOPP MATE', micras: '25', ancho: '520', kg: 150, producto: 'Bolsa Cafe', cliente: 'CAFE MADRID' },

            // BOPP Perlado
            { id: 'INV_008', material: 'BOPP PERLADO', micras: '25', ancho: '420', kg: 180, producto: 'Empaque Chocolates', cliente: 'SAVOY' },
            { id: 'INV_009', material: 'BOPP PERLADO', micras: '30', ancho: '520', kg: 75, producto: '', cliente: '' },

            // BOPP Metalizado
            { id: 'INV_010', material: 'BOPP METALIZADO', micras: '20', ancho: '620', kg: 340, producto: 'Snacks Premium', cliente: 'PEPSICO ALIMENTOS' },
            { id: 'INV_011', material: 'BOPP METALIZADO', micras: '25', ancho: '720', kg: 45, producto: 'Bolsa Cafe Gold', cliente: 'CAFE MADRID' },

            // CAST
            { id: 'INV_012', material: 'CAST', micras: '25', ancho: '520', kg: 280, producto: 'Laminado Base', cliente: '' },
            { id: 'INV_013', material: 'CAST', micras: '30', ancho: '620', kg: 190, producto: 'Film Stretch', cliente: 'EMPRESAS POLAR' },

            // PEBD
            { id: 'INV_014', material: 'PEBD', micras: '50', ancho: '800', kg: 520, producto: 'Bolsa Industrial', cliente: '' },
            { id: 'INV_015', material: 'PEBD', micras: '70', ancho: '1000', kg: 380, producto: 'Film Termoencogible', cliente: 'COCA-COLA FEMSA' },
            { id: 'INV_016', material: 'PEBD PIGMENTADO', micras: '60', ancho: '620', kg: 240, producto: 'Bolsa Impresa', cliente: 'ALFONZO RIVAS' },

            // Stock bajo para alertas
            { id: 'INV_017', material: 'BOPP', micras: '20', ancho: '320', kg: 45, producto: 'Sachet', cliente: 'NESTLE VENEZUELA' },
            { id: 'INV_018', material: 'BOPP MATE', micras: '20', ancho: '420', kg: 30, producto: 'Etiqueta', cliente: 'KRAFT HEINZ' },
        ];

        localStorage.setItem('axones_inventario', JSON.stringify(inventario));
        console.log(`Inventario: ${inventario.length} items generados`);
    },

    // Generar registros de produccion
    generarProduccion() {
        const produccion = [];
        const hoy = new Date();

        // Generar registros de los ultimos 30 dias
        for (let i = 0; i < 30; i++) {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() - i);
            const fechaStr = fecha.toISOString().split('T')[0];

            // 2-4 registros por dia
            const registrosDia = Math.floor(Math.random() * 3) + 2;

            for (let j = 0; j < registrosDia; j++) {
                const registro = this.generarRegistroProduccion(fechaStr, i * 10 + j);
                produccion.push(registro);
            }
        }

        localStorage.setItem('axones_produccion', JSON.stringify(produccion));
        localStorage.setItem('axones_impresion', JSON.stringify(produccion));
        console.log(`Produccion: ${produccion.length} registros generados`);
    },

    // Generar un registro de produccion individual
    generarRegistroProduccion(fecha, index) {
        const clientes = CONFIG.CLIENTES || ['PEPSICO ALIMENTOS', 'NESTLE VENEZUELA', 'EMPRESAS POLAR', 'KRAFT HEINZ', 'ALFONZO RIVAS'];
        const maquinas = ['COMEXI 1', 'COMEXI 2'];
        const turnos = ['D', '1', '2', '3'];
        const operadores = ['Carlos Rodriguez', 'Juan Martinez', 'Pedro Gomez', 'Luis Hernandez', 'Miguel Torres'];
        const productos = [
            'Bolsa Snacks 200g', 'Empaque Galletas 150g', 'Flow Pack Chocolates',
            'Bolsa Cereales 500g', 'Sachet Mayonesa', 'Etiqueta Premium',
            'Bolsa Cafe 250g', 'Film Termoencogible', 'Empaque Harina'
        ];

        const cliente = clientes[Math.floor(Math.random() * clientes.length)];
        const maquina = maquinas[Math.floor(Math.random() * maquinas.length)];
        const turno = turnos[Math.floor(Math.random() * turnos.length)];
        const operador = operadores[Math.floor(Math.random() * operadores.length)];
        const producto = productos[Math.floor(Math.random() * productos.length)];

        // Generar pesos realistas
        const totalEntrada = Math.floor(Math.random() * 800) + 200; // 200-1000 kg
        const eficiencia = 0.92 + (Math.random() * 0.06); // 92-98% eficiencia
        const totalSalida = Math.floor(totalEntrada * eficiencia);
        const merma = totalEntrada - totalSalida;
        const porcentajeRefil = ((merma / totalEntrada) * 100);

        // Tiempos
        const tiempoEfectivo = Math.floor(Math.random() * 300) + 180; // 180-480 min
        const tiempoMuerto = Math.floor(Math.random() * 60); // 0-60 min
        const tiempoPreparacion = Math.floor(Math.random() * 45) + 15; // 15-60 min

        return {
            id: 'IMP_' + Date.now() + '_' + index,
            timestamp: new Date(fecha + 'T' + String(8 + Math.floor(Math.random() * 10)).padStart(2, '0') + ':00:00').toISOString(),
            tipo: 'impresion',
            fecha: fecha,
            turno: turno,
            cliente: cliente,
            producto: producto,
            maquina: maquina,
            ordenTrabajo: `OT-${fecha.replace(/-/g, '').slice(2)}-${String(index + 1).padStart(3, '0')}`,
            operador: operador,
            ayudante: 'Ayudante ' + (Math.floor(Math.random() * 5) + 1),
            supervisor: 'Supervisor Turno',
            horaInicio: '0' + (6 + Math.floor(Math.random() * 2)) + ':00',
            horaArranque: '0' + (6 + Math.floor(Math.random() * 2)) + ':30',
            totalMaterialEntrada: totalEntrada,
            pesoTotal: totalSalida,
            totalSalida: totalSalida,
            merma: merma,
            porcentajeRefil: porcentajeRefil.toFixed(2),
            scrapTransparente: Math.floor(merma * 0.3),
            scrapImpreso: Math.floor(merma * 0.2),
            totalScrap: Math.floor(merma * 0.5),
            tiempoMuerto: tiempoMuerto,
            tiempoEfectivo: tiempoEfectivo,
            tiempoPreparacion: tiempoPreparacion,
            numBobinas: Math.floor(Math.random() * 8) + 3,
            observaciones: '',
            registradoPor: 'demo_user',
            registradoPorNombre: 'Usuario Demo'
        };
    },

    // Generar alertas
    generarAlertas() {
        const alertas = [
            {
                id: Date.now() - 1000,
                fecha: new Date(Date.now() - 2 * 3600000).toISOString(),
                tipo: 'refil_alto',
                nivel: 'warning',
                maquina: 'COMEXI 1',
                ot: 'OT-260126-001',
                mensaje: 'Refil 5.8% en OT OT-260126-001 - COMEXI 1 - Producto: Bolsa Snacks 200g',
                estado: 'pendiente',
                datos: { porcentajeRefil: 5.8, umbral: 6.0, producto: 'Bolsa Snacks 200g', cliente: 'PEPSICO ALIMENTOS' }
            },
            {
                id: Date.now() - 2000,
                fecha: new Date(Date.now() - 5 * 3600000).toISOString(),
                tipo: 'refil_critico',
                nivel: 'critical',
                maquina: 'COMEXI 2',
                ot: 'OT-260126-002',
                mensaje: 'Refil 8.2% en OT OT-260126-002 - COMEXI 2 - Producto: Empaque Galletas',
                estado: 'pendiente',
                datos: { porcentajeRefil: 8.2, umbral: 6.0, producto: 'Empaque Galletas', cliente: 'KRAFT HEINZ' }
            },
            {
                id: Date.now() - 3000,
                fecha: new Date(Date.now() - 24 * 3600000).toISOString(),
                tipo: 'stock_bajo',
                nivel: 'warning',
                maquina: null,
                ot: null,
                mensaje: 'Stock bajo de BOPP 20 micras 320mm: 45 Kg',
                estado: 'pendiente',
                datos: { material: 'BOPP', kg: 45 }
            },
            {
                id: Date.now() - 4000,
                fecha: new Date(Date.now() - 48 * 3600000).toISOString(),
                tipo: 'tiempo_muerto_alto',
                nivel: 'info',
                maquina: 'COMEXI 3',
                ot: 'OT-260124-005',
                mensaje: 'Tiempo muerto 25% en OT OT-260124-005 - COMEXI 3',
                estado: 'resuelta',
                fechaResolucion: new Date(Date.now() - 36 * 3600000).toISOString(),
                datos: { tiempoMuerto: 45, tiempoEfectivo: 135 }
            },
            {
                id: Date.now() - 5000,
                fecha: new Date(Date.now() - 72 * 3600000).toISOString(),
                tipo: 'refil_alto',
                nivel: 'warning',
                maquina: 'COMEXI 1',
                ot: 'OT-260123-003',
                mensaje: 'Refil 5.5% en OT OT-260123-003 - COMEXI 1',
                estado: 'resuelta',
                fechaResolucion: new Date(Date.now() - 60 * 3600000).toISOString(),
                datos: { porcentajeRefil: 5.5 }
            },
        ];

        localStorage.setItem('axones_alertas', JSON.stringify(alertas));
        console.log(`Alertas: ${alertas.length} alertas generadas`);
    },

    // Generar consumo de tintas
    generarTintas() {
        const tintas = [];
        const hoy = new Date();

        for (let i = 0; i < 15; i++) {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() - i * 2);

            tintas.push({
                id: 'TNT_' + Date.now() + '_' + i,
                timestamp: fecha.toISOString(),
                fecha: fecha.toISOString().split('T')[0],
                ot: `OT-${fecha.toISOString().split('T')[0].replace(/-/g, '').slice(2)}-00${i + 1}`,
                cliente: CONFIG.CLIENTES[i % CONFIG.CLIENTES.length],
                producto: 'Producto ' + (i + 1),
                maquina: ['COMEXI 1', 'COMEXI 2', 'COMEXI 3'][i % 3],
                operador: 'Operador ' + ((i % 5) + 1),
                tintasLaminacion: {
                    'Amarillo LAM': (Math.random() * 2 + 0.5).toFixed(2),
                    'Cyan LAM': (Math.random() * 1.5 + 0.3).toFixed(2),
                    'Magenta LAM': (Math.random() * 1.5 + 0.3).toFixed(2),
                    'Negro LAM': (Math.random() * 1 + 0.2).toFixed(2),
                },
                tintasSuperficie: {
                    'Blanco SUP': (Math.random() * 3 + 1).toFixed(2),
                },
                solventes: {
                    'Alcohol': (Math.random() * 5 + 2).toFixed(2),
                    'Acetato': (Math.random() * 3 + 1).toFixed(2),
                },
                totalTintasLaminacion: (Math.random() * 5 + 2).toFixed(2),
                totalTintasSuperficie: (Math.random() * 4 + 1).toFixed(2),
                totalSolventes: (Math.random() * 8 + 3).toFixed(2),
                observaciones: ''
            });
        }

        localStorage.setItem('axones_tintas', JSON.stringify(tintas));
        console.log(`Tintas: ${tintas.length} registros generados`);
    },

    // Generar estado de maquinas
    generarEstadoMaquinas() {
        const maquinas = [
            { id: 'comexi_1', nombre: 'COMEXI 1', estado: 'active' },
            { id: 'comexi_2', nombre: 'COMEXI 2', estado: 'active' },
            { id: 'laminadora', nombre: 'Laminadora', estado: 'active' },
            { id: 'cortadora_china', nombre: 'Cortadora China', estado: 'active' },
            { id: 'cortadora_permaco', nombre: 'Cortadora Permaco', estado: 'stopped' },
            { id: 'cortadora_novograf', nombre: 'Cortadora Novograf', estado: 'idle' },
        ];

        localStorage.setItem('axones_maquinas_estado', JSON.stringify(maquinas));
        console.log(`Maquinas: ${maquinas.length} estados generados`);
    },

    // Generar ordenes de trabajo de prueba
    generarOrdenesTrabajo() {
        // No sobrescribir ordenes reales (que tengan registradoPor de usuario real)
        const existentes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        const tieneOrdenesReales = existentes.some(o =>
            o.registradoPor && o.registradoPor !== 'sistema' && !o.id?.startsWith('OT_DEMO')
        );
        if (tieneOrdenesReales) {
            console.log('Ordenes: Ya existen ' + existentes.length + ' ordenes reales, no se sobrescriben');
            return;
        }

        const hoy = new Date().toISOString().split('T')[0];
        const ahora = new Date().toISOString();

        const ordenes = [
            {
                id: 'OT_' + Date.now(),
                numeroOrden: 'OT-2026-0001',
                fechaOrden: hoy,
                fechaCreacion: ahora,
                registradoPor: 'ovisionve',
                registradoPorNombre: 'Oscar Vasquez',
                cliente: 'C.A. SUCESORA JOSE PUIG & CIA',
                clienteRif: 'J-00012345-7',
                producto: 'Galleta Soda Puig Enriquecida 24g',
                ordenCompra: 'OC-2026-0142',
                maquina: 'COMEXI 1',
                planchas: 'SI',
                pedidoKg: 2100,
                estadoOrden: 'pendiente',
                prioridad: 'alta',
                // Montaje
                frecuencia: 380,
                anchoCorte: 240,
                anchoMontaje: 720,
                numBandas: 3,
                numRepeticion: 4,
                numColores: 6,
                desarrollo: 380,
                figuraEmbobinado: '1',
                tipoImpresion: 'Reverso',
                pinon: 76,
                lineaCorte: '3mm',
                // Colores
                color1: 'Blanco', color2: 'Amarillo', color3: 'Rojo 485',
                color4: 'Azul Proceso', color5: 'Negro', color6: 'Dorado',
                // Materia prima
                tipoMaterial: 'BOPP NORMAL',
                micrasMaterial: 20,
                anchoMaterial: 720,
                kgDisponible: 3500,
                densidadMaterial: 0.90,
                proveedorMaterial: 'Fabrica Siplast, C.A.',
                cpe: 'BN-20-720',
                codigoBarra: '7590001000015',
                estructuraMaterial: 'BOPP 20u + Adhesivo + CAST 25u',
                // Ficha tecnica
                fichaTipoMat1: 'BOPP NORMAL',
                fichaMicras1: 20,
                fichaDensidad1: 0.90,
                fichaKg1: 1050,
                fichaSku1: 'BN-20-720',
                fichaTipoAdhesivo: 'ADHESIVO',
                fichaGramajeAdhesivo: 2.5,
                fichaRelacionCatalizador: '10:1',
                fichaKgAdhesivo: 145,
                fichaKgCatalizador: 14.5,
                fichaTipoMat2: 'CAST',
                fichaMicras2: 25,
                fichaDensidad2: 0.92,
                fichaKg2: 1200,
                fichaSku2: 'CA-25-720',
                // Corte
                anchoCorteFinal: 240,
                pesoBobina: 12,
                diametroBobina: 250,
                anchoCore: 240,
                diametroCore: 76,
                cantidadCores: 48,
                maxEmpalmes: 2,
                tipoEmpalme: 'Bandera',
                // Programacion
                fechaInicio: hoy,
                fechaEntrega: '2026-04-05',
                observacionesGenerales: 'Cliente requiere 4 paletas. Despacho parcial autorizado.'
            },
            {
                id: 'OT_' + (Date.now() + 1),
                numeroOrden: 'OT-2026-0002',
                fechaOrden: hoy,
                fechaCreacion: ahora,
                registradoPor: 'ovisionve',
                registradoPorNombre: 'Oscar Vasquez',
                cliente: 'EMPRESAS POLAR, C.A.',
                clienteRif: 'J-00000008-5',
                producto: 'Harina PAN 1Kg',
                ordenCompra: 'OC-2026-0198',
                maquina: 'COMEXI 3',
                planchas: 'SI',
                pedidoKg: 5000,
                estadoOrden: 'pendiente',
                prioridad: 'alta',
                frecuencia: 400,
                anchoCorte: 280,
                anchoMontaje: 1120,
                numBandas: 4,
                numRepeticion: 6,
                numColores: 4,
                desarrollo: 400,
                figuraEmbobinado: '1',
                tipoImpresion: 'Reverso',
                pinon: 80,
                lineaCorte: '3mm',
                color1: 'Amarillo', color2: 'Rojo 485', color3: 'Azul Proceso', color4: 'Negro',
                tipoMaterial: 'PEBD PIGMENT',
                micrasMaterial: 60,
                anchoMaterial: 1120,
                kgDisponible: 6000,
                densidadMaterial: 0.93,
                proveedorMaterial: 'Plasticos la Dinastia, C.A.',
                cpe: 'PBP-60-1120',
                estructuraMaterial: 'PEBD PIGMENTADO 60u',
                fechaInicio: hoy,
                fechaEntrega: '2026-04-15',
                observacionesGenerales: 'Orden grande, produccion continua.'
            },
            {
                id: 'OT_' + (Date.now() + 2),
                numeroOrden: 'OT-2026-0003',
                fechaOrden: hoy,
                fechaCreacion: ahora,
                registradoPor: 'ovisionve',
                registradoPorNombre: 'Oscar Vasquez',
                cliente: 'NESTLE VENEZUELA, S.A.',
                clienteRif: 'J-00012345-7',
                producto: 'Cerelac Trigo con Leche 400g',
                ordenCompra: 'OC-2026-0211',
                maquina: 'COMEXI 1',
                planchas: 'SI',
                pedidoKg: 1500,
                estadoOrden: 'pendiente',
                prioridad: 'media',
                frecuencia: 320,
                anchoCorte: 200,
                anchoMontaje: 800,
                numBandas: 4,
                numRepeticion: 5,
                numColores: 8,
                desarrollo: 320,
                figuraEmbobinado: '1',
                tipoImpresion: 'Reverso',
                pinon: 64,
                lineaCorte: '5mm',
                color1: 'Blanco', color2: 'Amarillo', color3: 'Magenta', color4: 'Cyan',
                color5: 'Negro', color6: 'Verde', color7: 'Naranja', color8: 'Dorado',
                tipoMaterial: 'BOPP NORMAL',
                micrasMaterial: 20,
                anchoMaterial: 800,
                kgDisponible: 2000,
                densidadMaterial: 0.90,
                proveedorMaterial: 'Fabrica Siplast, C.A.',
                cpe: 'BN-20-800',
                estructuraMaterial: 'BOPP 20u + Adhesivo + CAST 30u',
                fichaTipoMat1: 'BOPP NORMAL',
                fichaMicras1: 20,
                fichaDensidad1: 0.90,
                fichaKg1: 750,
                fichaTipoMat2: 'CAST',
                fichaMicras2: 30,
                fichaDensidad2: 0.92,
                fichaKg2: 920,
                fechaInicio: hoy,
                fechaEntrega: '2026-04-10',
                observacionesGenerales: ''
            },
            // OT REAL - ALTROM AVENA VENELA (basada en orden fisica 030-FEB26)
            {
                id: 'OT_' + (Date.now() + 3),
                numeroOrden: 'OT-2026-0004',
                fechaOrden: '2026-02-10',
                fechaCreacion: ahora,
                registradoPor: 'ovisionve',
                registradoPorNombre: 'Oscar Vasquez',
                cliente: 'ALTROM, C.A.',
                clienteRif: 'J-30582298-0',
                producto: 'AVENA EN HOJUELA VENELA 200g',
                cpe: '0624562471',
                mpps: 'A-152.448',
                codigoBarra: '732388293308',
                estructuraMaterial: 'MATE 800 x 25(667 Kg) + CAST 660 x 25(83Kg) + CAST 680 x 25(481Kg)',
                maquina: 'COMEXI 3',
                planchas: '045',
                pedidoKg: 1000,
                estadoOrden: 'pendiente',
                prioridad: 'alta',
                etapa: 'pendiente',
                // AREA DE MONTAJE
                frecuencia: 200,
                anchoCorte: 320,
                anchoMontaje: 640,
                numBandas: 2,
                numRepeticion: 2,
                figuraEmbobinadoMontaje: '1',
                tipoImpresion: 'Reverso',
                desarrollo: 400,
                numColores: 8,
                // AREA DE IMPRESION
                pinon: null, // N/A
                lineaCorte: 'SI',
                sustratosVirgen: 'MATE 800 X 25 (667 Kg)',
                kgIngresadoImp: 665,
                kgSalidaImp: 667,
                mermaImp: 2,
                metrosImp: 37056,
                // Tintas (8 colores)
                tintas: [
                    { posicion: 1, color: 'NEGRO', anilox: '320', viscosidad: 19, porcentaje: null, observaciones: '' },
                    { posicion: 2, color: 'ROJO P485C', anilox: '240', viscosidad: 23, porcentaje: null, observaciones: '' },
                    { posicion: 3, color: 'NARANJA P165C', anilox: '160', viscosidad: 23, porcentaje: null, observaciones: '' },
                    { posicion: 4, color: 'AMARILLO', anilox: '320', viscosidad: 20, porcentaje: null, observaciones: 'FOTOCELDA 19mm X 10mm' },
                    { posicion: 5, color: 'MAGENTA', anilox: '260', viscosidad: 21, porcentaje: null, observaciones: '' },
                    { posicion: 6, color: 'CYAN', anilox: '280', viscosidad: 20, porcentaje: null, observaciones: '' },
                    { posicion: 7, color: 'VERDE P390C', anilox: '160', viscosidad: 23, porcentaje: null, observaciones: '' },
                    { posicion: 8, color: 'BLANCO', anilox: '120', viscosidad: 20, porcentaje: null, observaciones: '' }
                ],
                // Materia prima principal
                tipoMaterial: 'BOPP MATE',
                micrasMaterial: 25,
                anchoMaterial: 800,
                kgDisponible: 700,
                densidadMaterial: 0.90,
                // FICHA TECNICA - Estructura del producto
                fichaTipoMat1: 'BOPP MATE',
                fichaMicras1: 25,
                fichaDensidad1: 0.90,
                fichaKg1: 667,
                fichaSku1: 'BM-25-800',
                fichaTipoAdhesivo: 'Base solvente',
                fichaGramajeAdhesivo: '1,5',
                fichaGramajeAdhesivoHasta: '1,7',
                fichaRelacionCatalizador: '1.25',
                fichaKgAdhesivo: 22,
                fichaKgCatalizador: 16,
                fichaTipoMat2: 'CAST',
                fichaMicras2: 25,
                fichaDensidad2: 0.93,
                fichaKg2: 667,
                fichaSku2: 'CA-25-660',
                // Capas adicionales (CAST 680)
                capasAdicionales: [
                    {
                        capa: 3,
                        tipoMaterial: 'CAST',
                        micras: 25,
                        densidad: 0.93,
                        kg: 481,
                        sku: 'CA-25-680'
                    }
                ],
                // AREA DE LAMINACION
                figuraEmbobinadoLam: '1',
                gramajeAdhesivo: '1,5 A 1,7',
                relacionMezcla: '100/80',
                adhesivoKg: 22,
                catalizadorKg: 16,
                boppKg: 667,
                boppMetros: 37056,
                castKg: 667,
                castMetros: 37056,
                obsLaminacion: 'MATERIA PRIMA VIRGEN: Cast 660 x 25(83Kg) + Cast 680 x 25(481Kg)',
                // AREA DE CORTE/EMBALAJE
                anchoCorteFinal: 270,
                pesoBobina: '19-20',
                metrosBobina: 650,
                diametroBobina: 300,
                distFotoceldaBorde: 1,
                anchoCore: 320,
                cantidadCores: 58,
                diametroCore: 3,
                tipoEmpalme: 'EXTERNO',
                maxEmpalmes: 2,
                // Programacion
                fechaInicio: '2026-02-11',
                fechaEntrega: '2026-03-01',
                observacionesGenerales: 'OT basada en orden real 030-FEB26. Gramaje tinta: 1,50 g/m2. Figura embobinado impresion: 2.'
            }
        ];

        localStorage.setItem('axones_ordenes_trabajo', JSON.stringify(ordenes));
        console.log(`Ordenes de trabajo: ${ordenes.length} ordenes generadas (como usuario real)`);
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DemoData = DemoData;
}

// Auto-inicializar al cargar el script si no hay ordenes
// Esto asegura que los datos existen ANTES de que los modulos se inicialicen
(function() {
    try {
        const ordenes = localStorage.getItem('axones_ordenes_trabajo');
        const ordenesArr = ordenes ? JSON.parse(ordenes) : [];
        if (ordenesArr.length === 0) {
            console.log('[DemoData] Auto-init: no hay ordenes, generando datos iniciales...');
            DemoData.generarOrdenesTrabajo();
            DemoData.generarEstadoMaquinas();
        }
    } catch (e) {
        console.warn('[DemoData] Error en auto-init:', e);
    }
})();
