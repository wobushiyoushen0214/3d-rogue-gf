const express = require('express');
const cors = require('cors');
const { config } = require('./config');
const { ensureSchema } = require('./db');
const { getMetaProgress, saveMetaProgress, sanitizeProgress } = require('./metaProgressRepo');

const app = express();

app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        message: 'ok',
        db: config.dbName,
    });
});

app.get('/api/meta-progress/:playerId', async (req, res) => {
    try {
        const playerId = String(req.params.playerId || '').trim();
        if (!playerId) {
            return res.status(400).json({
                success: false,
                message: 'playerId is required',
            });
        }
        const data = await getMetaProgress(playerId);
        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: String(error?.message || error),
        });
    }
});

app.put('/api/meta-progress/:playerId', async (req, res) => {
    try {
        const playerId = String(req.params.playerId || '').trim();
        if (!playerId) {
            return res.status(400).json({
                success: false,
                message: 'playerId is required',
            });
        }
        const payload = sanitizeProgress(req.body?.data);
        const data = await saveMetaProgress(playerId, payload);
        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: String(error?.message || error),
        });
    }
});

async function bootstrap() {
    await ensureSchema();
    app.listen(config.apiPort, config.apiHost, () => {
        console.log(`[meta-server] http://${config.apiHost}:${config.apiPort}`);
    });
}

bootstrap().catch((error) => {
    console.error('[meta-server] startup failed:', error);
    process.exit(1);
});
