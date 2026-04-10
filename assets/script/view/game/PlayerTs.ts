import { _decorator, Component, Node, math, Vec3, director, v3, game,} from 'cc';
import { Actor } from '../../managerGame/Actor';
import { EffectConst } from '../../const/EffectConst';
import { RunGameInfoVo } from '../../data/povo/RunGameInfoVo';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { VirtualInput } from '../../data/dynamicData/VirtualInput';
import { ActorState } from '../../const/ActorState';
import { EffectManager } from '../../managerGame/EffectManager';
import { ProjectileEmitter } from '../../managerGame/ProjectileEmitter';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { Monster } from '../../managerGame/Monster';
import { MathUtil } from '../../utils/MathUtil';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { LevelConfigVo } from '../../data/povo/LevelConfigVo';

const { ccclass, property} = _decorator;
const tempShootStart = v3();
const tempPlayerPos = v3();
const tempDropPlayerPos = v3();
const tempDropNodePos = v3();
const tempDropStep = v3();

type EliteDropInfo = {
    node: Node;
    bornTime: number;
    rewardExp: number;
    rewardHeal: number;
    baseY: number;
};

@ccclass('PlayerTs')
export class PlayerTs extends Component {

    private actor:Actor = null;
    
    /**
     * 子弹发出位置
     */
    @property(Node)
    bowString: Node = null;

    // 子弹发射冷却计时
    shootTime: number = 0.0;

    // 初始子弹数量
    private _splitAngle: number[] = [0];

    // 主角击杀数量    
    private playerDoKill: number = 0;
    // 精英击杀计数
    private eliteKillCount: number = 0;

    // 工具状态：投射物追踪与穿透（用于调试入口与升级三选一）
    private projectileTraceEnabled: boolean = true;
    private projectilePenetration: number = 1;

    // 精英灵核掉落（击杀后可拾取）
    private eliteDrops: EliteDropInfo[] = [];
    private eliteDropCollectRadius = 1.8;
    private eliteDropMagnetRadius = 6.0;
    private eliteDropLifeTime = 18;
    private eliteDropRewardExp = 12;
    private eliteDropRewardHeal = 10;

    // 精英战利品（配置可调）
    private eliteLootAttack = 14;
    private eliteLootAttackInterval = -0.14;
    private eliteLootProjectile = 1;
    private eliteLootPenetration = 1;
    private eliteLootMoveSpeed = 1;
    private eliteLootMaxHp = 25;

    start() {
        this.actor = this.node.getComponent(Actor);
        // 初始化主角的参数
        this.runGameInit();
        // this.node.on("onFrameAttackLoose", this.onFrameAttackLoose, this);
        this.node.on(OnOrEmitConst.OnKill, this.onKill, this);
        this.node.on(OnOrEmitConst.PlayerOnDie, this.playerOnDie, this);
    }

    onDestroy(){
        this.node.off(OnOrEmitConst.OnKill, this.onKill, this);
        this.node.off(OnOrEmitConst.PlayerOnDie, this.playerOnDie, this);
        this.clearEliteDrops();
    }

    update(deltaTime: number) {
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        this.updateEliteDrops(deltaTime);

        this.actor.input.x = VirtualInput.horizontal;
        this.actor.input.z = -VirtualInput.vertical;

        if (this.actor.input.length() > 0){
            this.actor.changeState(ActorState.Run);
        }else{
            this.actor.changeState(ActorState.Idle);
        }
        this.shootTime += deltaTime;
        if (this.shootTime > this.actor.rungameInfo.attackInterval){
     
            // 有敌人就攻击，没有就是空闲
            let enmey = this.getNearEnemy();
            if (enmey != null) {
                // 主角需要朝着敌人方向旋转，子弹也朝向敌人
                // 敌人与主角的方向
                Vec3.subtract(this.actor.angleInput, enmey.worldPosition, this.node.worldPosition);
                this.actor.angleInput.y = 0;
                this.actor.angleInput.normalize(); 
                // this.actor.changeState(ActorState.Attack);
                this.onFrameAttackLoose(enmey);                
            }else {
                this.actor.angleInput.x = VirtualInput.horizontal;
                this.actor.angleInput.z = -VirtualInput.vertical;
                this.actor.angleInput.normalize();
            }
            this.shootTime = 0;
        }
    }

    // 普通攻击
    onFrameAttackLoose(target: Node = null){
        // 发射技能
        const arrowStartPos = this.resolveShootStart(tempShootStart);
        let arrowForward: Vec3 = v3();

        // 循环发射角色的普通攻击
        for (let i=0; i < this.actor.rungameInfo.projectileCount; i++){
            
            MathUtil.rotateAround(arrowForward, this.actor.angleInput, Vec3.UP, this._splitAngle[i]);

            let emitter = this.node.getComponent(ProjectileEmitter);
            let projectile = emitter.create();
            // 重置存活时间
            projectile.startTime = 0;
            // 添加发射角色
            projectile.host = this.node;
            const useTrace = this.projectileTraceEnabled && !!target;
            projectile.target = useTrace ? target : null;
            projectile.projectileProperty.isTrace = useTrace;
            projectile.projectileProperty.penetration = this.projectilePenetration;
            projectile.node.forward = arrowForward;
            projectile.node.worldPosition = arrowStartPos;
        }
    }

    private resolveShootStart(out: Vec3): Vec3{
        this.node.getWorldPosition(tempPlayerPos);
        if (this.bowString && this.bowString.isValid){
            this.bowString.getWorldPosition(out);
            // 挂点异常时回退到主角，避免子弹固定在错误坐标
            if (Vec3.distance(out, tempPlayerPos) < 6){
                return out;
            }
        }
        out.set(tempPlayerPos);
        out.y += 1.0;
        return out;
    }

    // 修改角色的子弹数量
    setProjectileCount(count: number){
        this.actor.rungameInfo.projectileCount = count;
        this._splitAngle = [];

        // 角度转弧度
        const rad = math.toRadian(10);

        const isOdd = count % 2 != 0;
        
        const len = Math.floor(count/2);
        for (let i = 0; i < len; i++){
            this._splitAngle.push(-rad * (i+1));
            this._splitAngle.push(rad * (i+1));
        }

        if(isOdd){
            this._splitAngle.push(0);
        }
    }

    getNearEnemy():Node{
        let minDistance = 9999;
        let minNode: Node = null;

        // 获取敌人ID
        for (let goalId of MonsterManager.instance.goalvoes.keys()){
            let entrie = MonsterManager.instance.goalvoes.get(goalId);
            if (!entrie || !entrie.mSphere || !entrie.mSphere.isValid){
                continue;
            }
            let actorForOne = entrie.mSphere.getComponent(Monster);
            if (!actorForOne){
                continue;
            }
            if (actorForOne.distance < minDistance){
                minDistance = actorForOne.distance;
                minNode = entrie.mSphere;
            }
        }
        if (minNode){
            if (minNode.getComponent(Monster).distance > 600){
                minNode = null;
            }
        }
        
        return minNode;
    }

    onKill(killTarget: Node = null, expReward: number = 1, isEliteKill: boolean = false, isBossKill: boolean = false){
        // 增加经验
        const gainExp = Math.max(1, Math.floor(expReward));
        this.addExp(gainExp);

        // 记录主角击杀数量
        this.playerDoKill ++;

        if (isEliteKill){
            this.eliteKillCount += 1;
            const lootDesc = this.applyEliteLootReward();
            director.getScene().emit(OnOrEmitConst.OnEliteKilled, this.eliteKillCount, gainExp, lootDesc);
            if (killTarget && killTarget.isValid){
                this.spawnEliteCoreDrop(killTarget.getWorldPosition());
            }
        }

        if (isBossKill){
            director.getScene().emit(OnOrEmitConst.OnBossKilled, gainExp, this.actor.rungameInfo.level);
        }

        if (this.playerDoKill > this.actor.rungameInfo.projectileCount * 10){
            let a  = this.actor.rungameInfo.projectileCount + 2;

            // 给主角加攻击力
            this.actor.rungameInfo.attack *= 1.2;
            
            this.setProjectileCount(a);
            
        }
    }

    /**
     * 初始化主角参数
     */
    runGameInit():RunGameInfoVo {
        if (this.actor == undefined){
            this.actor = this.node.getComponent(Actor);
        }
        this.node.setWorldPosition(Vec3.ZERO);
        this.actor.currState = ActorState.Idle;
        this.playerDoKill = 0;
        this.eliteKillCount = 0;
        this.shootTime = 0;
        this.clearEliteDrops();

        // TODO 角色初始化值
       // gameInfo.Hp = 100;
       this.actor.rungameInfo.maxHp = 100;
       this.actor.rungameInfo.attack = 30;
       this.actor.rungameInfo.cooldown = 1;
       this.actor.rungameInfo.attackInterval = 1;
       this.actor.rungameInfo.criticalHitRate = 0.05;
       this.actor.rungameInfo.criticalStrike = 0;
       this.actor.rungameInfo.hpAdd = 10;
       this.actor.rungameInfo.defense = 1;
       this.actor.rungameInfo.moveSpeed = 5.0;
       this.actor.rungameInfo.level = 1;
       this.actor.rungameInfo.exp = 0;
       this.actor.rungameInfo.maxExp = 40;
       this.actor.rungameInfo.Hp = this.actor.rungameInfo.maxHp;
       this.projectileTraceEnabled = true;
       this.projectilePenetration = 1;
       this.setProjectileCount(1);
       director.getScene().emit(OnOrEmitConst.OnPlayerhurt, 1);
       this.node.emit(OnOrEmitConst.OnExpGain, this.actor.rungameInfo.exp, this.actor.rungameInfo.maxExp, this.actor.rungameInfo.level, this);

        return this.actor.rungameInfo;
    }

    changeAttack(delta: number){
        this.actor.rungameInfo.attack = Math.max(1, this.actor.rungameInfo.attack + delta);
    }

    changeAttackInterval(delta: number){
        this.actor.rungameInfo.attackInterval = math.clamp(this.actor.rungameInfo.attackInterval + delta, 0.15, 5);
    }

    changeMoveSpeed(delta: number){
        this.actor.rungameInfo.moveSpeed = Math.max(1, this.actor.rungameInfo.moveSpeed + delta);
    }

    changeProjectileCount(delta: number){
        const nextCount = math.clamp(this.actor.rungameInfo.projectileCount + delta, 1, 9);
        this.setProjectileCount(nextCount);
    }

    changeProjectilePenetration(delta: number){
        const nextPenetration = Math.round(math.clamp(this.projectilePenetration + delta, 1, 6));
        this.projectilePenetration = nextPenetration;
    }

    setProjectileTraceEnabled(enabled: boolean){
        this.projectileTraceEnabled = !!enabled;
    }

    toggleProjectileTrace(): boolean{
        this.projectileTraceEnabled = !this.projectileTraceEnabled;
        return this.projectileTraceEnabled;
    }

    isProjectileTraceEnabled(): boolean{
        return this.projectileTraceEnabled;
    }

    changeDefense(delta: number){
        this.actor.rungameInfo.defense = Math.max(0, this.actor.rungameInfo.defense + delta);
    }

    changeMaxHp(delta: number, heal: number = 0){
        this.actor.rungameInfo.maxHp = Math.max(1, this.actor.rungameInfo.maxHp + delta);
        this.actor.rungameInfo.Hp = Math.min(this.actor.rungameInfo.maxHp, this.actor.rungameInfo.Hp + heal);
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, this.actor.rungameInfo.Hp / this.actor.rungameInfo.maxHp);
    }

    heal(healValue: number){
        this.actor.rungameInfo.Hp = Math.min(this.actor.rungameInfo.maxHp, this.actor.rungameInfo.Hp + healValue);
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, this.actor.rungameInfo.Hp / this.actor.rungameInfo.maxHp);
    }

    resetDebugStats(){
        this.runGameInit();
    }

    getDebugSummary(): string {
        const info = this.actor.rungameInfo;
        return `lv=${info.level}, hp=${info.Hp.toFixed(0)}/${info.maxHp.toFixed(0)}, atk=${info.attack.toFixed(0)}, interval=${info.attackInterval.toFixed(2)}, move=${info.moveSpeed.toFixed(1)}, projectile=${info.projectileCount}, pen=${this.projectilePenetration}, trace=${this.projectileTraceEnabled ? "on" : "off"}, kill=${this.playerDoKill}, elite=${this.eliteKillCount}, core=${this.eliteDrops.length}`;
    }

    getExpSnapshot(){
        return {
            exp: this.actor?.rungameInfo?.exp ?? 0,
            maxExp: this.actor?.rungameInfo?.maxExp ?? 1,
            level: this.actor?.rungameInfo?.level ?? 1,
        };
    }

    applyLevelConfig(config: LevelConfigVo | null){
        if (!config){
            return;
        }
        this.eliteDropRewardExp = Math.max(1, Math.floor(config.EliteCoreDropExp ?? this.eliteDropRewardExp));
        this.eliteDropRewardHeal = Math.max(0, Math.floor(config.EliteCoreDropHeal ?? this.eliteDropRewardHeal));
        this.eliteDropLifeTime = Math.max(3, config.EliteCoreDropLifeTime ?? this.eliteDropLifeTime);
        this.eliteDropMagnetRadius = Math.max(1.5, config.EliteCoreMagnetRadius ?? this.eliteDropMagnetRadius);
        this.eliteDropCollectRadius = Math.max(0.4, config.EliteCoreCollectRadius ?? this.eliteDropCollectRadius);

        this.eliteLootAttack = Math.max(1, config.EliteLootAttack ?? this.eliteLootAttack);
        this.eliteLootAttackInterval = config.EliteLootAttackInterval ?? this.eliteLootAttackInterval;
        this.eliteLootProjectile = Math.max(1, Math.floor(config.EliteLootProjectile ?? this.eliteLootProjectile));
        this.eliteLootPenetration = Math.max(1, Math.floor(config.EliteLootPenetration ?? this.eliteLootPenetration));
        this.eliteLootMoveSpeed = Math.max(0.1, config.EliteLootMoveSpeed ?? this.eliteLootMoveSpeed);
        this.eliteLootMaxHp = Math.max(1, config.EliteLootMaxHp ?? this.eliteLootMaxHp);
    }

    private applyEliteLootReward(): string{
        const roll = Math.random();
        if (roll < 0.20){
            this.changeAttack(this.eliteLootAttack);
            return `飞剑锐化（攻击 +${this.eliteLootAttack}）`;
        }
        if (roll < 0.40){
            this.changeAttackInterval(this.eliteLootAttackInterval);
            return `迅影连发（攻击间隔 ${this.eliteLootAttackInterval.toFixed(2)}）`;
        }
        if (roll < 0.58){
            this.changeProjectileCount(this.eliteLootProjectile);
            return `剑影增幅（子弹 +${this.eliteLootProjectile}）`;
        }
        if (roll < 0.74){
            this.changeProjectilePenetration(this.eliteLootPenetration);
            return `破甲印记（穿透 +${this.eliteLootPenetration}）`;
        }
        if (roll < 0.88){
            this.changeMoveSpeed(this.eliteLootMoveSpeed);
            return `御风诀（移速 +${this.eliteLootMoveSpeed.toFixed(1)}）`;
        }

        this.changeMaxHp(this.eliteLootMaxHp, this.eliteLootMaxHp);
        return `真元回流（最大生命 +${this.eliteLootMaxHp}，并回复 ${this.eliteLootMaxHp}）`;
    }

    private addExp(expReward: number){
        const property = this.actor.rungameInfo;
        property.exp += Math.max(1, Math.floor(expReward));
        while (property.exp >= property.maxExp){
            property.exp -= property.maxExp;
            property.maxExp = Math.ceil(property.maxExp * 1.2);
            property.level  = property.level + 1;
            property.Hp = Math.min(property.maxHp, property.Hp + property.hpAdd);
            director.getScene().emit(OnOrEmitConst.OnPlayerhurt, property.Hp / property.maxHp);
            this.node.emit(OnOrEmitConst.OnplayerUpgrade, property.level, this);
        }
        // 广播获得经验给UI系统
        this.node.emit(OnOrEmitConst.OnExpGain, property.exp, property.maxExp, property.level, this);
    }

    private spawnEliteCoreDrop(worldPosition: Vec3){
        const scene = director.getScene();
        if (!scene){
            return;
        }
        const dropNode = new Node("EliteCoreDrop");
        scene.addChild(dropNode);
        const spawnPos = v3(worldPosition.x, worldPosition.y + 0.8, worldPosition.z);
        dropNode.setWorldPosition(spawnPos);
        EffectManager.instance.findEffectNode(EffectConst.EffDie, spawnPos);
        this.eliteDrops.push({
            node: dropNode,
            bornTime: game.totalTime,
            rewardExp: this.eliteDropRewardExp,
            rewardHeal: this.eliteDropRewardHeal,
            baseY: spawnPos.y,
        });
    }

    private updateEliteDrops(deltaTime: number){
        if (this.eliteDrops.length <= 0){
            return;
        }
        this.node.getWorldPosition(tempDropPlayerPos);

        for (let i = this.eliteDrops.length - 1; i >= 0; i--){
            const drop = this.eliteDrops[i];
            if (!drop.node || !drop.node.isValid){
                this.eliteDrops.splice(i, 1);
                continue;
            }
            const life = game.totalTime - drop.bornTime;
            if (life > this.eliteDropLifeTime){
                drop.node.destroy();
                this.eliteDrops.splice(i, 1);
                continue;
            }

            drop.node.getWorldPosition(tempDropNodePos);

            // 漂浮动画
            tempDropNodePos.y = drop.baseY + Math.sin(life * 4) * 0.16;
            drop.node.setWorldPosition(tempDropNodePos);

            const distance = Vec3.distance(tempDropNodePos, tempDropPlayerPos);
            if (distance <= this.eliteDropCollectRadius){
                this.collectEliteCoreDrop(i);
                continue;
            }

            if (distance <= this.eliteDropMagnetRadius){
                Vec3.subtract(tempDropStep, tempDropPlayerPos, tempDropNodePos);
                tempDropStep.normalize();
                const step = Math.max(3.2, 9 - distance) * deltaTime;
                Vec3.scaleAndAdd(tempDropNodePos, tempDropNodePos, tempDropStep, step);
                drop.node.setWorldPosition(tempDropNodePos);
            }
        }
    }

    private collectEliteCoreDrop(index: number){
        const drop = this.eliteDrops[index];
        if (!drop){
            return;
        }
        const rewardExp = drop.rewardExp;
        const rewardHeal = drop.rewardHeal;
        const collectPos = drop.node && drop.node.isValid ? drop.node.getWorldPosition() : this.node.getWorldPosition();
        if (drop.node && drop.node.isValid){
            drop.node.destroy();
        }
        this.eliteDrops.splice(index, 1);

        this.addExp(rewardExp);
        this.heal(rewardHeal);
        director.getScene().emit(OnOrEmitConst.OnEliteCoreCollected, rewardExp, rewardHeal, collectPos);
    }

    private clearEliteDrops(){
        for (const drop of this.eliteDrops){
            if (drop.node && drop.node.isValid){
                drop.node.destroy();
            }
        }
        this.eliteDrops.length = 0;
    }

    getEliteDropNodes(): Node[]{
        return this.eliteDrops.filter((item)=> item.node && item.node.isValid).map((item)=> item.node);
    }

    playerOnDie(){
        let a = this.node.getWorldPosition();
        a.y = 1;
        this.node.worldPosition = a;
        console.log("主角死亡");

        // 发出主角死亡，让全局知道游戏结束
        director.getScene().emit(OnOrEmitConst.PlayerOnDie);
    }
}


