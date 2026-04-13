import { Component } from 'cc';
import { LevelConfigVo } from '../data/povo/LevelConfigVo';

export class LevelConfig extends Component {
    static chooseLevel: string = 'level1';
    static startLevel: LevelConfigVo = null;

    static leveles: LevelConfigVo[] = [
        {
            LV: 'level1',
            LavelName: 'DemoMap',
            Map: [['map1_1']],
            MonsterType: ['Dragon'],
            BossType: 'Dragon',
            EliteDisplayName: '代码屎山',
            BossDisplayName: '老板的大饼',
            BossAbility: [],
            EnemyBonus: 1,
            Vision: 0,
            BossShowTIme: 300,
            SpawnInterval: 8.5,
            SpawnCount: 8,
            MaxAlive: 110,
            SpawnRadiusMin: 8,
            SpawnRadiusMax: 28,
            MapRefreshInterval: 0.5,
            DifficultyInterval: 28,
            DifficultyGraceTime: 35,
            LatePressureScale: 1.25,
            HPGrowthPerTick: 0.16,
            AttackGrowthPerTick: 0.08,
            SpawnCountGrowthPerTick: 2.4,
            SpawnIntervalFloor: 0.65,
            SpawnIntervalLevelDecay: 0.05,
            SpawnIntervalTimeDecayRate: 0.085,
            SpawnCountLevelBonusRate: 0.42,
            DemandSurgeUnlockTime: 95,
            DemandSurgeInterval: 72,
            DemandSurgeWaveScale: 0.75,
            DemandSurgeRepeatCount: 2,
            DemandSurgeRepeatDelay: 1.15,
            ScheduleRushUnlockTime: 145,
            ScheduleRushInterval: 88,
            ScheduleRushDuration: 16,
            ScheduleRushSpawnIntervalScale: 0.58,
            ScheduleRushSpawnRadiusScale: 0.72,
            ScheduleRushBurstScale: 0.55,
            ProjectReviewUnlockTime: 205,
            ProjectReviewInterval: 96,
            ProjectReviewWaveCount: 5,
            ProjectReviewSpawnRadiusMin: 7,
            ProjectReviewSpawnRadiusMax: 13,
            ProjectReviewBaseHpBonus: 0.9,
            ProjectReviewBaseAttackBonus: 0.42,
            ProjectReviewMoveSpeedScale: 1.08,
            IncidentUnlockTime: 246,
            IncidentInterval: 82,
            IncidentWaveCount: 4,
            IncidentSpawnRadiusMin: 5,
            IncidentSpawnRadiusMax: 8.5,
            IncidentBaseHpBonus: 0.25,
            IncidentBaseAttackBonus: 0.72,
            IncidentMoveSpeedScale: 1.28,
            EliteUnlockTime: 75,
            EliteSpawnInterval: 50,
            EliteSpawnCount: 1,
            EliteScaleMin: 1.35,
            EliteScaleMax: 1.8,
            EliteHPMultiplier: 2.8,
            EliteAttackMultiplier: 1.6,
            EliteMoveSpeedMultiplier: 1.1,
            EliteBurdenScale: 1.3,
            EliteBurdenDuration: 2.6,
            EliteCoreDropExp: 12,
            EliteCoreDropHeal: 10,
            EliteCoreDropLifeTime: 18,
            EliteCoreMagnetRadius: 6,
            EliteCoreCollectRadius: 1.8,
            EliteLootAttack: 14,
            EliteLootAttackInterval: -0.14,
            EliteLootProjectile: 1,
            EliteLootPenetration: 1,
            EliteLootMoveSpeed: 1,
            EliteLootMaxHp: 25,
            BossScale: 2.3,
            BossHPMultiplier: 7.5,
            BossAttackMultiplier: 2.8,
            BossMoveSpeedMultiplier: 1.15,
            BossSpawnRadius: 24,
            BossRushInterval: 13,
            BossRushDuration: 4.2,
            BossRushSpeedScale: 1.35,
            BossPieInterval: 11,
            BossPieDuration: 8.5,
            BossPieCount: 3,
            BossPieRadius: 1.8,
            BossPieDebuffScale: 1.4,
            BossPieDebuffDuration: 3.2,
            BossPieSpawnRadiusMin: 3.5,
            BossPieSpawnRadiusMax: 8.5,
            BossFinalStandWaveScale: 0.6,
        },
    ];

    static getLevelByName(levelName: string): boolean {
        for (const one of LevelConfig.leveles) {
            if (one.LV === levelName) {
                return true;
            }
        }
        return false;
    }

    static getLevel(): LevelConfigVo {
        if (LevelConfig.startLevel != null && LevelConfig.startLevel.LV === LevelConfig.chooseLevel) {
            return LevelConfig.startLevel;
        }

        for (const one of LevelConfig.leveles) {
            if (one.LV === LevelConfig.chooseLevel) {
                LevelConfig.startLevel = one;
                return one;
            }
        }

        return null;
    }
}
