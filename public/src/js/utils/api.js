/**
 * AxonesAPI - DESACTIVADO
 * Reemplazado por Supabase (supabase-client.js + sync-realtime.js)
 */
const AxonesAPI = {
    async getOrdenes() { return { success: false, data: [] }; },
    async getInventario() { return { success: false, data: [] }; },
    async getProduccion() { return { success: false, data: [] }; },
    async getAlertas() { return { success: false, data: [] }; },
    async getMaquinas() { return { success: false, data: [] }; },
    async getClientes() { return { success: false, data: [] }; },
    async getDashboardData() { return { success: false, data: null }; }
};
if (typeof window !== 'undefined') window.AxonesAPI = AxonesAPI;
