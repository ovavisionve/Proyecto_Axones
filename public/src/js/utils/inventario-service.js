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
            return { exito: true };
        } catch (error) {
            console.error('Error agregando material:', error);
            return { exito: false, mensaje: error.message };
        }
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
     * Verifica stock bajo de materiales
     */
    verificarStockBajoMateriales: function(inventario) {
        const alertas = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.alertas) || '[]');

        inventario.forEach(item => {
            const kg = parseFloat(item.kg) || 0;
            if (kg < this.STOCK_MINIMO.material && kg > 0) {
                const alertaExistente = alertas.find(a =>
                    a.tipo === 'stock_bajo' &&
                    a.datos?.material === item.material &&
                    new Date(a.fecha) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );

                if (!alertaExistente) {
                    alertas.unshift({
                        id: Date.now(),
                        tipo: 'stock_bajo',
                        nivel: kg < 50 ? 'danger' : 'warning',
                        mensaje: `Stock bajo: ${item.material} ${item.micras || ''}u x ${item.ancho || ''}mm - Quedan ${kg.toFixed(1)} Kg`,
                        fecha: new Date().toISOString(),
                        estado: 'pendiente',
                        datos: { material: item.material, micras: item.micras, cantidad: kg }
                    });
                }
            }
        });

        localStorage.setItem(this.STORAGE_KEYS.alertas, JSON.stringify(alertas));
    },

    /**
     * Verifica stock bajo de tintas
     */
    verificarStockBajoTintas: function(tintas) {
        const alertas = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.alertas) || '[]');

        tintas.forEach(tinta => {
            const cantidad = parseFloat(tinta.cantidad) || 0;
            if (cantidad < this.STOCK_MINIMO.tinta && cantidad > 0) {
                const alertaExistente = alertas.find(a =>
                    a.tipo === 'stock_bajo_tinta' &&
                    a.datos?.nombre === tinta.nombre &&
                    new Date(a.fecha) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );

                if (!alertaExistente) {
                    alertas.unshift({
                        id: Date.now(),
                        tipo: 'stock_bajo_tinta',
                        nivel: cantidad < 2 ? 'danger' : 'warning',
                        mensaje: `Stock bajo de tinta: ${tinta.nombre} - Quedan ${cantidad.toFixed(1)} ${tinta.unidad || 'Kg'}`,
                        fecha: new Date().toISOString(),
                        estado: 'pendiente',
                        datos: { nombre: tinta.nombre, cantidad }
                    });
                }
            }
        });

        localStorage.setItem(this.STORAGE_KEYS.alertas, JSON.stringify(alertas));
    },

    /**
     * Verifica stock bajo de adhesivos
     */
    verificarStockBajoAdhesivos: function(adhesivos) {
        const alertas = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.alertas) || '[]');

        adhesivos.forEach(item => {
            const cantidad = parseFloat(item.cantidad) || 0;
            const minimo = this.STOCK_MINIMO[item.tipo] || 10;

            if (cantidad < minimo && cantidad > 0) {
                const alertaExistente = alertas.find(a =>
                    a.tipo === 'stock_bajo_adhesivo' &&
                    a.datos?.nombre === item.nombre &&
                    new Date(a.fecha) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );

                if (!alertaExistente) {
                    alertas.unshift({
                        id: Date.now(),
                        tipo: 'stock_bajo_adhesivo',
                        nivel: cantidad < minimo / 2 ? 'danger' : 'warning',
                        mensaje: `Stock bajo: ${item.nombre} (${item.tipo}) - Quedan ${cantidad.toFixed(1)} ${item.unidad || 'Kg'}`,
                        fecha: new Date().toISOString(),
                        estado: 'pendiente',
                        datos: { nombre: item.nombre, tipo: item.tipo, cantidad }
                    });
                }
            }
        });

        localStorage.setItem(this.STORAGE_KEYS.alertas, JSON.stringify(alertas));
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
