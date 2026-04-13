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
     * DifficultyGraceTime(前期缓冲时间 秒，期间难度不主动上升)
     */
    DifficultyGraceTime?: number;

    /**
     * LatePressureScale(中后期难度推进倍率)
     */
    LatePressureScale?: number;

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
     * DemandSurgeUnlockTime(需求轰炸首次触发时间 秒)
     */
    DemandSurgeUnlockTime?: number;

    /**
     * DemandSurgeInterval(需求轰炸触发间隔 秒)
     */
    DemandSurgeInterval?: number;

    /**
     * DemandSurgeWaveScale(需求轰炸额外波次规模系数)
     */
    DemandSurgeWaveScale?: number;

    /**
     * DemandSurgeRepeatCount(需求轰炸追加波次数)
     */
    DemandSurgeRepeatCount?: number;

    /**
     * DemandSurgeRepeatDelay(需求轰炸追加波次延迟 秒)
     */
    DemandSurgeRepeatDelay?: number;

    /**
     * ScheduleRushUnlockTime(排期冲刺首次触发时间 秒)
     */
    ScheduleRushUnlockTime?: number;

    /**
     * ScheduleRushInterval(排期冲刺触发间隔 秒)
     */
    ScheduleRushInterval?: number;

    /**
     * ScheduleRushDuration(排期冲刺持续时间 秒)
     */
    ScheduleRushDuration?: number;

    /**
     * ScheduleRushSpawnIntervalScale(排期冲刺期间刷怪间隔倍率)
     */
    ScheduleRushSpawnIntervalScale?: number;

    /**
     * ScheduleRushSpawnRadiusScale(排期冲刺期间刷怪半径倍率)
     */
    ScheduleRushSpawnRadiusScale?: number;

    /**
     * ScheduleRushBurstScale(排期冲刺启动时额外波次系数)
     */
    ScheduleRushBurstScale?: number;

    /**
     * ProjectReviewUnlockTime(项目评审首次触发时间 秒)
     */
    ProjectReviewUnlockTime?: number;

    /**
     * ProjectReviewInterval(项目评审触发间隔 秒)
     */
    ProjectReviewInterval?: number;

    /**
     * ProjectReviewWaveCount(项目评审基础波次数量)
     */
    ProjectReviewWaveCount?: number;

    /**
     * ProjectReviewSpawnRadiusMin(项目评审最小刷怪半径)
     */
    ProjectReviewSpawnRadiusMin?: number;

    /**
     * ProjectReviewSpawnRadiusMax(项目评审最大刷怪半径)
     */
    ProjectReviewSpawnRadiusMax?: number;

    /**
     * ProjectReviewBaseHpBonus(项目评审基础生命补正)
     */
    ProjectReviewBaseHpBonus?: number;

    /**
     * ProjectReviewBaseAttackBonus(项目评审基础攻击补正)
     */
    ProjectReviewBaseAttackBonus?: number;

    /**
     * ProjectReviewMoveSpeedScale(项目评审移动压迫倍率)
     */
    ProjectReviewMoveSpeedScale?: number;

    /**
     * IncidentUnlockTime(线上事故首次触发时间 秒)
     */
    IncidentUnlockTime?: number;

    /**
     * IncidentInterval(线上事故触发间隔 秒)
     */
    IncidentInterval?: number;

    /**
     * IncidentWaveCount(线上事故基础波次数量)
     */
    IncidentWaveCount?: number;

    /**
     * IncidentSpawnRadiusMin(线上事故最小刷怪半径)
     */
    IncidentSpawnRadiusMin?: number;

    /**
     * IncidentSpawnRadiusMax(线上事故最大刷怪半径)
     */
    IncidentSpawnRadiusMax?: number;

    /**
     * IncidentBaseHpBonus(线上事故基础生命补正)
     */
    IncidentBaseHpBonus?: number;

    /**
     * IncidentBaseAttackBonus(线上事故基础攻击补正)
     */
    IncidentBaseAttackBonus?: number;

    /**
     * IncidentMoveSpeedScale(线上事故移动压迫倍率)
     */
    IncidentMoveSpeedScale?: number;

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

    /** TechDebtUnlockTime(技术债利息首次出现时间 秒) */
    TechDebtUnlockTime?: number;
    /** TechDebtSpawnInterval(技术债利息刷新间隔 秒) */
    TechDebtSpawnInterval?: number;
    /** TechDebtScaleMin(技术债利息缩放最小值) */
    TechDebtScaleMin?: number;
    /** TechDebtScaleMax(技术债利息缩放最大值) */
    TechDebtScaleMax?: number;
    /** TechDebtHPMultiplier(技术债利息血量倍率) */
    TechDebtHPMultiplier?: number;
    /** TechDebtAttackMultiplier(技术债利息攻击倍率) */
    TechDebtAttackMultiplier?: number;
    /** TechDebtMoveSpeedMultiplier(技术债利息移速倍率) */
    TechDebtMoveSpeedMultiplier?: number;
    /** TechDebtAuraInterval(技术债利息光环叠层间隔 秒) */
    TechDebtAuraInterval?: number;
    /** TechDebtAuraAttackBonus(技术债利息每层光环全场攻击增量) */
    TechDebtAuraAttackBonus?: number;
    /** TechDebtAuraMaxStacks(技术债利息光环最大叠层数) */
    TechDebtAuraMaxStacks?: number;

    /** CodeReviewUnlockTime(代码 Review 首次触发时间 秒) */
    CodeReviewUnlockTime?: number;
    /** CodeReviewInterval(代码 Review 触发间隔 秒) */
    CodeReviewInterval?: number;
    /** CodeReviewMarkCount(代码 Review 标记怪物数量) */
    CodeReviewMarkCount?: number;
    /** CodeReviewExpMultiplier(代码 Review 标记怪物经验倍率) */
    CodeReviewExpMultiplier?: number;
    /** CodeReviewMarkDuration(代码 Review 标记持续时间 秒) */
    CodeReviewMarkDuration?: number;

    /** ReqChangeUnlockTime(需求变更单首次出现时间 秒) */
    ReqChangeUnlockTime?: number;
    /** ReqChangeSpawnInterval(需求变更单刷新间隔 秒) */
    ReqChangeSpawnInterval?: number;
    /** ReqChangeScaleMin(需求变更单缩放最小值) */
    ReqChangeScaleMin?: number;
    /** ReqChangeScaleMax(需求变更单缩放最大值) */
    ReqChangeScaleMax?: number;
    /** ReqChangeHPMultiplier(需求变更单血量倍率) */
    ReqChangeHPMultiplier?: number;
    /** ReqChangeAttackMultiplier(需求变更单攻击倍率) */
    ReqChangeAttackMultiplier?: number;
    /** ReqChangeMoveSpeedMultiplier(需求变更单移速倍率) */
    ReqChangeMoveSpeedMultiplier?: number;
    /** ReqChangeZigzagInterval(需求变更单变向间隔 秒) */
    ReqChangeZigzagInterval?: number;
    /** ReqChangeZigzagAngle(需求变更单变向角度 度) */
    ReqChangeZigzagAngle?: number;
}


