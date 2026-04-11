import { _decorator, Camera, CCInteger, Component, director, find, game, instantiate, macro, MotionStreak, Node, Prefab, randomRange, v3, Vec3 } from 'cc';
import { GameStateEnum } from '../../const/GameStateEnum';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { LevelConfig } from '../../const/LevelConfig';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { EffectConst } from '../../const/EffectConst';
import { GameMapManager } from '../../managerGame/GameMapManager';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { PlayerTs } from './PlayerTs';
import { EffectManager } from '../../managerGame/EffectManager';
import { Simulator } from '../../utils/RVO/Simulator';
import { Vector2 } from '../../utils/RVO/Common';
import { Monster } from '../../managerGame/Monster';
import { PoolManager } from '../../utils/PoolManager';
const { ccclass, property } = _decorator;
type PieTrapInfo = {
    node: Node;
    expireAt: number;
    radius: number;
};

@ccclass('level')
export class level extends Component {
    @property(Prefab)
    private playerPrefab: Prefab = null;

    //鍦板浘鍒锋柊闂撮殧
    private refashMap: number = 0.0;

    // 鎬墿琛€閲忓睘鎬у寮?
    baseHP: number = 1.0;
    // 鎬墿浼ゅ灞炴€у寮?
    baseAttack: number = 1.0;

    // 涓€娆℃€х敓鎴愭晫浜烘暟閲?
    @property(CCInteger)
    count: number = 10;

    // 鏈€澶氭晫浜哄瓨娲绘暟閲?    @property(CCInteger)
    maxAlive: number = 100;

    // 鍦板浘鍒锋柊闂撮殧
    private mapRefreshInterval: number = 0.5;
    private spawnTimer: number = 0;
    private spawnIntervalFloor: number = 0.85;
    private spawnIntervalLevelDecay: number = 0.04;
    private spawnIntervalTimeDecayRate: number = 0.055;
    private spawnCountLevelBonusRate: number = 0.35;

    // 鍒锋€棿闅?    private spawnInterval: number = 10;

    // 鍒锋€渶灏忓崐寰?    private spawnRadiusMin: number = 10;

    // 鍒锋€渶澶у崐寰?    private spawnRadiusMax: number = 50;

    // 闅惧害鎴愰暱闂撮殧
    private difficultyInterval: number = 30;

    // 闅惧害鎴愰暱鍙傛暟
    private hpGrowthPerTick: number = 0.2;
    private attackGrowthPerTick: number = 0.1;
    private spawnCountGrowthPerTick: number = 2;

    // 绮捐嫳鍒锋€弬鏁?    private eliteUnlockTime: number = 60;
    private eliteSpawnInterval: number = 45;
    private eliteSpawnCount: number = 1;
    private eliteScaleMin: number = 1.35;
    private eliteScaleMax: number = 1.8;
    private eliteHPMultiplier: number = 2.8;
    private eliteAttackMultiplier: number = 1.6;
    private eliteMoveSpeedMultiplier: number = 1.1;
    private eliteDisplayName: string = "浠ｇ爜灞庡北";
    private eliteSplitCountMin: number = 2;
    private eliteSplitCountMax: number = 3;

    // 鎴樻枟杩涜鏃堕暱锛堜粎鍦?Running 绱姞锛?    private battleElapsed: number = 0;

    // Boss 鍒锋柊鍙傛暟
    private bossType: string = "";
    private bossDisplayName: string = "老板的大饼";
    private bossShowTime: number = 300;
    private bossScale: number = 2.3;
    private bossHPMultiplier: number = 7.5;
    private bossAttackMultiplier: number = 2.8;
    private bossMoveSpeedMultiplier: number = 1.15;
    private bossSpawnRadius: number = 24;
    private bossSpawned: boolean = false;
    private bossWarning30Sent: boolean = false;
    private bossWarning10Sent: boolean = false;
    private bossNode: Node = null;
    private bossFinalStandTriggered: boolean = false;
    private bossRushRemain: number = 0;
    private bossRushDuration: number = 4.2;
    private bossRushInterval: number = 13;
    private bossRushSpeedScale: number = 1.35;
    private bossNextRushTime: number = 0;
    private bossPieInterval: number = 11;
    private bossPieDuration: number = 8.5;
    private bossPieCount: number = 3;
    private bossPieRadius: number = 1.8;
    private bossPieDebuffScale: number = 1.4;
    private bossPieDebuffDuration: number = 3.2;
    private bossPieSpawnRadiusMin: number = 3.5;
    private bossPieSpawnRadiusMax: number = 8.5;
    private bossFinalStandWaveScale: number = 0.6;
    private bossNextPieTime: number = 0;
    private bossPieTraps: PieTrapInfo[] = [];

    // 鏁屼汉鍑虹幇鐨勫垵濮嬩綅缃紝閬垮厤涓€鐩村垱寤烘殏鐢ㄥ唴瀛橈紝閲嶅浣跨敤璇ュ€?
    spawnPos: Vec3 = v3();

    start() {
        MonsterManager.instance.player =  instantiate(this.playerPrefab);
        MonsterManager.instance.player.parent = director.getScene();
        MonsterManager.instance.player.active = true;

        Simulator.instance.setAgentDefaults(10, 4, 1, 0.1, 0.5, 15, new Vector2(0, 0));
        // 鍔犺浇娓告垙
        GameStateInput.setGameState(GameStateEnum.Loading);
        // 鍔犺浇鍦板浘
        // 鍔犺浇鐗规晥
        EffectManager.instance.init();
        let level = LevelConfig.getLevel();
        MonsterManager.instance.player.getComponent(PlayerTs)?.applyLevelConfig(level);
        this.count = level.SpawnCount ?? this.count;
        this.maxAlive = level.MaxAlive ?? this.maxAlive;
        this.spawnInterval = level.SpawnInterval ?? this.spawnInterval;
        this.spawnRadiusMin = level.SpawnRadiusMin ?? this.spawnRadiusMin;
        this.spawnRadiusMax = level.SpawnRadiusMax ?? this.spawnRadiusMax;
        this.mapRefreshInterval = level.MapRefreshInterval ?? this.mapRefreshInterval;
        this.difficultyInterval = level.DifficultyInterval ?? this.difficultyInterval;
        this.hpGrowthPerTick = level.HPGrowthPerTick ?? this.hpGrowthPerTick;
        this.attackGrowthPerTick = level.AttackGrowthPerTick ?? this.attackGrowthPerTick;
        this.spawnCountGrowthPerTick = level.SpawnCountGrowthPerTick ?? this.spawnCountGrowthPerTick;
        this.spawnIntervalFloor = level.SpawnIntervalFloor ?? this.spawnIntervalFloor;
        this.spawnIntervalLevelDecay = level.SpawnIntervalLevelDecay ?? this.spawnIntervalLevelDecay;
        this.spawnIntervalTimeDecayRate = level.SpawnIntervalTimeDecayRate ?? this.spawnIntervalTimeDecayRate;
        this.spawnCountLevelBonusRate = level.SpawnCountLevelBonusRate ?? this.spawnCountLevelBonusRate;
        this.eliteUnlockTime = level.EliteUnlockTime ?? this.eliteUnlockTime;
        this.eliteSpawnInterval = level.EliteSpawnInterval ?? this.eliteSpawnInterval;
        this.eliteSpawnCount = level.EliteSpawnCount ?? this.eliteSpawnCount;
        this.eliteScaleMin = level.EliteScaleMin ?? this.eliteScaleMin;
        this.eliteScaleMax = level.EliteScaleMax ?? this.eliteScaleMax;
        this.eliteHPMultiplier = level.EliteHPMultiplier ?? this.eliteHPMultiplier;
        this.eliteAttackMultiplier = level.EliteAttackMultiplier ?? this.eliteAttackMultiplier;
        this.eliteMoveSpeedMultiplier = level.EliteMoveSpeedMultiplier ?? this.eliteMoveSpeedMultiplier;
        this.eliteDisplayName = level.EliteDisplayName ?? this.eliteDisplayName;
        this.bossType = level.BossType ?? this.bossType;
        this.bossDisplayName = level.BossDisplayName ?? this.bossDisplayName;
        this.bossShowTime = level.BossShowTIme ?? this.bossShowTime;
        this.bossScale = level.BossScale ?? this.bossScale;
        this.bossHPMultiplier = level.BossHPMultiplier ?? this.bossHPMultiplier;
        this.bossAttackMultiplier = level.BossAttackMultiplier ?? this.bossAttackMultiplier;
        this.bossMoveSpeedMultiplier = level.BossMoveSpeedMultiplier ?? this.bossMoveSpeedMultiplier;
        this.bossSpawnRadius = level.BossSpawnRadius ?? this.bossSpawnRadius;
        this.bossRushInterval = level.BossRushInterval ?? this.bossRushInterval;
        this.bossRushDuration = level.BossRushDuration ?? this.bossRushDuration;
        this.bossRushSpeedScale = level.BossRushSpeedScale ?? this.bossRushSpeedScale;
        this.bossPieInterval = level.BossPieInterval ?? this.bossPieInterval;
        this.bossPieDuration = level.BossPieDuration ?? this.bossPieDuration;
        this.bossPieCount = level.BossPieCount ?? this.bossPieCount;
        this.bossPieRadius = level.BossPieRadius ?? this.bossPieRadius;
        this.bossPieDebuffScale = level.BossPieDebuffScale ?? this.bossPieDebuffScale;
        this.bossPieDebuffDuration = level.BossPieDebuffDuration ?? this.bossPieDebuffDuration;
        this.bossPieSpawnRadiusMin = level.BossPieSpawnRadiusMin ?? this.bossPieSpawnRadiusMin;
        this.bossPieSpawnRadiusMax = level.BossPieSpawnRadiusMax ?? this.bossPieSpawnRadiusMax;
        this.bossFinalStandWaveScale = level.BossFinalStandWaveScale ?? this.bossFinalStandWaveScale;
        if (this.bossPieSpawnRadiusMin > this.bossPieSpawnRadiusMax){
            const temp = this.bossPieSpawnRadiusMin;
            this.bossPieSpawnRadiusMin = this.bossPieSpawnRadiusMax;
            this.bossPieSpawnRadiusMax = temp;
        }
        this.bossSpawned = false;
        this.bossWarning30Sent = false;
        this.bossWarning10Sent = false;
        this.bossNode = null;
        this.bossFinalStandTriggered = false;
        this.bossRushRemain = 0;
        this.bossNextRushTime = 0;
        this.bossNextPieTime = 0;
        this.clearBossPieTraps();

        GameMapManager.instance.init(level.Map, () => {
            MonsterManager.instance.init(() => {
                this.reflashMaster();
                GameStateInput.setGameState(GameStateEnum.Ready);
            });
        });


        // 普通刷怪由 update 内的动态计时器驱动，便于随时间和等级加速
        this.spawnTimer = Math.max(0.8, this.spawnInterval);

        if (this.eliteSpawnInterval > 0 && this.eliteSpawnCount > 0){
            this.schedule(()=>{
                if (!GameStateInput.canUpdateWorld()){
                    return;
                }
                if (MonsterManager.instance.goalvoes.size >= this.maxAlive){
                    return;
                }
                const spawnCount = this.randomSpawn(this.eliteSpawnCount, true);
                if (spawnCount > 0){
                    director.getScene().emit(
                        OnOrEmitConst.OnEliteSpawn,
                        spawnCount,
                        MonsterManager.instance.goalvoes.size,
                        Math.floor(this.battleElapsed),
                        this.eliteDisplayName,
                    );
                }
            }, this.eliteSpawnInterval, macro.REPEAT_FOREVER, this.eliteUnlockTime);
        }

        director.getScene().on(OnOrEmitConst.OnEliteKilled, this.onEliteKilled, this);
        director.getScene().on(OnOrEmitConst.OnBossKilled, this.onBossKilled, this);

        // 难度增强改为时间 + 等级双轴动态计算
    }

    // 閿€姣?
    onDestroy(){
        const scene = director.getScene();
        if (scene && scene.isValid){
            scene.off(OnOrEmitConst.OnEliteKilled, this.onEliteKilled, this);
            scene.off(OnOrEmitConst.OnBossKilled, this.onBossKilled, this);
        }
        this.clearBossPieTraps();
        MonsterManager.instance.destroy();
        EffectManager.instance.destroy();
        PoolManager.instance.clearAllNodes();
        // 閬块殰鍐呭娓呯┖
        Simulator.instance.clear();
        LevelConfig.startLevel = null;
    }

    update(deltaTime: number) {
        if (GameStateInput.isReady()){
            if (MonsterManager.instance.player != null){
                MonsterManager.instance.player.getComponent(PlayerTs).runGameInit();
                GameStateInput.setGameState(GameStateEnum.Running);
            }
        }

        if (GameStateInput.canUpdateWorld()){
            this.battleElapsed += deltaTime;
            this.updateDynamicSpawn(deltaTime);
            this.updateBossSpawnState();
            this.updateBossEvent(deltaTime);
            this.refashMap += deltaTime;
            if (this.refashMap > this.mapRefreshInterval){
                this.refashMap = 0;
                GameMapManager.instance.flashMap();
            }
            // 鏁屼汉绉诲姩
            MonsterManager.instance.setPreferredVelocities(deltaTime);
        }
    }

    private getPlayerLevel(): number{
        const player = MonsterManager.instance.player;
        if (!player){
            return 1;
        }
        const playerTs = player.getComponent(PlayerTs);
        return Math.max(1, playerTs?.getCurrentLevel() ?? 1);
    }

    private getDynamicSpawnInterval(): number{
        const level = this.getPlayerLevel();
        const tickProgress = this.difficultyInterval > 0
            ? this.battleElapsed / this.difficultyInterval
            : this.battleElapsed / 30;
        const intervalDecayByTime = tickProgress * this.spawnIntervalTimeDecayRate;
        const intervalDecayByLevel = Math.max(0, level - 1) * this.spawnIntervalLevelDecay;
        return Math.max(this.spawnIntervalFloor, this.spawnInterval - intervalDecayByTime - intervalDecayByLevel);
    }

    private getDynamicSpawnCount(): number{
        const level = this.getPlayerLevel();
        const tickProgress = this.difficultyInterval > 0
            ? this.battleElapsed / this.difficultyInterval
            : this.battleElapsed / 30;
        const timeBonus = Math.floor(tickProgress * Math.max(1, this.spawnCountGrowthPerTick));
        const levelBonus = Math.floor(Math.max(0, level - 1) * this.spawnCountLevelBonusRate);
        const waveCount = this.count + timeBonus + levelBonus;
        return Math.max(1, Math.min(this.maxAlive, waveCount));
    }

    private getRuntimeDifficultyScale(): number{
        const level = this.getPlayerLevel();
        const tickProgress = this.difficultyInterval > 0
            ? this.battleElapsed / this.difficultyInterval
            : this.battleElapsed / 30;
        const hpScale = 1 + tickProgress * this.hpGrowthPerTick + Math.max(0, level - 1) * Math.max(0.02, this.hpGrowthPerTick * 0.45);
        const attackScale = 1 + tickProgress * this.attackGrowthPerTick + Math.max(0, level - 1) * Math.max(0.015, this.attackGrowthPerTick * 0.42);
        return Math.max(1, (hpScale + attackScale) * 0.5);
    }

    private updateDynamicSpawn(deltaTime: number){
        this.spawnTimer -= deltaTime;
        if (this.spawnTimer > 0){
            return;
        }
        this.spawnTimer = this.getDynamicSpawnInterval();
        if (MonsterManager.instance.goalvoes.size >= this.maxAlive){
            return;
        }
        this.randomSpawn(this.getDynamicSpawnCount(), false);
    }

    // 关卡逻辑：初始化刷怪
    reflashMaster(){
        this.randomSpawn(this.count, false);
    }

    /**
     * 
     * @param monsterNum    鎬墿鏁伴噺
     * @param width         鍦板浘瀹藉害
     * @param height        鍦板浘闀垮害
     */
     randomSpawn(monsterNum: number = 0, isElite: boolean = false): number{
        let spawnCount = 0;
        const player = MonsterManager.instance.player;
        if (!player || !MonsterManager.instance.goalvoes){
            return spawnCount;
        }
        const runtimeDifficulty = this.getRuntimeDifficultyScale();
        const runtimeBaseHp = this.baseHP * runtimeDifficulty;
        const runtimeNormalBaseHp = Math.max(0, runtimeBaseHp - 1);
        const runtimeBaseAttack = this.baseAttack * runtimeDifficulty;
        for (let i = 0; i< monsterNum; i++){
            if (MonsterManager.instance.goalvoes.size >= this.maxAlive){
                break;
            }
            // TODO 鍏冲崱涓晫浜虹殑鐢熸垚閫昏緫 闅忔満浣嶇疆
            this.spawnPos.y = 0;
            const radius = randomRange(this.spawnRadiusMin, this.spawnRadiusMax);
            const angle = randomRange(0, Math.PI * 2);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            this.spawnPos.x = player.getWorldPosition().x + x;
            this.spawnPos.z = player.getWorldPosition().z + z;
            // 鎬墿绉嶇被灏戯紝浣跨敤澶у皬鍖哄垎
            const scale = isElite
                ? randomRange(this.eliteScaleMin, this.eliteScaleMax)
                : randomRange(1, 1.5);
            let node = MonsterManager.instance.createEnemy(this.spawnPos, scale);
            if (node){
                let monster = node.getComponent(Monster);
                if (monster){
                    if (isElite){
                        monster.monsterInit(
                            runtimeBaseHp,
                            runtimeBaseAttack,
                            this.eliteHPMultiplier,
                            this.eliteAttackMultiplier,
                            this.eliteMoveSpeedMultiplier,
                        );
                    } else {
                        // 普通小怪前期保持一枪可清，随后再随时间和等级逐步变硬
                        monster.monsterInit(runtimeNormalBaseHp, runtimeBaseAttack);
                    }
                }
                spawnCount += 1;
            }
        }
        return spawnCount;
    }

    private updateBossSpawnState(){
        if (this.bossSpawned){
            return;
        }
        if (!this.bossType || this.bossType.length <= 0){
            return;
        }
        const remain = this.bossShowTime - this.battleElapsed;
        if (!this.bossWarning30Sent && remain <= 30 && remain > 10){
            this.bossWarning30Sent = true;
            director.getScene().emit(OnOrEmitConst.OnBossWarning, Math.ceil(remain), this.bossDisplayName);
        }
        if (!this.bossWarning10Sent && remain <= 10 && remain > 0){
            this.bossWarning10Sent = true;
            director.getScene().emit(OnOrEmitConst.OnBossWarning, Math.ceil(remain), this.bossDisplayName);
        }
        if (remain <= 0){
            this.trySpawnBoss();
        }
    }

    private trySpawnBoss(){
        const player = MonsterManager.instance.player;
        if (!player){
            return;
        }
        this.spawnPos.y = 0;
        const angle = randomRange(0, Math.PI * 2);
        this.spawnPos.x = player.getWorldPosition().x + Math.cos(angle) * this.bossSpawnRadius;
        this.spawnPos.z = player.getWorldPosition().z + Math.sin(angle) * this.bossSpawnRadius;
        const bossNode = MonsterManager.instance.createBoss(this.spawnPos, this.bossScale);
        if (!bossNode){
            return;
        }
        const monster = bossNode.getComponent(Monster);
        const runtimeDifficulty = this.getRuntimeDifficultyScale();
        if (monster){
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

    private onEliteKilled(_eliteKillCount: number, _expReward: number, _lootDesc: string, deathPos: Vec3){
        if (!deathPos){
            return;
        }
        this.spawnLegacyBugSwarm(deathPos);
    }

    private spawnLegacyBugSwarm(centerPos: Vec3){
        const count = Math.max(
            this.eliteSplitCountMin,
            Math.floor(randomRange(this.eliteSplitCountMin, this.eliteSplitCountMax + 1)),
        );
        for (let i = 0; i < count; i++){
            if (MonsterManager.instance.goalvoes.size >= this.maxAlive){
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
            if (!splitMonster){
                continue;
            }
            const runtimeDifficulty = this.getRuntimeDifficultyScale();
            splitMonster.monsterInit(this.baseHP * runtimeDifficulty * 0.65, this.baseAttack * runtimeDifficulty * 0.65);
        }
    }

    private updateBossEvent(deltaTime: number){
        if (!this.bossSpawned){
            return;
        }

        if (!this.bossNode || !this.bossNode.isValid || !this.bossNode.activeInHierarchy){
            this.applyBossRushScale(1);
            return;
        }

        if (this.battleElapsed >= this.bossNextRushTime){
            this.bossNextRushTime = this.battleElapsed + this.bossRushInterval;
            this.triggerBossVisionRush();
        }

        if (this.battleElapsed >= this.bossNextPieTime){
            this.bossNextPieTime = this.battleElapsed + this.bossPieInterval;
            this.triggerBossPieTrap();
        }

        if (!this.bossFinalStandTriggered){
            const boss = this.bossNode.getComponent(Monster);
            if (boss && boss.rungameInfo.maxHp > 0){
                const hpRate = boss.rungameInfo.Hp / boss.rungameInfo.maxHp;
                if (hpRate <= 0.3){
                    this.bossFinalStandTriggered = true;
                    this.triggerBossFinalStand();
                }
            }
        }

        if (this.bossRushRemain > 0){
            this.bossRushRemain -= deltaTime;
            if (this.bossRushRemain <= 0){
                this.bossRushRemain = 0;
                this.applyBossRushScale(1);
            } else {
                this.applyBossRushScale(this.bossRushSpeedScale);
            }
        }

        this.updateBossPieTraps();
    }

    private triggerBossVisionRush(){
        this.bossRushRemain = this.bossRushDuration;
        this.applyBossRushScale(this.bossRushSpeedScale);
        director.getScene().emit(OnOrEmitConst.OnEliteCast, "bossRush", this.bossNode?.worldPosition);
    }

    private applyBossRushScale(scale: number){
        const entries = MonsterManager.instance.goalvoes;
        if (!entries){
            return;
        }
        const fixedScale = Math.max(1, scale);
        for (const goalId of entries.keys()){
            const one = entries.get(goalId);
            const monster = one?.mSphere?.getComponent(Monster);
            if (!monster){
                continue;
            }
            monster.runtimeMoveSpeedScale = fixedScale;
        }
    }

    private triggerBossPieTrap(){
        const player = MonsterManager.instance.player;
        if (!player){
            return;
        }
        const pieCount = Math.max(1, Math.floor(this.bossPieCount));
        for (let i = 0; i < pieCount; i++){
            const angle = randomRange(0, Math.PI * 2);
            const radius = randomRange(this.bossPieSpawnRadiusMin, this.bossPieSpawnRadiusMax);
            const trapNode = new Node("BossPieTrap");
            trapNode.parent = director.getScene();
            const expireAt = this.battleElapsed + this.bossPieDuration;
            const expireGameTime = game.totalTime + this.bossPieDuration;
            trapNode.setWorldPosition(
                player.worldPosition.x + Math.cos(angle) * radius,
                0,
                player.worldPosition.z + Math.sin(angle) * radius,
            );
            (trapNode as any).__pieExpireAt = expireAt;
            (trapNode as any).__pieExpireGameTime = expireGameTime;
            (trapNode as any).__pieRadius = this.bossPieRadius;
            (trapNode as any).__pieCreatedAt = this.battleElapsed;
            this.bossPieTraps.push({
                node: trapNode,
                expireAt: expireAt,
                radius: this.bossPieRadius,
            });
            EffectManager.instance.findEffectNode(EffectConst.EffDie, trapNode.worldPosition);
        }
        director.getScene().emit(OnOrEmitConst.OnEliteCast, "pie", player.worldPosition);
    }

    private updateBossPieTraps(){
        if (this.bossPieTraps.length <= 0){
            return;
        }
        const player = MonsterManager.instance.player;
        if (!player || !player.isValid){
            this.clearBossPieTraps();
            return;
        }
        const playerTs = player.getComponent(PlayerTs);
        if (!playerTs){
            return;
        }
        for (let i = this.bossPieTraps.length - 1; i >= 0; i--){
            const trap = this.bossPieTraps[i];
            if (!trap.node || !trap.node.isValid){
                this.bossPieTraps.splice(i, 1);
                continue;
            }
            if (this.battleElapsed >= trap.expireAt){
                EffectManager.instance.findEffectNode(EffectConst.EffDie, trap.node.worldPosition);
                trap.node.destroy();
                this.bossPieTraps.splice(i, 1);
                continue;
            }
            const distance = Vec3.distance(trap.node.worldPosition, player.worldPosition);
            if (distance <= trap.radius){
                playerTs.applyMaintenanceBurden(this.bossPieDebuffScale, this.bossPieDebuffDuration, "老板的大饼");
                director.getScene().emit(OnOrEmitConst.OnEliteCast, "pieHit", player.worldPosition);
                EffectManager.instance.findEffectNode(EffectConst.EffDie, trap.node.worldPosition);
                trap.node.destroy();
                this.bossPieTraps.splice(i, 1);
            }
        }
    }

    private triggerBossFinalStand(){
        const scale = Math.max(0.1, this.bossFinalStandWaveScale);
        const waveCount = Math.max(6, Math.floor(this.count * scale));
        this.randomSpawn(waveCount, false);
        this.scheduleOnce(()=>{
            if (GameStateInput.canUpdateWorld()){
                this.randomSpawn(waveCount, false);
            }
        }, 1.2);
        director.getScene().emit(OnOrEmitConst.OnEliteCast, "finalStand", this.bossNode?.worldPosition);
    }

    private onBossKilled(){
        this.applyBossRushScale(1);
        this.clearBossPieTraps();
        this.bossNode = null;
    }

    private clearBossPieTraps(){
        for (const trap of this.bossPieTraps){
            if (trap.node && trap.node.isValid){
                trap.node.destroy();
            }
        }
        this.bossPieTraps.length = 0;
    }
}



