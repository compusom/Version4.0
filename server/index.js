const express = require('express');
const cors = require('cors');
const { pool, testConnection, checkAndCreateTables, saveClients, savePerformanceData, saveLookerData } = require('./db');
const os = require('os');

const app = express();
const port = process.env.PORT || 3001;

// Obtener la IP local del servidor
const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Omitir direcciones IPv6 y direcciones de loopback
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

const serverIP = getLocalIP();

// Configuración de CORS para permitir cualquier origen en desarrollo
app.use(cors());

// Middleware para logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use(express.json());

// Ruta para probar la conexión
app.post('/api/connections/test-sql', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Iniciando prueba de conexión SQL`);
    
    try {
        // Verificar la configuración recibida
        const config = req.body;
        console.log('[SQL Test] Configuración recibida:', {
            host: config?.host || pool.options.host,
            database: config?.database || pool.options.database,
            user: config?.user || pool.options.user,
            port: config?.port || pool.options.port
        });

        console.log('[SQL Test] Intentando conexión a la base de datos...');
        const result = await testConnection();
        
        const response = {
            success: true,
            message: 'Conexión exitosa a PostgreSQL',
            details: {
                timestamp: result.timestamp,
                server: {
                    ip: serverIP,
                    port: port
                },
                database: {
                    host: pool.options.host,
                    database: pool.options.database,
                    user: pool.options.user,
                    port: pool.options.port
                }
            }
        };
        
        console.log(`[${timestamp}] Conexión exitosa:`, response);
        return res.json(response);
    } catch (error) {
        console.error(`[${timestamp}] Error en la conexión:`, {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        const errorResponse = {
            success: false,
            message: error.message,
            details: {
                code: error.code,
                timestamp: timestamp,
                server: {
                    ip: serverIP,
                    port: port
                },
                originalError: error.toString()
            }
        };
        
        return res.status(500).json(errorResponse);
    }
});

// Endpoint para revisar y crear tablas principales
app.post('/api/db/status', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Revisión/creación de tablas principales iniciada`);
    try {
        const results = await checkAndCreateTables();
        console.log(`[${timestamp}] Estado de tablas:`, results);
        return res.json({
            success: true,
            tables: results,
            timestamp
        });
    } catch (error) {
        console.error(`[${timestamp}] Error al revisar/crear tablas:`, error);
        return res.status(500).json({
            success: false,
            message: error.message,
            timestamp
        });
    }
});

// Endpoint para guardar clientes
app.post('/api/clients', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Guardando clientes`);
    try {
        await saveClients(req.body);
        return res.status(204).send();
    } catch (error) {
        console.error(`[${timestamp}] Error al guardar clientes:`, error);
        return res.status(500).json({
            success: false,
            message: error.message,
            timestamp
        });
    }
});

// Endpoint para guardar datos de rendimiento
app.post('/api/performance-data', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Guardando datos de rendimiento`);
    try {
        await savePerformanceData(req.body);
        return res.status(204).send();
    } catch (error) {
        console.error(`[${timestamp}] Error al guardar datos de rendimiento:`, error);
        return res.status(500).json({
            success: false,
            message: error.message,
            timestamp
        });
    }
});

// Endpoint para guardar datos de Looker
app.post('/api/looker-data', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Guardando datos de Looker`);
    try {
        await saveLookerData(req.body);
        return res.status(204).send();
    } catch (error) {
        console.error(`[${timestamp}] Error al guardar datos de Looker:`, error);
        return res.status(500).json({
            success: false,
            message: error.message,
            timestamp
        });
    }
});

// Ruta inicial
app.get('/api/initial-data', async (req, res) => {
    try {
        // Aquí puedes agregar la lógica para obtener datos iniciales
        res.json({ message: 'Servidor funcionando correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log('='.repeat(50));
    console.log(`Servidor Backend iniciado`);
    console.log(`- Hora de inicio: ${new Date().toISOString()}`);
    console.log(`- IP Local: http://${serverIP}:${port}`);
    console.log(`- Localhost: http://localhost:${port}`);
    console.log(`- Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`- PostgreSQL: ${pool.options.user}@${pool.options.host}:${pool.options.port}/${pool.options.database}`);
    console.log('='.repeat(50));
});
