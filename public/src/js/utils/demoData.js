/**
 * DemoData - DESACTIVADO
 *
 * Supabase es la UNICA fuente de verdad.
 * Este archivo ahora LIMPIA datos demo del localStorage
 * para evitar que aparezcan ordenes fantasma.
 */

const DemoData = {
    // Ya no genera nada - limpia datos basura
    init() {
        console.warn('[DemoData] DESACTIVADO - Supabase es la fuente de verdad');
        this.limpiar();
    },

    // Limpiar TODOS los datos demo del localStorage
    limpiar() {
        const keysToClean = [
            'axones_ordenes_trabajo',
            'axones_inventario',
            'axones_produccion',
            'axones_impresion',
            'axones_alertas',
            'axones_tintas',
            'axones_tintas_inventario',
            'axones_tintas_cementerio',
            'axones_tintas_mezclas',
            'axones_adhesivos_inventario',
            'axones_maquinas_estado',
            'axones_control_tiempo',
            'axones_tiempo_historial',
            'axones_producto_terminado',
            'axones_clientes_memoria'
        ];

        let cleaned = 0;
        for (const key of keysToClean) {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[DemoData] ${cleaned} keys limpiadas del localStorage`);
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DemoData = DemoData;
}

// AUTO-LIMPIEZA: Si hay datos en localStorage ANTES de que AxonesSync
// descargue del cloud, limpiarlos para evitar datos fantasma
(function() {
    // Solo limpiar si AxonesSync va a correr (Supabase disponible)
    // Si no hay Supabase, dejar localStorage tranquilo
    const hasOldData = localStorage.getItem('axones_ordenes_trabajo');
    if (hasOldData) {
        try {
            const data = JSON.parse(hasOldData);
            // Detectar datos demo: tienen IDs que empiezan con OT_ + timestamp
            if (Array.isArray(data) && data.length > 0) {
                const hasDemoIds = data.some(d =>
                    d.id && (d.id.startsWith('OT_') || d.id.startsWith('demo_'))
                );
                if (hasDemoIds) {
                    console.warn('[DemoData] Datos demo detectados en localStorage - limpiando...');
                    DemoData.limpiar();
                }
            }
        } catch(e) {
            // Si no se puede parsear, limpiar por seguridad
            DemoData.limpiar();
        }
    }
})();
