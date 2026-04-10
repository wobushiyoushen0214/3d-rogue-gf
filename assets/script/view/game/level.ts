import { _decorator, Camera, CCInteger, Component, director, find, game, instantiate, macro, MotionStreak, Node, Prefab, randomRange, v3, Vec3 } from 'cc';
import { GameStateEnum } from '../../const/GameStateEnum';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { LevelConfig } from '../../const/LevelConfig';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { GameMapManager } from '../../managerGame/GameMapManager';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { PlayerTs } from './PlayerTs';
import { EffectManager } from '../../managerGame/EffectManager';
import { Simulator } from '../../utils/RVO/Simulator';
import { Vector2 } from '../../utils/RVO/Common';
import { Monster } from '../../managerGame/Monster';
import { PoolManager } from '../../utils/PoolManager';
const { ccclass, property } = _decorator;

@ccclass('level')
export class level extends Component {
    @property(Prefab)
    private playerPrefab: Prefab = null;

    //地图刷新间隔
    private refashMap: number = 0.0;

    // 怪物血量属性增强
    baseHP: number = 1.0;
    // 怪物伤害属性增强
    baseAttack: number = 1.0;

    // 一次性生成敌人数量
    @property(CCInteger)
    count: number = 10;

    // 最多敌人存活数量
    @property(CCInteger)
    maxAlive: number = 100;

    // 地图刷新间隔
    private mapRefreshInterval: number = 0.5;

    // 刷怪间隔
    private spawnInterval: number = 10;

    // 刷怪最小半径
    private spawnRadiusMin: number = 10;

    // 刷怪最大半径
    private spawnRadiusMax: number = 50;

    // 难度成长间隔
    private difficultyInterval: number = 30;

    // 难度成长参数
    private hpGrowthPerTick: number = 0.2;
    private attackGrowthPerTick: number = 0.1;
    private spawnCountGrowthPerTick: number = 2;

    // 精英刷怪参数
    private eliteUnlockTime: number = 60;
    private eliteSpawnInterval: number = 45;
    private eliteSpawnCount: number = 1;
    private eliteScaleMin: number = 1.35;
    private eliteScaleMax: number = 1.8;
    private eliteHPMultiplier: number = 2.8;
    private eliteAttackMultiplier: number = 1.6;
    private eliteMoveSpeedMultiplier: number = 1.1;

    // 战斗进行时长（仅在 Running 累加）
    private battleElapsed: number = 0;

    // Boss 刷新参数
    private bossType: string = "";
    private bossShowTime: number = 300;
    private bossScale: number = 2.3;
    private bossHPMultiplier: number = 7.5;
    private bossAttackMultiplier: number = 2.8;
    private bossMoveSpeedMultiplier: number = 1.15;
    private bossSpawnRadius: number = 24;
    private bossSpawned: boolean = false;
    private bossWarning30Sent: boolean = false;
    private bossWarning10Sent: boolean = false;

    // 敌人出现的初始位置，避免一直创建暂用内存，重复使用该值
    spawnPos: Vec3 = v3();

    start() {
        MonsterManager.instance.player =  instantiate(this.playerPrefab);
        MonsterManager.instance.player.parent = director.getScene();
        MonsterManager.instance.player.active = true;

        Simulator.instance.setAgentDefaults(10, 4, 1, 0.1, 0.5, 15, new Vector2(0, 0));
        // 加载游戏
        GameStateInput.setGameState(GameStateEnum.Loading);
        // 加载地图
        // 加载特效
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
        this.eliteUnlockTime = level.EliteUnlockTime ?? this.eliteUnlockTime;
        this.eliteSpawnInterval = level.EliteSpawnInterval ?? this.eliteSpawnInterval;
        this.eliteSpawnCount = level.EliteSpawnCount ?? this.eliteSpawnCount;
        this.eliteScaleMin = level.EliteScaleMin ?? this.eliteScaleMin;
        this.eliteScaleMax = level.EliteScaleMax ?? this.eliteScaleMax;
        this.eliteHPMultiplier = level.EliteHPMultiplier ?? this.eliteHPMultiplier;
        this.eliteAttackMultiplier = level.EliteAttackMultiplier ?? this.eliteAttackMultiplier;
        this.eliteMoveSpeedMultiplier = level.EliteMoveSpeedMultiplier ?? this.eliteMoveSpeedMultiplier;
        this.bossType = level.BossType ?? this.bossType;
        this.bossShowTime = level.BossShowTIme ?? this.bossShowTime;
        this.bossScale = level.BossScale ?? this.bossScale;
        this.bossHPMultiplier = level.BossHPMultiplier ?? this.bossHPMultiplier;
        this.bossAttackMultiplier = level.BossAttackMultiplier ?? this.bossAttackMultiplier;
        this.bossMoveSpeedMultiplier = level.BossMoveSpeedMultiplier ?? this.bossMoveSpeedMultiplier;
        this.bossSpawnRadius = level.BossSpawnRadius ?? this.bossSpawnRadius;
        this.bossSpawned = false;
        this.bossWarning30Sent = false;
        this.bossWarning10Sent = false;

        GameMapManager.instance.init(level.Map, () => {
            // 加载地图完成之后，加载敌人
            MonsterManager.instance.init(() =>{
                this.reflashMaster();
                GameStateInput.setGameState(GameStateEnum.Ready);
            });
        });


        // 2. 关卡逻辑（刷怪，数值向）
        this.schedule( ()=>{
            if (GameStateInput.canUpdateWorld()){
                console.log("开始创建敌人22：" + game.totalTime);

                if (MonsterManager.instance.goalvoes.size >= this.maxAlive){
                    return;
                }
                this.randomSpawn(this.count, false);

                console.log("创建完成：" + game.totalTime)
            }          
        }, this.spawnInterval, macro.REPEAT_FOREVER, 1.0);

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
                    );
                }
            }, this.eliteSpawnInterval, macro.REPEAT_FOREVER, this.eliteUnlockTime);
        }

        // 怪物增强计时器
        this.schedule(()=>{
            this.baseHP += this.hpGrowthPerTick;
            this.baseAttack += this.attackGrowthPerTick;
            this.count += this.spawnCountGrowthPerTick;
        }, this.difficultyInterval, macro.REPEAT_FOREVER, 0);
    }

    // 销毁
    onDestroy(){
        MonsterManager.instance.destroy();
        EffectManager.instance.destroy();
        PoolManager.instance.clearAllNodes();
        // 避障内容清空
        Simulator.instance.clear();
        LevelConfig.startLevel = null;
    }

    update(deltaTime: number) {
        if (GameStateInput.isReady()){
            // 加载游戏则监控是否加载完成
            if (MonsterManager.instance.player != null){
                // 初始化已经完成
                MonsterManager.instance.player.getComponent(PlayerTs).runGameInit();
                GameStateInput.setGameState(GameStateEnum.Running);
            }
        }

        if (GameStateInput.canUpdateWorld()){
            this.battleElapsed += deltaTime;
            this.updateBossSpawnState();
            this.refashMap += deltaTime;
            if (this.refashMap > this.mapRefreshInterval){
                this.refashMap = 0;
                GameMapManager.instance.flashMap();
            }
            // 敌人移动
            MonsterManager.instance.setPreferredVelocities(deltaTime);
        }
    }

    // 关卡逻辑 计时器刷怪（刷怪，数值向）
    reflashMaster(){
        // 将怪物放到地图中
        this.randomSpawn(this.count, false);
    }

    /**
     * 
     * @param monsterNum    怪物数量
     * @param width         地图宽度
     * @param height        地图长度
     */
     randomSpawn(monsterNum: number = 0, isElite: boolean = false): number{
        let spawnCount = 0;
        const player = MonsterManager.instance.player;
        if (!player || !MonsterManager.instance.goalvoes){
            return spawnCount;
        }
        for (let i = 0; i< monsterNum; i++){
            if (MonsterManager.instance.goalvoes.size >= this.maxAlive){
                break;
            }
            // TODO 关卡中敌人的生成逻辑 随机位置
            this.spawnPos.y = 0;
            const radius = randomRange(this.spawnRadiusMin, this.spawnRadiusMax);
            const angle = randomRange(0, Math.PI * 2);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            this.spawnPos.x = player.getWorldPosition().x + x;
            this.spawnPos.z = player.getWorldPosition().z + z;
            // 怪物种类少，使用大小区分
            const scale = isElite
                ? randomRange(this.eliteScaleMin, this.eliteScaleMax)
                : randomRange(1, 1.5);
            let node = MonsterManager.instance.createEnemy(this.spawnPos, scale);
            if (node){
                let monster = node.getComponent(Monster);
                // 初始化参数
                if (monster){
                    if (isElite){
                        monster.monsterInit(
                            this.baseHP,
                            this.baseAttack,
                            this.eliteHPMultiplier,
                            this.eliteAttackMultiplier,
                            this.eliteMoveSpeedMultiplier,
                        );
                    } else {
                        monster.monsterInit(this.baseHP, this.baseAttack);
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
            director.getScene().emit(OnOrEmitConst.OnBossWarning, Math.ceil(remain));
        }
        if (!this.bossWarning10Sent && remain <= 10 && remain > 0){
            this.bossWarning10Sent = true;
            director.getScene().emit(OnOrEmitConst.OnBossWarning, Math.ceil(remain));
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
        if (monster){
            monster.monsterInit(
                this.baseHP,
                this.baseAttack,
                this.bossHPMultiplier,
                this.bossAttackMultiplier,
                this.bossMoveSpeedMultiplier,
                true,
            );
        }
        this.bossSpawned = true;
        director.getScene().emit(
            OnOrEmitConst.OnBossSpawn,
            this.bossType,
            Math.floor(this.battleElapsed),
            monster?.rungameInfo?.maxHp ?? 0,
        );
    }
}


