/**
 * AlertasEngine - Motor de alertas inteligentes Sistema Axones
 *
 * Analiza los datos de produccion, consumo, montaje y despachos para detectar
 * condiciones que ameritan una alerta. Las alertas se guardan en la tabla 'alertas'
 * de Supabase y en sync_store 'axones_alertas' como backup.
 *
 * Reglas implementadas:
 *   1. MERMA ELEVADA: si en un registro de produccion la merma > 5% del total entrada
 *   2. MERMA CRITICA: si merma > 10% -> alerta danger
 *   3. CONSUMO TINTA ELEVADO: si kg tinta por OT supera el estandar teorico
 *   4. MONTAJE LENTO: si un montaje duro > 1h
 *   5. STOCK BAJO: si un material tiene stock < 100 Kg
 *   6. BOBINAS EN OT SIN COMPLETAR: bobinas asignadas hace > 48h sin consumir
 *   7. DESPACHO PENDIENTE: OT completada en corte pero sin despachar hace > 72h
 *
 * Uso:
 *   await AlertasEngine.ejecutarTodo();              // Corre todas las reglas
 *   await AlertasEngine.verificarMerma(datos);       // Llamado desde guardar produccion
 *   await AlertasEngine.verificarTintas(datos);      // Llamado desde guardar consumo tintas
 *
 * Ejecucion automatica:
 *   - Al cargar cualquier pagina (una vez cada 30 min)
 *   - Manualmente desde boton "Analizar" en alertas.html
 */

const AlertasEngine = {
    // Umbrales configurables
    UMBRAL_MERMA_WARNING: 0.05,      // 5%
    UMBRAL_MERMA_DANGER: 0.10,       // 10%
    UMBRAL_MONTAJE_MS: 60 * 60 * 1000, // 1 hora
    UMBRAL_STOCK_BAJO_KG: 100,
    UMBRAL_BOBINA_ESTANCADA_HS: 48,
    UMBRAL_DESPACHO_RETRASADO_HS: 72,

    // Consumo teorico de tinta por Kg producido (aproximado, ajustable)
    CONSUMO_TINTA_TEORICO_G_POR_KG: 12, // 12g tinta por kg producido

    // Ultima ejecucion (para no repetir)
    _ultimaEjecucion: null,
    INTERVALO_MIN: 30 * 60 * 1000,  // 30 min

    /** Ejecuta todas las reglas (llamar desde main.js al cargar) */
    ejecutarTodo: async function() {
        // No correr muy seguido
        const ahora = Date.now();
        const last = parseInt(localStorage.getItem('axones_alertas_last_run') || '0');
        if (ahora - last < this.INTERVALO_MIN) {
            console.log('[AlertasEngine] Ya ejecutado recientemente, skip');
            return;
        }
        localStorage.setItem('axones_alertas_last_run', String(ahora));

        console.log('[AlertasEngine] Ejecutando analisis...');
        try {
            await this.analizarMermaHistorica();
            await this.analizarStockBajo();
            await this.analizarMontajesLentos();
            await this.analizarBobinasEstancadas();
            await this.analizarDespachosRetrasados();
            console.log('[AlertasEngine] Analisis completo');
        } catch(e) {
            console.warn('[AlertasEngine] Error en analisis:', e);
        }
    },

    /** Crea una alerta en Supabase evitando duplicados por referencia */
    crearAlerta: async function(alerta) {
        if (!AxonesDB.isReady()) return null;
        const ref = alerta.referencia || alerta.titulo;
        try {
            // Verificar duplicado (ultima 24h)
            const hace24h = new Date(Date.now() - 24*60*60*1000).toISOString();
            const { data: existentes } = await AxonesDB.client.from('alertas')
                .select('id').eq('titulo', alerta.titulo)
                .gte('created_at', hace24h).limit(1);
            if (existentes && existentes.length > 0) return null;

            // Mapear nivel (usado en UI) al campo correcto segun estructura de tabla
            const payload = {
                tipo: alerta.tipo || 'warning',
                titulo: alerta.titulo,
                mensaje: alerta.mensaje,
                created_at: new Date().toISOString(),
            };
            // Campos opcionales (requieren migration-008)
            if (alerta.modulo !== undefined) payload.modulo = alerta.modulo;
            if (alerta.nivel !== undefined) payload.nivel = alerta.nivel;
            if (alerta.referencia !== undefined) payload.referencia = alerta.referencia;

            let data;
            try {
                const res = await AxonesDB.client.from('alertas').insert(payload).select().single();
                data = res.data;
            } catch(errChk) {
                // Fallback si BD no tiene migration-008: reintentar con payload minimo
                if (errChk?.code === '23514' || errChk?.code === 'PGRST204' || errChk?.message?.includes('check constraint') || errChk?.message?.includes('column')) {
                    console.warn('[AlertasEngine] Usando fallback (ejecute migration-008-hardening.sql)');
                    // Mapear tipo->general, poner nivel correctamente, quitar columnas no existentes
                    const nivelMap = { danger: 'danger', critical: 'danger', error: 'danger', warning: 'warning', info: 'info', success: 'success' };
                    const fallback = {
                        tipo: 'general',
                        nivel: nivelMap[payload.tipo] || 'warning',
                        titulo: payload.titulo,
                        mensaje: payload.mensaje,
                        created_at: payload.created_at,
                    };
                    const res2 = await AxonesDB.client.from('alertas').insert(fallback).select().single();
                    data = res2.data;
                } else {
                    throw errChk;
                }
            }
            console.log('[AlertasEngine] Alerta creada:', alerta.titulo);
            return data;
        } catch(e) {
            console.warn('[AlertasEngine] Error creando alerta:', e.message);
            return null;
        }
    },

    // ============================================================
    // REGLA 1: Verificar merma en un registro recien guardado
    // Llamado desde guardar de impresion/laminacion/corte
    // ============================================================
    verificarMerma: async function(datos, fase) {
        const entrada = parseFloat(datos.totalEntrada || datos.kgEntrada || 0);
        const merma = parseFloat(datos.merma || 0);
        const ot = datos.ordenTrabajo || datos.numeroOrden || '?';
        if (entrada <= 0) return;

        const pct = merma / entrada;
        if (pct >= this.UMBRAL_MERMA_DANGER) {
            await this.crearAlerta({
                tipo: 'danger',
                titulo: `Merma CRITICA en ${fase} - OT ${ot}`,
                mensaje: `Merma del ${(pct*100).toFixed(1)}% (${merma.toFixed(2)} Kg de ${entrada.toFixed(2)} Kg) en OT ${ot}, maquina ${datos.maquina || '-'}. Verificar calibracion y operador.`,
                modulo: fase,
                referencia: `merma-${ot}-${fase}-${datos.fecha}`,
            });
        } else if (pct >= this.UMBRAL_MERMA_WARNING) {
            await this.crearAlerta({
                tipo: 'warning',
                titulo: `Merma elevada en ${fase} - OT ${ot}`,
                mensaje: `Merma del ${(pct*100).toFixed(1)}% (${merma.toFixed(2)} Kg) en OT ${ot}, maquina ${datos.maquina || '-'}.`,
                modulo: fase,
                referencia: `merma-${ot}-${fase}-${datos.fecha}`,
            });
        }
    },

    // ============================================================
    // REGLA 2: Verificar consumo de tintas vs estandar
    // Llamado desde guardar consumo de tintas
    // ============================================================
    verificarTintas: async function(datos) {
        const ot = datos.ordenTrabajo || '?';
        const kgTintas = parseFloat(datos.totalTintas || 0);
        const kgProduccion = parseFloat(datos.kgProduccion || 0);

        if (kgProduccion <= 0 || kgTintas <= 0) return;

        // Consumo real en gramos de tinta por kg producido
        const gPorKg = (kgTintas * 1000) / kgProduccion;
        const estandar = this.CONSUMO_TINTA_TEORICO_G_POR_KG;

        if (gPorKg > estandar * 1.5) {
            // 50% por encima del estandar = alerta roja
            await this.crearAlerta({
                tipo: 'danger',
                titulo: `Consumo de tinta ELEVADO - OT ${ot}`,
                mensaje: `Consumo ${gPorKg.toFixed(1)} g/Kg producido. Estandar: ${estandar} g/Kg. Desviacion: +${((gPorKg/estandar - 1) * 100).toFixed(0)}%. Verificar recetas y desperdicio.`,
                modulo: 'tintas',
                referencia: `tinta-${ot}-${datos.fecha}`,
            });
        } else if (gPorKg > estandar * 1.25) {
            await this.crearAlerta({
                tipo: 'warning',
                titulo: `Consumo de tinta por encima del estandar - OT ${ot}`,
                mensaje: `Consumo ${gPorKg.toFixed(1)} g/Kg (estandar ${estandar}). Revisar.`,
                modulo: 'tintas',
                referencia: `tinta-${ot}-${datos.fecha}`,
            });
        }
    },

    // ============================================================
    // REGLA 3: Analisis historico de merma (se ejecuta periodicamente)
    // Busca OTs con merma promedio alta
    // ============================================================
    analizarMermaHistorica: async function() {
        if (!AxonesDB.isReady()) return;
        try {
            const hace7d = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
            const tablas = ['produccion_impresion', 'produccion_laminacion', 'produccion_corte'];

            for (const tabla of tablas) {
                const { data } = await AxonesDB.client.from(tabla)
                    .select('numero_ot, total_entrada, merma, maquina, fecha')
                    .gte('fecha', hace7d);
                if (!data) continue;

                // Agrupar por maquina
                const porMaquina = {};
                data.forEach(r => {
                    const m = r.maquina || 'SIN';
                    if (!porMaquina[m]) porMaquina[m] = { entrada: 0, merma: 0, registros: 0 };
                    porMaquina[m].entrada += parseFloat(r.total_entrada) || 0;
                    porMaquina[m].merma += parseFloat(r.merma) || 0;
                    porMaquina[m].registros++;
                });

                // Alertar si alguna maquina tiene > 8% merma promedio
                for (const [maquina, stats] of Object.entries(porMaquina)) {
                    if (stats.registros >= 3 && stats.entrada > 0) {
                        const pct = stats.merma / stats.entrada;
                        if (pct > 0.08) {
                            const fase = tabla.replace('produccion_', '');
                            await this.crearAlerta({
                                tipo: 'warning',
                                titulo: `Patron de merma alta en ${maquina}`,
                                mensaje: `${maquina} tiene ${(pct*100).toFixed(1)}% de merma promedio en ${stats.registros} registros de ${fase} esta semana. Evaluar mantenimiento.`,
                                modulo: 'alertas-engine',
                                referencia: `patron-merma-${maquina}-${fase}`,
                            });
                        }
                    }
                }
            }
        } catch(e) { console.warn('[AlertasEngine] analizarMermaHistorica error:', e); }
    },

    // ============================================================
    // REGLA 4: Stock bajo
    // ============================================================
    analizarStockBajo: async function() {
        if (!AxonesDB.isReady()) return;
        try {
            const { data } = await AxonesDB.client.from('materiales')
                .select('id, material, micras, ancho, stock_kg, activo').eq('activo', true);
            if (!data) return;

            for (const mat of data) {
                const stock = parseFloat(mat.stock_kg) || 0;
                if (stock > 0 && stock < this.UMBRAL_STOCK_BAJO_KG) {
                    await this.crearAlerta({
                        tipo: 'warning',
                        titulo: `Stock bajo: ${mat.material}`,
                        mensaje: `${mat.material} ${mat.micras || ''}µ x ${mat.ancho || ''}mm tiene solo ${stock.toFixed(2)} Kg. Considerar reposicion.`,
                        modulo: 'inventario',
                        referencia: `stock-bajo-${mat.id}`,
                    });
                }
            }
        } catch(e) { console.warn('[AlertasEngine] analizarStockBajo error:', e); }
    },

    // ============================================================
    // REGLA 5: Montajes que superaron umbral
    // ============================================================
    analizarMontajesLentos: async function() {
        try {
            const { data } = await AxonesDB.client.from('sync_store')
                .select('value').eq('key', 'axones_montajes').maybeSingle();
            const montajes = data?.value ? JSON.parse(data.value) : [];
            const recientes = montajes.filter(m => {
                const hace24h = Date.now() - 24*60*60*1000;
                return m.superoUmbral && new Date(m.fechaFin).getTime() > hace24h;
            });

            for (const m of recientes) {
                await this.crearAlerta({
                    tipo: 'warning',
                    titulo: `Montaje lento - OT ${m.otNumero}`,
                    mensaje: `Montaje de ${m.otNumero} (${m.cliente}) en ${m.maquina} duro ${m.duracionMin} min. Operador: ${m.operador}. ${m.observaciones ? 'Motivo: ' + m.observaciones : 'Sin motivo registrado.'}`,
                    modulo: 'montaje',
                    referencia: `montaje-lento-${m.id}`,
                });
            }
        } catch(e) { console.warn('[AlertasEngine] analizarMontajesLentos error:', e); }
    },

    // ============================================================
    // REGLA 6: Bobinas asignadas pero no consumidas
    // ============================================================
    analizarBobinasEstancadas: async function() {
        if (!AxonesDB.isReady()) return;
        try {
            const hace48h = new Date(Date.now() - 48*60*60*1000).toISOString();
            const { data } = await AxonesDB.client.from('bobinas')
                .select('codigo, material, peso_actual_kg, orden_trabajo, fase_produccion, fecha_asignacion')
                .eq('estado', 'reservada')
                .lt('fecha_asignacion', hace48h);

            if (!data || data.length === 0) return;

            // Agrupar por OT
            const porOT = {};
            data.forEach(b => {
                const ot = b.orden_trabajo || 'SIN';
                if (!porOT[ot]) porOT[ot] = [];
                porOT[ot].push(b);
            });

            for (const [ot, bobinas] of Object.entries(porOT)) {
                const totalKg = bobinas.reduce((s, b) => s + (parseFloat(b.peso_actual_kg) || 0), 0);
                await this.crearAlerta({
                    tipo: 'info',
                    titulo: `Bobinas asignadas sin usar - OT ${ot}`,
                    mensaje: `${bobinas.length} bobina(s) (${totalKg.toFixed(2)} Kg) asignadas a OT ${ot} hace mas de 48h sin consumir.`,
                    modulo: 'inventario',
                    referencia: `bobinas-estancadas-${ot}`,
                });
            }
        } catch(e) { /* tabla bobinas puede no existir aun */ }
    },

    // ============================================================
    // REGLA 7: OTs cortadas sin despachar
    // ============================================================
    analizarDespachosRetrasados: async function() {
        if (!AxonesDB.isReady()) return;
        try {
            const hace72h = new Date(Date.now() - 72*60*60*1000).toISOString();
            const { data: cortes } = await AxonesDB.client.from('produccion_corte')
                .select('numero_ot, fecha, peso_total_salida')
                .lt('created_at', hace72h);

            if (!cortes) return;

            // Cargar notas de despacho
            const { data: stdata } = await AxonesDB.client.from('sync_store')
                .select('value').eq('key', 'axones_notas_despacho').maybeSingle();
            const notas = stdata?.value ? JSON.parse(stdata.value) : [];
            const otsDespachadas = new Set(notas.map(n => n.otNumero));

            // OTs con corte pero sin despacho
            const otsCortadas = {};
            cortes.forEach(c => {
                if (!c.numero_ot) return;
                if (!otsCortadas[c.numero_ot]) otsCortadas[c.numero_ot] = { kg: 0 };
                otsCortadas[c.numero_ot].kg += parseFloat(c.peso_total_salida) || 0;
            });

            for (const [ot, stats] of Object.entries(otsCortadas)) {
                if (!otsDespachadas.has(ot) && stats.kg > 0) {
                    await this.crearAlerta({
                        tipo: 'info',
                        titulo: `OT sin despachar - ${ot}`,
                        mensaje: `OT ${ot} tiene ${stats.kg.toFixed(2)} Kg cortados hace mas de 72h sin registrar despacho.`,
                        modulo: 'despacho',
                        referencia: `despacho-retrasado-${ot}`,
                    });
                }
            }
        } catch(e) { console.warn('[AlertasEngine] analizarDespachosRetrasados error:', e); }
    },

    // ============================================================
    // Conteo de alertas pendientes (para badge en navbar)
    // ============================================================
    contarPendientes: async function() {
        if (!AxonesDB.isReady()) return 0;
        // Intentar con columna resuelta (requiere migration-008)
        try {
            const { count, error } = await AxonesDB.client.from('alertas')
                .select('*', { count: 'exact', head: true })
                .or('resuelta.is.null,resuelta.eq.false');
            if (!error) return count || 0;
        } catch(e) {}
        // Fallback: contar todas no leidas (campo leida siempre existe)
        try {
            const { count, error } = await AxonesDB.client.from('alertas')
                .select('*', { count: 'exact', head: true })
                .eq('leida', false);
            if (!error) return count || 0;
        } catch(e) {}
        // Ultimo recurso: ultimas 24h
        try {
            const hace24h = new Date(Date.now() - 24*60*60*1000).toISOString();
            const { count } = await AxonesDB.client.from('alertas')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', hace24h);
            return count || 0;
        } catch(e2) { return 0; }
    },

    /** Actualiza el badge de alertas en el navbar */
    actualizarBadge: async function() {
        const count = await this.contarPendientes();
        const badge = document.getElementById('alertasBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }
    },
};

// Auto-inicializar: correr al cargar pagina (con delay) y cada 30 min
if (typeof window !== 'undefined') {
    window.AlertasEngine = AlertasEngine;
    document.addEventListener('DOMContentLoaded', () => {
        // Actualizar badge a los 2seg
        setTimeout(() => AlertasEngine.actualizarBadge(), 2000);
        // Correr analisis a los 5seg
        setTimeout(() => AlertasEngine.ejecutarTodo(), 5000);
        // Repetir cada 30 min
        setInterval(() => {
            AlertasEngine.ejecutarTodo();
            AlertasEngine.actualizarBadge();
        }, 30 * 60 * 1000);
    });
}
