import { _decorator, CCInteger, Component, director, game, instantiate, Node, Prefab, randomRange, v3, Vec3 } from 'cc';
import { CareerRoleId } from '../../const/CareerConfig';
import { EffectConst } from '../../const/EffectConst';
import { GameStateEnum } from '../../const/GameStateEnum';
import { LevelConfig } from '../../const/LevelConfig';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { EffectManager } from '../../managerGame/EffectManager';
import { GameMapManager } from '../../managerGame/GameMapManager';
import { Monster } from '../../managerGame/Monster';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { PoolManager } from '../../utils/PoolManager';
import { Vector2 } from '../../utils/RVO/Common';
import { Simulator } from '../../utils/RVO/Simulator';
import { PlayerTs } from './PlayerTs';

const { ccclass, property } = _decorator;

type PieTrapInfo = {
    node: Node;
    expireAt: number;
    radius: number;
};

type DropItemType = 'coffee' | 'energyDrink';

type DropItemInfo = {
    node: Node;
    type: DropItemType;
    bornTime: number;
    lifeTime: number;
    collectRadius: number;
    magnetRadius: number;
    baseY: number;
};

type BuffInfo = {
    type: string;
    remainTime: number;
    scale: number;
};

@ccclass('level')
export class level extends Component {
    @property(Prefab)
    private playerPrefab: Prefab = null;

    private refashMap = 0;
    private baseHP = 1;
    private baseAttack = 1;

    @property(CCInteger)
    count = 10;

    @property(CCInteger)
    maxAlive = 100;

    private mapRefreshInterval = 0.5;
    private spawnTimer = 0;
    private spawnIntervalFloor = 0.85;
    private spawnIntervalLevelDecay = 0.04;
    private spawnIntervalTimeDecayRate = 0.055;
    private spawnCountLevelBonusRate = 0.35;
    private spawnInterval = 10;
    private spawnRadiusMin = 10;
    private spawnRadiusMax = 50;
    private difficultyInterval = 30;
    private difficultyGraceTime = 35;
    private latePressureScale = 1.15;
    private hpGrowthPerTick = 0.2;
    private attackGrowthPerTick = 0.1;
    private spawnCountGrowthPerTick = 2;
    private demandSurgeUnlockTime = 95;
    private demandSurgeInterval = 72;
    private demandSurgeWaveScale = 0.75;
    private demandSurgeRepeatCount = 2;
    private demandSurgeRepeatDelay = 1.15;
    private demandSurgeNextTime = 95;
    private scheduleRushUnlockTime = 145;
    private scheduleRushInterval = 88;
    private scheduleRushDuration = 16;
    private scheduleRushSpawnIntervalScale = 0.58;
    private scheduleRushSpawnRadiusScale = 0.72;
    private scheduleRushBurstScale = 0.55;
    private scheduleRushNextTime = 145;
    private scheduleRushRemain = 0;
    private projectReviewUnlockTime = 205;
    private projectReviewInterval = 96;
    private projectReviewWaveCount = 5;
    private projectReviewSpawnRadiusMin = 7;
    private projectReviewSpawnRadiusMax = 13;
    private projectReviewBaseHpBonus = 0.9;
    private projectReviewBaseAttackBonus = 0.42;
    private projectReviewMoveSpeedScale = 1.08;
    private projectReviewNextTime = 205;
    private incidentUnlockTime = 246;
    private incidentInterval = 82;
    private incidentWaveCount = 4;
    private incidentSpawnRadiusMin = 5;
    private incidentSpawnRadiusMax = 8.5;
    private incidentBaseHpBonus = 0.25;
    private incidentBaseAttackBonus = 0.72;
    private incidentMoveSpeedScale = 1.28;
    private incidentNextTime = 246;

    private eliteUnlockTime = 60;
    private eliteSpawnInterval = 45;
    private eliteSpawnCount = 1;
    private eliteScaleMin = 1.35;
    private eliteScaleMax = 1.8;
    private eliteHPMultiplier = 2.8;
    private eliteAttackMultiplier = 1.6;
    private eliteMoveSpeedMultiplier = 1.1;
    private eliteDisplayName = '代码屎山';
    private eliteSplitCountMin = 2;
    private eliteSplitCountMax = 3;
    private eliteNextSpawnAt = 60;

    private battleElapsed = 0;
    private runStarted = false;

    private bossType = '';
    private bossDisplayName = '老板的大饼';
    private bossShowTime = 300;
    private bossScale = 2.3;
    private bossHPMultiplier = 7.5;
    private bossAttackMultiplier = 2.8;
    private bossMoveSpeedMultiplier = 1.15;
    private bossSpawnRadius = 24;
    private bossSpawned = false;
    private bossWarning30Sent = false;
    private bossWarning10Sent = false;
    private bossNode: Node = null;
    private bossFinalStandTriggered = false;
    private bossRushRemain = 0;
    private bossRushDuration = 4.2;
    private bossRushInterval = 13;
    private bossRushSpeedScale = 1.35;
    private bossNextRushTime = 0;
    private bossPieInterval = 11;
    private bossPieDuration = 8.5;
    private bossPieCount = 3;
    private bossPieRadius = 1.8;
    private bossPieDebuffScale = 1.4;
    private bossPieDebuffDuration = 3.2;
    private bossPieSpawnRadiusMin = 3.5;
    private bossPieSpawnRadiusMax = 8.5;
    private bossFinalStandWaveScale = 0.6;
    private bossNextPieTime = 0;
    private bossPieTraps: PieTrapInfo[] = [];

    // 本局统计数据
    private statEliteKills = 0;
    private statBossKills = 0;
    private statMaxLevel = 1;
    private statEventsTriggered = 0;

    // 掉落物系统
    private dropItems: DropItemInfo[] = [];
    private dropCoffeeChance = 0.06;
    private dropCoffeeHealPercent = 0.15;
    private dropEnergyDrinkChance = 0.03;
    private dropEnergyDrinkDuration = 10;
    private dropEnergyDrinkAtkSpeedScale = 0.7;
    private dropCollectRadius = 1.6;
    private dropMagnetRadius = 5.0;
    private dropLifeTime = 15;

    // 玩家临时 Buff
    private playerBuffs: BuffInfo[] = [];

    // 技术分享会事件
    private techShareUnlockTime = 180;
    private techShareInterval = 120;
    private techShareNextTime = 180;
    private techSharePickupCount = 3;
    private techSharePickupRadius = 12;
    private techShareBuffDuration = 15;
    private techSharePickups: DropItemInfo[] = [];

    private spawnPos: Vec3 = v3();

    start() {
        MonsterManager.instance.player = instantiate(this.playerPrefab);
        MonsterManager.instance.player.parent = director.getScene();
        MonsterManager.instance.player.active = true;

        Simulator.instance.setAgentDefaults(10, 4, 1, 0.1, 0.5, 15, new Vector2(0, 0));
        GameStateInput.setGameState(GameStateEnum.Loading);

        EffectManager.instance.init();

        const levelConfig = LevelConfig.getLevel();
        MonsterManager.instance.player.getComponent(PlayerTs)?.applyLevelConfig(levelConfig);

        this.count = levelConfig.SpawnCount ?? this.count;
        this.maxAlive = levelConfig.MaxAlive ?? this.maxAlive;
        this.spawnInterval = levelConfig.SpawnInterval ?? this.spawnInterval;
        this.spawnRadiusMin = levelConfig.SpawnRadiusMin ?? this.spawnRadiusMin;
        this.spawnRadiusMax = levelConfig.SpawnRadiusMax ?? this.spawnRadiusMax;
        this.mapRefreshInterval = levelConfig.MapRefreshInterval ?? this.mapRefreshInterval;
        this.difficultyInterval = levelConfig.DifficultyInterval ?? this.difficultyInterval;
        this.difficultyGraceTime = levelConfig.DifficultyGraceTime ?? this.difficultyGraceTime;
        this.latePressureScale = levelConfig.LatePressureScale ?? this.latePressureScale;
        this.hpGrowthPerTick = levelConfig.HPGrowthPerTick ?? this.hpGrowthPerTick;
        this.attackGrowthPerTick = levelConfig.AttackGrowthPerTick ?? this.attackGrowthPerTick;
        this.spawnCountGrowthPerTick = levelConfig.SpawnCountGrowthPerTick ?? this.spawnCountGrowthPerTick;
        this.spawnIntervalFloor = levelConfig.SpawnIntervalFloor ?? this.spawnIntervalFloor;
        this.spawnIntervalLevelDecay = levelConfig.SpawnIntervalLevelDecay ?? this.spawnIntervalLevelDecay;
        this.spawnIntervalTimeDecayRate = levelConfig.SpawnIntervalTimeDecayRate ?? this.spawnIntervalTimeDecayRate;
        this.spawnCountLevelBonusRate = levelConfig.SpawnCountLevelBonusRate ?? this.spawnCountLevelBonusRate;
        this.demandSurgeUnlockTime = levelConfig.DemandSurgeUnlockTime ?? this.demandSurgeUnlockTime;
        this.demandSurgeInterval = levelConfig.DemandSurgeInterval ?? this.demandSurgeInterval;
        this.demandSurgeWaveScale = levelConfig.DemandSurgeWaveScale ?? this.demandSurgeWaveScale;
        this.demandSurgeRepeatCount = levelConfig.DemandSurgeRepeatCount ?? this.demandSurgeRepeatCount;
        this.demandSurgeRepeatDelay = levelConfig.DemandSurgeRepeatDelay ?? this.demandSurgeRepeatDelay;
        this.scheduleRushUnlockTime = levelConfig.ScheduleRushUnlockTime ?? this.scheduleRushUnlockTime;
        this.scheduleRushInterval = levelConfig.ScheduleRushInterval ?? this.scheduleRushInterval;
        this.scheduleRushDuration = levelConfig.ScheduleRushDuration ?? this.scheduleRushDuration;
        this.scheduleRushSpawnIntervalScale = levelConfig.ScheduleRushSpawnIntervalScale ?? this.scheduleRushSpawnIntervalScale;
        this.scheduleRushSpawnRadiusScale = levelConfig.ScheduleRushSpawnRadiusScale ?? this.scheduleRushSpawnRadiusScale;
        this.scheduleRushBurstScale = levelConfig.ScheduleRushBurstScale ?? this.scheduleRushBurstScale;
        this.projectReviewUnlockTime = levelConfig.ProjectReviewUnlockTime ?? this.projectReviewUnlockTime;
        this.projectReviewInterval = levelConfig.ProjectReviewInterval ?? this.projectReviewInterval;
        this.projectReviewWaveCount = levelConfig.ProjectReviewWaveCount ?? this.projectReviewWaveCount;
        this.projectReviewSpawnRadiusMin = levelConfig.ProjectReviewSpawnRadiusMin ?? this.projectReviewSpawnRadiusMin;
        this.projectReviewSpawnRadiusMax = levelConfig.ProjectReviewSpawnRadiusMax ?? this.projectReviewSpawnRadiusMax;
        this.projectReviewBaseHpBonus = levelConfig.ProjectReviewBaseHpBonus ?? this.projectReviewBaseHpBonus;
        this.projectReviewBaseAttackBonus = levelConfig.ProjectReviewBaseAttackBonus ?? this.projectReviewBaseAttackBonus;
        this.projectReviewMoveSpeedScale = levelConfig.ProjectReviewMoveSpeedScale ?? this.projectReviewMoveSpeedScale;
        this.incidentUnlockTime = levelConfig.IncidentUnlockTime ?? this.incidentUnlockTime;
        this.incidentInterval = levelConfig.IncidentInterval ?? this.incidentInterval;
        this.incidentWaveCount = levelConfig.IncidentWaveCount ?? this.incidentWaveCount;
        this.incidentSpawnRadiusMin = levelConfig.IncidentSpawnRadiusMin ?? this.incidentSpawnRadiusMin;
        this.incidentSpawnRadiusMax = levelConfig.IncidentSpawnRadiusMax ?? this.incidentSpawnRadiusMax;
        this.incidentBaseHpBonus = levelConfig.IncidentBaseHpBonus ?? this.incidentBaseHpBonus;
        this.incidentBaseAttackBonus = levelConfig.IncidentBaseAttackBonus ?? this.incidentBaseAttackBonus;
        this.incidentMoveSpeedScale = levelConfig.IncidentMoveSpeedScale ?? this.incidentMoveSpeedScale;

        this.eliteUnlockTime = levelConfig.EliteUnlockTime ?? this.eliteUnlockTime;
        this.eliteSpawnInterval = levelConfig.EliteSpawnInterval ?? this.eliteSpawnInterval;
        this.eliteSpawnCount = levelConfig.EliteSpawnCount ?? this.eliteSpawnCount;
        this.eliteScaleMin = levelConfig.EliteScaleMin ?? this.eliteScaleMin;
        this.eliteScaleMax = levelConfig.EliteScaleMax ?? this.eliteScaleMax;
        this.eliteHPMultiplier = levelConfig.EliteHPMultiplier ?? this.eliteHPMultiplier;
        this.eliteAttackMultiplier = levelConfig.EliteAttackMultiplier ?? this.eliteAttackMultiplier;
        this.eliteMoveSpeedMultiplier = levelConfig.EliteMoveSpeedMultiplier ?? this.eliteMoveSpeedMultiplier;
        this.eliteDisplayName = levelConfig.EliteDisplayName ?? this.eliteDisplayName;

        this.bossType = levelConfig.BossType ?? this.bossType;
        this.bossDisplayName = levelConfig.BossDisplayName ?? this.bossDisplayName;
        this.bossShowTime = levelConfig.BossShowTIme ?? this.bossShowTime;
        this.bossScale = levelConfig.BossScale ?? this.bossScale;
        this.bossHPMultiplier = levelConfig.BossHPMultiplier ?? this.bossHPMultiplier;
        this.bossAttackMultiplier = levelConfig.BossAttackMultiplier ?? this.bossAttackMultiplier;
        this.bossMoveSpeedMultiplier = levelConfig.BossMoveSpeedMultiplier ?? this.bossMoveSpeedMultiplier;
        this.bossSpawnRadius = levelConfig.BossSpawnRadius ?? this.bossSpawnRadius;
        this.bossRushInterval = levelConfig.BossRushInterval ?? this.bossRushInterval;
        this.bossRushDuration = levelConfig.BossRushDuration ?? this.bossRushDuration;
        this.bossRushSpeedScale = levelConfig.BossRushSpeedScale ?? this.bossRushSpeedScale;
        this.bossPieInterval = levelConfig.BossPieInterval ?? this.bossPieInterval;
        this.bossPieDuration = levelConfig.BossPieDuration ?? this.bossPieDuration;
        this.bossPieCount = levelConfig.BossPieCount ?? this.bossPieCount;
        this.bossPieRadius = levelConfig.BossPieRadius ?? this.bossPieRadius;
        this.bossPieDebuffScale = levelConfig.BossPieDebuffScale ?? this.bossPieDebuffScale;
        this.bossPieDebuffDuration = levelConfig.BossPieDebuffDuration ?? this.bossPieDebuffDuration;
        this.bossPieSpawnRadiusMin = levelConfig.BossPieSpawnRadiusMin ?? this.bossPieSpawnRadiusMin;
        this.bossPieSpawnRadiusMax = levelConfig.BossPieSpawnRadiusMax ?? this.bossPieSpawnRadiusMax;
        this.bossFinalStandWaveScale = levelConfig.BossFinalStandWaveScale ?? this.bossFinalStandWaveScale;

        if (this.bossPieSpawnRadiusMin > this.bossPieSpawnRadiusMax) {
            const temp = this.bossPieSpawnRadiusMin;
            this.bossPieSpawnRadiusMin = this.bossPieSpawnRadiusMax;
            this.bossPieSpawnRadiusMax = temp;
        }
        if (this.projectReviewSpawnRadiusMin > this.projectReviewSpawnRadiusMax) {
            const temp = this.projectReviewSpawnRadiusMin;
            this.projectReviewSpawnRadiusMin = this.projectReviewSpawnRadiusMax;
            this.projectReviewSpawnRadiusMax = temp;
        }
        if (this.incidentSpawnRadiusMin > this.incidentSpawnRadiusMax) {
            const temp = this.incidentSpawnRadiusMin;
            this.incidentSpawnRadiusMin = this.incidentSpawnRadiusMax;
            this.incidentSpawnRadiusMax = temp;
        }

        this.resetRuntimeState();

        GameMapManager.instance.init(levelConfig.Map, () => {
            MonsterManager.instance.init(() => {
                GameStateInput.setGameState(GameStateEnum.Ready);
            });
        });

        const scene = director.getScene();
        scene.on(OnOrEmitConst.OnEliteKilled, this.onEliteKilled, this);
        scene.on(OnOrEmitConst.OnBossKilled, this.onBossKilled, this);
        scene.on(OnOrEmitConst.OnNormalKill, this.onNormalKill, this);
    }

    onDestroy() {
        const scene = director.getScene();
        if (scene && scene.isValid) {
            scene.off(OnOrEmitConst.OnEliteKilled, this.onEliteKilled, this);
            scene.off(OnOrEmitConst.OnBossKilled, this.onBossKilled, this);
            scene.off(OnOrEmitConst.OnNormalKill, this.onNormalKill, this);
        }

        this.clearBossPieTraps();
        this.clearDropItems();
        this.clearTechSharePickups();
        MonsterManager.instance.destroy();
        EffectManager.instance.destroy();
        PoolManager.instance.clearAllNodes();
        Simulator.instance.clear();
        LevelConfig.startLevel = null;
    }

    update(deltaTime: number) {
        if (!GameStateInput.canUpdateWorld()) {
            return;
        }

        this.battleElapsed += deltaTime;
        this.updateScheduleRushState(deltaTime);
        this.updateDynamicSpawn(deltaTime);
        this.updateDemandSurgeState();
        this.updateProjectReviewState();
        this.updateIncidentState();
        this.updateEliteSpawnState();
        this.updateBossSpawnState();
        this.updateBossEvent(deltaTime);
        this.updateDropItems(deltaTime);
        this.updatePlayerBuffs(deltaTime);
        this.updateTechShareState();
        this.updateTechSharePickups();

        this.refashMap += deltaTime;
        if (this.refashMap > this.mapRefreshInterval) {
            this.refashMap = 0;
            GameMapManager.instance.flashMap();
        }

        MonsterManager.instance.setPreferredVelocities(deltaTime);
    }

    public startRun(startRoleId: CareerRoleId = 'student'): boolean {
        if (this.runStarted || GameStateInput.isGameOver()) {
            return false;
        }

        const playerNode = MonsterManager.instance.player;
        const playerTs = playerNode?.getComponent(PlayerTs);
        if (!playerTs) {
            return false;
        }

        this.resetRuntimeState();
        this.runStarted = true;

        playerTs.runGameInit(startRoleId);
        this.reflashMaster();
        GameStateInput.setGameState(GameStateEnum.Running);
        return true;
    }

    private resetRuntimeState() {
        this.statEliteKills = 0;
        this.statBossKills = 0;
        this.statMaxLevel = 1;
        this.statEventsTriggered = 0;
        this.refashMap = 0;
        this.spawnTimer = Math.max(0.8, this.spawnInterval);
        this.demandSurgeNextTime = this.demandSurgeUnlockTime;
        this.scheduleRushNextTime = this.scheduleRushUnlockTime;
        this.scheduleRushRemain = 0;
        this.projectReviewNextTime = this.projectReviewUnlockTime;
        this.incidentNextTime = this.incidentUnlockTime;
        this.eliteNextSpawnAt = this.eliteUnlockTime;
        this.bossSpawned = false;
        this.bossWarning30Sent = false;
        this.bossWarning10Sent = false;
        this.bossNode = null;
        this.bossFinalStandTriggered = false;
        this.bossRushRemain = 0;
        this.bossNextRushTime = 0;
        this.bossNextPieTime = 0;
        this.clearBossPieTraps();
        this.clearDropItems();
        this.clearTechSharePickups();
        this.playerBuffs.length = 0;
        this.techShareNextTime = this.techShareUnlockTime;
    }

    private getPlayerLevel(): number {
        const player = MonsterManager.instance.player;
        if (!player) {
            return 1;
        }
        const playerTs = player.getComponent(PlayerTs);
        return Math.max(1, playerTs?.getCurrentLevel() ?? 1);
    }

    private getDynamicSpawnInterval(): number {
        const levelValue = this.getPlayerLevel();
        const tickProgress = this.getBattlePressureProgress();
        const intervalDecayByTime = tickProgress * this.spawnIntervalTimeDecayRate;
        const intervalDecayByLevel = Math.max(0, levelValue - 1) * this.spawnIntervalLevelDecay;
        let interval = this.spawnInterval - intervalDecayByTime - intervalDecayByLevel;
        if (this.isScheduleRushActive()) {
            interval *= Math.max(0.2, this.scheduleRushSpawnIntervalScale);
        }
        return Number.isFinite(interval) ? Math.max(this.spawnIntervalFloor, interval) : this.spawnInterval;
    }

    private getDynamicSpawnCount(): number {
        const levelValue = this.getPlayerLevel();
        const tickProgress = this.getBattlePressureProgress();
        const timeBonus = Math.floor(tickProgress * Math.max(1, this.spawnCountGrowthPerTick));
        const levelBonus = Math.floor(Math.max(0, levelValue - 1) * this.spawnCountLevelBonusRate);
        const waveCount = this.count + timeBonus + levelBonus;
        if (!Number.isFinite(waveCount)) {
            return Math.max(1, this.count);
        }
        return Math.max(1, Math.min(this.maxAlive, waveCount));
    }

    private getRuntimeDifficultyScale(): number {
        const levelValue = this.getPlayerLevel();
        const tickProgress = this.getBattlePressureProgress();
        const hpScale = 1 + tickProgress * this.hpGrowthPerTick + Math.max(0, levelValue - 1) * Math.max(0.02, this.hpGrowthPerTick * 0.45);
        const attackScale = 1 + tickProgress * this.attackGrowthPerTick + Math.max(0, levelValue - 1) * Math.max(0.015, this.attackGrowthPerTick * 0.42);
        const difficulty = (hpScale + attackScale) * 0.5;
        return Number.isFinite(difficulty) ? Math.max(1, difficulty) : 1;
    }

    private getBattlePressureProgress(): number {
        const graceTime = Math.max(0, this.difficultyGraceTime);
        const activeElapsed = Math.max(0, this.battleElapsed - graceTime);
        const baseProgress = this.difficultyInterval > 0
            ? activeElapsed / this.difficultyInterval
            : activeElapsed / 30;
        if (!Number.isFinite(baseProgress) || baseProgress <= 0) {
            return 0;
        }
        if (baseProgress <= 4) {
            return baseProgress;
        }
        return 4 + (baseProgress - 4) * Math.max(1, this.latePressureScale);
    }

    private updateDynamicSpawn(deltaTime: number) {
        this.spawnTimer -= deltaTime;
        if (this.spawnTimer > 0) {
            return;
        }

        this.spawnTimer = this.getDynamicSpawnInterval();
        if (MonsterManager.instance.goalvoes.size >= this.maxAlive) {
            return;
        }

        this.randomSpawn(this.getDynamicSpawnCount(), false);
    }

    private updateScheduleRushState(deltaTime: number) {
        if (this.scheduleRushRemain > 0) {
            this.scheduleRushRemain = Math.max(0, this.scheduleRushRemain - deltaTime);
        }
        if (this.scheduleRushInterval <= 0 || this.scheduleRushDuration <= 0) {
            return;
        }
        if (this.battleElapsed < this.scheduleRushNextTime) {
            return;
        }
        this.scheduleRushNextTime = this.battleElapsed + this.scheduleRushInterval;
        this.triggerScheduleRush();
    }

    private triggerScheduleRush() {
        this.statEventsTriggered += 1;
        this.scheduleRushRemain = Math.max(this.scheduleRushRemain, this.scheduleRushDuration);
        const burstWaveCount = Math.max(3, Math.floor(this.getDynamicSpawnCount() * Math.max(0.2, this.scheduleRushBurstScale)));
        director.getScene().emit(
            OnOrEmitConst.OnEliteCast,
            'scheduleRush',
            null,
            '排期冲刺',
            burstWaveCount,
            this.scheduleRushDuration,
        );
        this.spawnTimer = Math.min(this.spawnTimer, Math.max(0.2, this.getDynamicSpawnInterval() * 0.35));
        this.randomSpawn(burstWaveCount, false);
    }

    private isScheduleRushActive(): boolean {
        return this.scheduleRushRemain > 0;
    }

    private updateProjectReviewState() {
        if (this.projectReviewInterval <= 0 || this.projectReviewWaveCount <= 0) {
            return;
        }
        if (this.battleElapsed < this.projectReviewNextTime) {
            return;
        }
        this.projectReviewNextTime = this.battleElapsed + this.projectReviewInterval;
        this.triggerProjectReview();
    }

    private triggerProjectReview() {
        this.statEventsTriggered += 1;
        const pressureBonus = Math.floor(Math.max(0, this.getBattlePressureProgress()) * 0.45);
        const reviewWaveCount = Math.max(3, Math.floor(this.projectReviewWaveCount + pressureBonus));
        const spawnCount = this.spawnProjectReviewWave(reviewWaveCount);
        if (spawnCount <= 0) {
            return;
        }

        director.getScene().emit(
            OnOrEmitConst.OnEliteCast,
            'projectReview',
            null,
            '项目评审',
            spawnCount,
            this.projectReviewMoveSpeedScale,
        );
        this.spawnTimer = Math.min(this.spawnTimer, Math.max(0.35, this.getDynamicSpawnInterval() * 0.55));
    }

    private updateIncidentState() {
        if (this.incidentInterval <= 0 || this.incidentWaveCount <= 0) {
            return;
        }
        if (this.battleElapsed < this.incidentNextTime) {
            return;
        }
        this.incidentNextTime = this.battleElapsed + this.incidentInterval;
        this.triggerIncidentWave();
    }

    private triggerIncidentWave() {
        this.statEventsTriggered += 1;
        const pressureBonus = Math.floor(Math.max(0, this.getBattlePressureProgress()) * 0.3);
        const incidentWaveCount = Math.max(3, Math.floor(this.incidentWaveCount + pressureBonus));
        const spawnCount = this.spawnIncidentWave(incidentWaveCount);
        if (spawnCount <= 0) {
            return;
        }

        director.getScene().emit(
            OnOrEmitConst.OnEliteCast,
            'incident',
            null,
            '线上事故',
            spawnCount,
            this.incidentMoveSpeedScale,
        );
        this.spawnTimer = Math.min(this.spawnTimer, Math.max(0.25, this.getDynamicSpawnInterval() * 0.45));
    }

    private updateEliteSpawnState() {
        if (this.eliteSpawnInterval <= 0 || this.eliteSpawnCount <= 0) {
            return;
        }
        if (this.battleElapsed < this.eliteNextSpawnAt) {
            return;
        }

        this.eliteNextSpawnAt = this.battleElapsed + this.eliteSpawnInterval;
        if (MonsterManager.instance.goalvoes.size >= this.maxAlive) {
            return;
        }

        const spawnCount = this.randomSpawn(this.eliteSpawnCount, true);
        if (spawnCount > 0) {
            director.getScene().emit(
                OnOrEmitConst.OnEliteSpawn,
                spawnCount,
                MonsterManager.instance.goalvoes.size,
                Math.floor(this.battleElapsed),
                this.eliteDisplayName,
            );
        }
    }

    private updateDemandSurgeState() {
        if (this.demandSurgeInterval <= 0 || this.demandSurgeWaveScale <= 0) {
            return;
        }
        if (this.battleElapsed < this.demandSurgeNextTime) {
            return;
        }
        this.demandSurgeNextTime = this.battleElapsed + this.demandSurgeInterval;
        this.triggerDemandSurge();
    }

    private triggerDemandSurge() {
        this.statEventsTriggered += 1;
        const baseWave = this.getDynamicSpawnCount();
        const surgeWaveCount = Math.max(4, Math.floor(baseWave * this.demandSurgeWaveScale));
        director.getScene().emit(OnOrEmitConst.OnEliteCast, 'demandSurge', null, '需求轰炸', surgeWaveCount, this.demandSurgeRepeatDelay);
        this.randomSpawn(surgeWaveCount, false);

        const repeatCount = Math.max(0, Math.floor(this.demandSurgeRepeatCount));
        const repeatDelay = Math.max(0.25, this.demandSurgeRepeatDelay);
        for (let i = 1; i < repeatCount; i++) {
            const delay = repeatDelay * i;
            this.scheduleOnce(() => {
                if (!GameStateInput.canUpdateWorld()) {
                    return;
                }
                this.randomSpawn(Math.max(3, Math.floor(surgeWaveCount * 0.9)), false);
            }, delay);
        }
    }

    private reflashMaster() {
        this.randomSpawn(this.count, false);
    }

    private createConfiguredEnemy(
        spawnPos: Vec3,
        scale: number,
        baseHp: number,
        baseAttack: number,
        hpMultiplier: number = 1,
        attackMultiplier: number = 1,
        moveSpeedMultiplier: number = 1,
        runtimeMoveSpeedScale: number = 1,
    ): boolean {
        const node = MonsterManager.instance.createEnemy(spawnPos, scale);
        if (!node) {
            return false;
        }

        const monster = node.getComponent(Monster);
        if (!monster) {
            return false;
        }

        monster.monsterInit(baseHp, baseAttack, hpMultiplier, attackMultiplier, moveSpeedMultiplier);
        monster.runtimeMoveSpeedScale = Math.max(0.1, runtimeMoveSpeedScale);
        return true;
    }

    private spawnProjectReviewWave(monsterNum: number): number {
        let spawnCount = 0;
        const player = MonsterManager.instance.player;
        if (!player || !MonsterManager.instance.goalvoes) {
            return spawnCount;
        }

        const runtimeDifficulty = this.getRuntimeDifficultyScale();
        const reviewBaseHp = Math.max(0, this.baseHP * runtimeDifficulty + this.projectReviewBaseHpBonus);
        const reviewBaseAttack = Math.max(0, this.baseAttack * runtimeDifficulty + this.projectReviewBaseAttackBonus);
        const playerPosition = player.getWorldPosition();
        const centerAngle = randomRange(0, Math.PI * 2);
        const halfSpread = Math.PI * 0.42;

        for (let i = 0; i < monsterNum; i++) {
            if (MonsterManager.instance.goalvoes.size >= this.maxAlive) {
                break;
            }

            const ratio = monsterNum <= 1 ? 0.5 : i / (monsterNum - 1);
            const angle = centerAngle - halfSpread + ratio * halfSpread * 2 + randomRange(-0.08, 0.08);
            const radius = randomRange(this.projectReviewSpawnRadiusMin, this.projectReviewSpawnRadiusMax);
            this.spawnPos.set(
                playerPosition.x + Math.cos(angle) * radius,
                0,
                playerPosition.z + Math.sin(angle) * radius,
            );

            const created = this.createConfiguredEnemy(
                this.spawnPos,
                randomRange(1.08, 1.32),
                reviewBaseHp,
                reviewBaseAttack,
                1,
                1,
                1,
                this.projectReviewMoveSpeedScale,
            );
            if (created) {
                spawnCount += 1;
            }
        }

        return spawnCount;
    }

    private spawnIncidentWave(monsterNum: number): number {
        let spawnCount = 0;
        const player = MonsterManager.instance.player;
        if (!player || !MonsterManager.instance.goalvoes) {
            return spawnCount;
        }

        const runtimeDifficulty = this.getRuntimeDifficultyScale();
        const incidentBaseHp = Math.max(0, this.baseHP * runtimeDifficulty + this.incidentBaseHpBonus);
        const incidentBaseAttack = Math.max(0, this.baseAttack * runtimeDifficulty + this.incidentBaseAttackBonus);
        const playerPosition = player.getWorldPosition();
        const laneAngle = randomRange(0, Math.PI * 2);
        const sideAngle = laneAngle + Math.PI * 0.5;
        const laneWidth = Math.max(2.4, monsterNum * 1.1);

        for (let i = 0; i < monsterNum; i++) {
            if (MonsterManager.instance.goalvoes.size >= this.maxAlive) {
                break;
            }

            const ratio = monsterNum <= 1 ? 0.5 : i / (monsterNum - 1);
            const lateralOffset = (ratio - 0.5) * laneWidth + randomRange(-0.35, 0.35);
            const depth = randomRange(this.incidentSpawnRadiusMin, this.incidentSpawnRadiusMax);
            this.spawnPos.set(
                playerPosition.x + Math.cos(laneAngle) * depth + Math.cos(sideAngle) * lateralOffset,
                0,
                playerPosition.z + Math.sin(laneAngle) * depth + Math.sin(sideAngle) * lateralOffset,
            );

            const created = this.createConfiguredEnemy(
                this.spawnPos,
                randomRange(0.92, 1.14),
                incidentBaseHp,
                incidentBaseAttack,
                1,
                1,
                1,
                this.incidentMoveSpeedScale,
            );
            if (created) {
                spawnCount += 1;
            }
        }

        return spawnCount;
    }

    private randomSpawn(monsterNum: number = 0, isElite: boolean = false): number {
        let spawnCount = 0;
        const player = MonsterManager.instance.player;
        if (!player || !MonsterManager.instance.goalvoes) {
            return spawnCount;
        }

        const runtimeDifficulty = this.getRuntimeDifficultyScale();
        const runtimeBaseHp = this.baseHP * runtimeDifficulty;
        const runtimeNormalBaseHp = Math.max(0, runtimeBaseHp - 1.15);
        const runtimeBaseAttack = this.baseAttack * runtimeDifficulty;
        const runtimeNormalBaseAttack = Math.max(0, runtimeBaseAttack - 0.12);

        for (let i = 0; i < monsterNum; i++) {
            if (MonsterManager.instance.goalvoes.size >= this.maxAlive) {
                break;
            }

            this.spawnPos.y = 0;
            let radiusMin = this.spawnRadiusMin;
            let radiusMax = this.spawnRadiusMax;
            if (!isElite && this.isScheduleRushActive()) {
                const rushScale = Math.max(0.25, this.scheduleRushSpawnRadiusScale);
                radiusMin = Math.max(4, radiusMin * rushScale);
                radiusMax = Math.max(radiusMin + 2, radiusMax * rushScale);
            }
            const radius = randomRange(radiusMin, radiusMax);
            const angle = randomRange(0, Math.PI * 2);
            this.spawnPos.x = player.getWorldPosition().x + Math.cos(angle) * radius;
            this.spawnPos.z = player.getWorldPosition().z + Math.sin(angle) * radius;

            const scale = isElite
                ? randomRange(this.eliteScaleMin, this.eliteScaleMax)
                : randomRange(1, 1.5);
            const created = isElite
                ? this.createConfiguredEnemy(
                    this.spawnPos,
                    scale,
                    runtimeBaseHp,
                    runtimeBaseAttack,
                    this.eliteHPMultiplier,
                    this.eliteAttackMultiplier,
                    this.eliteMoveSpeedMultiplier,
                )
                : this.createConfiguredEnemy(this.spawnPos, scale, runtimeNormalBaseHp, runtimeNormalBaseAttack);
            if (!created) {
                continue;
            }

            spawnCount += 1;
        }

        return spawnCount;
    }

    private updateBossSpawnState() {
        if (this.bossSpawned) {
            return;
        }
        if (!this.bossType || this.bossType.length <= 0) {
            return;
        }

        const remain = this.bossShowTime - this.battleElapsed;
        if (!this.bossWarning30Sent && remain <= 30 && remain > 10) {
            this.bossWarning30Sent = true;
            director.getScene().emit(OnOrEmitConst.OnBossWarning, Math.ceil(remain), this.bossDisplayName);
        }
        if (!this.bossWarning10Sent && remain <= 10 && remain > 0) {
            this.bossWarning10Sent = true;
            director.getScene().emit(OnOrEmitConst.OnBossWarning, Math.ceil(remain), this.bossDisplayName);
        }
        if (remain <= 0) {
            this.trySpawnBoss();
        }
    }

    private trySpawnBoss() {
        const player = MonsterManager.instance.player;
        if (!player) {
            return;
        }

        this.spawnPos.y = 0;
        const angle = randomRange(0, Math.PI * 2);
        this.spawnPos.x = player.getWorldPosition().x + Math.cos(angle) * this.bossSpawnRadius;
        this.spawnPos.z = player.getWorldPosition().z + Math.sin(angle) * this.bossSpawnRadius;

        const bossNode = MonsterManager.instance.createBoss(this.spawnPos, this.bossScale);
        if (!bossNode) {
            return;
        }

        const monster = bossNode.getComponent(Monster);
        const runtimeDifficulty = this.getRuntimeDifficultyScale();
        if (monster) {
            monster.monsterInit(
                this.baseHP * runtimeDifficulty,
                this.baseAttack * runtimeDifficulty,
                this.bossHPMultiplier,
                this.bossAttackMultiplier,
                this.bossMoveSpeedMultiplier,
                true,
            );
        }

        this.bossSpawned = true;
        this.bossNode = bossNode;
        this.bossFinalStandTriggered = false;
        this.bossRushRemain = 0;
        this.bossNextRushTime = this.battleElapsed + 5;
        this.bossNextPieTime = this.battleElapsed + 8;

        director.getScene().emit(
            OnOrEmitConst.OnBossSpawn,
            this.bossDisplayName,
            Math.floor(this.battleElapsed),
            monster?.rungameInfo?.maxHp ?? 0,
        );
    }

    private onEliteKilled(_eliteKillCount: number, _expReward: number, _lootDesc: string, deathPos: Vec3) {
        this.statEliteKills += 1;
        if (!deathPos) {
            return;
        }
        this.spawnLegacyBugSwarm(deathPos);
    }

    private spawnLegacyBugSwarm(centerPos: Vec3) {
        const count = Math.max(
            this.eliteSplitCountMin,
            Math.floor(randomRange(this.eliteSplitCountMin, this.eliteSplitCountMax + 1)),
        );

        for (let i = 0; i < count; i++) {
            if (MonsterManager.instance.goalvoes.size >= this.maxAlive) {
                break;
            }

            const radius = randomRange(1.4, 3.2);
            const angle = randomRange(0, Math.PI * 2);
            this.spawnPos.set(
                centerPos.x + Math.cos(angle) * radius,
                0,
                centerPos.z + Math.sin(angle) * radius,
            );

            const splitNode = MonsterManager.instance.createEnemy(this.spawnPos, randomRange(0.9, 1.15));
            const splitMonster = splitNode?.getComponent(Monster);
            if (!splitMonster) {
                continue;
            }

            const runtimeDifficulty = this.getRuntimeDifficultyScale();
            splitMonster.monsterInit(
                this.baseHP * runtimeDifficulty * 0.65,
                this.baseAttack * runtimeDifficulty * 0.65,
            );
        }
    }

    private updateBossEvent(deltaTime: number) {
        if (!this.bossSpawned) {
            return;
        }

        if (!this.bossNode || !this.bossNode.isValid || !this.bossNode.activeInHierarchy) {
            this.applyBossRushScale(1);
            return;
        }

        if (this.battleElapsed >= this.bossNextRushTime) {
            this.bossNextRushTime = this.battleElapsed + this.bossRushInterval;
            this.triggerBossVisionRush();
        }

        if (this.battleElapsed >= this.bossNextPieTime) {
            this.bossNextPieTime = this.battleElapsed + this.bossPieInterval;
            this.triggerBossPieTrap();
        }

        if (!this.bossFinalStandTriggered) {
            const boss = this.bossNode.getComponent(Monster);
            if (boss && boss.rungameInfo.maxHp > 0) {
                const hpRate = boss.rungameInfo.Hp / boss.rungameInfo.maxHp;
                if (hpRate <= 0.3) {
                    this.bossFinalStandTriggered = true;
                    this.triggerBossFinalStand();
                }
            }
        }

        if (this.bossRushRemain > 0) {
            this.bossRushRemain -= deltaTime;
            if (this.bossRushRemain <= 0) {
                this.bossRushRemain = 0;
                this.applyBossRushScale(1);
            } else {
                this.applyBossRushScale(this.bossRushSpeedScale);
            }
        }

        this.updateBossPieTraps();
    }

    private triggerBossVisionRush() {
        this.bossRushRemain = this.bossRushDuration;
        this.applyBossRushScale(this.bossRushSpeedScale);
        director.getScene().emit(OnOrEmitConst.OnEliteCast, 'bossRush', this.bossNode?.worldPosition);
    }

    private applyBossRushScale(scale: number) {
        const entries = MonsterManager.instance.goalvoes;
        if (!entries) {
            return;
        }

        const fixedScale = Math.max(1, scale);
        for (const goalId of entries.keys()) {
            const entry = entries.get(goalId);
            const monster = entry?.mSphere?.getComponent(Monster);
            if (!monster) {
                continue;
            }
            monster.runtimeMoveSpeedScale = fixedScale;
        }
    }

    private triggerBossPieTrap() {
        const player = MonsterManager.instance.player;
        if (!player) {
            return;
        }

        const pieCount = Math.max(1, Math.floor(this.bossPieCount));
        for (let i = 0; i < pieCount; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const radius = randomRange(this.bossPieSpawnRadiusMin, this.bossPieSpawnRadiusMax);
            const trapNode = new Node('BossPieTrap');
            trapNode.parent = director.getScene();

            trapNode.setWorldPosition(
                player.worldPosition.x + Math.cos(angle) * radius,
                0,
                player.worldPosition.z + Math.sin(angle) * radius,
            );

            this.bossPieTraps.push({
                node: trapNode,
                expireAt: this.battleElapsed + this.bossPieDuration,
                radius: this.bossPieRadius,
            });

            EffectManager.instance.findEffectNode(EffectConst.EffDie, trapNode.worldPosition);
        }

        director.getScene().emit(OnOrEmitConst.OnEliteCast, 'pie', player.worldPosition);
    }

    private updateBossPieTraps() {
        if (this.bossPieTraps.length <= 0) {
            return;
        }

        const player = MonsterManager.instance.player;
        if (!player || !player.isValid) {
            this.clearBossPieTraps();
            return;
        }

        const playerTs = player.getComponent(PlayerTs);
        if (!playerTs) {
            return;
        }

        for (let i = this.bossPieTraps.length - 1; i >= 0; i--) {
            const trap = this.bossPieTraps[i];
            if (!trap.node || !trap.node.isValid) {
                this.bossPieTraps.splice(i, 1);
                continue;
            }

            if (this.battleElapsed >= trap.expireAt) {
                EffectManager.instance.findEffectNode(EffectConst.EffDie, trap.node.worldPosition);
                trap.node.destroy();
                this.bossPieTraps.splice(i, 1);
                continue;
            }

            const distance = Vec3.distance(trap.node.worldPosition, player.worldPosition);
            if (distance <= trap.radius) {
                playerTs.applyMaintenanceBurden(
                    this.bossPieDebuffScale,
                    this.bossPieDebuffDuration,
                    '老板的大饼',
                );
                director.getScene().emit(OnOrEmitConst.OnEliteCast, 'pieHit', player.worldPosition);
                EffectManager.instance.findEffectNode(EffectConst.EffDie, trap.node.worldPosition);
                trap.node.destroy();
                this.bossPieTraps.splice(i, 1);
            }
        }
    }

    private triggerBossFinalStand() {
        const scale = Math.max(0.1, this.bossFinalStandWaveScale);
        const waveCount = Math.max(6, Math.floor(this.count * scale));
        this.randomSpawn(waveCount, false);
        this.scheduleOnce(() => {
            if (GameStateInput.canUpdateWorld()) {
                this.randomSpawn(waveCount, false);
            }
        }, 1.2);
        director.getScene().emit(OnOrEmitConst.OnEliteCast, 'finalStand', this.bossNode?.worldPosition);
    }

    private onBossKilled() {
        this.statBossKills += 1;
        this.applyBossRushScale(1);
        this.clearBossPieTraps();
        this.bossNode = null;
    }

    /** 获取本局战斗统计数据，用于结算页展示 */
    public getBattleStats(): {
        elapsed: number;
        totalKills: number;
        eliteKills: number;
        bossKills: number;
        maxLevel: number;
        eventsTriggered: number;
    } {
        const playerLevel = this.getPlayerLevel();
        if (playerLevel > this.statMaxLevel) {
            this.statMaxLevel = playerLevel;
        }
        // 从 PlayerTs 获取击杀数据（更准确）
        const playerTs = MonsterManager.instance.player?.getComponent(PlayerTs);
        const totalKills = playerTs?.getTotalKills() ?? (this.statEliteKills + this.statBossKills);
        return {
            elapsed: Math.floor(this.battleElapsed),
            totalKills,
            eliteKills: this.statEliteKills,
            bossKills: this.statBossKills,
            maxLevel: this.statMaxLevel,
            eventsTriggered: this.statEventsTriggered,
        };
    }

    private clearBossPieTraps() {
        for (const trap of this.bossPieTraps) {
            if (trap.node && trap.node.isValid) {
                trap.node.destroy();
            }
        }
        this.bossPieTraps.length = 0;
    }

    // ==================== 掉落物系统 ====================

    private onNormalKill(deathPos: Vec3) {
        if (!deathPos) {
            return;
        }
        // 咖啡掉落判定
        if (Math.random() < this.dropCoffeeChance) {
            this.spawnDropItem('coffee', deathPos);
        }
        // 能量饮料掉落判定
        else if (Math.random() < this.dropEnergyDrinkChance) {
            this.spawnDropItem('energyDrink', deathPos);
        }
    }

    private spawnDropItem(type: DropItemType, worldPos: Vec3) {
        const scene = director.getScene();
        if (!scene) {
            return;
        }
        const dropNode = new Node(`Drop_${type}`);
        scene.addChild(dropNode);
        const spawnPos = v3(worldPos.x, worldPos.y + 0.5, worldPos.z);
        dropNode.setWorldPosition(spawnPos);
        EffectManager.instance.findEffectNode(EffectConst.EffDie, spawnPos);
        this.dropItems.push({
            node: dropNode,
            type,
            bornTime: game.totalTime,
            lifeTime: this.dropLifeTime,
            collectRadius: this.dropCollectRadius,
            magnetRadius: this.dropMagnetRadius,
            baseY: spawnPos.y,
        });
    }

    private updateDropItems(deltaTime: number) {
        if (this.dropItems.length <= 0) {
            return;
        }
        const player = MonsterManager.instance.player;
        if (!player || !player.isValid) {
            this.clearDropItems();
            return;
        }
        const playerPos = player.getWorldPosition();
        const tempPos = v3();

        for (let i = this.dropItems.length - 1; i >= 0; i--) {
            const drop = this.dropItems[i];
            if (!drop.node || !drop.node.isValid) {
                this.dropItems.splice(i, 1);
                continue;
            }
            const life = game.totalTime - drop.bornTime;
            if (life > drop.lifeTime) {
                drop.node.destroy();
                this.dropItems.splice(i, 1);
                continue;
            }

            drop.node.getWorldPosition(tempPos);
            // 浮动动画
            tempPos.y = drop.baseY + Math.sin(life * 3.5) * 0.12;
            drop.node.setWorldPosition(tempPos);

            const distance = Vec3.distance(tempPos, playerPos);
            // 拾取
            if (distance <= drop.collectRadius) {
                this.collectDropItem(i);
                continue;
            }
            // 磁吸
            if (distance <= drop.magnetRadius) {
                const step = Math.max(2.8, 7 - distance) * deltaTime;
                const dir = v3();
                Vec3.subtract(dir, playerPos, tempPos);
                dir.normalize();
                Vec3.scaleAndAdd(tempPos, tempPos, dir, step);
                drop.node.setWorldPosition(tempPos);
            }
        }
    }

    private collectDropItem(index: number) {
        const drop = this.dropItems[index];
        if (!drop) {
            return;
        }
        const playerTs = MonsterManager.instance.player?.getComponent(PlayerTs);
        if (!playerTs) {
            return;
        }

        switch (drop.type) {
        case 'coffee': {
            const maxHp = playerTs['actor']?.rungameInfo?.maxHp ?? 100;
            const healAmount = Math.max(5, Math.floor(maxHp * this.dropCoffeeHealPercent));
            playerTs.heal(healAmount);
            director.getScene().emit(OnOrEmitConst.OnDropCollected, 'coffee', `咖啡续命：回复 ${healAmount} 生命`);
            break;
        }
        case 'energyDrink': {
            this.addPlayerBuff('energyDrink', this.dropEnergyDrinkDuration, this.dropEnergyDrinkAtkSpeedScale);
            director.getScene().emit(OnOrEmitConst.OnDropCollected, 'energyDrink', `能量饮料：攻速提升 ${this.dropEnergyDrinkDuration} 秒`);
            break;
        }
        }

        if (drop.node && drop.node.isValid) {
            EffectManager.instance.findEffectNode(EffectConst.EffDie, drop.node.worldPosition);
            drop.node.destroy();
        }
        this.dropItems.splice(index, 1);
    }

    private clearDropItems() {
        for (const drop of this.dropItems) {
            if (drop.node && drop.node.isValid) {
                drop.node.destroy();
            }
        }
        this.dropItems.length = 0;
    }

    // ==================== 玩家临时 Buff ====================

    private addPlayerBuff(type: string, duration: number, scale: number) {
        // 同类型 Buff 刷新而不叠加
        const existing = this.playerBuffs.find((b) => b.type === type);
        if (existing) {
            existing.remainTime = Math.max(existing.remainTime, duration);
            existing.scale = scale;
            return;
        }
        this.playerBuffs.push({ type, remainTime: duration, scale });
        this.applyBuffEffect(type, scale, true);
        director.getScene().emit(OnOrEmitConst.OnBuffGained, type, duration, scale);
    }

    private updatePlayerBuffs(deltaTime: number) {
        for (let i = this.playerBuffs.length - 1; i >= 0; i--) {
            const buff = this.playerBuffs[i];
            buff.remainTime -= deltaTime;
            if (buff.remainTime <= 0) {
                this.applyBuffEffect(buff.type, buff.scale, false);
                this.playerBuffs.splice(i, 1);
            }
        }
    }

    private applyBuffEffect(type: string, scale: number, isApply: boolean) {
        const playerTs = MonsterManager.instance.player?.getComponent(PlayerTs);
        if (!playerTs) {
            return;
        }
        switch (type) {
        case 'energyDrink':
            // 攻击间隔乘以 scale（0.7 = 加速 30%），移除时恢复
            if (isApply) {
                playerTs.changeAttackInterval(-(1 - scale) * 0.3);
            } else {
                playerTs.changeAttackInterval((1 - scale) * 0.3);
            }
            break;
        case 'techShareAtk':
            if (isApply) {
                playerTs.changeAttack(12);
                playerTs.changeMoveSpeed(0.8);
            } else {
                playerTs.changeAttack(-12);
                playerTs.changeMoveSpeed(-0.8);
            }
            break;
        }
    }

    // ==================== 技术分享会事件 ====================

    private updateTechShareState() {
        if (this.techShareInterval <= 0) {
            return;
        }
        if (this.battleElapsed < this.techShareNextTime) {
            return;
        }
        this.techShareNextTime = this.battleElapsed + this.techShareInterval;
        this.triggerTechShare();
    }

    private triggerTechShare() {
        this.statEventsTriggered += 1;
        const player = MonsterManager.instance.player;
        if (!player) {
            return;
        }
        const playerPos = player.getWorldPosition();
        const scene = director.getScene();
        if (!scene) {
            return;
        }

        // 在玩家周围生成知识点拾取物
        for (let i = 0; i < this.techSharePickupCount; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const radius = randomRange(4, this.techSharePickupRadius);
            const pickupNode = new Node(`TechSharePickup_${i}`);
            scene.addChild(pickupNode);
            const spawnPos = v3(
                playerPos.x + Math.cos(angle) * radius,
                0.5,
                playerPos.z + Math.sin(angle) * radius,
            );
            pickupNode.setWorldPosition(spawnPos);
            EffectManager.instance.findEffectNode(EffectConst.EffDie, spawnPos);
            this.techSharePickups.push({
                node: pickupNode,
                type: 'coffee', // 复用类型字段，实际效果不同
                bornTime: game.totalTime,
                lifeTime: 20,
                collectRadius: 2.0,
                magnetRadius: 6.0,
                baseY: 0.5,
            });
        }

        director.getScene().emit(
            OnOrEmitConst.OnEliteCast,
            'techShare',
            null,
            '技术分享会',
            this.techSharePickupCount,
            this.techShareBuffDuration,
        );
    }

    private updateTechSharePickups() {
        // 在 updateDropItems 之后调用，复用类似逻辑
        if (this.techSharePickups.length <= 0) {
            return;
        }
        const player = MonsterManager.instance.player;
        if (!player || !player.isValid) {
            this.clearTechSharePickups();
            return;
        }
        const playerPos = player.getWorldPosition();
        const tempPos = v3();

        for (let i = this.techSharePickups.length - 1; i >= 0; i--) {
            const pickup = this.techSharePickups[i];
            if (!pickup.node || !pickup.node.isValid) {
                this.techSharePickups.splice(i, 1);
                continue;
            }
            const life = game.totalTime - pickup.bornTime;
            if (life > pickup.lifeTime) {
                pickup.node.destroy();
                this.techSharePickups.splice(i, 1);
                continue;
            }

            pickup.node.getWorldPosition(tempPos);
            tempPos.y = pickup.baseY + Math.sin(life * 4.5) * 0.2;
            pickup.node.setWorldPosition(tempPos);

            const distance = Vec3.distance(tempPos, playerPos);
            if (distance <= pickup.collectRadius) {
                this.collectTechSharePickup(i);
                continue;
            }
            if (distance <= pickup.magnetRadius) {
                const step = Math.max(3, 8 - distance) * 0.016;
                const dir = v3();
                Vec3.subtract(dir, playerPos, tempPos);
                dir.normalize();
                Vec3.scaleAndAdd(tempPos, tempPos, dir, step);
                pickup.node.setWorldPosition(tempPos);
            }
        }
    }

    private collectTechSharePickup(index: number) {
        const pickup = this.techSharePickups[index];
        if (!pickup) {
            return;
        }
        this.addPlayerBuff('techShareAtk', this.techShareBuffDuration, 1);
        director.getScene().emit(OnOrEmitConst.OnDropCollected, 'techShare', `知识充能：攻击和移速提升 ${this.techShareBuffDuration} 秒`);
        if (pickup.node && pickup.node.isValid) {
            EffectManager.instance.findEffectNode(EffectConst.EffDie, pickup.node.worldPosition);
            pickup.node.destroy();
        }
        this.techSharePickups.splice(index, 1);
    }

    private clearTechSharePickups() {
        for (const pickup of this.techSharePickups) {
            if (pickup.node && pickup.node.isValid) {
                pickup.node.destroy();
            }
        }
        this.techSharePickups.length = 0;
    }
}
