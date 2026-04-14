/**
     * 数据或者UI更新的监听和发送事件
     */
export enum OnOrEmitConst{

    /**
     * 用户金币
     */
    CurrencyData = "CurrencyData",
    CurrencyUI = "CurrencyUI",

    /**
     * 用户基本信息，除了金币以外的所有信息
     */
     UserData = "UserData",
     UserUI = "UserUI",

     /**
      * 投射物死亡
      */
     OnprojectileDead = "OnprojectileDead",

     /**
      * 角色死亡（敌人）
      */
      OnDie = "OnDie",

      /**
      * 角色死亡（主角）
      */
     PlayerOnDie = "playerOnDie",

     /**
      * 击杀
      */
      OnKill = "OnKill",

      /**
      * 主角受伤
      */
     OnPlayerhurt = "OnPlayerhurt",


     /**
      * 受伤
      */
     Onhurt = "Onhurt",

     /**
      * 角色升级
      */
     OnplayerUpgrade = "OnplayerUpgrade",

     /**
      * 角色获得经验
      */
     OnExpGain = "OnExpGain",

     /**
      * 技能点变化（totalSkillPoint, gainedThisTime, level）
      */
     OnSkillPointChanged = "OnSkillPointChanged",

     /**
      * 角色专职变化
      */
     OnCareerChanged = "OnCareerChanged",

     /**
      * 精英怪刷新提示
      */
     OnEliteSpawn = "OnEliteSpawn",

     /**
      * 击杀精英后获得奖励
      */
     OnEliteKilled = "OnEliteKilled",

     /**
      * 精英技能释放预警
      */
     OnEliteCast = "OnEliteCast",

     /**
      * 拾取精英灵核
      */
     OnEliteCoreCollected = "OnEliteCoreCollected",

     /**
      * Boss 即将登场提示
      */
     OnBossWarning = "OnBossWarning",

     /**
      * Boss 出现
      */
     OnBossSpawn = "OnBossSpawn",

     /**
      * Boss 被击败
      */
     OnBossKilled = "OnBossKilled",

     /**
      * 请求开始战斗
      */
     OnRequestStartRun = "OnRequestStartRun",

     /**
      * 普通怪被击杀（用于掉落物判定）
      */
     OnNormalKill = "OnNormalKill",

     /**
      * 掉落物被拾取
      */
     OnDropCollected = "OnDropCollected",

     /**
      * 玩家获得临时 Buff
      */
     OnBuffGained = "OnBuffGained",

     /**
      * 代码 Review 标记怪物被击杀
      */
     OnCodeReviewKill = "OnCodeReviewKill",

     /**
      * 技术债利息光环叠层
      */
     OnTechDebtAuraStack = "OnTechDebtAuraStack",

     /**
      * 主动技能解锁
      */
     OnActiveSkillUnlocked = "OnActiveSkillUnlocked",

     /**
      * 主动技能释放
      */
     OnActiveSkillCast = "OnActiveSkillCast",

     /**
      * 主动技能冷却完成
      */
     OnActiveSkillReady = "OnActiveSkillReady",

     /**
      * 护盾怪格挡攻击
      */
     OnShieldEnemyBlock = "OnShieldEnemyBlock",

     /**
      * 冲锋怪冲刺命中
      */
     OnChargeEnemyImpact = "OnChargeEnemyImpact",

     /**
      * 自爆怪爆炸
      */
     OnSelfDestructExplode = "OnSelfDestructExplode",

     /**
      * 特殊波次事件触发
      */
     OnSpecialWave = "OnSpecialWave",

     /**
      * 玩家被减速
      */
     OnPlayerSlowed = "OnPlayerSlowed",
}
