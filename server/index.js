const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./db');

const app = express();
const port = 3001; // Puerto para el backend

// Configuración más específica de CORS
app.use(cors({
    origin: 'http://192.168.1.234:5173', // URL del frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Ruta para probar la conexión
app.post('/api/connections/test-sql', async (req, res) => {
    console.log('[SQL Test] Inicio de la solicitud');
    try {
        console.log('[SQL Test] Intentando conexión a la base de datos...');
        const result = await testConnection();
        console.log('[SQL Test] Conexión exitosa:', result);
        
        const response = { 
            success: true, 
            message: 'Conexión exitosa a PostgreSQL',
            details: result 
        };
        console.log('[SQL Test] Enviando respuesta:', response);
        
        return res.json(response);
    } catch (error) {
        console.error('[SQL Test] Error en la conexión:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        const errorResponse = { 
            success: false, 
            message: error.message,
            details: error.toString()
        };
        console.log('[SQL Test] Enviando respuesta de error:', errorResponse);
        
        return res.status(500).json(errorResponse);
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
    console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
