/**
 * Datos de Prueba - Sistema Axones
 * Genera datos realistas para desarrollo y demostracion
 * Sincroniza con Google Sheets API automaticamente
 */

const DemoData = {
    // Inicializar datos de prueba
    init() {
        console.log('Inicializando datos de prueba...');
        this.generarInventario();
        this.generarProduccion();
        this.generarAlertas();
        this.generarTintas();
        this.generarEstadoMaquinas();
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
        console.log('Datos limpiados');
    },

    // Sincronizar datos de demo con Google Sheets API
    async syncToAPI() {
        if (typeof AxonesAPI === 'undefined') {
            console.warn('AxonesAPI no disponible, saltando sync');
            return;
        }

        console.log('Sincronizando datos de demo con Google Sheets...');
        let synced = 0;
        let errors = 0;

        // Sync produccion (solo los ultimos 10 para no saturar)
        const produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');
        const prodRecientes = produccion.slice(0, 10);
        for (const reg of prodRecientes) {
            try {
                await AxonesAPI.createProduccion({
                    fecha: reg.fecha,
                    turno: reg.turno,
                    maquina: reg.maquina,
                    proceso: reg.tipo || 'impresion',
                    cliente: reg.cliente,
                    producto: reg.producto,
                    ot: reg.ordenTrabajo,
                    kilos_producidos: reg.pesoTotal || reg.totalSalida || 0,
                    kilos_entrada: reg.totalMaterialEntrada || reg.totalEntrada || 0,
                    refil_kg: reg.merma || 0,
                    tiempo_trabajo_min: reg.tiempoEfectivo || 0,
                    tiempo_muerto_min: reg.tiempoMuerto || 0,
                    operador: reg.operador,
                    observaciones: 'Datos de demo'
                });
                synced++;
            } catch (e) {
                errors++;
            }
        }

        // Sync alertas
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        for (const alerta of alertas) {
            try {
                await AxonesAPI.createAlerta({
                    tipo: alerta.tipo,
                    nivel: alerta.nivel,
                    mensaje: alerta.mensaje,
                    usuario_id: null,
                    referencia_id: null,
                    referencia_tipo: alerta.tipo
                });
                synced++;
            } catch (e) {
                errors++;
            }
        }

        // Sync inventario (5 items de muestra)
        const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
        const invMuestra = inventario.slice(0, 5);
        for (const item of invMuestra) {
            try {
                await AxonesAPI.createInventario({
                    tipo: item.material,
                    material: item.material + ' ' + item.micras + 'µ x ' + item.ancho + 'mm',
                    cantidad: item.kg,
                    unidad: 'Kg',
                    ubicacion: item.producto || 'Almacen',
                    lote: '',
                    proveedor: item.importado ? 'Importado' : 'Nacional',
                    observaciones: 'Demo'
                });
                synced++;
            } catch (e) {
                errors++;
            }
        }

        // Sync tintas (5 registros de muestra)
        const tintas = JSON.parse(localStorage.getItem('axones_tintas') || '[]');
        const tintasMuestra = tintas.slice(0, 5);
        for (const tinta of tintasMuestra) {
            try {
                await AxonesAPI.createConsumoTinta({
                    fecha: tinta.fecha,
                    turno: '1',
                    maquina: tinta.maquina,
                    produccion_id: null,
                    tinta_tipo: 'laminacion',
                    tinta_nombre: 'Mix tintas demo',
                    cantidad_kg: parseFloat(tinta.totalTintasLaminacion) || 0,
                    operador: tinta.operador
                });
                synced++;
            } catch (e) {
                errors++;
            }
        }

        console.log(`Sync completado: ${synced} registros enviados, ${errors} errores`);

        // Mostrar notificacion si hay funcion de toast disponible
        if (typeof bootstrap !== 'undefined') {
            let toastContainer = document.querySelector('.toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
                document.body.appendChild(toastContainer);
            }
            const toast = document.createElement('div');
            toast.className = 'toast align-items-center text-white bg-success border-0';
            toast.innerHTML = '<div class="d-flex"><div class="toast-body"><i class="bi bi-cloud-check me-1"></i>Datos de demo sincronizados con Google Sheets (' + synced + ' registros)</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>';
            toastContainer.appendChild(toast);
            new bootstrap.Toast(toast).show();
            toast.addEventListener('hidden.bs.toast', () => toast.remove());
        }
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
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DemoData = DemoData;
}
