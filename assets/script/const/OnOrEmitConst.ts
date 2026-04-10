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
}
