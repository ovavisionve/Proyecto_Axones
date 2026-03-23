/**
 * SyncManager - DESACTIVADO
 * Reemplazado por sync-realtime.js (AxonesSync via Supabase)
 */
const SyncManager = {
    init() { console.log('[SyncManager] Desactivado - usar AxonesSync'); },
    on() {},
    sync() {},
    isActive() { return false; }
};
if (typeof window !== 'undefined') window.SyncManager = SyncManager;
