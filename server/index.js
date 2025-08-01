require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

const app = express();
app.use(cors());
app.use(express.json());

// Test SQL connection endpoint
app.post('/api/connections/test-sql', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        res.json({ success: true, message: 'Conexión exitosa a PostgreSQL', timestamp: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al conectar a PostgreSQL', error: err.message });
    }
});

// Check and create tables endpoint
app.post('/api/connections/check-tables', async (req, res) => {
    const tables = [
        'users', 'clients', 'performance_records', 'looker_data', 'import_history', 'logs', 'reports'
    ];
    try {
        const client = await pool.connect();
        const results = [];
        for (const table of tables) {
            const result = await client.query(
                `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS "exists"`,
                [table]
            );
            results.push({ table, exists: result.rows[0].exists });
        }
        client.release();
        res.json({ success: true, tables: results });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al verificar tablas', error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
