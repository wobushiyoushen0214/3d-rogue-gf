const mysql = require('mysql2/promise');
const { config } = require('./config');

const pool = mysql.createPool({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    connectionLimit: config.dbConnectionLimit,
    waitForConnections: true,
    charset: 'utf8mb4',
});

const bootstrapSql = `
CREATE TABLE IF NOT EXISTS meta_progress (
    player_id VARCHAR(64) NOT NULL PRIMARY KEY,
    version INT NOT NULL DEFAULT 1,
    certification_point INT NOT NULL DEFAULT 0,
    total_runs INT NOT NULL DEFAULT 0,
    best_grade ENUM('D', 'C', 'B', 'A', 'S', 'SS') NOT NULL DEFAULT 'D',
    best_score INT NOT NULL DEFAULT 0,
    highest_level INT NOT NULL DEFAULT 1,
    total_kills INT NOT NULL DEFAULT 0,
    last_role_id VARCHAR(64) NOT NULL DEFAULT 'student',
    updated_at BIGINT NOT NULL DEFAULT 0,
    created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function ensureSchema() {
    const adminConnection = await mysql.createConnection({
        host: config.dbHost,
        port: config.dbPort,
        user: config.dbUser,
        password: config.dbPassword,
        charset: 'utf8mb4',
    });
    const dbName = String(config.dbName || 'rogue_game').replace(/[^a-zA-Z0-9_]/g, '');
    await adminConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await adminConnection.end();
    await pool.query(bootstrapSql);
}

module.exports = {
    pool,
    ensureSchema,
};
