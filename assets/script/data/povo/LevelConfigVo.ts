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
}


