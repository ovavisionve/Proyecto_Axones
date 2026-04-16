/**
 * PayloadSanitizer - Limpia payloads antes de enviar a Supabase
 *
 * Previene errores de:
 *   - VARCHAR(N) value too long
 *   - NaN/Infinity en campos NUMERIC
 *   - undefined en campos NOT NULL
 *   - JSONB con valores invalidos (string en vez de object/array)
 *   - Fechas en formato incorrecto
 *   - UUIDs invalidos
 *
 * Uso:
 *   const limpio = PayloadSanitizer.produccion(payload);
 *   await supabase.from('produccion_corte').insert(limpio);
 */

const PayloadSanitizer = {
    /** Limites de VARCHAR conocidos por tabla.columna */
    VARCHAR_LIMITS: {
        'numero_ot': 20,
        'turno': 10,
        'maquina': 30,
        'operador': 100,
        'ayudante': 100,
        'supervisor': 100,
        'registrado_por_nombre': 150,
        'tipo': 30,
        'nivel': 20,
        'titulo': 200,
        'cliente_nombre': 200,
        'producto': 200,
        'cpe': 30,
        'codigo_barra': 20,
        'sku': 30,
        'figura_embobinado_montaje': 10,
        'figura_embobinado_lam': 10,
        'linea_corte': 10,
        'diametro_core': 10,
        'orientacion_embalaje': 10,
        'tipo_material': 50,
        'estructura_material': 200,
        'modulo': 50,
        'referencia': 100,
        'estado': 30,
    },

    /** Recorta string al limite de la columna */
    truncar: function(valor, columna) {
        if (valor === null || valor === undefined) return null;
        const str = String(valor);
        const limit = this.VARCHAR_LIMITS[columna];
        if (limit && str.length > limit) {
            console.warn(`[Sanitizer] Truncando ${columna} de ${str.length} a ${limit} chars: "${str}"`);
            return str.substring(0, limit);
        }
        return str;
    },

    /** Convierte a numero seguro (no NaN, no Infinity) */
    num: function(valor, defaultVal = 0) {
        if (valor === null || valor === undefined || valor === '') return defaultVal;
        const n = parseFloat(valor);
        return (isFinite(n) && !isNaN(n)) ? n : defaultVal;
    },

    /** Convierte a entero seguro */
    int: function(valor, defaultVal = 0) {
        if (valor === null || valor === undefined || valor === '') return defaultVal;
        const n = parseInt(valor);
        return (isFinite(n) && !isNaN(n)) ? n : defaultVal;
    },

    /** Asegura formato YYYY-MM-DD para campos DATE */
    fecha: function(valor) {
        if (!valor) return new Date().toISOString().split('T')[0];
        if (typeof valor === 'string') {
            // Si ya esta en formato YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.split('T')[0];
            // Intentar parsear y convertir
            const d = new Date(valor);
            if (!isNaN(d)) return d.toISOString().split('T')[0];
        }
        if (valor instanceof Date) return valor.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
    },

    /** Asegura formato HH:MM:SS para campos TIME (o null) */
    hora: function(valor) {
        if (!valor) return null;
        if (typeof valor === 'string') {
            if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(valor)) {
                return valor.length === 5 ? valor + ':00' : valor;
            }
        }
        return null;
    },

    /** Asegura UUID valido o null */
    uuid: function(valor) {
        if (!valor) return null;
        const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return re.test(String(valor)) ? valor : null;
    },

    /** Asegura JSONB valido (array u objeto) */
    jsonb: function(valor, defaultVal = []) {
        if (valor === null || valor === undefined) return defaultVal;
        if (typeof valor === 'string') {
            try { return JSON.parse(valor); } catch(e) { return defaultVal; }
        }
        if (typeof valor === 'object') return valor;
        return defaultVal;
    },

    /** Sanitiza payload para tabla produccion_impresion */
    produccionImpresion: function(p) {
        return {
            orden_id: this.uuid(p.orden_id),
            numero_ot: this.truncar(p.numero_ot, 'numero_ot'),
            fecha: this.fecha(p.fecha),
            turno: this.truncar(p.turno, 'turno'),
            maquina: this.truncar(p.maquina, 'maquina'),
            operador: this.truncar(p.operador, 'operador'),
            ayudante: this.truncar(p.ayudante, 'ayudante'),
            supervisor: this.truncar(p.supervisor, 'supervisor'),
            hora_inicio: this.hora(p.hora_inicio),
            hora_arranque: this.hora(p.hora_arranque),
            hora_final: this.hora(p.hora_final),
            bobinas_entrada: this.jsonb(p.bobinas_entrada, []),
            total_entrada: this.num(p.total_entrada),
            bobinas_restante: this.jsonb(p.bobinas_restante, []),
            total_restante: this.num(p.total_restante),
            total_consumido: this.num(p.total_consumido),
            bobinas_salida: this.jsonb(p.bobinas_salida, []),
            num_bobinas: this.int(p.num_bobinas),
            peso_total: this.num(p.peso_total),
            total_scrap: this.num(p.total_scrap),
            merma: this.num(p.merma),
            porcentaje_refil: this.num(p.porcentaje_refil),
            metraje: this.int(p.metraje),
            etiquetas_entrada: this.jsonb(p.etiquetas_entrada, {}),
            etiquetas_salida: this.jsonb(p.etiquetas_salida, {}),
            motivos_paradas: p.motivos_paradas ? String(p.motivos_paradas) : null,
            observaciones: p.observaciones ? String(p.observaciones).substring(0, 50000) : null,
            registrado_por_nombre: this.truncar(p.registrado_por_nombre, 'registrado_por_nombre'),
        };
    },

    /** Sanitiza payload para produccion_laminacion */
    produccionLaminacion: function(p) {
        return {
            orden_id: this.uuid(p.orden_id),
            numero_ot: this.truncar(p.numero_ot, 'numero_ot'),
            fecha: this.fecha(p.fecha),
            turno: this.truncar(p.turno, 'turno'),
            maquina: this.truncar(p.maquina, 'maquina'),
            operador: this.truncar(p.operador, 'operador'),
            ayudante: this.truncar(p.ayudante, 'ayudante'),
            supervisor: this.truncar(p.supervisor, 'supervisor'),
            hora_inicio: this.hora(p.hora_inicio),
            hora_arranque: this.hora(p.hora_arranque),
            hora_final: this.hora(p.hora_final),
            bobinas_entrada: this.jsonb(p.bobinas_entrada, []),
            total_entrada: this.num(p.total_entrada),
            bobinas_restante: this.jsonb(p.bobinas_restante, []),
            total_restante: this.num(p.total_restante),
            total_consumido: this.num(p.total_consumido),
            bobinas_virgen: this.jsonb(p.bobinas_virgen, []),
            total_entrada_virgen: this.num(p.total_entrada_virgen),
            bobinas_restante_virgen: this.jsonb(p.bobinas_restante_virgen, []),
            total_restante_virgen: this.num(p.total_restante_virgen),
            total_consumido_virgen: this.num(p.total_consumido_virgen),
            adhesivo_entrada: this.num(p.adhesivo_entrada),
            adhesivo_sobro: this.num(p.adhesivo_sobro),
            consumo_adhesivo: this.num(p.consumo_adhesivo),
            catalizador_entrada: this.num(p.catalizador_entrada),
            catalizador_sobro: this.num(p.catalizador_sobro),
            consumo_catalizador: this.num(p.consumo_catalizador),
            acetato_entrada: this.num(p.acetato_entrada),
            acetato_sobro: this.num(p.acetato_sobro),
            consumo_acetato: this.num(p.consumo_acetato),
            bobinas_salida: this.jsonb(p.bobinas_salida, []),
            num_bobinas: this.int(p.num_bobinas),
            peso_total: this.num(p.peso_total),
            scrap_transparente: this.num(p.scrap_transparente),
            scrap_impreso: this.num(p.scrap_impreso),
            scrap_laminado: this.num(p.scrap_laminado),
            total_scrap: this.num(p.total_scrap),
            merma: this.num(p.merma),
            porcentaje_refil: this.num(p.porcentaje_refil),
            etiquetas_entrada: this.jsonb(p.etiquetas_entrada, {}),
            etiquetas_salida: this.jsonb(p.etiquetas_salida, {}),
            motivos_paradas: p.motivos_paradas ? String(p.motivos_paradas) : null,
            observaciones: p.observaciones ? String(p.observaciones).substring(0, 50000) : null,
            registrado_por_nombre: this.truncar(p.registrado_por_nombre, 'registrado_por_nombre'),
        };
    },

    /** Sanitiza payload para produccion_corte */
    produccionCorte: function(p) {
        return {
            orden_id: this.uuid(p.orden_id),
            numero_ot: this.truncar(p.numero_ot, 'numero_ot'),
            fecha: this.fecha(p.fecha),
            turno: this.truncar(p.turno, 'turno'),
            maquina: this.truncar(p.maquina, 'maquina'),
            operador: this.truncar(p.operador, 'operador'),
            ayudante: this.truncar(p.ayudante, 'ayudante'),
            supervisor: this.truncar(p.supervisor, 'supervisor'),
            hora_inicio: this.hora(p.hora_inicio),
            hora_arranque: this.hora(p.hora_arranque),
            hora_final: this.hora(p.hora_final),
            bobinas_entrada: this.jsonb(p.bobinas_entrada, []),
            total_entrada: this.num(p.total_entrada),
            bobinas_restante: this.jsonb(p.bobinas_restante, []),
            total_restante: this.num(p.total_restante),
            total_consumido: this.num(p.total_consumido),
            paletas: this.jsonb(p.paletas, []),
            num_bobinas_salida: this.int(p.num_bobinas_salida),
            num_rollos_salida: this.int(p.num_rollos_salida),
            peso_total_salida: this.num(p.peso_total_salida),
            num_paletas: this.int(p.num_paletas),
            scrap_refile: this.num(p.scrap_refile),
            scrap_impreso: this.num(p.scrap_impreso),
            total_scrap: this.num(p.total_scrap),
            merma: this.num(p.merma),
            porcentaje_refil: this.num(p.porcentaje_refil),
            etiquetas_entrada: this.jsonb(p.etiquetas_entrada, {}),
            motivos_paradas: p.motivos_paradas ? String(p.motivos_paradas) : null,
            observaciones: p.observaciones ? String(p.observaciones).substring(0, 50000) : null,
            registrado_por_nombre: this.truncar(p.registrado_por_nombre, 'registrado_por_nombre'),
        };
    },
};

if (typeof window !== 'undefined') window.PayloadSanitizer = PayloadSanitizer;
