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
                
                -- Información básica de campaña
                campaign_name TEXT,
                ad_set_name TEXT,
                ad_name TEXT,
                day VARCHAR(20),
                age VARCHAR(20),
                gender VARCHAR(20),
                account_name TEXT,
                
                -- Métricas financieras principales
                spend DECIMAL(12,2) DEFAULT 0,
                purchase_value DECIMAL(12,2) DEFAULT 0,
                purchases INTEGER DEFAULT 0,
                cpa DECIMAL(10,2) DEFAULT 0,
                roas DECIMAL(10,4) DEFAULT 0,
                aov DECIMAL(10,2) DEFAULT 0,
                
                -- Métricas de alcance e impresiones
                impressions INTEGER DEFAULT 0,
                reach INTEGER DEFAULT 0,
                frequency DECIMAL(10,2) DEFAULT 0,
                cpm DECIMAL(10,2) DEFAULT 0,
                impressions_per_purchase DECIMAL(10,2) DEFAULT 0,
                
                -- Métricas de clics y CTR
                clicks_all INTEGER DEFAULT 0,
                link_clicks INTEGER DEFAULT 0,
                ctr_all DECIMAL(10,4) DEFAULT 0,
                ctr_link DECIMAL(10,4) DEFAULT 0,
                ctr_unique_link DECIMAL(10,4) DEFAULT 0,
                cpc_all DECIMAL(10,2) DEFAULT 0,
                
                -- Métricas de landing page
                landing_page_views INTEGER DEFAULT 0,
                lp_view_rate DECIMAL(10,4) DEFAULT 0,
                landing_conversion_rate DECIMAL(10,4) DEFAULT 0,
                purchase_rate_from_landing_page_views DECIMAL(10,4) DEFAULT 0,
                
                -- Métricas de video
                video_plays INTEGER DEFAULT 0,
                video_plays_3s INTEGER DEFAULT 0,
                video_plays_25percent INTEGER DEFAULT 0,
                video_plays_50percent INTEGER DEFAULT 0,
                video_plays_75percent INTEGER DEFAULT 0,
                video_plays_95percent INTEGER DEFAULT 0,
                video_plays_100percent INTEGER DEFAULT 0,
                video_play_rate_3s DECIMAL(10,4) DEFAULT 0,
                video_plays_2s_continuous_unique INTEGER DEFAULT 0,
                video_retention_proprietary DECIMAL(10,4) DEFAULT 0,
                video_retention_meta DECIMAL(10,4) DEFAULT 0,
                video_average_play_time DECIMAL(10,2) DEFAULT 0,
                thru_plays INTEGER DEFAULT 0,
                video_capture TEXT,
                video_file_name TEXT,
                
                -- Métricas de engagement
                page_likes INTEGER DEFAULT 0,
                page_engagement INTEGER DEFAULT 0,
                post_comments INTEGER DEFAULT 0,
                post_interactions INTEGER DEFAULT 0,
                post_reactions INTEGER DEFAULT 0,
                post_shares INTEGER DEFAULT 0,
                
                -- Métricas de conversión
                adds_to_cart INTEGER DEFAULT 0,
                checkouts_initiated INTEGER DEFAULT 0,
                checkouts_initiated_on_website INTEGER DEFAULT 0,
                payment_info_adds INTEGER DEFAULT 0,
                percent_purchases DECIMAL(10,4) DEFAULT 0,
                cvr_link_click DECIMAL(10,4) DEFAULT 0,
                
                -- Configuración de campaña
                campaign_delivery TEXT,
                ad_set_delivery TEXT,
                ad_delivery TEXT,
                campaign_budget TEXT,
                campaign_budget_type TEXT,
                bid TEXT,
                bid_type TEXT,
                objective TEXT,
                purchase_type TEXT,
                currency VARCHAR(10) DEFAULT 'EUR',
                
                -- Audiencias
                included_custom_audiences TEXT,
                excluded_custom_audiences TEXT,
                
                -- Fechas de reporte
                report_start VARCHAR(20),
                report_end VARCHAR(20),
                
                -- Métricas de funnel (AIDA)
                attention DECIMAL(10,4) DEFAULT 0,
                interest DECIMAL(10,4) DEFAULT 0,
                desire DECIMAL(10,4) DEFAULT 0,
                
                -- Métricas adicionales
                visualizations INTEGER DEFAULT 0,
                adc_to_lpv DECIMAL(10,4) DEFAULT 0,
                website_url TEXT,
                
                -- Identificadores creativos
                image_name TEXT,
                creative_identifier TEXT,
                
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
                        unique_id, client_id, campaign_name, ad_set_name, ad_name, day, age, gender, account_name,
                        spend, purchase_value, purchases, aov, impressions, reach, frequency, cpm, impressions_per_purchase,
                        clicks_all, link_clicks, ctr_all, ctr_link, ctr_unique_link, cpc_all,
                        landing_page_views, lp_view_rate, landing_conversion_rate, purchase_rate_from_landing_page_views,
                        video_plays, video_plays_3s, video_plays_25percent, video_plays_50percent, video_plays_75percent,
                        video_plays_95percent, video_plays_100percent, video_play_rate_3s, video_plays_2s_continuous_unique,
                        video_retention_proprietary, video_retention_meta, video_average_play_time, thru_plays,
                        video_capture, video_file_name, page_likes, page_engagement, post_comments, post_interactions,
                        post_reactions, post_shares, adds_to_cart, checkouts_initiated, checkouts_initiated_on_website,
                        payment_info_adds, percent_purchases, cvr_link_click, campaign_delivery, ad_set_delivery,
                        ad_delivery, campaign_budget, campaign_budget_type, bid, bid_type, objective, purchase_type,
                        currency, included_custom_audiences, excluded_custom_audiences, report_start, report_end,
                        attention, interest, desire, visualizations, adc_to_lpv, website_url, image_name, creative_identifier
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
                        $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56,
                        $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72
                    ) ON CONFLICT (unique_id) DO NOTHING`,
                    [
                        record.uniqueId, clientId, record.campaignName, record.adSetName, record.adName,
                        record.day, record.age, record.gender, record.accountName, record.spend,
                        record.purchaseValue, record.purchases, record.aov, record.impressions, record.reach,
                        record.frequency, record.cpm, record.impressionsPerPurchase, record.clicksAll, record.linkClicks,
                        record.ctrAll, record.ctrLink, record.ctrUniqueLink, record.cpcAll, record.landingPageViews,
                        record.lpViewRate, record.landingConversionRate, record.purchaseRateFromLandingPageViews,
                        record.videoPlays, record.videoPlays3s, record.videoPlays25percent, record.videoPlays50percent,
                        record.videoPlays75percent, record.videoPlays95percent, record.videoPlays100percent,
                        record.videoPlayRate3s, record.videoPlays2sContinuousUnique, record.videoRetentionProprietary,
                        record.videoRetentionMeta, record.videoAveragePlayTime, record.thruPlays, record.videoCapture,
                        record.videoFileName, record.pageLikes, record.pageEngagement, record.postComments,
                        record.postInteractions, record.postReactions, record.postShares, record.addsToCart,
                        record.checkoutsInitiated, record.checkoutsInitiatedOnWebsite, record.paymentInfoAdds,
                        record.percentPurchases, record.cvrLinkClick, record.campaignDelivery, record.adSetDelivery,
                        record.adDelivery, record.campaignBudget, record.campaignBudgetType, record.bid,
                        record.bidType, record.objective, record.purchaseType, record.currency,
                        record.includedCustomAudiences, record.excludedCustomAudiences, record.reportStart,
                        record.reportEnd, record.attention, record.interest, record.desire, record.visualizations,
                        record.adcToLpv, record.websiteUrl, record.imageName, record.creativeIdentifier
                    ]
                );
            }
        }
        await client.query('COMMIT');
        console.log('Datos de rendimiento completos guardados en la base de datos');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al guardar datos de rendimiento:', err);
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

// Función para obtener todos los clientes
async function getClients() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM clients ORDER BY name');
        return result.rows;
    } finally {
        client.release();
    }
}

// Función para obtener datos de rendimiento por cliente
async function getPerformanceDataByClient(clientId) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM performance_records WHERE client_id = $1 ORDER BY day DESC',
            [clientId]
        );
        return result.rows;
    } finally {
        client.release();
    }
}

// Función para obtener métricas agregadas por cliente
async function getClientMetrics(clientId, startDate = null, endDate = null) {
    const client = await pool.connect();
    try {
        let query = `
            SELECT 
                client_id,
                COUNT(*) as total_records,
                SUM(spend) as total_spend,
                SUM(impressions) as total_impressions,
                SUM(purchases) as total_purchases,
                SUM(purchase_value) as total_purchase_value,
                SUM(link_clicks) as total_link_clicks,
                AVG(cpm) as avg_cpm,
                AVG(ctr_link) as avg_ctr_link,
                CASE 
                    WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend)
                    ELSE 0 
                END as roas,
                CASE 
                    WHEN SUM(purchases) > 0 THEN SUM(spend) / SUM(purchases)
                    ELSE 0 
                END as cpa,
                CASE 
                    WHEN SUM(purchases) > 0 THEN SUM(purchase_value) / SUM(purchases)
                    ELSE 0 
                END as aov
            FROM performance_records 
            WHERE client_id = $1
        `;
        
        const params = [clientId];
        
        if (startDate && endDate) {
            query += ' AND day BETWEEN $2 AND $3';
            params.push(startDate, endDate);
        }
        
        query += ' GROUP BY client_id';
        
        const result = await client.query(query, params);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

// Función para obtener top campañas por cliente
async function getTopCampaignsByClient(clientId, limit = 10) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                campaign_name,
                SUM(spend) as total_spend,
                SUM(purchases) as total_purchases,
                SUM(purchase_value) as total_purchase_value,
                CASE 
                    WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend)
                    ELSE 0 
                END as roas
            FROM performance_records 
            WHERE client_id = $1
            GROUP BY campaign_name
            ORDER BY total_spend DESC
            LIMIT $2
        `, [clientId, limit]);
        return result.rows;
    } finally {
        client.release();
    }
}

// Función para obtener datos de Looker por cliente
async function getLookerDataByClient(clientId) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM looker_data WHERE client_id = $1 ORDER BY ad_name',
            [clientId]
        );
        return result.rows;
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
    saveLookerData,
    getClients,
    getPerformanceDataByClient,
    getClientMetrics,
    getTopCampaignsByClient,
    getLookerDataByClient
};
