import { _decorator, Component, Node, SkeletalAnimation, Animation, RigidBody, Collider, v3, CCFloat, Vec3, ICollisionEvent, PhysicsSystem, SkeletalAnimationState, AnimationState, SkinnedMeshBatchRenderer, SkinnedMeshRenderer, Color, game, director } from 'cc';
import { ActorState } from '../const/ActorState';
import { GameStateInput } from '../data/dynamicData/GameStateInput';
import { MathUtil } from '../utils/MathUtil';
import { LevelConfig } from '../const/LevelConfig';
import { OnOrEmitConst } from '../const/OnOrEmitConst';
import { RunGameInfoVo } from '../data/povo/RunGameInfoVo';
import { ProjectileManager } from './ProjectileManager';
import { Monster } from './Monster';
import { ColliderGroup } from '../const/ColliderGroup';

const { ccclass, property } = _decorator;

@ccclass('Actor')
export class Actor extends Component {

    tempVelocity = v3();
    tempVelocity2 = v3();

    // 状态
    currState: ActorState = ActorState.Idle;

    @property(SkeletalAnimation)
    skeletalAnimation: SkeletalAnimation = null;

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

    // 碰撞伤害 1S 只能触发一次
    private isCrash: boolean = false;

    start() {
        this.rigidbody = this.node.getComponent(RigidBody);
        this.collider = this.node.getComponent(Collider);

        // 投射物的碰撞
        this.collider.on("onTriggerEnter", this.onTriggerEnter, this);
        this.collider.on('onCollisionStay', this.onCollision, this)

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

    update(deltaTime: number) {

        let a = game.totalTime;
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        switch(this.currState){
        case ActorState.Run:
            // 刚体运动
            this.doMove();
            break;
        }
        // 主角旋转
        this.playerDoRotate();      
    }

    // 角色旋转
    playerDoRotate(){
        this.tempVelocity.x = 0;
        this.tempVelocity.z = 0;

        // 输入朝向和当前朝向的夹角
        let angleIn: Vec3 = this.angleInput;
        
        const angle = MathUtil.signAngle(this.node.forward, angleIn, Vec3.UP);

        this.tempVelocity.y = angle * this.angularSpeed;
        this.rigidbody.setAngularVelocity(this.tempVelocity);
    }

    // 角色运动
    doMove(){
        // 速度 = 方向(node.forward) * 基础速度 * 因子(遥感输入(加速度))
        const speed = this.input.length() * this.rungameInfo.moveSpeed;
    
        this.tempVelocity = this.input;
        this.tempVelocity.normalize();
        this.tempVelocity.x = this.tempVelocity.x * speed;
        this.tempVelocity.z = this.tempVelocity.z * speed;
        
        
        this.rigidbody.getLinearVelocity(this.tempVelocity2);
        this.tempVelocity.y = this.tempVelocity2.y;
        // 设置刚体的线性运动速度
        this.rigidbody.setLinearVelocity(this.tempVelocity);
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

    onCollision(event: ICollisionEvent){
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
        
        // 主角撞上敌人受伤
        if (event.otherCollider.getGroup() == ColliderGroup.monster){
            if (this.isCrash){
                return;
            }
            this.isCrash = true;
            this.scheduleOnce(()=>{
                this.isCrash = false;
            }, 1);
            const monster = event.otherCollider.getComponent(Monster);
            if (monster == undefined){
                return;
            }

            let attack = monster.rungameInfo.attack;
            // 碰撞伤害为 2/3
            attack = attack * 0.66;

            if (attack == null || attack == undefined){
                return;
            }
    
            // 受击方向
            let hurtDiretion = v3();
            Vec3.subtract(hurtDiretion, this.node.worldPosition, monster.node.worldPosition);
            hurtDiretion.normalize();

            // 主角受伤
            this.hurt(attack, hurtDiretion, this.node);

            // 敌人同样受伤 敌人受到护甲的反伤
            monster.hurt(this.rungameInfo.defense * 0.66, hurtDiretion, monster.node);
        }
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
        
        const projectile = event.otherCollider.getComponent(ProjectileManager);
        if (projectile == undefined){
            return;
        }

        let attack = null;
      
        let monster =  projectile.host.getComponent(Monster);
        if (monster != undefined){
            attack = monster.rungameInfo.attack;
        }
        
        if (attack == null || attack == undefined){
            return;
        }

        // 受击方向
        let hurtDiretion = v3();
        Vec3.subtract(hurtDiretion, this.node.worldPosition, projectile.node.worldPosition);
        hurtDiretion.normalize();
        this.hurt(attack, hurtDiretion, projectile.host);
    }

    // 角色受伤
    /**
     * 
     * @param damage 攻击力
     * @param hurtDiretion 受击方向
     * @param hurtSrc 被攻击角色
     */
     hurt(damage: number, hurtDiretion: Vec3, hurtSrc: Node){
        if (this.rungameInfo.defense > damage){
            damage = 1;
        }else {
            damage = damage - this.rungameInfo.defense;
        }

        this.rungameInfo.Hp = this.rungameInfo.Hp -damage;
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, this.rungameInfo.Hp / this.rungameInfo.maxHp);

        if(this.rungameInfo.Hp <= 0){
            this.onDie();
            hurtSrc.emit(OnOrEmitConst.OnKill, this);
        } else {
            // 视情况而定，是播放受击动画，还是改变屏幕颜色
            // this.changeState(ActorState.Hit);
        }

        // 对角色受击施加冲量，让角色拥有打击感
        hurtDiretion.multiplyScalar(5.0);
        this.rigidbody.applyImpulse(hurtDiretion);

        //
        console.log("啊，主角受伤了"+ damage);
        
    }

    onDie(){
        this.node.emit(OnOrEmitConst.PlayerOnDie, this.node);
        this.changeState(ActorState.Die);
    }
}


