export class LevelConfigVo {

    /**
     * LV (关卡等级)
     */
    LV: string;
    
    /**
    * LavelName(关卡名称)
    */
    LavelName: string;

    /**
     * Map(游戏地图组成)
     */
    Map:string[][];

    /**
     * MonsterType(当前场景敌人组成)
     */
    MonsterType: string[];

    /**
     * BossType(关卡boss)
     */
    BossType: string ;

    /**
     * EliteDisplayName(精英展示名)
     */
    EliteDisplayName?: string;

    /**
     * BossDisplayName(Boss 展示名)
     */
    BossDisplayName?: string;

    /**
     * BossAbility(Boss使用的技能)
     */
    BossAbility: string[];

    /**
     * EnemyBonus(敌人加成)
     */
    EnemyBonus: number;

    /**
     * Vision(视野方式 0全视野，1半视野)
     */
    Vision: number;

    /**
     * BossShowTIme(boss出现时间 秒)
     */
    BossShowTIme: number;

    /**
     * SpawnInterval(刷怪间隔 秒)
     */
    SpawnInterval?: number;

    /**
     * SpawnCount(每次刷怪数量)
     */
    SpawnCount?: number;

    /**
     * MaxAlive(最大同时存活怪物数)
     */
    MaxAlive?: number;

    /**
     * SpawnRadiusMin(离玩家最小刷怪半径)
     */
    SpawnRadiusMin?: number;

    /**
     * SpawnRadiusMax(离玩家最大刷怪半径)
     */
    SpawnRadiusMax?: number;

    /**
     * MapRefreshInterval(地图刷新间隔 秒)
     */
    MapRefreshInterval?: number;

    /**
     * DifficultyInterval(难度成长间隔 秒)
     */
    DifficultyInterval?: number;

    /**
     * HPGrowthPerTick(难度成长时血量增幅)
     */
    HPGrowthPerTick?: number;

    /**
     * AttackGrowthPerTick(难度成长时攻击增幅)
     */
    AttackGrowthPerTick?: number;

    /**
     * SpawnCountGrowthPerTick(难度成长时每波增怪)
     */
    SpawnCountGrowthPerTick?: number;

    /**
     * SpawnIntervalFloor(普通怪最短刷怪间隔 秒)
     */
    SpawnIntervalFloor?: number;

    /**
     * SpawnIntervalLevelDecay(玩家每升 1 级，普通怪刷怪间隔额外缩短值)
     */
    SpawnIntervalLevelDecay?: number;

    /**
     * SpawnIntervalTimeDecayRate(随战斗时间推进的刷怪间隔缩短系数)
     */
    SpawnIntervalTimeDecayRate?: number;

    /**
     * SpawnCountLevelBonusRate(玩家每升 1 级带来的额外刷怪数量系数)
     */
    SpawnCountLevelBonusRate?: number;

    /**
     * EliteUnlockTime(首只精英出现时间 秒)
     */
    EliteUnlockTime?: number;

    /**
     * EliteSpawnInterval(精英刷新间隔 秒)
     */
    EliteSpawnInterval?: number;

    /**
     * EliteSpawnCount(每波精英数量)
     */
    EliteSpawnCount?: number;

    /**
     * EliteScaleMin(精英缩放最小值)
     */
    EliteScaleMin?: number;

    /**
     * EliteScaleMax(精英缩放最大值)
     */
    EliteScaleMax?: number;

    /**
     * EliteHPMultiplier(精英血量倍率)
     */
    EliteHPMultiplier?: number;

    /**
     * EliteAttackMultiplier(精英攻击倍率)
     */
    EliteAttackMultiplier?: number;

    /**
     * EliteMoveSpeedMultiplier(精英移速倍率)
     */
    EliteMoveSpeedMultiplier?: number;

    /**
     * EliteBurdenScale(精英维护负担倍率，作用于主角攻击间隔)
     */
    EliteBurdenScale?: number;

    /**
     * EliteBurdenDuration(精英维护负担持续时间 秒)
     */
    EliteBurdenDuration?: number;

    /**
     * EliteCoreDropExp(精英灵核拾取经验)
     */
    EliteCoreDropExp?: number;

    /**
     * EliteCoreDropHeal(精英灵核拾取回血)
     */
    EliteCoreDropHeal?: number;

    /**
     * EliteCoreDropLifeTime(精英灵核存在时间 秒)
     */
    EliteCoreDropLifeTime?: number;

    /**
     * EliteCoreMagnetRadius(精英灵核吸附半径)
     */
    EliteCoreMagnetRadius?: number;

    /**
     * EliteCoreCollectRadius(精英灵核拾取半径)
     */
    EliteCoreCollectRadius?: number;

    /**
     * EliteLootAttack(精英战利品攻击增量)
     */
    EliteLootAttack?: number;

    /**
     * EliteLootAttackInterval(精英战利品攻速增量，负数代表更快)
     */
    EliteLootAttackInterval?: number;

    /**
     * EliteLootProjectile(精英战利品子弹增量)
     */
    EliteLootProjectile?: number;

    /**
     * EliteLootPenetration(精英战利品穿透增量)
     */
    EliteLootPenetration?: number;

    /**
     * EliteLootMoveSpeed(精英战利品移速增量)
     */
    EliteLootMoveSpeed?: number;

    /**
     * EliteLootMaxHp(精英战利品最大生命增量)
     */
    EliteLootMaxHp?: number;

    /**
     * BossScale(Boss缩放)
     */
    BossScale?: number;

    /**
     * BossHPMultiplier(Boss血量倍率)
     */
    BossHPMultiplier?: number;

    /**
     * BossAttackMultiplier(Boss攻击倍率)
     */
    BossAttackMultiplier?: number;

    /**
     * BossMoveSpeedMultiplier(Boss移速倍率)
     */
    BossMoveSpeedMultiplier?: number;

    /**
     * BossSpawnRadius(Boss离玩家刷新半径)
     */
    BossSpawnRadius?: number;

    /**
     * BossRushInterval(愿景冲刺触发间隔 秒)
     */
    BossRushInterval?: number;

    /**
     * BossRushDuration(愿景冲刺持续时间 秒)
     */
    BossRushDuration?: number;

    /**
     * BossRushSpeedScale(愿景冲刺期间敌人移速倍率)
     */
    BossRushSpeedScale?: number;

    /**
     * BossPieInterval(画饼陷阱触发间隔 秒)
     */
    BossPieInterval?: number;

    /**
     * BossPieDuration(画饼陷阱存在时间 秒)
     */
    BossPieDuration?: number;

    /**
     * BossPieCount(每次生成画饼陷阱数量)
     */
    BossPieCount?: number;

    /**
     * BossPieRadius(画饼陷阱触发半径)
     */
    BossPieRadius?: number;

    /**
     * BossPieDebuffScale(踩中画饼后的维护负担倍率)
     */
    BossPieDebuffScale?: number;

    /**
     * BossPieDebuffDuration(踩中画饼后的维护负担持续时间 秒)
     */
    BossPieDebuffDuration?: number;

    /**
     * BossPieSpawnRadiusMin(画饼陷阱离玩家最小生成半径)
     */
    BossPieSpawnRadiusMin?: number;

    /**
     * BossPieSpawnRadiusMax(画饼陷阱离玩家最大生成半径)
     */
    BossPieSpawnRadiusMax?: number;

    /**
     * BossFinalStandWaveScale(再坚持一下阶段召唤波次系数)
     */
    BossFinalStandWaveScale?: number;
}


