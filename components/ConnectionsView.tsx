import React, { useState, useEffect, useRef } from 'react';
import { MetaApiConfig, SqlConfig, FtpConfig } from '../types';
import Logger from '../Logger';
import { dbTyped } from '../database';

interface ConnectionsViewProps {
    metaApiConfig: MetaApiConfig | null;
    setMetaApiConfig: React.Dispatch<React.SetStateAction<MetaApiConfig | null>>;
    sqlConfig: SqlConfig | null;
    setSqlConfig: React.Dispatch<React.SetStateAction<SqlConfig | null>>;
    ftpConfig: FtpConfig | null;
    setFtpConfig: React.Dispatch<React.SetStateAction<FtpConfig | null>>;
}

type LogMessage = {
    text: string;
    level: 'info' | 'success' | 'error' | 'warn';
    timestamp: string;
};

const InputField: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string; }> = ({ label, name, value, onChange, type = 'text', placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-brand-text-secondary mb-1">{label}</label>
        <input
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-brand-bg border border-brand-border text-brand-text rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
            autoComplete={type === 'password' ? 'current-password' : 'off'}
        />
    </div>
);


const ConnectionCard: React.FC<{ title: string; icon: JSX.Element; children: React.ReactNode; }> = ({ title, icon, children }) => (
    <div className="bg-brand-border/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
            <div className="text-brand-primary">{icon}</div>
            <h3 className="text-lg font-bold text-brand-text">{title}</h3>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({ metaApiConfig, setMetaApiConfig, sqlConfig, setSqlConfig, ftpConfig, setFtpConfig }) => {
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);
    
    // Local state for forms
    const [localMeta, setLocalMeta] = useState<MetaApiConfig>({ appId: '', appSecret: '', accessToken: '' });
    const [localSql, setLocalSql] = useState<SqlConfig>({ host: '', port: '5432', user: '', password: '', database: '' });
    const [localFtp, setLocalFtp] = useState<FtpConfig>({ host: '', user: '', password: '' });

    useEffect(() => {
        if (metaApiConfig) setLocalMeta(metaApiConfig);
        if (sqlConfig) setLocalSql(sqlConfig);
        if (ftpConfig) setLocalFtp(ftpConfig);
    }, [metaApiConfig, sqlConfig, ftpConfig]);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const addLog = (text: string, level: LogMessage['level']) => {
        const timestamp = new Date().toLocaleTimeString('es-ES');
        setLogs(prev => [...prev.slice(-100), { text, level, timestamp }]);
    };
    
    // Test a connection by sending credentials to the backend
    const testConnection = async (type: 'sql' | 'ftp' | 'meta' | 'gemini', config?: any) => {
        try {
            const response = await fetch(`/api/connections/test-${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: config ? JSON.stringify(config) : undefined
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `Test failed with status ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`[${type.toUpperCase()}] ${message}`);
        }
    };


    const handleTestGemini = async () => {
        addLog("--> Executing: TEST_GEMINI_CONNECTION", "info");
        try {
            // In a production setup, the key is on the backend.
            // This endpoint should simply check if the backend can access the Gemini API.
            const result = await testConnection('gemini');
            addLog(`SUCCESS: ${result.message}`, "success");
            Logger.info("Gemini connection test successful (via backend).");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido.";
            addLog(`ERROR: ${message}`, "error");
            Logger.error("Gemini connection test failed.", { error: message });
        }
    };
    
    const handleSaveAndTest = async <T extends {}>(
        configType: 'Meta' | 'SQL' | 'FTP',
        localConfig: T,
        saveConfigAction: (config: T) => Promise<any>
    ) => {
        const typeLower = configType.toLowerCase() as 'meta' | 'sql' | 'ftp';
        addLog(`--> Executing: SAVE_AND_TEST_${configType}_CONNECTION`, 'info');

        try {
            // Step 1: Test the connection with the provided credentials
            addLog(`Attempting to test ${configType} connection...`, 'info');
            const testResult = await testConnection(typeLower, localConfig);
            addLog(`SUCCESS: ${configType} connection test successful. ${testResult.message}`, 'success');

            // Step 2: If test is successful, save the configuration
            addLog(`Saving ${configType} configuration...`, 'info');
            await saveConfigAction(localConfig);
            addLog(`SUCCESS: ${configType} configuration saved permanently.`, 'success');
            Logger.success(`${configType} configuration saved.`);

            // Update the component's main state
            if (configType === 'Meta') setMetaApiConfig(localConfig as unknown as MetaApiConfig);
            else if (configType === 'SQL') setSqlConfig(localConfig as unknown as SqlConfig);
            else if (configType === 'FTP') setFtpConfig(localConfig as unknown as FtpConfig);

        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido.";
            addLog(`ERROR: ${message}`, "error");
            Logger.error(`${configType} operation failed.`, { error: message });
        }
    };

    const getLogColor = (level: LogMessage['level']) => {
        switch (level) {
            case 'success': return 'text-green-400';
            case 'error': return 'text-red-400';
            case 'warn': return 'text-yellow-400';
            default: return 'text-brand-text-secondary';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <header>
                <h2 className="text-2xl font-bold text-brand-text mb-2">Plataformas y Conexiones</h2>
                <p className="text-brand-text-secondary">
                    Configura las credenciales para conectar la aplicación con servicios externos. Las credenciales se envían y almacenan de forma segura en el backend.
                </p>
            </header>

            <div className="space-y-6">
                <ConnectionCard title="Gemini API" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}>
                     <p className="text-sm text-brand-text-secondary">
                        La API Key de Gemini se usa en el backend y se configura a través de variables de entorno (<code className="bg-brand-bg text-yellow-300 font-mono px-1 py-0.5 rounded-md">API_KEY</code>).
                    </p>
                    <button onClick={handleTestGemini} className="bg-brand-border hover:bg-brand-border/70 text-brand-text font-bold py-2 px-4 rounded-lg shadow-md transition-colors">
                        Verificar Conexión del Backend
                    </button>
                </ConnectionCard>
                
                <ConnectionCard title="Base de Datos (PostgreSQL)" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Host" name="host" value={localSql.host || ''} onChange={(e) => setLocalSql({...localSql, host: e.target.value})} placeholder="localhost" />
                        <InputField label="Port" name="port" value={localSql.port || ''} onChange={(e) => setLocalSql({...localSql, port: e.target.value})} placeholder="5432" />
                        <InputField label="Usuario" name="user" value={localSql.user || ''} onChange={(e) => setLocalSql({...localSql, user: e.target.value})} placeholder="postgres_user" />
                        <InputField label="Contraseña" name="password" type="password" value={localSql.password || ''} onChange={(e) => setLocalSql({...localSql, password: e.target.value})} />
                        <InputField label="Base de Datos" name="database" value={localSql.database || ''} onChange={(e) => setLocalSql({...localSql, database: e.target.value})} placeholder="ads_assistant_db" />
                    </div>
                    <button onClick={() => handleSaveAndTest('SQL', localSql, (config) => dbTyped.saveSqlConfig(config))} className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors">
                        Guardar y Probar Conexión
                    </button>
                </ConnectionCard>
                
                 <ConnectionCard title="Servidor FTP" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 2.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>}>
                    <InputField label="Host" name="host" value={localFtp.host || ''} onChange={(e) => setLocalFtp({...localFtp, host: e.target.value})} placeholder="ftp.dominio.com" />
                    <InputField label="Usuario" name="user" value={localFtp.user || ''} onChange={(e) => setLocalFtp({...localFtp, user: e.target.value})} placeholder="ftp_user" />
                    <InputField label="Contraseña" name="password" type="password" value={localFtp.password || ''} onChange={(e) => setLocalFtp({...localFtp, password: e.target.value})} />
                     <button onClick={() => handleSaveAndTest('FTP', localFtp, (config) => dbTyped.saveFtpConfig(config))} className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors">
                        Guardar y Probar Conexión
                    </button>
                </ConnectionCard>
                
                 <ConnectionCard title="Meta API" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}>
                    <InputField label="App ID" name="appId" value={localMeta.appId} onChange={(e) => setLocalMeta({...localMeta, appId: e.target.value})} />
                    <InputField label="App Secret" name="appSecret" type="password" value={localMeta.appSecret} onChange={(e) => setLocalMeta({...localMeta, appSecret: e.target.value})} />
                    <InputField label="Access Token" name="accessToken" type="password" value={localMeta.accessToken} onChange={(e) => setLocalMeta({...localMeta, accessToken: e.target.value})} />
                    <button onClick={() => handleSaveAndTest('Meta', localMeta, (config) => dbTyped.saveMetaApiConfig(config))} className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors">
                        Guardar y Probar Conexión
                    </button>
                </ConnectionCard>
            </div>
            
            <div>
                 <h3 className="text-sm font-semibold text-brand-text-secondary mb-2 uppercase tracking-wider">Panel de Estado de Conexión</h3>
                 <div ref={logContainerRef} className="bg-black p-4 rounded-lg font-mono text-xs h-48 overflow-y-auto w-full border border-brand-border shadow-inner">
                    {logs.map((log, i) => (
                        <div key={i} className={`flex gap-4 items-start whitespace-pre-wrap py-1 ${getLogColor(log.level)}`}>
                            <span className="flex-shrink-0 font-semibold opacity-60">{log.timestamp}</span>
                            <p className="flex-grow">{log.text}</p>
                        </div>
                    ))}
                    {logs.length === 0 && <p className="text-brand-text-secondary/50">El estado de las pruebas de conexión aparecerá aquí...</p>}
                 </div>
            </div>
        </div>
    );
};