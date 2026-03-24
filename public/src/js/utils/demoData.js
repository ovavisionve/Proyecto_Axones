/**
 * DemoData - DESACTIVADO
 *
 * Supabase es la UNICA fuente de verdad.
 * Este archivo solo limpia datos DEMO (con IDs demo_/OT_timestamp)
 * y NO toca datos reales del inventario ni ordenes legitimas.
 */

const DemoData = {
    init() {
        // No hacer nada - Supabase es la fuente de verdad
    },

    /**
     * Limpia SOLO datos que sean demo (IDs con prefijo demo_ o OT_ + timestamp)
     * NO borra inventario ni datos reales
     */
    limpiar() {
        // Solo limpiar keys que puedan tener datos demo mezclados
        const keysToCheck = [
            'axones_ordenes_trabajo',
            'axones_produccion',
            'axones_alertas',
            'axones_maquinas_estado'
        ];

        let cleaned = 0;
        for (const key of keysToCheck) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;

            try {
                const data = JSON.parse(raw);
                if (!Array.isArray(data)) continue;

                // Filtrar: solo mantener datos NO demo
                const real = data.filter(d => {
                    if (!d || !d.id) return true; // Sin ID = mantener
                    const id = String(d.id);
                    return !id.startsWith('demo_') && !id.match(/^OT_\d{13}/);
                });

                if (real.length < data.length) {
                    localStorage.setItem(key, JSON.stringify(real));
                    cleaned += (data.length - real.length);
                }
            } catch (e) {
                // No se puede parsear - dejar como esta
            }
        }

        if (cleaned > 0) {
            console.log(`[DemoData] ${cleaned} registros demo eliminados`);
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DemoData = DemoData;
}

// AUTO-LIMPIEZA al cargar: solo limpiar si detecta datos demo
(function() {
    const raw = localStorage.getItem('axones_ordenes_trabajo');
    if (raw) {
        try {
            const data = JSON.parse(raw);
            if (Array.isArray(data) && data.some(d =>
                d.id && (String(d.id).startsWith('demo_') || String(d.id).match(/^OT_\d{13}/))
            )) {
                DemoData.limpiar();
            }
        } catch(e) {}
    }
})();
