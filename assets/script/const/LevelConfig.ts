import { _decorator, Component, loader } from 'cc';
import { LevelConfigVo } from '../data/povo/LevelConfigVo';

export class LevelConfig  extends Component {

    static getLevelByName(levelName: string): boolean {
        for (let a of LevelConfig.leveles){
            if (a.LV == levelName){
                return true;
            }
        }
        return false;
    }

    static getLevel(): LevelConfigVo {
        if (LevelConfig.startLevel != null && LevelConfig.startLevel.LV == LevelConfig.chooseLevel){
            return LevelConfig.startLevel;
        }else {
            for (let a of LevelConfig.leveles){
                if (a.LV == LevelConfig.chooseLevel){
                    LevelConfig.startLevel = a;
                    return a;
                }
            }
        }
        return null;
    }

    // 点击进入关卡后的选择
    static chooseLevel: string = "level1";
    static startLevel: LevelConfigVo = null;
    
    static leveles: LevelConfigVo[] = [
        {
            "LV": "level1",
            "LavelName": "DemoMap",
            "Map": [["map1_1"]],
            "MonsterType": [
                "Dragon"
            ],
            "BossType": "Dragon",
            "BossAbility": [],
            "EnemyBonus": 1,
            "Vision": 0,
            "BossShowTIme": 180,
            "SpawnInterval": 10,
            "SpawnCount": 10,
            "MaxAlive": 100,
            "SpawnRadiusMin": 10,
            "SpawnRadiusMax": 50,
            "MapRefreshInterval": 0.5,
            "DifficultyInterval": 30,
            "HPGrowthPerTick": 0.2,
            "AttackGrowthPerTick": 0.1,
            "SpawnCountGrowthPerTick": 2,
            "EliteUnlockTime": 60,
            "EliteSpawnInterval": 45,
            "EliteSpawnCount": 1,
            "EliteScaleMin": 1.35,
            "EliteScaleMax": 1.8,
            "EliteHPMultiplier": 2.8,
            "EliteAttackMultiplier": 1.6,
            "EliteMoveSpeedMultiplier": 1.1,
            "EliteCoreDropExp": 12,
            "EliteCoreDropHeal": 10,
            "EliteCoreDropLifeTime": 18,
            "EliteCoreMagnetRadius": 6,
            "EliteCoreCollectRadius": 1.8,
            "EliteLootAttack": 14,
            "EliteLootAttackInterval": -0.14,
            "EliteLootProjectile": 1,
            "EliteLootPenetration": 1,
            "EliteLootMoveSpeed": 1,
            "EliteLootMaxHp": 25,
            "BossScale": 2.3,
            "BossHPMultiplier": 7.5,
            "BossAttackMultiplier": 2.8,
            "BossMoveSpeedMultiplier": 1.15,
            "BossSpawnRadius": 24
        }
    ]
        

    
}


