/**
 * Modulo Nota de Entrega - Sistema Axones
 * Genera notas de entrega al finalizar corte/despacho
 * Basado en formato real de Inversiones Axones 2008, C.A.
 */

const NotaEntrega = {
    notas: [],
    paletas: [],
    otSeleccionada: null,

    STORAGE_KEY: 'axones_notas_entrega',

    init: function() {
        this.loadNotas();
        this.cargarOTsDisponibles();
        this.renderHistorial();
        this.generarNumeroNota();

        // Fecha actual
        const hoy = new Date().toLocaleDateString('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        document.getElementById('printFecha').textContent = hoy;
    },

    /**
     * Carga notas guardadas
     */
    loadNotas: async function() {
        if (AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', this.STORAGE_KEY).single();
                this.notas = data?.value || [];
            } catch (e) { this.notas = []; }
        } else { this.notas = []; }
    },

    /**
     * Guarda notas
     */
    saveNotas: async function() {
        if (AxonesDB.isReady()) {
            await AxonesDB.client.from('sync_store').upsert({
                key: this.STORAGE_KEY, value: this.notas, updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        }
    },

    /**
     * Genera numero de nota correlativo
     */
    generarNumeroNota: function() {
        const ultimoNumero = this.notas.length > 0
            ? Math.max(...this.notas.map(n => parseInt(n.numeroNota) || 0))
            : 0;
        document.getElementById('numeroNota').value = ultimoNumero + 1;
    },

    /**
     * Carga OTs disponibles (completadas o con producto terminado)
     */
    cargarOTsDisponibles: async function() {
        const select = document.getElementById('selectOT');
        const ordenes = AxonesDB.isReady() ? await AxonesDB.ordenesHelper.cargar() : [];
        let productoTerminado = [];
        if (AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_producto_terminado').single();
                productoTerminado = data?.value || [];
            } catch (e) { productoTerminado = []; }
        }

        // Obtener OTs que tienen producto terminado o estan completadas/en proceso
        const otsConPT = [...new Set(productoTerminado.map(pt => pt.ordenTrabajo))];
        const otsDisponibles = ordenes.filter(o =>
            otsConPT.includes(o.numeroOrden) ||
            o.estadoOrden === 'completada' ||
            o.estadoOrden === 'en_proceso' ||
            o.estadoOrden === 'pendiente'
        );

        select.innerHTML = '<option value="">-- Seleccione una OT --</option>';
        otsDisponibles.forEach(ot => {
            const opt = document.createElement('option');
            opt.value = ot.numeroOrden || ot.id;
            opt.textContent = `${ot.numeroOrden} - ${ot.cliente} - ${ot.producto} (${ot.pedidoKg || 0} Kg)`;
            select.appendChild(opt);
        });
    },

    /**
     * Carga datos de la OT seleccionada
     */
    cargarDatosOT: async function() {
        const otNumero = document.getElementById('selectOT').value;
        if (!otNumero) {
            alert('Seleccione una Orden de Trabajo');
            return;
        }

        const ordenes = AxonesDB.isReady() ? await AxonesDB.ordenesHelper.cargar() : [];
        const orden = ordenes.find(o => o.numeroOrden === otNumero || o.id === otNumero);

        if (!orden) {
            alert('No se encontro la orden');
            return;
        }

        this.otSeleccionada = orden;

        // Llenar datos del cliente
        document.getElementById('printCliente').textContent = orden.cliente || '___';
        document.getElementById('printDireccion').textContent = orden.clienteDireccion || 'Venezuela';
        document.getElementById('printTipoMaterial').textContent =
            `MATERIAL DE EMPAQUE PARA PRODUCTO "${(orden.producto || '').toUpperCase()}"`;
        document.getElementById('printOT').textContent = orden.numeroOrden || '___';

        // Orden de compra
        const oc = document.getElementById('ordenCompra').value || orden.ordenCompra || '';
        document.getElementById('printOrdenCompra').textContent = oc;
        if (orden.ordenCompra && !document.getElementById('ordenCompra').value) {
            document.getElementById('ordenCompra').value = orden.ordenCompra;
        }

        // Numero de nota
        const numNota = document.getElementById('numeroNota').value;
        document.getElementById('printNumeroNota').textContent = numNota;

        // Cargar paletas desde producto terminado (sync_store)
        let productoTerminado = [];
        if (AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_producto_terminado').single();
                productoTerminado = data?.value || [];
            } catch (e) { productoTerminado = []; }
        }
        const paletasOT = productoTerminado.filter(pt => pt.ordenTrabajo === orden.numeroOrden);

        this.paletas = [];
        if (paletasOT.length > 0) {
            paletasOT.forEach((pt, i) => {
                this.paletas.push({
                    numero: i + 1,
                    bobinas: pt.numBobinas || 0,
                    kilos: parseFloat(pt.pesoTotal) || 0
                });
            });
        } else {
            // Si no hay PT, crear 4 paletas vacias como ejemplo
            for (let i = 1; i <= 4; i++) {
                this.paletas.push({ numero: i, bobinas: 0, kilos: 0 });
            }
        }

        this.renderPaletas();
        this.renderPaletasEditor();
        this.actualizarPrintArea();
    },

    /**
     * Agrega una paleta
     */
    agregarPaleta: function() {
        const num = this.paletas.length + 1;
        this.paletas.push({ numero: num, bobinas: 0, kilos: 0 });
        this.renderPaletasEditor();
        this.renderPaletas();
    },

    /**
     * Elimina una paleta
     */
    eliminarPaleta: function(index) {
        this.paletas.splice(index, 1);
        this.paletas.forEach((p, i) => p.numero = i + 1);
        this.renderPaletasEditor();
        this.renderPaletas();
    },

    /**
     * Renderiza el editor de paletas (controles)
     */
    renderPaletasEditor: function() {
        const container = document.getElementById('paletasEditor');
        if (!container) return;

        container.innerHTML = this.paletas.map((p, i) => `
            <div class="row g-1 mb-1 align-items-center">
                <div class="col-2">
                    <span class="badge bg-success">Paleta ${p.numero}</span>
                </div>
                <div class="col-3">
                    <input type="number" class="form-control form-control-sm"
                        value="${p.bobinas}" placeholder="Bobinas"
                        onchange="NotaEntrega.actualizarPaleta(${i}, 'bobinas', this.value)">
                </div>
                <div class="col-3">
                    <input type="number" step="0.01" class="form-control form-control-sm"
                        value="${p.kilos}" placeholder="Kilos"
                        onchange="NotaEntrega.actualizarPaleta(${i}, 'kilos', this.value)">
                </div>
                <div class="col-2">
                    <span class="small text-muted">${p.kilos > 0 ? p.kilos.toFixed(2) + ' Kg' : ''}</span>
                </div>
                <div class="col-2">
                    <button class="btn btn-sm btn-outline-danger" onclick="NotaEntrega.eliminarPaleta(${i})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Actualiza datos de una paleta
     */
    actualizarPaleta: function(index, campo, valor) {
        this.paletas[index][campo] = parseFloat(valor) || 0;
        this.renderPaletas();
    },

    /**
     * Renderiza paletas en la nota imprimible
     */
    renderPaletas: function() {
        const body = document.getElementById('printPaletasBody');
        if (!body) return;

        let totalBobinas = 0;
        let totalKilos = 0;

        body.innerHTML = this.paletas.map(p => {
            totalBobinas += p.bobinas;
            totalKilos += p.kilos;
            return `
                <tr>
                    <td>${p.numero}</td>
                    <td>${p.bobinas}</td>
                    <td>${p.kilos.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        document.getElementById('printTotalBobinas').textContent = totalBobinas;
        document.getElementById('printTotalKilos').textContent = totalKilos.toFixed(2);
    },

    /**
     * Actualiza el area de impresion con los datos del formulario
     */
    actualizarPrintArea: function() {
        const numNota = document.getElementById('numeroNota').value;
        document.getElementById('printNumeroNota').textContent = numNota;

        const oc = document.getElementById('ordenCompra').value;
        if (oc) document.getElementById('printOrdenCompra').textContent = oc;

        const vehiculo = document.getElementById('vehiculo').value;
        const conductor = document.getElementById('conductor').value;
        const conductorCI = document.getElementById('conductorCI').value;
        const observaciones = document.getElementById('observacionesNota').value;
        const autorizado = document.getElementById('autorizadoPor').value;
        const despachado = document.getElementById('despachadoPor').value;

        document.getElementById('printVehiculo').textContent = vehiculo || '___';
        document.getElementById('printConductor').textContent =
            conductor ? `${conductor}${conductorCI ? ' C.I. ' + conductorCI : ''}` : '___';
        document.getElementById('printObservaciones').textContent = observaciones || '___';
        document.getElementById('printAutorizado').textContent = autorizado || '___';
        document.getElementById('printDespachado').textContent = despachado || '___';

        const hoy = new Date().toLocaleDateString('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        document.getElementById('printFecha').textContent = hoy;
    },

    /**
     * Imprime la nota de entrega
     */
    imprimir: function() {
        this.actualizarPrintArea();
        window.print();
    },

    /**
     * Guarda la nota de entrega en localStorage (sincronizado con Supabase)
     */
    guardar: function() {
        if (!this.otSeleccionada) {
            alert('Primero cargue una Orden de Trabajo');
            return;
        }

        this.actualizarPrintArea();

        const totalKilos = this.paletas.reduce((sum, p) => sum + p.kilos, 0);
        const totalBobinas = this.paletas.reduce((sum, p) => sum + p.bobinas, 0);

        const nota = {
            id: 'NE_' + Date.now(),
            timestamp: new Date().toISOString(),
            numeroNota: document.getElementById('numeroNota').value,
            fecha: new Date().toLocaleDateString('es-VE'),
            // Datos OT
            ordenTrabajo: this.otSeleccionada.numeroOrden,
            ordenCompra: document.getElementById('ordenCompra').value,
            cliente: this.otSeleccionada.cliente,
            clienteRif: this.otSeleccionada.clienteRif,
            producto: this.otSeleccionada.producto,
            tipoMaterial: this.otSeleccionada.estructuraMaterial || this.otSeleccionada.tipoMaterial,
            pedidoKg: this.otSeleccionada.pedidoKg,
            // Paletas
            paletas: this.paletas,
            totalPaletas: this.paletas.length,
            totalBobinas: totalBobinas,
            totalKilos: totalKilos,
            // Transporte
            vehiculo: document.getElementById('vehiculo').value,
            conductor: document.getElementById('conductor').value,
            conductorCI: document.getElementById('conductorCI').value,
            // Personal
            autorizadoPor: document.getElementById('autorizadoPor').value,
            despachadoPor: document.getElementById('despachadoPor').value,
            observaciones: document.getElementById('observacionesNota').value,
            // Registro
            registradoPor: typeof Auth !== 'undefined' && Auth.getUser() ? Auth.getUser().usuario : 'sistema',
            registradoPorNombre: typeof Auth !== 'undefined' && Auth.getUser() ? Auth.getUser().nombre : 'Sistema'
        };

        this.notas.unshift(nota);
        this.saveNotas();
        this.renderHistorial();
        this.generarNumeroNota();

        alert('Nota de Entrega N° ' + nota.numeroNota + ' guardada exitosamente');
    },

    /**
     * Renderiza historial de notas
     */
    renderHistorial: function() {
        const tbody = document.getElementById('historialNotas');
        const badge = document.getElementById('totalNotas');
        if (!tbody) return;

        if (badge) badge.textContent = this.notas.length;

        if (this.notas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">No hay notas de entrega registradas</td></tr>';
            return;
        }

        tbody.innerHTML = this.notas.map(nota => `
            <tr>
                <td><span class="badge bg-success">${nota.numeroNota}</span></td>
                <td>${nota.fecha || ''}</td>
                <td>${nota.ordenTrabajo || ''}</td>
                <td>${nota.ordenCompra || '-'}</td>
                <td>${nota.cliente || ''}</td>
                <td>${nota.totalPaletas || 0}</td>
                <td><strong>${(nota.totalKilos || 0).toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="NotaEntrega.verNota('${nota.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="NotaEntrega.eliminarNota('${nota.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    /**
     * Ver una nota guardada
     */
    verNota: function(id) {
        const nota = this.notas.find(n => n.id === id);
        if (!nota) return;

        document.getElementById('numeroNota').value = nota.numeroNota;
        document.getElementById('ordenCompra').value = nota.ordenCompra || '';
        document.getElementById('vehiculo').value = nota.vehiculo || '';
        document.getElementById('conductor').value = nota.conductor || '';
        document.getElementById('conductorCI').value = nota.conductorCI || '';
        document.getElementById('autorizadoPor').value = nota.autorizadoPor || '';
        document.getElementById('despachadoPor').value = nota.despachadoPor || '';
        document.getElementById('observacionesNota').value = nota.observaciones || '';

        // Datos de impresion
        document.getElementById('printNumeroNota').textContent = nota.numeroNota;
        document.getElementById('printFecha').textContent = nota.fecha;
        document.getElementById('printCliente').textContent = nota.cliente;
        document.getElementById('printDireccion').textContent = 'Venezuela';
        document.getElementById('printTipoMaterial').textContent =
            `MATERIAL DE EMPAQUE PARA PRODUCTO "${(nota.producto || '').toUpperCase()}"`;
        document.getElementById('printOrdenCompra').textContent = nota.ordenCompra || '___';
        document.getElementById('printOT').textContent = nota.ordenTrabajo || '___';
        document.getElementById('printVehiculo').textContent = nota.vehiculo || '___';
        document.getElementById('printConductor').textContent =
            nota.conductor ? `${nota.conductor}${nota.conductorCI ? ' C.I. ' + nota.conductorCI : ''}` : '___';
        document.getElementById('printObservaciones').textContent = nota.observaciones || '___';
        document.getElementById('printAutorizado').textContent = nota.autorizadoPor || '___';
        document.getElementById('printDespachado').textContent = nota.despachadoPor || '___';

        this.paletas = nota.paletas || [];
        this.renderPaletas();
        this.renderPaletasEditor();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Elimina una nota
     */
    eliminarNota: function(id) {
        if (!confirm('Eliminar esta nota de entrega?')) return;
        this.notas = this.notas.filter(n => n.id !== id);
        this.saveNotas();
        this.renderHistorial();
    }
};
