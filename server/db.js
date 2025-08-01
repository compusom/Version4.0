const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'casaos',
    password: process.env.POSTGRES_PASSWORD || 'casaos',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

// Función para probar la conexión
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('Conexión exitosa a PostgreSQL');
        
        // Intentar hacer una consulta simple para verificar la conexión
        const result = await client.query('SELECT NOW()');
        console.log('Prueba de consulta exitosa:', result.rows[0]);
        
        client.release();
        return {
            success: true,
            message: 'Conexión exitosa a PostgreSQL',
            timestamp: result.rows[0]
        };
    } catch (err) {
        console.error('Error detallado al conectar a PostgreSQL:', {
            code: err.code,
            detail: err.detail,
            message: err.message
        });
        
        let errorMessage = 'Error al conectar a PostgreSQL: ';
        
        switch(err.code) {
            case 'ECONNREFUSED':
                errorMessage += 'No se pudo conectar al servidor PostgreSQL. Asegúrate que PostgreSQL esté corriendo.';
                break;
            case '28P01':
                errorMessage += 'Contraseña incorrecta.';
                break;
            case '3D000':
                errorMessage += 'Base de datos no existe.';
                break;
            case '28000':
                errorMessage += 'Usuario no existe o no tiene permisos.';
                break;
            default:
                errorMessage += err.message;
        }
        
        throw new Error(errorMessage);
    }
}

module.exports = {
    pool,
    testConnection
};
