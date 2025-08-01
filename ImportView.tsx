import React, { useState, useRef, useEffect } from 'react';
import { Client, PerformanceRecord, AllLookerData, BitacoraReport, ImportBatch, MetaApiConfig } from '../types';
import { dbTyped } from '../database';
import Logger from '../Logger';
import { ClientSelectorModal } from './ClientSelectorModal';
import { ImportHistory } from './ImportHistory';

interface ImportViewProps {
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    lookerData: AllLookerData;
    setLookerData: React.Dispatch<React.SetStateAction<AllLookerData>>;
    performanceData: { [key: string]: PerformanceRecord[] };
    setPerformanceData: React.Dispatch<React.SetStateAction<{ [key: string]: PerformanceRecord[] }>>;
    bitacoraReports: BitacoraReport[];
    setBitacoraReports: React.Dispatch<React.SetStateAction<BitacoraReport[]>>;
    onSyncFromMeta: (clientId: string) => Promise<void>;
    metaApiConfig: MetaApiConfig | null;
}

type Feedback = { type: 'info' | 'success' | 'error', message: string };

const ImportCard: React.FC<{
    title: string;
    description: string;
    icon: JSX.Element;
    onButtonClick: () => void;
    buttonText: string;
    disabled?: boolean;
}> = ({ title, description, icon, onButtonClick, buttonText, disabled }) => (
    <div className="bg-brand-border/30 rounded-lg p-6 flex flex-col items-start justify-between">
        <div>
            <div className="flex items-center gap-4 mb-2">
                <div className="text-brand-primary">{icon}</div>
                <h3 className="text-lg font-bold text-brand-text">{title}</h3>
            </div>
            <p className="text-sm text-brand-text-secondary mb-4">{description}</p>
        </div>
        <button
            onClick={onButtonClick}
            disabled={disabled}
            className="w-full bg-brand-border hover:bg-brand-border/70 text-brand-text font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {buttonText}
        </button>
    </div>
);


export const ImportView: React.FC<ImportViewProps> = ({ clients, setClients, lookerData, setLookerData, performanceData, setPerformanceData, bitacoraReports, setBitacoraReports, onSyncFromMeta, metaApiConfig }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isTxtClientSelectorOpen, setIsTxtClientSelectorOpen] = useState(false);
    const [isApiSyncClientSelectorOpen, setIsApiSyncClientSelectorOpen] = useState(false);
    const [pendingTxtFile, setPendingTxtFile] = useState<File | null>(null);
    const [importHistory, setImportHistory] = useState<ImportBatch[]>([]);
    
    const lookerInputRef = useRef<HTMLInputElement>(null);
    const metaInputRef = useRef<HTMLInputElement>(null);
    const txtInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        dbTyped.getImportHistory().then(history => {
            setImportHistory(history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        });
    }, []);

    const uploadFile = async (endpoint: string, file: File, additionalData?: Record<string, string>) => {
        const formData = new FormData();
        formData.append('file', file);
        if (additionalData) {
            for (const key in additionalData) {
                formData.append(key, additionalData[key]);
            }
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Error al subir el archivo a ${endpoint}`);
        }

        return result;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, sourceType: 'looker' | 'meta' | 'txt') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setFeedback({ type: 'info', message: `Subiendo y procesando ${file.name}...` });

        try {
            if (sourceType === 'txt') {
                setPendingTxtFile(file);
                setIsTxtClientSelectorOpen(true);
            } else {
                // Para XLSX (Meta y Looker), subimos directamente.
                // TODO Backend: El endpoint /api/import/{sourceType} debe manejar la lógica completa:
                // 1. Recibir el archivo.
                // 2. Parsearlo.
                // 3. Comprobar si existen todos los clientes. Si no, devolver error con los nombres de clientes nuevos.
                // 4. Procesar los datos y guardarlos en la DB.
                // 5. Devolver un resumen del resultado.
                const result = await uploadFile(`/api/import/${sourceType}`, file);
                
                // Actualizar el estado del frontend con los datos que devuelva el backend
                if(result.lookerData) setLookerData(result.lookerData);
                if(result.performanceData) setPerformanceData(result.performanceData);
                if(result.clients) setClients(result.clients);
                if(result.newHistory) setImportHistory(prev => [result.newHistory, ...prev]);

                setFeedback({ type: 'success', message: result.message });
                Logger.success(`Import successful for ${file.name}`, { result });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error inesperado.";
            setFeedback({ type: 'error', message });
             Logger.error(`Import failed for ${file.name}`, { error });
        } finally {
            setIsProcessing(false);
             e.target.value = ''; // Reset file input
        }
    };

    const processTxtReport = async (clientId: string) => {
        if (!pendingTxtFile) return;
        
        setIsTxtClientSelectorOpen(false);
        setIsProcessing(true);
        setFeedback({ type: 'info', message: 'Subiendo y procesando reporte de Bitácora...' });

        try {
            const result = await uploadFile('/api/import/txt', pendingTxtFile, { clientId });

            // Actualizar estado
            setBitacoraReports(result.bitacoraReports);
            if(result.newHistory) setImportHistory(prev => [result.newHistory, ...prev]);

            setFeedback({ type: 'success', message: result.message });
            Logger.success(`TXT Report import successful`, { result });

        } catch (error) {
             const message = error instanceof Error ? error.message : "Error desconocido.";
            setFeedback({ type: 'error', message: `Error al procesar el reporte TXT: ${message}` });
        } finally {
            setIsProcessing(false);
            setPendingTxtFile(null);
        }
    };
    
    const triggerFileUpload = (ref: React.RefObject<HTMLInputElement>) => ref.current?.click();

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
             <div className="bg-brand-surface rounded-lg p-6 shadow-lg space-y-6">
                <h2 className="text-2xl font-bold text-brand-text">Centro de Importación de Datos</h2>
                
                {feedback && (
                    <div className={`p-4 rounded-md text-sm font-semibold ${feedback.type === 'success' ? 'bg-green-500/20 text-green-300' : feedback.type === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {feedback.message}
                    </div>
                )}
                
                <input type="file" ref={lookerInputRef} onChange={(e) => handleFileChange(e, 'looker')} accept=".xlsx" className="hidden" />
                <input type="file" ref={metaInputRef} onChange={(e) => handleFileChange(e, 'meta')} accept=".xlsx" className="hidden" />
                <input type="file" ref={txtInputRef} onChange={(e) => handleFileChange(e, 'txt')} accept=".txt" className="hidden" />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ImportCard
                        title="Rendimiento (Meta)"
                        description="Sube el XLSX exportado desde Meta Ads para importar los datos de rendimiento de las campañas."
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M5 11a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" /><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm2 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm-1 5a1 1 0 00-1 1v2a1 1 0 001 1h12a1 1 0 001-1v-2a1 1 0 00-1-1H4z" clipRule="evenodd" /></svg>}
                        onButtonClick={() => triggerFileUpload(metaInputRef)}
                        buttonText="Subir XLSX de Meta"
                        disabled={isProcessing}
                    />
                    <ImportCard
                        title="Creativos (Looker)"
                        description="Sube el XLSX de Looker Studio con los nombres de anuncios y las URLs de los creativos para vincularlos."
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>}
                        onButtonClick={() => triggerFileUpload(lookerInputRef)}
                        buttonText="Subir XLSX de Looker"
                        disabled={isProcessing}
                    />
                     <ImportCard
                        title="Reporte Bitácora (TXT)"
                        description="Sube un reporte de bitácora en formato TXT para un análisis semanal o mensual detallado."
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>}
                        onButtonClick={() => triggerFileUpload(txtInputRef)}
                        buttonText="Subir TXT de Bitácora"
                        disabled={isProcessing}
                    />
                </div>
                 <div className="border-t border-brand-border pt-6">
                    <h3 className="text-lg font-semibold text-brand-text mb-2">Sincronización API</h3>
                    <p className="text-sm text-brand-text-secondary mb-4">Sincroniza datos directamente desde la API de Meta para los clientes que tengan un "Nombre de Cuenta de Meta" configurado.</p>
                    <button
                        onClick={() => setIsApiSyncClientSelectorOpen(true)}
                        disabled={!metaApiConfig}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!metaApiConfig ? 'Configura la API de Meta en la pestaña de Conexiones' : 'Sincronizar cliente'}
                    >
                        Sincronizar desde Meta API
                    </button>
                </div>
            </div>
            
            <ClientSelectorModal isOpen={isTxtClientSelectorOpen} onClose={() => setIsTxtClientSelectorOpen(false)} clients={clients} onClientSelect={processTxtReport} title="Seleccionar Cliente para Reporte TXT" description="Elige a qué cliente pertenece este reporte de Bitácora."/>
            
            <ClientSelectorModal isOpen={isApiSyncClientSelectorOpen} onClose={() => setIsApiSyncClientSelectorOpen(false)} clients={clients.filter(c => c.metaAccountName)} onClientSelect={onSyncFromMeta} title="Seleccionar Cliente para Sincronizar" description="Elige qué cliente quieres sincronizar desde la API de Meta."/>
            
            <ImportHistory history={importHistory} setHistory={setImportHistory} setLookerData={setLookerData} />
        </div>
    );
};
