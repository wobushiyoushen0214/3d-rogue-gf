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
    // 闁告柣鍔嶉埀顑跨窔娴尖晠姊惧鈧懙鎴﹀礆閸℃稑甯抽柣銊ュ椤鎳濋惈鐎廵nt闁汇劌鍩嘾
    id: number = null;
    // 閻熸瑦甯熸竟濠囨儍閸曨喖螡闁绘劗鎳撻悿鍕瑹?
    mSphere: Node = null;
};

let posGoal = new Vector2(0, 0);
/**
 * 閻熸瑦甯熸竟濠勭不閿涘嫭鍊炵紒?
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

    // 閻犱焦婢樼紞宥夊箥閳ь剟寮垫径灞剧暠濞达絽绉堕悿鍡涘Υ娴ｈ棄螡闁绘劙鈧稐绻嗛柟顓у灛閳ь兛妞掔粭宀勫礉閵婏腹鍋撴笟鈧导鈺呮⒕濠婂喚鍤犻幖瀛樻⒒濞堟厜gentId
    goalvoes: Map<string, IdVector> = null; 

    enemyPool: Pool<Node> = null;

    private enemyNodeNames: string[] = [];
    private bossNodeName: string = "";
    /**
     * 
     * @param onComplet         闁告梻濮惧ù鍥籍閸撲焦鐣遍柛銉у仩閻ㄧ喖宕欓懞銉︽
     */
    init(onComplet:()=>void = () =>{}){

        this.goalvoes = new Map();
        this.enemyNodeNames = [];
        this.bossNodeName = "";

        // TODO 闂傚洠鍋撻悷鏇氭閹便劑寮ㄩ柅娑滅闁哄秷顫夊畵渚€宕楅崘鎻掑耿闁告梻濮惧ù鍥箑椤忓棗鈷?
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

    // 闁轰礁濂斿Ч澶嬫媴鐠恒劍鏆忛柛鏂诲妽閳ь兛绶氭导鈺呮⒕濠婂嫭鐓欑€殿喖绻掍簺闁?
    // 闁哄洤鐡ㄩ弻濠囨焻閺勫繒甯嗛柛褎鍔栭悥?
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

            // 闁轰礁濂斿Ч澶屾喆閹烘洖顥忕紓浣哥墢閸嬶絾鎷呭鍥╂瀭 - 鐟滅増鎸告晶鐘虫媴瀹ュ洨鏋?
            let goaPositon = agent.position_;
            let goalVector = posGoal.minus(goaPositon);
            // 閻犵儤绻勯‖鍥棘閻熺増鈻?
            monsterForOne.distance = RVOMath.absSq(goalVector);
            const runtimeSpeed = monsterForOne.rungameInfo.moveSpeed * Math.max(0.1, monsterForOne.runtimeMoveSpeedScale ?? 1);
            if(monsterForOne.distance > 1.0) {
                // 婵炲备鈧啿鐓傜紓浣哥墢閸嬶綁鏁嶇仦钘夌仧閻犱礁澧介悿鍡欑矓鐠囨彃袟
                goalVector = RVOMath.normalize(goalVector).scale(runtimeSpeed);
            }

            let rvo = RVOMath.absSq(goalVector)
            if (monsterForOne.currState != ActorState.Run || rvo < RVOMath.RVO_EPSILON) {
                // Agent 鐎瑰憡褰冨﹢顏堟儎椤旂晫鍨奸柛妤€锕ょ欢鐐哄礃閸滃啰绀夐柛妤€鐤囬～瀣▔閾忚娼鹃柟鍓у剳缁辨繄浜搁崱娑掑亾閻斿嘲顔婇悹浣稿綖鐠?
                Simulator.instance.setAgentPrefVelocity (entrie.id, new Vector2 (0.0, 0.0));
            }else {
                // 婵炲备鍓濆﹢浣肝涢埀顒勫蓟閵夈儱鐓傜痪鎵閹告帡鏁嶇仦钘夌仧缂備綀鍛暰缂佸顕ф慨?
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

        // 闁哄洤鐡ㄩ弻濠傘€掗崣澶屽帬闁秆勫姈閻?
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

        // 缂佹稑顦欢鐔煎礉閻樼儤绁?
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
        // 闁告帗绋戠紓鎾诲礉閵婏腹鍋撴笟鈧导鈺呮⒕?agent
        let p = new Vector2(spawnPos.x, spawnPos.z);
        let idx = Simulator.instance.addAgentByR(p, monster.goalSize*scale);
        // 閻犱礁澧介悿鍡涙⒕濠婂拋鏆￠悷娆愬笩婢瑰﹦鎷归妸鈺佹
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

    // 闁告帞濞€濞呭孩绋夐埀顒佺▔椤忓嫭韬柛鏂诲妽閳ь兛绶氭导鈺呮⒕濠婂牆娅￠梻鍫涘灮濞堟垹鎲撮幒鏇烆棌
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
