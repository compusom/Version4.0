const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Cambia esto por el nombre de tu base de datos
    password: 'postgres', // Cambia esto por tu contraseña
    port: 5432,
});

// Función para probar la conexión
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('Conexión exitosa a PostgreSQL');
        client.release();
        return true;
    } catch (err) {
        console.error('Error al conectar a PostgreSQL:', err);
        throw err;
    }
}

module.exports = {
    pool,
    testConnection
};
