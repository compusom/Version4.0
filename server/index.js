const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./db');

const app = express();
const port = 3001; // Puerto para el backend

app.use(cors());
app.use(express.json());

// Ruta para probar la conexión
app.post('/api/connections/test-sql', async (req, res) => {
    try {
        await testConnection();
        res.json({ success: true, message: 'Conexión exitosa a PostgreSQL' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
