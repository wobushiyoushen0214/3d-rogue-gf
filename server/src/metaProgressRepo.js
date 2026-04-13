const { pool } = require('./db');

const GRADE_ORDER = ['D', 'C', 'B', 'A', 'S', 'SS'];
const DEFAULT_PROGRESS = {
    version: 1,
    certificationPoint: 0,
    totalRuns: 0,
    bestGrade: 'D',
    bestScore: 0,
    highestLevel: 1,
    totalKills: 0,
    lastRoleId: 'student',
    updatedAt: 0,
};

function toInt(value, fallback, min = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(min, Math.floor(parsed));
}

function normalizeGrade(value) {
    if (typeof value !== 'string') {
        return DEFAULT_PROGRESS.bestGrade;
    }
    return GRADE_ORDER.includes(value) ? value : DEFAULT_PROGRESS.bestGrade;
}

function sanitizeProgress(raw) {
    if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_PROGRESS };
    }
    return {
        version: toInt(raw.version, DEFAULT_PROGRESS.version, 1),
        certificationPoint: toInt(raw.certificationPoint, DEFAULT_PROGRESS.certificationPoint, 0),
        totalRuns: toInt(raw.totalRuns, DEFAULT_PROGRESS.totalRuns, 0),
        bestGrade: normalizeGrade(raw.bestGrade),
        bestScore: toInt(raw.bestScore, DEFAULT_PROGRESS.bestScore, 0),
        highestLevel: toInt(raw.highestLevel, DEFAULT_PROGRESS.highestLevel, 1),
        totalKills: toInt(raw.totalKills, DEFAULT_PROGRESS.totalKills, 0),
        lastRoleId: typeof raw.lastRoleId === 'string' && raw.lastRoleId.trim().length > 0
            ? raw.lastRoleId
            : DEFAULT_PROGRESS.lastRoleId,
        updatedAt: toInt(raw.updatedAt, DEFAULT_PROGRESS.updatedAt, 0),
    };
}

function mapDbRow(row) {
    if (!row) {
        return { ...DEFAULT_PROGRESS };
    }
    return sanitizeProgress({
        version: row.version,
        certificationPoint: row.certification_point,
        totalRuns: row.total_runs,
        bestGrade: row.best_grade,
        bestScore: row.best_score,
        highestLevel: row.highest_level,
        totalKills: row.total_kills,
        lastRoleId: row.last_role_id,
        updatedAt: row.updated_at,
    });
}

async function ensurePlayerRow(playerId) {
    await pool.query(
        `INSERT INTO meta_progress (
            player_id,
            version,
            certification_point,
            total_runs,
            best_grade,
            best_score,
            highest_level,
            total_kills,
            last_role_id,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE player_id = player_id`,
        [
            playerId,
            DEFAULT_PROGRESS.version,
            DEFAULT_PROGRESS.certificationPoint,
            DEFAULT_PROGRESS.totalRuns,
            DEFAULT_PROGRESS.bestGrade,
            DEFAULT_PROGRESS.bestScore,
            DEFAULT_PROGRESS.highestLevel,
            DEFAULT_PROGRESS.totalKills,
            DEFAULT_PROGRESS.lastRoleId,
            DEFAULT_PROGRESS.updatedAt,
        ],
    );
}

async function getMetaProgress(playerId) {
    await ensurePlayerRow(playerId);
    const [rows] = await pool.query(
        `SELECT
            version,
            certification_point,
            total_runs,
            best_grade,
            best_score,
            highest_level,
            total_kills,
            last_role_id,
            updated_at
         FROM meta_progress
         WHERE player_id = ?
         LIMIT 1`,
        [playerId],
    );
    return mapDbRow(rows[0]);
}

async function saveMetaProgress(playerId, progress) {
    const safe = sanitizeProgress(progress);
    await ensurePlayerRow(playerId);
    await pool.query(
        `UPDATE meta_progress
         SET
            version = ?,
            certification_point = ?,
            total_runs = ?,
            best_grade = ?,
            best_score = ?,
            highest_level = ?,
            total_kills = ?,
            last_role_id = ?,
            updated_at = ?
         WHERE player_id = ?`,
        [
            safe.version,
            safe.certificationPoint,
            safe.totalRuns,
            safe.bestGrade,
            safe.bestScore,
            safe.highestLevel,
            safe.totalKills,
            safe.lastRoleId,
            safe.updatedAt,
            playerId,
        ],
    );
    return getMetaProgress(playerId);
}

module.exports = {
    getMetaProgress,
    saveMetaProgress,
    sanitizeProgress,
};
