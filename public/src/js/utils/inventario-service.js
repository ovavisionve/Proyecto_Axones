/**
 * Servicio Centralizado de Inventario - Sistema Axones
 * Maneja todas las operaciones de inventario desde un solo lugar
 * Conecta con produccion (impresion, laminacion, corte) y ordenes
 */

const InventarioService = {
    // Configuracion de stock minimo por tipo
    STOCK_MINIMO: {
        material: 200,      // Kg
        tinta: 5,           // Kg
        adhesivo: 20,       // Kg
        catalizador: 5,     // Kg
        acetato: 10         // Lt
    },

    // Claves de localStorage
    STORAGE_KEYS: {
        inventario: 'axones_inventario',
        tintas: 'axones_tintas_inventario',
        adhesivos: 'axones_adhesivos_inventario',
        alertas: 'axones_alertas',
        movimientos: 'axones_movimientos_inventario'
    },

    /**
     * Obtiene el inventario de materiales
     */
    getMateriales: function() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.inventario) || '[]');
        } catch (e) {
            console.error('Error cargando inventario:', e);
            return [];
        }
    },

    /**
     * Obtiene el inventario de tintas
     */
    getTintas: function() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.tintas) || '[]');
        } catch (e) {
            console.error('Error cargando tintas:', e);
            return [];
        }
    },

    /**
     * Obtiene el inventario de adhesivos
     */
    getAdhesivos: function() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.adhesivos) || '[]');
        } catch (e) {
            console.error('Error cargando adhesivos:', e);
            return [];
        }
    },

    /**
     * Guarda inventario de materiales
     */
    saveMateriales: function(inventario) {
        localStorage.setItem(this.STORAGE_KEYS.inventario, JSON.stringify(inventario));
    },

    /**
     * Guarda inventario de tintas
     */
    saveTintas: function(tintas) {
        localStorage.setItem(this.STORAGE_KEYS.tintas, JSON.stringify(tintas));
    },

    /**
     * Guarda inventario de adhesivos
     */
    saveAdhesivos: function(adhesivos) {
        localStorage.setItem(this.STORAGE_KEYS.adhesivos, JSON.stringify(adhesivos));
    },

    /**
     * Descuenta material del inventario
     * @param {number} cantidad - Cantidad en Kg a descontar
     * @param {object} opciones - {producto, cliente, material, micras, ancho}
     * @param {string} proceso - Proceso que genera el descuento (impresion, laminacion, corte)
     * @returns {object} - {exito, descontado, mensaje}
     */
    descontarMaterial: function(cantidad, opciones = {}, proceso = 'produccion') {
        if (!cantidad || cantidad <= 0) {
            return { exito: false, descontado: 0, mensaje: 'Cantidad no valida' };
        }

        try {
            const inventario = this.getMateriales();
            let restante = cantidad;
            let totalDescontado = 0;
            const detalles = [];

            // Ordenar: primero los que coinciden con producto/cliente, luego los genericos
            const ordenados = [...inventario].sort((a, b) => {
                const coincideA = this.coincideMaterial(a, opciones) ? 0 : 1;
                const coincideB = this.coincideMaterial(b, opciones) ? 0 : 1;
                return coincideA - coincideB;
            });

            for (let i = 0; i < ordenados.length && restante > 0; i++) {
                const item = ordenados[i];
                const disponible = parseFloat(item.kg) || 0;

                if (disponible > 0) {
                    const aDescontar = Math.min(disponible, restante);

                    // Actualizar en el array original
                    const indexOriginal = inventario.findIndex(inv => inv.id === item.id);
                    if (indexOriginal !== -1) {
                        inventario[indexOriginal].kg = disponible - aDescontar;
                    }

                    restante -= aDescontar;
                    totalDescontado += aDescontar;
                    detalles.push({
                        material: item.material,
                        micras: item.micras,
                        descontado: aDescontar,
                        restante: disponible - aDescontar
                    });
                }
            }

            if (totalDescontado > 0) {
                this.saveMateriales(inventario);
                this.registrarMovimiento('material', 'salida', totalDescontado, proceso, detalles);
                this.verificarStockBajoMateriales(inventario);

                console.log(`InventarioService: Descontados ${totalDescontado.toFixed(2)} Kg de material (${proceso})`);
            }

            return {
                exito: true,
                descontado: totalDescontado,
                faltante: restante,
                mensaje: restante > 0
                    ? `Descontados ${totalDescontado.toFixed(2)} Kg, faltan ${restante.toFixed(2)} Kg en inventario`
                    : `Descontados ${totalDescontado.toFixed(2)} Kg correctamente`,
                detalles
            };
        } catch (error) {
            console.error('Error descontando material:', error);
            return { exito: false, descontado: 0, mensaje: error.message };
        }
    },

    /**
     * Verifica si un item coincide con las opciones de busqueda
     */
    coincideMaterial: function(item, opciones) {
        if (!opciones) return false;

        // Coincide por producto
        if (opciones.producto && item.producto) {
            const prod = opciones.producto.toLowerCase();
            const itemProd = item.producto.toLowerCase();
            if (itemProd.includes(prod) || prod.includes(itemProd)) return true;
        }

        // Coincide por material
        if (opciones.material && item.material) {
            if (item.material.includes(opciones.material)) return true;
        }

        // Coincide por micras y ancho
        if (opciones.micras && opciones.ancho) {
            if (item.micras === opciones.micras && item.ancho === opciones.ancho) return true;
        }

        return false;
    },

    /**
     * Descuenta tinta del inventario
     * @param {string} color - Color de la tinta
     * @param {number} cantidad - Cantidad en Kg
     * @param {string} proceso - Proceso origen
     */
    descontarTinta: function(color, cantidad, proceso = 'impresion') {
        if (!color || !cantidad || cantidad <= 0) return { exito: false };

        try {
            const tintas = this.getTintas();
            const tinta = tintas.find(t =>
                t.nombre?.toLowerCase().includes(color.toLowerCase()) ||
                t.codigo?.toLowerCase().includes(color.toLowerCase())
            );

            if (tinta) {
                const disponible = parseFloat(tinta.cantidad) || 0;
                const aDescontar = Math.min(disponible, cantidad);
                tinta.cantidad = disponible - aDescontar;

                this.saveTintas(tintas);
                this.registrarMovimiento('tinta', 'salida', aDescontar, proceso, { color });
                this.verificarStockBajoTintas(tintas);

                console.log(`InventarioService: Descontados ${aDescontar.toFixed(2)} Kg de tinta ${color}`);
                return { exito: true, descontado: aDescontar };
            }

            return { exito: false, mensaje: 'Tinta no encontrada' };
        } catch (error) {
            console.error('Error descontando tinta:', error);
            return { exito: false, mensaje: error.message };
        }
    },

    /**
     * Descuenta adhesivo, catalizador o acetato del inventario
     * @param {string} tipo - Tipo: adhesivo, catalizador, acetato
     * @param {number} cantidad - Cantidad
     * @param {string} proceso - Proceso origen
     */
    descontarAdhesivo: function(tipo, cantidad, proceso = 'laminacion') {
        if (!tipo || !cantidad || cantidad <= 0) return { exito: false };

        try {
            const adhesivos = this.getAdhesivos();
            const item = adhesivos.find(a => a.tipo === tipo);

            if (item) {
                const disponible = parseFloat(item.cantidad) || 0;
                const aDescontar = Math.min(disponible, cantidad);
                item.cantidad = disponible - aDescontar;

                this.saveAdhesivos(adhesivos);
                this.registrarMovimiento('adhesivo', 'salida', aDescontar, proceso, { tipo });
                this.verificarStockBajoAdhesivos(adhesivos);

                console.log(`InventarioService: Descontados ${aDescontar.toFixed(2)} de ${tipo}`);
                return { exito: true, descontado: aDescontar };
            }

            return { exito: false, mensaje: `${tipo} no encontrado` };
        } catch (error) {
            console.error('Error descontando adhesivo:', error);
            return { exito: false, mensaje: error.message };
        }
    },

    /**
     * Agrega material al inventario (entrada de mercancia)
     * @param {object} item - Datos del material
     */
    agregarMaterial: function(item) {
        try {
            const inventario = this.getMateriales();

            // Buscar si ya existe
            const existente = inventario.find(i =>
                i.material === item.material &&
                i.micras === item.micras &&
                i.ancho === item.ancho
            );

            if (existente) {
                existente.kg = (parseFloat(existente.kg) || 0) + (parseFloat(item.kg) || 0);
            } else {
                item.id = item.id || 'INV' + Date.now();
                inventario.push(item);
            }

            this.saveMateriales(inventario);
            this.registrarMovimiento('material', 'entrada', item.kg, 'compra', item);

            console.log(`InventarioService: Agregados ${item.kg} Kg de ${item.material}`);

            // Verificar y resolver alertas pendientes relacionadas con este material
            this.resolverAlertasPorMaterial(item.material);

            return { exito: true };
        } catch (error) {
            console.error('Error agregando material:', error);
            return { exito: false, mensaje: error.message };
        }
    },

    /**
     * Agrega tinta al inventario
     * @param {object} tinta - Datos de la tinta {nombre, cantidad, unidad}
     */
    agregarTinta: function(tinta) {
        try {
            const tintas = this.getTintas();

            const existente = tintas.find(t =>
                t.nombre?.toLowerCase() === tinta.nombre?.toLowerCase() ||
                t.codigo === tinta.codigo
            );

            if (existente) {
                existente.cantidad = (parseFloat(existente.cantidad) || 0) + (parseFloat(tinta.cantidad) || 0);
            } else {
                tinta.id = tinta.id || 'TINTA' + Date.now();
                tintas.push(tinta);
            }

            this.saveTintas(tintas);
            this.registrarMovimiento('tinta', 'entrada', tinta.cantidad, 'compra', tinta);

            console.log(`InventarioService: Agregados ${tinta.cantidad} ${tinta.unidad || 'Kg'} de tinta ${tinta.nombre}`);

            // Resolver alertas de tinta
            this.resolverAlertasPorTinta(tinta.nombre);

            return { exito: true };
        } catch (error) {
            console.error('Error agregando tinta:', error);
            return { exito: false, mensaje: error.message };
        }
    },

    /**
     * Agrega adhesivo/catalizador/acetato al inventario
     * @param {object} item - Datos {tipo, nombre, cantidad, unidad}
     */
    agregarAdhesivo: function(item) {
        try {
            const adhesivos = this.getAdhesivos();

            const existente = adhesivos.find(a => a.tipo === item.tipo);

            if (existente) {
                existente.cantidad = (parseFloat(existente.cantidad) || 0) + (parseFloat(item.cantidad) || 0);
            } else {
                item.id = item.id || 'ADH' + Date.now();
                adhesivos.push(item);
            }

            this.saveAdhesivos(adhesivos);
            this.registrarMovimiento('adhesivo', 'entrada', item.cantidad, 'compra', item);

            console.log(`InventarioService: Agregados ${item.cantidad} ${item.unidad || 'Kg'} de ${item.tipo}`);

            // Resolver alertas de adhesivos
            this.resolverAlertasPorAdhesivo(item.tipo);

            return { exito: true };
        } catch (error) {
            console.error('Error agregando adhesivo:', error);
            return { exito: false, mensaje: error.message };
        }
    },

    /**
     * Resuelve alertas pendientes cuando se repone material
     * @param {string} material - Nombre del material agregado
     */
    resolverAlertasPorMaterial: function(material) {
        const alertas = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.alertas) || '[]');
        const inventario = this.getMateriales();
        let alertasResueltas = 0;

        // Calcular total disponible del material
        const totalDisponible = inventario
            .filter(i => i.material?.includes(material))
            .reduce((sum, i) => sum + (parseFloat(i.kg) || 0), 0);

        alertas.forEach(alerta => {
            // Buscar alertas de stock bajo o inventario insuficiente relacionadas
            if ((alerta.tipo === 'stock_bajo' || alerta.tipo === 'inventario_insuficiente_email' || alerta.tipo === 'stock_bajo_material') &&
                alerta.estado === 'pendiente') {

                const relacionada = alerta.datos?.material?.includes(material) ||
                                   alerta.mensaje?.includes(material);

                if (relacionada) {
                    // Verificar si el stock ahora es suficiente
                    const cantidadRequerida = alerta.datos?.cantidadRequerida || this.STOCK_MINIMO.material;

                    if (totalDisponible >= cantidadRequerida) {
                        alerta.estado = 'resuelta';
                        alerta.fechaResolucion = new Date().toISOString();
                        alerta.resolucion = `Inventario repuesto automaticamente. Stock actual: ${totalDisponible.toFixed(2)} Kg`;
                        alertasResueltas++;
                        console.log(`Alerta resuelta: ${alerta.mensaje}`);
                    }
                }
            }
        });

        if (alertasResueltas > 0) {
            localStorage.setItem(this.STORAGE_KEYS.alertas, JSON.stringify(alertas));
            console.log(`InventarioService: ${alertasResueltas} alerta(s) resuelta(s) por reposicion de ${material}`);
        }

        return alertasResueltas;
    },

    /**
     * Resuelve alertas pendientes cuando se repone tinta
     * @param {string} nombreTinta - Nombre de la tinta agregada
     */
    resolverAlertasPorTinta: function(nombreTinta) {
        const alertas = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.alertas) || '[]');
        const tintas = this.getTintas();
        let alertasResueltas = 0;

        // Buscar la tinta y su cantidad actual
        const tinta = tintas.find(t =>
            t.nombre?.toLowerCase().includes(nombreTinta.toLowerCase())
        );
        const cantidadActual = tinta ? (parseFloat(tinta.cantidad) || 0) : 0;

        alertas.forEach(alerta => {
            if (alerta.tipo === 'stock_bajo_tinta' && alerta.estado === 'pendiente') {
                const relacionada = alerta.datos?.nombre?.toLowerCase().includes(nombreTinta.toLowerCase()) ||
                                   alerta.mensaje?.toLowerCase().includes(nombreTinta.toLowerCase());

                if (relacionada && cantidadActual >= this.STOCK_MINIMO.tinta) {
                    alerta.estado = 'resuelta';
                    alerta.fechaResolucion = new Date().toISOString();
                    alerta.resolucion = `Tinta repuesta. Stock actual: ${cantidadActual.toFixed(2)} ${tinta?.unidad || 'Kg'}`;
                    alertasResueltas++;
                    console.log(`Alerta de tinta resuelta: ${alerta.mensaje}`);
                }
            }
        });

        if (alertasResueltas > 0) {
            localStorage.setItem(this.STORAGE_KEYS.alertas, JSON.stringify(alertas));
        }

        return alertasResueltas;
    },

    /**
     * Resuelve alertas pendientes cuando se repone adhesivo/catalizador/acetato
     * @param {string} tipo - Tipo de adhesivo (adhesivo, catalizador, acetato)
     */
    resolverAlertasPorAdhesivo: function(tipo) {
        const alertas = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.alertas) || '[]');
        const adhesivos = this.getAdhesivos();
        let alertasResueltas = 0;

        const item = adhesivos.find(a => a.tipo === tipo);
        const cantidadActual = item ? (parseFloat(item.cantidad) || 0) : 0;
        const minimo = this.STOCK_MINIMO[tipo] || 10;

        alertas.forEach(alerta => {
            if (alerta.tipo === 'stock_bajo_adhesivo' && alerta.estado === 'pendiente') {
                const relacionada = alerta.datos?.tipo === tipo ||
                                   alerta.mensaje?.toLowerCase().includes(tipo.toLowerCase());

                if (relacionada && cantidadActual >= minimo) {
                    alerta.estado = 'resuelta';
                    alerta.fechaResolucion = new Date().toISOString();
                    alerta.resolucion = `${tipo} repuesto. Stock actual: ${cantidadActual.toFixed(2)} ${item?.unidad || 'Kg'}`;
                    alertasResueltas++;
                    console.log(`Alerta de ${tipo} resuelta: ${alerta.mensaje}`);
                }
            }
        });

        if (alertasResueltas > 0) {
            localStorage.setItem(this.STORAGE_KEYS.alertas, JSON.stringify(alertas));
        }

        return alertasResueltas;
    },

    /**
     * Verifica todas las alertas pendientes contra el inventario actual
     * Util para ejecutar periodicamente o al iniciar la aplicacion
     */
    verificarYResolverAlertasPendientes: function() {
        const alertas = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.alertas) || '[]');
        const inventario = this.getMateriales();
        const tintas = this.getTintas();
        const adhesivos = this.getAdhesivos();
        let alertasResueltas = 0;

        alertas.forEach(alerta => {
            if (alerta.estado !== 'pendiente') return;

            let resuelta = false;

            // Verificar alertas de material
            if (alerta.tipo === 'stock_bajo' || alerta.tipo === 'inventario_insuficiente_email') {
                const material = alerta.datos?.material;
                if (material) {
                    const totalDisponible = inventario
                        .filter(i => i.material?.includes(material))
                        .reduce((sum, i) => sum + (parseFloat(i.kg) || 0), 0);

                    const cantidadRequerida = alerta.datos?.cantidadRequerida || this.STOCK_MINIMO.material;
                    if (totalDisponible >= cantidadRequerida) {
                        resuelta = true;
                        alerta.resolucion = `Stock verificado: ${totalDisponible.toFixed(2)} Kg disponibles`;
                    }
                }
            }

            // Verificar alertas de tinta
            if (alerta.tipo === 'stock_bajo_tinta') {
                const nombreTinta = alerta.datos?.nombre;
                if (nombreTinta) {
                    const tinta = tintas.find(t => t.nombre?.includes(nombreTinta));
                    if (tinta && (parseFloat(tinta.cantidad) || 0) >= this.STOCK_MINIMO.tinta) {
                        resuelta = true;
                        alerta.resolucion = `Tinta verificada: ${tinta.cantidad} ${tinta.unidad || 'Kg'} disponibles`;
                    }
                }
            }

            // Verificar alertas de adhesivos
            if (alerta.tipo === 'stock_bajo_adhesivo') {
                const tipo = alerta.datos?.tipo;
                if (tipo) {
                    const item = adhesivos.find(a => a.tipo === tipo);
                    const minimo = this.STOCK_MINIMO[tipo] || 10;
                    if (item && (parseFloat(item.cantidad) || 0) >= minimo) {
                        resuelta = true;
                        alerta.resolucion = `${tipo} verificado: ${item.cantidad} ${item.unidad || 'Kg'} disponibles`;
                    }
                }
            }

            if (resuelta) {
                alerta.estado = 'resuelta';
                alerta.fechaResolucion = new Date().toISOString();
                alertasResueltas++;
            }
        });

        if (alertasResueltas > 0) {
            localStorage.setItem(this.STORAGE_KEYS.alertas, JSON.stringify(alertas));
            console.log(`InventarioService: ${alertasResueltas} alerta(s) resuelta(s) en verificacion global`);
        }

        return alertasResueltas;
    },

    /**
     * Verifica disponibilidad de material para una orden
     * @param {object} orden - Datos de la orden
     * @returns {object} - {disponible, cantidad, suficiente, mensaje}
     */
    verificarDisponibilidad: function(orden) {
        const inventario = this.getMateriales();
        const tipoMaterial = orden.tipoMaterial;
        const cantidadRequerida = parseFloat(orden.pedidoKg) || 0;
        const micras = parseFloat(orden.micrasMaterial) || 0;
        const ancho = parseFloat(orden.anchoMaterial) || 0;

        if (!tipoMaterial || !cantidadRequerida) {
            return { disponible: 0, suficiente: true, mensaje: 'Sin datos de material' };
        }

        // Filtrar inventario que coincide
        const disponibles = inventario.filter(item => {
            const matchMaterial = item.material?.includes(tipoMaterial);
            const matchMicras = !micras || item.micras === micras;
            const matchAncho = !ancho || item.ancho === ancho;
            return matchMaterial && matchMicras && matchAncho && (item.kg || 0) > 0;
        });

        const totalDisponible = disponibles.reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);
        const suficiente = totalDisponible >= cantidadRequerida;

        return {
            disponible: totalDisponible,
            requerido: cantidadRequerida,
            suficiente,
            faltante: suficiente ? 0 : cantidadRequerida - totalDisponible,
            mensaje: suficiente
                ? `Inventario suficiente: ${totalDisponible.toFixed(2)} Kg disponibles`
                : `ALERTA: Inventario insuficiente - Disponible: ${totalDisponible.toFixed(2)} Kg, Requerido: ${cantidadRequerida} Kg`,
            items: disponibles
        };
    },

    /**
     * Registra un movimiento de inventario
     */
    registrarMovimiento: function(tipoInventario, tipoMovimiento, cantidad, proceso, detalles) {
        try {
            const movimientos = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.movimientos) || '[]');
            movimientos.unshift({
                id: Date.now(),
                fecha: new Date().toISOString(),
                tipoInventario,
                tipoMovimiento,
                cantidad,
                proceso,
                detalles,
                usuario: typeof Auth !== 'undefined' && Auth.getUser() ? Auth.getUser().nombre : 'Sistema'
            });

            // Mantener solo los ultimos 500 movimientos
            if (movimientos.length > 500) {
                movimientos.splice(500);
            }

            localStorage.setItem(this.STORAGE_KEYS.movimientos, JSON.stringify(movimientos));
        } catch (error) {
            console.warn('Error registrando movimiento:', error);
        }
    },

    /**
     * Verifica stock bajo de materiales SOLO si hay ordenes que lo necesiten
     * Ya no alerta por stock bajo general, solo cuando afecta un pedido
     */
    verificarStockBajoMateriales: function(inventario) {
        // Re-escanear alertas vs ordenes pendientes
        this.escanearInventarioYGenerarAlertas();
    },

    /**
     * Verifica stock bajo de tintas - solo re-escanea vs ordenes
     */
    verificarStockBajoTintas: function(tintas) {
        // Ya no genera alertas generales, solo se re-escanean las ordenes
        console.log('InventarioService: Tintas verificadas (alertas solo por pedidos)');
    },

    /**
     * Verifica stock bajo de adhesivos - solo re-escanea vs ordenes
     */
    verificarStockBajoAdhesivos: function(adhesivos) {
        // Ya no genera alertas generales, solo se re-escanean las ordenes
        console.log('InventarioService: Adhesivos verificados (alertas solo por pedidos)');
    },

    /**
     * Obtiene resumen del inventario
     */
    getResumen: function() {
        const materiales = this.getMateriales();
        const tintas = this.getTintas();
        const adhesivos = this.getAdhesivos();

        return {
            materiales: {
                total: materiales.reduce((sum, m) => sum + (parseFloat(m.kg) || 0), 0),
                items: materiales.length,
                bajoStock: materiales.filter(m => (m.kg || 0) < this.STOCK_MINIMO.material && (m.kg || 0) > 0).length,
                agotados: materiales.filter(m => (m.kg || 0) === 0).length
            },
            tintas: {
                total: tintas.reduce((sum, t) => sum + (parseFloat(t.cantidad) || 0), 0),
                items: tintas.length,
                bajoStock: tintas.filter(t => (t.cantidad || 0) < this.STOCK_MINIMO.tinta && (t.cantidad || 0) > 0).length
            },
            adhesivos: {
                total: adhesivos.reduce((sum, a) => sum + (parseFloat(a.cantidad) || 0), 0),
                items: adhesivos.length,
                bajoStock: adhesivos.filter(a => (a.cantidad || 0) < (this.STOCK_MINIMO[a.tipo] || 10) && (a.cantidad || 0) > 0).length
            }
        };
    },

    /**
     * Escanea inventario y genera alertas SOLO cuando hay ordenes pendientes
     * que necesitan material insuficiente. Ya no alerta por stock bajo general.
     * Envia email cuando detecta faltante relacionado con un pedido.
     */
    escanearInventarioYGenerarAlertas: function() {
        console.log('InventarioService: Escaneando inventario vs ordenes pendientes...');

        const materiales = this.getMateriales();

        // Obtener ordenes pendientes/en proceso
        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        const ordenesPendientes = ordenes.filter(o =>
            o.estadoOrden === 'pendiente' || o.estadoOrden === 'en_proceso'
        );

        // Obtener alertas existentes y limpiar las de stock viejas
        let alertas = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.alertas) || '[]');
        alertas = alertas.filter(a =>
            !['stock_bajo', 'stock_bajo_tinta', 'stock_bajo_adhesivo', 'stock_bajo_material', 'stock_insuficiente_pedido'].includes(a.tipo)
        );

        const nuevasAlertas = [];

        // Solo alertar si hay ordenes que necesitan material insuficiente
        ordenesPendientes.forEach(orden => {
            const tipoMat = orden.tipoMaterial;
            const pedidoKg = parseFloat(orden.pedidoKg) || 0;
            if (!tipoMat || !pedidoKg) return;

            // Buscar material disponible en inventario
            const disponible = materiales.filter(item =>
                item.material && item.material.toUpperCase().includes(tipoMat.toUpperCase())
            ).reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);

            if (disponible < pedidoKg) {
                const faltante = pedidoKg - disponible;
                const nivel = disponible === 0 ? 'critical' : (disponible < pedidoKg * 0.5 ? 'danger' : 'warning');

                nuevasAlertas.push({
                    id: Date.now() + Math.random() * 1000,
                    tipo: 'stock_insuficiente_pedido',
                    nivel: nivel,
                    mensaje: `EPA! No hay suficiente ${tipoMat} para ${orden.numeroOrden} (${orden.cliente}). Necesario: ${pedidoKg} Kg, Disponible: ${disponible.toFixed(1)} Kg. FALTAN ${faltante.toFixed(1)} Kg - COMPRAR!`,
                    fecha: new Date().toISOString(),
                    estado: 'pendiente',
                    maquina: orden.maquina || null,
                    ot: orden.numeroOrden,
                    datos: {
                        ordenId: orden.id,
                        numeroOrden: orden.numeroOrden,
                        cliente: orden.cliente,
                        material: tipoMat,
                        requerido: pedidoKg,
                        disponible: disponible,
                        faltante: faltante
                    }
                });

                // Enviar email de alerta automatica
                if (typeof AxonesAPI !== 'undefined') {
                    AxonesAPI.enviarAlertaEmail({
                        tipo: 'stock_insuficiente_pedido',
                        nivel: nivel,
                        mensaje: `EPA! No hay suficiente ${tipoMat} para la orden ${orden.numeroOrden} del cliente ${orden.cliente}. Se necesitan ${pedidoKg} Kg pero solo hay ${disponible.toFixed(1)} Kg disponibles. Faltan ${faltante.toFixed(1)} Kg. POR FAVOR COMPRAR!`,
                        ot: orden.numeroOrden,
                        maquina: orden.maquina || ''
                    }).catch(e => console.warn('Error enviando email de stock:', e));
                }
            }

            // Tambien verificar ficha tecnica (materiales secundarios)
            if (orden.fichaTipoMat2 && orden.fichaKg2) {
                const tipoMat2 = orden.fichaTipoMat2;
                const kg2 = parseFloat(orden.fichaKg2) || 0;
                const disponible2 = materiales.filter(item =>
                    item.material && item.material.toUpperCase().includes(tipoMat2.toUpperCase())
                ).reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);

                if (disponible2 < kg2) {
                    const faltante2 = kg2 - disponible2;
                    nuevasAlertas.push({
                        id: Date.now() + Math.random() * 1000,
                        tipo: 'stock_insuficiente_pedido',
                        nivel: disponible2 === 0 ? 'critical' : 'warning',
                        mensaje: `EPA! Falta ${tipoMat2} (capa 2) para ${orden.numeroOrden}. Necesario: ${kg2} Kg, Disponible: ${disponible2.toFixed(1)} Kg. COMPRAR!`,
                        fecha: new Date().toISOString(),
                        estado: 'pendiente',
                        ot: orden.numeroOrden,
                        datos: {
                            ordenId: orden.id,
                            numeroOrden: orden.numeroOrden,
                            cliente: orden.cliente,
                            material: tipoMat2,
                            requerido: kg2,
                            disponible: disponible2,
                            faltante: faltante2,
                            capa: 2
                        }
                    });
                }
            }
        });

        // Agregar nuevas alertas al inicio
        alertas = [...nuevasAlertas, ...alertas];
        localStorage.setItem(this.STORAGE_KEYS.alertas, JSON.stringify(alertas));

        console.log(`InventarioService: ${nuevasAlertas.length} alertas de stock vs pedidos (ya no alerta stock bajo general)`);

        return {
            totalAlertas: nuevasAlertas.length,
            criticas: nuevasAlertas.filter(a => a.nivel === 'critical').length,
            altas: nuevasAlertas.filter(a => a.nivel === 'danger').length,
            advertencias: nuevasAlertas.filter(a => a.nivel === 'warning').length
        };
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.InventarioService = InventarioService;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventarioService;
}
