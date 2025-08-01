import { Client, PerformanceRecord, AllLookerData, BitacoraReport, UploadedVideo, ImportBatch, MetaApiConfig, SqlConfig, FtpConfig, ProcessedHashes } from './types';

// ARQUITECTURA DE PRODUCCIÓN: CLIENTE DE API
// --------------------------------------------
// Esta implementación ha sido refactorizada para actuar como un cliente de una API de backend real.
// Abandona la simulación con `localStorage` en favor de llamadas `fetch` a endpoints de API.
//
// El backend (que debes construir) será responsable de:
// 1. Conectarse a la base de datos PostgreSQL real usando las credenciales del archivo .env.
// 2. Exponer endpoints seguros (ej. GET /api/clients, POST /api/clients) para cada una de estas funciones.
// 3. Implementar la lógica de negocio y las consultas a la base de datos.

const API_BASE_URL = '/api'; // Asume que la API está en el mismo dominio.

// Función de utilidad para manejar las respuestas de la API
const fetchApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Error en la solicitud a ${endpoint}`);
        }
        
        // Retorna un objeto vacío si la respuesta es 204 No Content
        if (response.status === 204) {
            return {} as T;
        }

        return await response.json();
    } catch (error) {
        console.error(`[API Client] Error en fetch a ${endpoint}:`, error);
        throw error;
    }
};

// Objeto para interactuar con la API del backend
const api = {
    get: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'GET' }),
    post: <T>(endpoint: string, body: any) => fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: any) => fetchApi<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'DELETE' }),
};

// Exporta funciones que encapsulan las llamadas a los endpoints de la API
export const dbTyped = {
    // --- App Initialization ---
    getInitialData: () => api.get('/initial-data'),

    // --- Clients ---
    // Backend: GET /api/clients -> devuelve Client[]
    getClients: () => api.get<Client[]>('/clients'),
    // Backend: POST /api/clients -> recibe Client[], no devuelve nada (204)
    saveClients: (clients: Client[]) => api.post<void>('/clients', clients),

    // --- Performance Data ---
    // Backend: GET /api/performance-data -> devuelve {[key: string]: PerformanceRecord[]}
    getPerformanceData: () => api.get<{[key: string]: PerformanceRecord[]}>('/performance-data'),
    // Backend: POST /api/performance-data -> recibe {[key:string]: PerformanceRecord[]}, no devuelve nada (204)
    savePerformanceData: (data: {[key:string]: PerformanceRecord[]}) => api.post<void>('/performance-data', data),

    // --- Looker Data ---
    // Backend: GET /api/looker-data -> devuelve AllLookerData
    getLookerData: () => api.get<AllLookerData>('/looker-data'),
    // Backend: POST /api/looker-data -> recibe AllLookerData, no devuelve nada (204)
    saveLookerData: (data: AllLookerData) => api.post<void>('/looker-data', data),
    
    // --- Reports ---
    // Backend: GET /api/reports -> devuelve BitacoraReport[]
    getBitacoraReports: () => api.get<BitacoraReport[]>('/reports'),
    // Backend: POST /api/reports -> recibe BitacoraReport[], no devuelve nada (204)
    saveBitacoraReports: (reports: BitacoraReport[]) => api.post<void>('/reports', reports),
    
    // --- Videos ---
    // Backend: GET /api/videos -> devuelve UploadedVideo[]
    getUploadedVideos: () => api.get<UploadedVideo[]>('/videos'),
    // Backend: POST /api/videos -> recibe UploadedVideo[], no devuelve nada (204)
    saveUploadedVideos: (videos: UploadedVideo[]) => api.post<void>('/videos', videos),

    // --- Import History ---
    // Backend: GET /api/import-history -> devuelve ImportBatch[]
    getImportHistory: () => api.get<ImportBatch[]>('/import-history'),
    // Backend: POST /api/import-history -> recibe ImportBatch[], no devuelve nada (204)
    saveImportHistory: (history: ImportBatch[]) => api.post<void>('/import-history', history),

    // --- Processed Hashes ---
    getProcessedHashes: () => api.get<ProcessedHashes>('/hashes'),
    saveProcessedHashes: (hashes: ProcessedHashes) => api.post<void>('/hashes', hashes),

    // --- Configs ---
    // Backend: GET /api/config/meta -> devuelve MetaApiConfig | null
    getMetaApiConfig: () => api.get<MetaApiConfig | null>('/config/meta'),
    // Backend: POST /api/config/meta -> recibe MetaApiConfig | null, no devuelve nada (204)
    saveMetaApiConfig: (config: MetaApiConfig | null) => api.post<void>('/config/meta', config),
    
    // Backend: GET /api/config/sql -> devuelve SqlConfig | null
    getSqlConfig: () => api.get<SqlConfig | null>('/config/sql'),
    // Backend: POST /api/config/sql -> recibe SqlConfig | null, no devuelve nada (204)
    saveSqlConfig: (config: SqlConfig | null) => api.post<void>('/config/sql', config),

    // Backend: GET /api/config/ftp -> devuelve FtpConfig | null
    getFtpConfig: () => api.get<FtpConfig | null>('/config/ftp'),
    // Backend: POST /api/config/ftp -> recibe FtpConfig | null, no devuelve nada (204)
    saveFtpConfig: (config: FtpConfig | null) => api.post<void>('/config/ftp', config),
    
    // --- Control Panel ---
    // Backend: POST /api/control/clear-all-data -> no devuelve nada (204)
    clearAllData: () => api.post<void>('/control/clear-all-data', {}),
};

export const dbConnectionStatus = {
    // La conexión ahora se determina por la capacidad de la API para responder
    connected: true 
};

// El objeto `db` anterior se elimina ya que no se usa la simulación de `localStorage`.
// `dbTyped` ahora es el export principal.
export default {
    ...dbTyped
};