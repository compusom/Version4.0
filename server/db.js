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

// Función para revisar y crear tablas principales
async function checkAndCreateTables() {
    const tables = [
        {
            name: 'users',
            createSQL: `CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                password VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        },
        {
            name: 'clients',
            createSQL: `CREATE TABLE clients (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                logo TEXT,
                currency VARCHAR(10) DEFAULT 'EUR',
                meta_account_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        },
        {
            name: 'performance_records',
            createSQL: `CREATE TABLE performance_records (
                id SERIAL PRIMARY KEY,
                unique_id VARCHAR(200) UNIQUE NOT NULL,
                client_id VARCHAR(50) REFERENCES clients(id),
                campaign_name TEXT,
                ad_set_name TEXT,
                ad_name TEXT,
                day VARCHAR(20),
                age VARCHAR(20),
                gender VARCHAR(20),
                spend DECIMAL(12,2) DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                reach INTEGER DEFAULT 0,
                frequency DECIMAL(10,2) DEFAULT 0,
                purchases INTEGER DEFAULT 0,
                landing_page_views INTEGER DEFAULT 0,
                clicks_all INTEGER DEFAULT 0,
                cpm DECIMAL(10,2) DEFAULT 0,
                ctr_all DECIMAL(10,4) DEFAULT 0,
                cpc_all DECIMAL(10,2) DEFAULT 0,
                video_plays_3s INTEGER DEFAULT 0,
                checkouts_initiated INTEGER DEFAULT 0,
                page_likes INTEGER DEFAULT 0,
                adds_to_cart INTEGER DEFAULT 0,
                link_clicks INTEGER DEFAULT 0,
                purchase_value DECIMAL(12,2) DEFAULT 0,
                account_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        },
        {
            name: 'looker_data',
            createSQL: `CREATE TABLE looker_data (
                id SERIAL PRIMARY KEY,
                client_id VARCHAR(50) REFERENCES clients(id),
                ad_name TEXT NOT NULL,
                image_url TEXT,
                ad_preview_link TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id, ad_name)
            )`
        },
        {
            name: 'import_history',
            createSQL: `CREATE TABLE import_history (
                id VARCHAR(50) PRIMARY KEY,
                source VARCHAR(20) NOT NULL,
                file_name TEXT NOT NULL,
                file_hash TEXT,
                client_name TEXT,
                description TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        },
        {
            name: 'logs',
            createSQL: `CREATE TABLE logs (
                id SERIAL PRIMARY KEY,
                message TEXT NOT NULL,
                level VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        },
        {
            name: 'reports',
            createSQL: `CREATE TABLE reports (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        }
    ];

    const client = await pool.connect();
    const results = [];
    try {
        for (const table of tables) {
            let exists = false;
            let error = null;
            try {
                const res = await client.query(
                    `SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = $1
                    ) AS "exists"`, [table.name]
                );
                exists = res.rows[0].exists;
                if (!exists) {
                    await client.query(table.createSQL);
                }
            } catch (err) {
                error = err.message;
            }
            results.push({
                table: table.name,
                exists: exists || false,
                created: !exists && !error,
                error: error
            });
        }
    } finally {
        client.release();
    }
    return results;
}

// Función para guardar clientes
async function saveClients(clients) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Limpiar tabla existente y reinsertar
        await client.query('DELETE FROM clients');
        
        for (const clientRecord of clients) {
            await client.query(
                `INSERT INTO clients (id, name, logo, currency, meta_account_name) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name,
                    logo = EXCLUDED.logo,
                    currency = EXCLUDED.currency,
                    meta_account_name = EXCLUDED.meta_account_name`,
                [clientRecord.id, clientRecord.name, clientRecord.logo || '', clientRecord.currency || 'EUR', clientRecord.metaAccountName]
            );
        }
        await client.query('COMMIT');
        console.log(`Guardados ${clients.length} clientes en la base de datos`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Función para guardar datos de rendimiento
async function savePerformanceData(performanceData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (const [clientId, records] of Object.entries(performanceData)) {
            for (const record of records) {
                await client.query(
                    `INSERT INTO performance_records (
                        unique_id, client_id, campaign_name, ad_set_name, ad_name, day, age, gender,
                        spend, impressions, reach, frequency, purchases, landing_page_views, clicks_all,
                        cpm, ctr_all, cpc_all, video_plays_3s, checkouts_initiated, page_likes,
                        adds_to_cart, link_clicks, purchase_value, account_name
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
                    ON CONFLICT (unique_id) DO NOTHING`,
                    [
                        record.uniqueId, clientId, record.campaignName, record.adSetName, record.adName,
                        record.day, record.age, record.gender, record.spend, record.impressions,
                        record.reach, record.frequency, record.purchases, record.landingPageViews,
                        record.clicksAll, record.cpm, record.ctrAll, record.cpcAll, record.videoPlays3s,
                        record.checkoutsInitiated, record.pageLikes, record.addsToCart, record.linkClicks,
                        record.purchaseValue, record.accountName
                    ]
                );
            }
        }
        await client.query('COMMIT');
        console.log('Datos de rendimiento guardados en la base de datos');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Función para guardar datos de Looker
async function saveLookerData(lookerData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (const [clientId, clientData] of Object.entries(lookerData)) {
            for (const [adName, adData] of Object.entries(clientData)) {
                await client.query(
                    `INSERT INTO looker_data (client_id, ad_name, image_url, ad_preview_link)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (client_id, ad_name) DO UPDATE SET
                        image_url = EXCLUDED.image_url,
                        ad_preview_link = EXCLUDED.ad_preview_link`,
                    [clientId, adName, adData.imageUrl, adData.adPreviewLink]
                );
            }
        }
        await client.query('COMMIT');
        console.log('Datos de Looker guardados en la base de datos');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    testConnection,
    checkAndCreateTables,
    saveClients,
    savePerformanceData,
    saveLookerData
};
