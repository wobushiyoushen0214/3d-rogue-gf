export type SettlementGrade = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';

export type MetaProgressSave = {
    version: number;
    certificationPoint: number;
    totalRuns: number;
    bestGrade: SettlementGrade;
    bestScore: number;
    highestLevel: number;
    totalKills: number;
    lastRoleId: string;
    updatedAt: number;
};

export const META_PROGRESS_API_BASE_URL = 'http://127.0.0.1:3007/api';
export const META_PROGRESS_DEFAULT_PLAYER_ID = 'local-player';

export const CertificationPointByGrade: Record<SettlementGrade, number> = {
    D: 1,
    C: 3,
    B: 6,
    A: 10,
    S: 15,
    SS: 25,
};

const gradeRank: Record<SettlementGrade, number> = {
    D: 1,
    C: 2,
    B: 3,
    A: 4,
    S: 5,
    SS: 6,
};

export function createDefaultMetaProgress(): MetaProgressSave {
    return {
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
}

export function normalizeSettlementGrade(value: string): SettlementGrade {
    if (value === 'SS' || value === 'S' || value === 'A' || value === 'B' || value === 'C' || value === 'D') {
        return value;
    }
    return 'D';
}

export function getCertificationPointByGrade(grade: string): number {
    return CertificationPointByGrade[normalizeSettlementGrade(grade)];
}

export function compareSettlementGrade(left: string, right: string): number {
    const leftRank = gradeRank[normalizeSettlementGrade(left)];
    const rightRank = gradeRank[normalizeSettlementGrade(right)];
    return leftRank - rightRank;
}

function toSafeInt(value: unknown, fallback: number, min = 0): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(min, Math.floor(parsed));
}

export function sanitizeMetaProgressSave(raw: Partial<MetaProgressSave> | null | undefined): MetaProgressSave {
    const base = createDefaultMetaProgress();
    if (!raw || typeof raw !== 'object') {
        return base;
    }
    return {
        version: toSafeInt(raw.version, base.version, 1),
        certificationPoint: toSafeInt(raw.certificationPoint, base.certificationPoint, 0),
        totalRuns: toSafeInt(raw.totalRuns, base.totalRuns, 0),
        bestGrade: normalizeSettlementGrade(raw.bestGrade ?? base.bestGrade),
        bestScore: toSafeInt(raw.bestScore, base.bestScore, 0),
        highestLevel: toSafeInt(raw.highestLevel, base.highestLevel, 1),
        totalKills: toSafeInt(raw.totalKills, base.totalKills, 0),
        lastRoleId: typeof raw.lastRoleId === 'string' && raw.lastRoleId.trim().length > 0
            ? raw.lastRoleId
            : base.lastRoleId,
        updatedAt: toSafeInt(raw.updatedAt, base.updatedAt, 0),
    };
}
