import { Pool, Prefab, resources, Node, randomRangeInt, instantiate, director, Animation, SkeletalAnimationState, RigidBody, Collider, EffectAsset, Vec3, v2, Vec2 } from "cc";
import { level } from "../view/game/level";
import { LevelConfig } from "../const/LevelConfig";
import { OnOrEmitConst } from "../const/OnOrEmitConst";
import { Monster } from "./Monster";
import { EffectManager } from "./EffectManager";
import { EffectConst } from "../const/EffectConst";
import { Simulator } from "../utils/RVO/Simulator";
import { RVOMath, Vector2 } from "../utils/RVO/Common";
import { ActorState } from "../const/ActorState";
import { PoolManager } from "../utils/PoolManager";

class IdVector {
    constructor(id: number, mSphere:Node){
        this.id = id;
        this.mSphere = mSphere;
    }
    // RVO agent ID
    id: number = null;
    // 怪物节点引用
    mSphere: Node = null;
};

let posGoal = new Vector2(0, 0);
/**
 * 怪物管理器
 *  */ 
export class MonsterManager {

    player:Node = null;
    
    static _instance: MonsterManager;

    static get instance(): MonsterManager {
        if (this._instance == null){
            this._instance = new MonsterManager();
        }
        return this._instance;
    }

    // 所有活跃怪物的 agentId 映射
    goalvoes: Map<string, IdVector> = null; 

    enemyPool: Pool<Node> = null;

    private enemyNodeNames: string[] = [];
    private bossNodeName: string = "";
    /**
     * 
     * @param onComplet         预加载完成后的回调
     */
    init(onComplet:()=>void = () =>{}){

        this.goalvoes = new Map();
        this.enemyNodeNames = [];
        this.bossNodeName = "";

        // TODO 根据关卡配置加载怪物预制体
        const level = LevelConfig.getLevel();
        const normalNames = (level?.MonsterType ?? []).filter((name)=> !!name);
        const uniqueLoadNames = new Set<string>();
        normalNames.forEach((name)=> uniqueLoadNames.add(name));
        if (level?.BossType){
            uniqueLoadNames.add(level.BossType);
            this.bossNodeName = level.BossType;
        }
        this.enemyNodeNames = normalNames.length > 0 ? normalNames.slice() : (this.bossNodeName ? [this.bossNodeName] : []);
        const preUrl = Array.from(uniqueLoadNames).map((name)=> "prefab/monster/" + name);

        resources.load(preUrl, Prefab, (err:Error, prefabs:Prefab[])=>{
            if (err){
                throw err;
            }

            for (let i=0; i< prefabs.length; i++){
                PoolManager.instance.putPrefab(prefabs[i].name, prefabs[i]);
            }
            onComplet();
        });
    }

    // 更新所有怪物的 RVO 期望速度
    // 每帧驱动 RVO 避障模拟
    setPreferredVelocities(dt: number) {
        const palyer = MonsterManager.instance.player;
        if (palyer == undefined){
            return;
        }

        const recycleGoalIds: string[] = [];

        for (let goalId of Array.from(this.goalvoes.keys())) {
            let entrie = this.goalvoes.get(goalId);
            if (!entrie || !entrie.mSphere || !entrie.mSphere.isValid){
                recycleGoalIds.push(goalId);
                continue;
            }
            let monsterForOne = entrie.mSphere.getComponent(Monster);
            if (monsterForOne == undefined || monsterForOne.goalId == undefined){
                recycleGoalIds.push(goalId);
                continue;
            }
            if (!monsterForOne.node.activeInHierarchy){
                recycleGoalIds.push(monsterForOne.goalId);
                continue;
            }
            const agent = Simulator.instance.getAgentByAid(entrie.id);
            if (!agent){
                recycleGoalIds.push(monsterForOne.goalId);
                continue;
            }
            // Move toward the player position
            posGoal.x = palyer.worldPosition.x;
            posGoal.y = palyer.worldPosition.z;

            // 计算怪物朝玩家方向的目标向量
            let goaPositon = agent.position_;
            let goalVector = posGoal.minus(goaPositon);
            // 计算到玩家的距离平方
            monsterForOne.distance = RVOMath.absSq(goalVector);
            const runtimeSpeed = monsterForOne.rungameInfo.moveSpeed * Math.max(0.1, monsterForOne.runtimeMoveSpeedScale ?? 1);
            if(monsterForOne.distance > 1.0) {
                // 将目标向量归一化并缩放为移动速度
                goalVector = RVOMath.normalize(goalVector).scale(runtimeSpeed);
            }

            let rvo = RVOMath.absSq(goalVector)
            if (monsterForOne.currState != ActorState.Run || rvo < RVOMath.RVO_EPSILON) {
                // Agent 处于非移动状态或速度过小，停止移动
                Simulator.instance.setAgentPrefVelocity (entrie.id, new Vector2 (0.0, 0.0));
            }else {
                // 向玩家方向移动，设置期望速度
                Simulator.instance.setAgentPrefVelocity(entrie.id, goalVector);
            }
        }

        for (let goalId of recycleGoalIds){
            let entrie = this.goalvoes.get(goalId);
            if (!entrie){
                continue;
            }
            this.removeGoal(goalId);
            this.recycleEnemyNode(entrie.mSphere);
        }

        if (Simulator.instance.getNumAgents() > 0){
            Simulator.instance.run(dt);
        }

        // 将 RVO 计算后的位置同步到怪物节点
        for(let goalId of Array.from(this.goalvoes.keys())) {
            let entrie = this.goalvoes.get(goalId);
            if (entrie){
                let agent = Simulator.instance.getAgentByAid(entrie.id);
                if (!agent){
                    continue;
                }
                let p1 = agent.position_;
                entrie.mSphere.setWorldPosition(p1.x, entrie.mSphere.worldPosition.y, p1.y);
            }
        }
    }

    destroy(){
        if (this.enemyPool != null){
            this.enemyPool.destroy();
        }
        this.enemyNodeNames = [];
        if (this.goalvoes){
            this.goalvoes.clear();
            this.goalvoes = null;
        }
    }

    createEnemy(spawnPos: Vec3, scale: number):Node {
        if (!this.enemyNodeNames || this.enemyNodeNames.length <= 0){
            return null;
        }
        let prefabName = this.enemyNodeNames[randomRangeInt(0, this.enemyNodeNames.length)];
        return this.createEnemyByName(prefabName, spawnPos, scale);
    }

    createBoss(spawnPos: Vec3, scale: number): Node {
        const prefabName = this.bossNodeName || this.enemyNodeNames[0];
        return this.createEnemyByName(prefabName, spawnPos, scale);
    }

    private createEnemyByName(prefabName: string, spawnPos: Vec3, scale: number): Node {
        if (!prefabName){
            return null;
        }

        // 初始化 RVO 默认代理参数
        if (Simulator.instance.defaultAgent == null){
            Simulator.instance.setAgentDefaults(10, 4, 1, 0.1, 0.5, 15, new Vector2(0, 0));
        }

        let node = PoolManager.instance.getNodeByName(prefabName, director.getScene()); 
        if (!node){
            return null;
        }

        node.active = true;
        node.setWorldScale(scale, scale, scale);
        node.off(OnOrEmitConst.OnDie, this.onEnemyDie, this);
        node.on(OnOrEmitConst.OnDie, this.onEnemyDie, this);
        node.getComponent(Collider).enabled = true;

        let monster = node.getComponent(Monster);
        // 注册怪物到 RVO 仿真中作为 agent
        let p = new Vector2(spawnPos.x, spawnPos.z);
        let idx = Simulator.instance.addAgentByR(p, monster.goalSize*scale);
        // 设置 agent 质量
        Simulator.instance.setAgentMass(idx, 1*scale);
        this.goalvoes.set(node.uuid, new IdVector(idx, node));
        monster.goalId = node.uuid;
        node.setWorldPosition(p.x, 0, p.y);        
        return node;
    }

    onEnemyDie(node: Node){
        if (!node || !node.isValid){
            return;
        }
        node.off(OnOrEmitConst.OnDie, this.onEnemyDie, this);
        let actor = node.getComponent(Monster);
        this.removeGoal(actor?.goalId);

        EffectManager.instance.findEffectNode(EffectConst.EffDie, node.worldPosition);
        this.recycleEnemyNode(node);
    }

    // 从 RVO 仿真中移除怪物并清理映射
    removeGoal(goalId: string = null){
        if (!goalId) {
            return;
        }
        if (this.goalvoes.get(goalId)){
            Simulator.instance.removeAgent(this.goalvoes.get(goalId).id);
            this.goalvoes.delete(goalId);
        }
        return;
    }

    private recycleEnemyNode(node: Node){
        if (!node || !node.isValid){
            return;
        }
        node.off(OnOrEmitConst.OnDie, this.onEnemyDie, this);
        const collider = node.getComponent(Collider);
        if (collider){
            collider.enabled = false;
        }
        const monster = node.getComponent(Monster);
        if (monster){
            monster.goalId = null;
            monster.distance = 9999;
            monster.isElite = false;
            monster.isBoss = false;
            monster.runtimeMoveSpeedScale = 1;
        }
        node.active = false;
        PoolManager.instance.putNode(node);
    }
}
