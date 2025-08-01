import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { AppView, Placement, Creative, AnalysisResult, FormatGroup, Language, CreativeSet, Client, AggregatedAdPerformance, AllLookerData, PerformanceRecord, TrendsAnalysisResult, TrendCardData, MetaApiConfig, BitacoraReport, UploadedVideo, ImportBatch, ProcessResult, SqlConfig, FtpConfig } from './types';
import { PLACEMENTS, META_ADS_GUIDELINES } from './constants';
import { PlatformAnalysisView } from './components/PlatformAnalysisView';
import { Navbar } from './components/Navbar';
import { ConnectionsView } from './components/ConnectionsView';
import { ControlPanelView } from './components/ControlPanelView';
import { ClientManager } from './components/ClientManager';
import { PerformanceView } from './components/PerformanceView';
import { ImportView } from './components/ImportView';
import { HelpView } from './components/HelpView';
import { LogView } from './components/LogView';
import { TrendsView } from './components/TrendsView';
import { ReportsView } from './components/ReportsView';
import { dbTyped } from './database';
import Logger from './Logger';
import { CreativeAnalysisView } from './components/CreativeAnalysisView';

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const getFormatAnalysis = async (creativeSet: CreativeSet, formatGroup: FormatGroup, language: Language, context: string, isVideo: boolean): Promise<AnalysisResult | null> => {
    // Esta función ahora debería llamar a un endpoint del backend que maneje la llamada a Gemini
    // para mantener la API Key segura en el servidor.
    
    // El backend recibiría el archivo/imagen, el prompt, y las configuraciones,
    // y devolvería el resultado JSON del análisis.

    try {
        const formData = new FormData();
        formData.append('formatGroup', formatGroup);
        formData.append('language', language);
        formData.append('context', context);
        formData.append('isVideo', String(isVideo));

        if (isVideo && creativeSet.videoFile) {
            formData.append('creativeFile', creativeSet.videoFile);
        } else {
            const relevantCreative = formatGroup === 'SQUARE_LIKE' ? creativeSet.square : creativeSet.vertical;
            const creativeToAnalyze = relevantCreative || (formatGroup === 'SQUARE_LIKE' ? creativeSet.vertical : creativeSet.square);
            if (!creativeToAnalyze) throw new Error("No creative available for analysis.");
            formData.append('creativeFile', creativeToAnalyze.file);
        }

        const response = await fetch('/api/analyze-creative', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error en el análisis de la IA desde el backend.');
        }

        return await response.json();

    } catch (error) {
        console.error("Error fetching analysis from backend:", error);
        const isSpanish = language === 'es';
        let errorMessage = isSpanish ? "Hubo un error al comunicarse con el servidor para el análisis." : "There was an error communicating with the server for analysis.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return {
            creativeDescription: "Error", effectivenessScore: 0, effectivenessJustification: "Error", clarityScore: 0, clarityJustification: "Error", textToImageRatio: 0, textToImageRatioJustification: "Error", funnelStage: "Error", funnelStageJustification: "Error", recommendations: [], advantagePlusAnalysis: [], placementSummaries: [],
            overallConclusion: { headline: isSpanish ? "Error de Servidor" : "Server Error", checklist: [{ severity: 'CRITICAL', text: errorMessage }] },
        };
    }
};

const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleaned = value.replace(/\./g, '').replace(/,/g, '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

const Footer: React.FC = () => {
    const APP_VERSION = "1.0.0";
    const APP_BUILD = "4"; // Incremento de build por refactorización a cliente-servidor

    return (
        <footer className="text-center py-4 mt-8">
            <p className="text-xs text-brand-text-secondary font-mono">
                Meta Ads Creative Assistant v{APP_VERSION} (Build {APP_BUILD})
            </p>
        </footer>
    );
};

const App: React.FC = () => {
    // App State
    const [mainView, setMainView] = useState<AppView>('creative_analysis');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Data State
    const [clients, setClients] = useState<Client[]>([]);
    const [lookerData, setLookerData] = useState<AllLookerData>({});
    const [metaApiConfig, setMetaApiConfig] = useState<MetaApiConfig | null>(null);
    const [sqlConfig, setSqlConfig] = useState<SqlConfig | null>(null);
    const [ftpConfig, setFtpConfig] = useState<FtpConfig | null>(null);
    const [bitacoraReports, setBitacoraReports] = useState<BitacoraReport[]>([]);
    const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
    const [importHistory, setImportHistory] = useState<ImportBatch[]>([]);
    const [performanceData, setPerformanceData] = useState<{ [key: string]: PerformanceRecord[] }>({});

    // Shared State for Date Range
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(today.getDate() - 7);
    const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    // --- DATABASE & PERSISTENCE ---
    useEffect(() => {
        const initializeApp = async () => {
            Logger.info('Application initializing...');
            setIsLoading(true);
            try {
                // TODO Backend: Crear un endpoint GET /api/initial-data que devuelva este objeto
                const initialData = await dbTyped.getInitialData() as any;
                
                setClients(initialData.clients || []);
                setLookerData(initialData.lookerData || {});
                setMetaApiConfig(initialData.metaApiConfig || null);
                setSqlConfig(initialData.sqlConfig || null);
                setFtpConfig(initialData.ftpConfig || null);
                setBitacoraReports(initialData.bitacoraReports || []);
                setUploadedVideos(initialData.uploadedVideos || []);
                setImportHistory(initialData.importHistory || []);
                setPerformanceData(initialData.performanceData || {});
                
                Logger.success(`Loaded initial data from backend.`);

            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown server error';
                Logger.error('Failed to load initial data from backend.', { error: message });
                alert(`Error crítico: No se pudo conectar con el servidor para cargar los datos. ${message}`);
            } finally {
                setIsLoading(false);
            }
        };
        initializeApp();
    }, []);
    
    // La persistencia de datos ahora se maneja por operación (ej. al añadir un cliente)
    // por lo que los useEffects que vigilaban cambios masivos ya no son necesarios
    // y se eliminan para evitar llamadas excesivas a la API.

    // --- LOGIC ---
    
    const getPerformanceAnalysis = useCallback(async (performanceData: AggregatedAdPerformance[], client: Client): Promise<string> => {
        // TODO Backend: Crear un endpoint POST /api/analyze-performance
        // que reciba los datos y devuelva el análisis de texto.
        try {
            const response = await fetch('/api/analyze-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ performanceData, client })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error en el análisis de rendimiento de la IA');
            }
            const data = await response.json();
            return data.analysisText;
        } catch (error) {
             console.error("Error en el análisis de rendimiento por IA:", error);
            const message = error instanceof Error ? error.message : "Ocurrió un error desconocido al generar el análisis.";
            return `Error al contactar la IA: ${message}`;
        }
    }, []);

    const getTrendsAnalysis = useCallback(async (topAds: AggregatedAdPerformance[], client: Client, period: string, dailyData: PerformanceRecord[]): Promise<TrendsAnalysisResult> => {
        // TODO Backend: Crear un endpoint POST /api/analyze-trends
        // que reciba los datos y devuelva el análisis JSON.
        try {
             const response = await fetch('/api/analyze-trends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topAds, client, period, dailyData })
            });
             if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error en el análisis de tendencias de la IA');
            }
            return await response.json();
        } catch (error) {
            console.error("Error en el análisis de tendencias por IA:", error);
            const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            alert(`Error al generar el análisis de tendencias: ${errorMessage}`);
            return { trends: [] };
        }
    }, []);

    const handleSyncFromMeta = async (clientId: string) => {
        if (!metaApiConfig) {
            alert("La configuración de la API de Meta no está definida.");
            return;
        }
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.metaAccountName) {
            alert("El cliente seleccionado no tiene un 'Nombre de Cuenta de Meta' configurado.");
            return;
        }

        setIsLoading(true);
        try {
            // TODO Backend: Crear un endpoint POST /api/sync-meta que reciba el clientId
            // y realice la sincronización, devolviendo el resultado.
            const response = await fetch('/api/sync-meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Error en la sincronización con la API de Meta");
            }
            
            const syncResult = await response.json();
            
            // Actualizar el estado local con los nuevos datos recibidos del backend.
            setPerformanceData(syncResult.performanceData);
            setImportHistory(syncResult.importHistory);

            alert(`Sincronización completada. Se añadieron ${syncResult.totalNewRecords} nuevos registros.`);
            if(syncResult.totalNewRecords > 0) {
                Logger.success(`Synced from Meta API. Added ${syncResult.totalNewRecords} records.`);
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            alert(`Error durante la sincronización: ${message}`);
            Logger.error('Meta API sync failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMainContent = () => {
        if (isLoading) {
             return (
                <div className="fixed inset-0 bg-brand-bg flex items-center justify-center z-50">
                    <div className="flex flex-col items-center gap-4">
                         <svg className="animate-spin h-10 w-10 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-lg font-semibold text-brand-text">Cargando aplicación...</p>
                    </div>
                </div>
            )
        }
        
        return (
             <div className="min-h-screen text-brand-text p-4 sm:p-6 lg:p-8 flex flex-col">
                <div className="flex-grow">
                    <Navbar 
                        currentView={mainView}
                        onNavigate={setMainView}
                    />
                    
                    {mainView === 'creative_analysis' && <CreativeAnalysisView clients={clients} getFormatAnalysis={getFormatAnalysis} />}
                    {mainView === 'performance' && <PerformanceView clients={clients} getPerformanceAnalysis={getPerformanceAnalysis} getFormatAnalysis={getFormatAnalysis} lookerData={lookerData} setLookerData={setLookerData} performanceData={performanceData} uploadedVideos={uploadedVideos} setUploadedVideos={setUploadedVideos} startDate={startDate} endDate={endDate} onDateChange={(start, end) => { setStartDate(start); setEndDate(end); }} />}
                    {mainView === 'strategies' && <TrendsView clients={clients} lookerData={lookerData} getTrendsAnalysis={getTrendsAnalysis} performanceData={performanceData} startDate={startDate} endDate={endDate} onDateChange={(start, end) => { setStartDate(start); setEndDate(end); }} />}
                    {mainView === 'reports' && <ReportsView clients={clients} lookerData={lookerData} bitacoraReports={bitacoraReports} />}
                    {mainView === 'connections' && <ConnectionsView metaApiConfig={metaApiConfig} setMetaApiConfig={setMetaApiConfig} sqlConfig={sqlConfig} setSqlConfig={setSqlConfig} ftpConfig={ftpConfig} setFtpConfig={setFtpConfig} />}
                    {mainView === 'control_panel' && <ControlPanelView />}
                    {mainView === 'clients' && <ClientManager clients={clients} setClients={setClients} />}
                    {mainView === 'import' && <ImportView clients={clients} setClients={setClients} lookerData={lookerData} setLookerData={setLookerData} performanceData={performanceData} setPerformanceData={setPerformanceData} bitacoraReports={bitacoraReports} setBitacoraReports={setBitacoraReports} onSyncFromMeta={handleSyncFromMeta} metaApiConfig={metaApiConfig} />}
                    {mainView === 'help' && <HelpView />}
                    {mainView === 'logs' && <LogView />}
                </div>
                <Footer />
            </div>
        )
    }
    
    return renderMainContent();
};

export default App;
