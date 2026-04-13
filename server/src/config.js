const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
    path: process.env.DOTENV_CONFIG_PATH || path.resolve(process.cwd(), '.env'),
});

function toInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.floor(parsed);
}

const config = {
    apiHost: process.env.API_HOST || '0.0.0.0',
    apiPort: toInt(process.env.API_PORT, 3007),
    dbHost: process.env.DB_HOST || '127.0.0.1',
    dbPort: toInt(process.env.DB_PORT, 3306),
    dbUser: process.env.DB_USER || 'root',
    dbPassword: process.env.DB_PASSWORD || 'root',
    dbName: process.env.DB_NAME || 'rogue_game',
    dbConnectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),
};

module.exports = {
    config,
};
