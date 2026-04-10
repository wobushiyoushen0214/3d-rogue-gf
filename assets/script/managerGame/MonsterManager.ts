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
    // 动态避障中分配的角色Agent的id
    id: number = null;
    // 角色的节点实例
    mSphere: Node = null;
};

let posGoal = new Vector2(0, 0);
/**
 * 角色管理类
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

    // 记录所有的位置、节点信息、与动态避障对应的AgentId
    goalvoes: Map<string, IdVector> = null; 

    enemyPool: Pool<Node> = null;

    private enemyNodeNames: string[] = [];
    private bossNodeName: string = "";
    /**
     * 
     * @param onComplet         加载时的回调函数
     */
    init(onComplet:()=>void = () =>{}){

        this.goalvoes = new Map();
        this.enemyNodeNames = [];
        this.bossNodeName = "";

        // TODO 需要修改为根据关卡加载怪物
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

    // 敌人使用动态避障方式移动
    // 更新逻辑坐标
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
            // 向主角移动坐标
            posGoal.x = palyer.worldPosition.x;
            posGoal.y = palyer.worldPosition.z;

            // 敌人角色终点位置 - 当前位置
            let goaPositon = agent.position_;
            let goalVector = posGoal.minus(goaPositon);
            // 距离方差
            monsterForOne.distance = RVOMath.absSq(goalVector);
            const runtimeSpeed = monsterForOne.rungameInfo.moveSpeed * Math.max(0.1, monsterForOne.runtimeMoveSpeedScale ?? 1);
            if(monsterForOne.distance > 1.0) {
                // 没到终点，则设置移动
                goalVector = RVOMath.normalize(goalVector).scale(runtimeSpeed);
            }

            let rvo = RVOMath.absSq(goalVector)
            if (monsterForOne.currState != ActorState.Run || rvo < RVOMath.RVO_EPSILON) {
                // Agent 已在目标半径内，即视为碰撞，将速度设为0
                Simulator.instance.setAgentPrefVelocity (entrie.id, new Vector2 (0.0, 0.0));
            }else {
                // 没有检查到碰撞，则继续移动
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

        // 更新渲染坐标
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

        // 等待加载
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
        // 创建动态避障 agent
        let p = new Vector2(spawnPos.x, spawnPos.z);
        let idx = Simulator.instance.addAgentByR(p, monster.goalSize*scale);
        // 设置障碍角色质量
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

        // 消除动态避障
        this.removeGoal(actor?.goalId);

        // TODO 死亡特效
        EffectManager.instance.findEffectNode(EffectConst.EffDie, node.worldPosition);
        this.recycleEnemyNode(node);
    }

    // 删除一个在动态避障里面的角色
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
