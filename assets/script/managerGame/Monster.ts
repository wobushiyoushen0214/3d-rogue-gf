import { _decorator, Component, Node, SkeletalAnimation, Animation, RigidBody, Collider, v3, CCFloat, Vec3, ICollisionEvent, PhysicsSystem, SkeletalAnimationState, AnimationState, MotionStreak, CCInteger, SkinnedMeshRenderer, Color, MeshRenderer, Material, director } from 'cc';
import { ActorState } from '../const/ActorState';
import { GameStateInput } from '../data/dynamicData/GameStateInput';
import { MathUtil } from '../utils/MathUtil';
import { OnOrEmitConst } from '../const/OnOrEmitConst';
import { RunGameInfoVo } from '../data/povo/RunGameInfoVo';
import { ProjectileManager } from './ProjectileManager';
import { Actor } from './Actor';
import { ColliderGroup } from '../const/ColliderGroup';
import { EffectManager } from './EffectManager';

const { ccclass, property } = _decorator;

@ccclass('Monster')
export class Monster extends Component {

    tempVelocity = v3();
    tempVelocity2 = v3();

    // 状态
    currState: ActorState = ActorState.Idle;

    // 角色 RVO 动态避障唯一辨识
    goalId: string = null;

    // 敌人与主角的方差距离
    distance: number = 9999;

    // 角色避障占位大小
    @property(CCInteger)
    goalSize: number = 1;

    @property(SkeletalAnimation)
    skeletalAnimation: SkeletalAnimation = null;

    @property(Node)
    messhNodes: Node[] =[];
    @property(Material)
    oldMaterial: Material = null;

    @property(Material)
    hurtMaterial: Material = null;

    // 角色刚体
    rigidbody: RigidBody = null;

    // 碰撞体
    collider: Collider = null;

    // 基础旋转角速度
    @property(CCFloat)
    angularSpeed: number = 10;

    // 遥感速度
    input:Vec3 = v3();

    // 角度旋转值
    angleInput:Vec3 = v3();
    // 默认朝向
    angleForZ : Vec3 = v3(0,0,-1);

    // 初始属性
    rungameInfo: RunGameInfoVo = new RunGameInfoVo();

    // 等級
    playerLevel:number = 1;

    //被攻击僵直
    rigidityTime: number = 0;

    // 精英标记（用于 UI 跟随与战场提示）
    isElite: boolean = false;

    // Boss 标记
    isBoss: boolean = false;

    private readonly restoreMaterialState = () => {
        for (let i = 0; i < this.messhNodes.length; i++){
            let messh = this.messhNodes[i].getComponent(MeshRenderer);
            if (messh && this.oldMaterial){
                messh.setSharedMaterial(this.oldMaterial, 0);
            }
        }
    };

    // 初始化敌人参数
    monsterInit(
        baseHP: number,
        baseAttack: number,
        hpMultiplier: number = 1,
        attackMultiplier: number = 1,
        moveSpeedMultiplier: number = 1,
        isBoss: boolean = false,
    ){
        // TODO
        this.isBoss = isBoss;
        this.isElite = !isBoss && (hpMultiplier > 1.01 || attackMultiplier > 1.01 || moveSpeedMultiplier > 1.01);
        this.rungameInfo.moveSpeed = 3 * moveSpeedMultiplier;
        this.rungameInfo.Hp = 30 * (1+baseHP) * hpMultiplier;
        this.rungameInfo.maxHp = this.rungameInfo.Hp;
        this.rungameInfo.attack = 10 * (1+baseAttack) * attackMultiplier;
        this.currState = ActorState.Idle;
    }
    start() {
        this.rigidbody = this.node.getComponent(RigidBody);
        this.collider = this.node.getComponent(Collider);

        // 投射物的碰撞
        this.collider.on("onTriggerEnter", this.onTriggerEnter, this);

        if (this.skeletalAnimation){
            this.skeletalAnimation.on(Animation.EventType.FINISHED, (
                type: Animation.EventType, state: SkeletalAnimationState) =>{
                    if (state.name == ActorState.Hit){
                    // 被攻击之后动画结束自动回到待机状态
                    this.changeState(ActorState.Idle);
                    }
                }
            );
        }
    }

    onDisable() {
        this.unschedule(this.restoreMaterialState);
        this.restoreMaterialState();
    }

    onDestroy() {
        if (this.collider){
            this.collider.off("onTriggerEnter", this.onTriggerEnter, this);
        }
        this.unschedule(this.restoreMaterialState);
    }

    update(deltaTime: number) {
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        // 旋转
        this.doRotate();
        
        if (this.currState == ActorState.Hit && this.skeletalAnimation == undefined){
            this.rigidityTime += deltaTime;
            if (this.rigidityTime >= 0.5){
                this.changeState(ActorState.Idle);
            }
        }
    }

    // 角色旋转
    doRotate(){
        this.tempVelocity.x = 0;
        this.tempVelocity.z = 0;

        // 输入朝向和当前朝向的夹角
        const angle = MathUtil.signAngle(this.node.forward, this.input, Vec3.UP);

        this.tempVelocity.y = angle * this.angularSpeed;
        this.rigidbody.setAngularVelocity(this.tempVelocity);
    }

    // 角色停止移动
    stopMove(){
        this.rigidbody.setLinearVelocity(Vec3.ZERO);
    }

    changeState(destState: ActorState){
        if (this.currState == ActorState.Die){
            return;
        }
        if (this.currState == destState){
            return;
        }

        if (destState != ActorState.Run){
            this.stopMove();
        }


        this.currState = destState;
        this.playAnimation(destState);
    }

    // 重置状态
    resetState(state: ActorState){
        this.currState = state;
        this.playAnimation(state, false);
    }

    /**
     * @param state     切换的动画态
     * @param isCross   是否需要交叉切换，默认 true
     * 播放动画
     * */ 
    playAnimation(state: ActorState, isCross: boolean = true){
        if (this.skeletalAnimation){
            if (isCross){
                this.skeletalAnimation.crossFade(state, 0.3);
            }else {
                this.skeletalAnimation.play(state);
            }
        }
        return;
    }

    onTriggerEnter(event: ICollisionEvent){
        if (!GameStateInput.canUpdateWorld()){
            return;
        }

        if (this.currState == ActorState.Die){
            return;
        }

        // 过滤非指定碰撞
        if(event.otherCollider.getGroup() == PhysicsSystem.PhysicsGroup.DEFAULT){
            return;
        }
        // TODO 分类碰撞 现在实现的是投射物碰撞
        
        let attack = null;
        
        let attackNodePostion = null;

        let masterNode = null;
        if (event.otherCollider.getGroup() == ColliderGroup.protagonistBullet){
            // 被普通攻击击中
            const projectile = event.otherCollider.getComponent(ProjectileManager);
            if (projectile == undefined){
                return;
            }
            let hostActor = projectile.host.getComponent(Actor);
            if (hostActor != undefined){
                attack = hostActor.rungameInfo.attack;
            }else {
                let monster =  projectile.host.getComponent(Monster);
                if (monster != undefined){
                    attack = monster.rungameInfo.attack;
                }
            }

            // 获取攻击点的位置
            attackNodePostion = projectile.node.worldPosition;
            // 获取发起攻击的角色
            masterNode = projectile.host;
        }
        
        if (attack == null || attack == undefined){
            return;
        }
        
        // 受击方向
        let hurtDiretion = v3();
        Vec3.subtract(hurtDiretion, this.node.worldPosition, attackNodePostion);
        hurtDiretion.normalize();
        this.hurt(attack, hurtDiretion, masterNode);
    }

    // 角色受伤
    /**
     * 
     * @param damage 攻击力
     * @param hurtDiretion 受击方向
     * @param hurtSrc 发射攻击的角色
     */
     hurt(damage: number, hurtDiretion: Vec3, hurtSrc: Node){
        if (this.rungameInfo.defense > damage){
            damage = 1;
        }else {
            damage = damage - this.rungameInfo.defense;
        }
        this.rungameInfo.Hp = this.rungameInfo.Hp - damage;
        this.node.emit(OnOrEmitConst.Onhurt, damage);
        if(this.rungameInfo.Hp <= 0){
            this.onDie();
            const expReward = this.isBoss ? 25 : (this.isElite ? 8 : 1);
            if (hurtSrc){
                hurtSrc.emit(OnOrEmitConst.OnKill, this.node, expReward, this.isElite, this.isBoss);
            }
        } else {
            this.changeState(ActorState.Hit);
        }

        EffectManager.instance.doPlayHurtNumber(damage, this.node.getWorldPosition());
        
        for (let i = 0; i < this.messhNodes.length; i++){
            let messh = this.messhNodes[i].getComponent(MeshRenderer);
            if (messh && this.hurtMaterial){
                messh.setSharedMaterial(this.hurtMaterial, 0);
            }
        }

        this.unschedule(this.restoreMaterialState);
        this.scheduleOnce(this.restoreMaterialState, 0.1);
    }

    onDie(){
        this.changeState(ActorState.Die);
        this.node.emit(OnOrEmitConst.OnDie, this.node);
    }
}


