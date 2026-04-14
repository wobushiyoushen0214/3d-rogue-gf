import { _decorator, Component, Node, macro, Vec3, CCFloat, game, ccenum, v3, math, director } from 'cc';
import { Monster } from '../../managerGame/Monster';
import { ProjectileEmitter } from '../../managerGame/ProjectileEmitter';
import { Actor } from '../../managerGame/Actor';
import { ActorState } from '../../const/ActorState';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { MathUtil } from '../../utils/MathUtil';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { PlayerTs } from './PlayerTs';
import { LevelConfig } from '../../const/LevelConfig';
const { ccclass, property, requireComponent } = _decorator;
const tempProjectileStart = v3();
const tempEnemyPos = v3();
const tempRangeForward = v3();
const tempSpreadForwardL = v3();
const tempSpreadForwardR = v3();

export enum Career{
    // 近战
    Melee = 0,
    // 远程
    Range = 1,
}
ccenum(Career);
@ccclass('EnemyTS')
@requireComponent(Monster)
export class EnemyTS extends Component {

    monster: Monster = null;

    // 敌人攻击范围
    @property(CCFloat)
    attackRange: number = 2.5;

    // 敌人攻击间隔
    @property(CCFloat)
    attackInterval: number = 5;

    // 碰撞间隔
    crashInterval: number = 1.5;

    // 上一次攻击时间
    lastAttckTime: number = 0;

    // 上一次碰撞时间
    lastCrash: number = 0;

    @property({type: Career})
    career:Career = Career.Melee;

    // 远程需要投射物发射器
    projectileEmitter: ProjectileEmitter = null;

    // 投射物起点
    @property(Node)
    projectleStartNode: Node = null;

    // 精英冲刺间隔（秒）
    @property(CCFloat)
    eliteDashInterval: number = 7;

    // 精英冲刺持续时间（秒）
    @property(CCFloat)
    eliteDashDuration: number = 0.7;

    // 精英冲刺移速倍率
    @property(CCFloat)
    eliteDashSpeedMultiplier: number = 2.2;

    // 精英远程扇形角度（度）
    @property(CCFloat)
    eliteRangeSpreadAngle: number = 15;

    // 精英远程扇形弹数量（含中间主弹）
    @property
    eliteRangeProjectileCount: number = 5;

    // 代码屎山维护负担强度（作用于主角攻击间隔倍率）
    @property(CCFloat)
    eliteBurdenScale: number = 1.3;

    // 代码屎山维护负担持续时间（秒）
    @property(CCFloat)
    eliteBurdenDuration: number = 2.6;

    private baseAttackRange: number = 0;
    private baseAttackInterval: number = 0;
    private runtimeEliteConfigured = false;
    private eliteDashRemainTime = 0;
    private eliteLastDashTime = 0;
    private eliteDashBaseMoveSpeed = 0;

    // 需求变更单 S 形走位
    private reqChangeZigzagInterval = 1.8;
    private reqChangeZigzagAngle = 55;
    private reqChangeZigzagTimer = 0;
    private reqChangeZigzagSign = 1;

    // ---- 冲锋怪状态 ----
    private chargeState: 'idle' | 'windup' | 'charging' | 'stunned' = 'idle';
    private chargeWindupTime = 1.5;
    private chargeDuration = 0.6;
    private chargeSpeedMultiplier = 4.0;
    private chargeStunTime = 1.5;
    private chargeTimer = 0;
    private chargeCooldown = 6.0;
    private chargeLastTime = 0;
    private chargeDirection = v3();
    private chargeBaseMoveSpeed = 0;

    // ---- 自爆怪状态 ----
    private selfDestructFuseTime = 1.5;
    private selfDestructRadius = 3.0;
    private selfDestructDamageMultiplier = 3.0;
    private selfDestructFuseTimer = 0;
    private selfDestructFuseActive = false;
    private selfDestructFlashTimer = 0;

    start() {

        this.monster = this.node.getComponent(Monster);
        this.baseAttackRange = this.attackRange;
        this.baseAttackInterval = this.attackInterval;
        const level = LevelConfig.getLevel();
        this.eliteBurdenScale = level?.EliteBurdenScale ?? this.eliteBurdenScale;
        this.eliteBurdenDuration = level?.EliteBurdenDuration ?? this.eliteBurdenDuration;
        this.reqChangeZigzagInterval = level?.ReqChangeZigzagInterval ?? this.reqChangeZigzagInterval;
        this.reqChangeZigzagAngle = level?.ReqChangeZigzagAngle ?? this.reqChangeZigzagAngle;

        // 冲锋怪配置
        this.chargeWindupTime = level?.ChargeEnemyWindupTime ?? 1.5;
        this.chargeDuration = level?.ChargeEnemyChargeDuration ?? 0.6;
        this.chargeSpeedMultiplier = level?.ChargeEnemySpeedMultiplier ?? 4.0;
        this.chargeStunTime = level?.ChargeEnemyStunTime ?? 1.5;
        this.chargeCooldown = level?.ChargeEnemyCooldown ?? 6.0;

        // 自爆怪配置
        this.selfDestructFuseTime = level?.SelfDestructFuseTime ?? 1.5;
        this.selfDestructRadius = level?.SelfDestructRadius ?? 3.0;
        this.selfDestructDamageMultiplier = level?.SelfDestructDamageMultiplier ?? 3.0;

        this.node.on("onFrameAttack", this.onFrameAttack, this);
        this.schedule(this.excuteSAI, 1, macro.REPEAT_FOREVER, 1.0);

        if (this.career == Career.Range){
            this.projectileEmitter = this.node.getComponent(ProjectileEmitter);
        }
    }

    onEnable() {
        this.lastAttckTime = 0;
        this.lastCrash = 0;
        this.eliteDashRemainTime = 0;
        this.eliteLastDashTime = 0;
        this.eliteDashBaseMoveSpeed = 0;
        this.reqChangeZigzagTimer = 0;
        this.reqChangeZigzagSign = 1;
        this.chargeState = 'idle';
        this.chargeTimer = 0;
        this.chargeLastTime = 0;
        this.selfDestructFuseTimer = 0;
        this.selfDestructFuseActive = false;
        this.selfDestructFlashTimer = 0;
    }

    onDestroy() {
        this.node.off("onFrameAttack", this.onFrameAttack, this);
        this.unschedule(this.excuteSAI);
    }

    update(deltaTime: number) {
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        if (!this.monster){
            return;
        }

        // 需求变更单 S 形走位计时
        if (this.monster.isReqChange && this.monster.currState !== ActorState.Die){
            this.reqChangeZigzagTimer += deltaTime;
            if (this.reqChangeZigzagTimer >= this.reqChangeZigzagInterval){
                this.reqChangeZigzagTimer = 0;
                this.reqChangeZigzagSign *= -1;
            }
        }

        // 冲锋怪状态机
        if (this.monster.isChargeEnemy && this.monster.currState !== ActorState.Die) {
            this.updateChargeEnemy(deltaTime);
        }

        // 自爆怪引信
        if (this.monster.isSelfDestruct && this.monster.currState !== ActorState.Die) {
            this.updateSelfDestruct(deltaTime);
        }

        if (!this.monster.isElite){
            return;
        }
        if (this.eliteDashRemainTime <= 0){
            return;
        }
        if (this.monster.currState == ActorState.Die){
            this.stopEliteDash();
            return;
        }

        this.eliteDashRemainTime -= deltaTime;
        const target = MonsterManager.instance.player;
        if (target){
            this.moveTowardTarget(target);
        }
        if (this.eliteDashRemainTime <= 0){
            this.stopEliteDash();
        }
    }

    excuteSAI() {
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        this.syncEliteRuntimeConfig();

        // 冲锋怪在非 idle 状态时不走普通 AI
        if (this.monster.isChargeEnemy && this.chargeState !== 'idle') {
            return;
        }

        // 自爆怪引信激活后不走普通 AI
        if (this.monster.isSelfDestruct && this.selfDestructFuseActive) {
            return;
        }

        let target = MonsterManager.instance.player;
        if (target == null){
            return;
        }
        let playerActor = target.getComponent(Actor);

        if( playerActor.currState == ActorState.Die){
            return;
        }

        if (this.monster.currState == ActorState.Hit || this.monster.currState == ActorState.Die){
            return;
        }

        // 计算当前角色与主角之间的距离
        const distance = Vec3.distance(this.node.worldPosition, target.worldPosition);

        if (this.monster.isElite && this.eliteDashRemainTime > 0){
            this.moveTowardTarget(target);
            return;
        }

        if (this.monster.isElite && this.career == Career.Melee){
            const canDash = game.totalTime - this.eliteLastDashTime >= this.eliteDashInterval;
            if (canDash && distance > this.attackRange * 0.9){
                this.beginEliteDash();
                this.moveTowardTarget(target);
                return;
            }
        }

        // 如果主角在攻击范围，则开始攻击
        if (distance > this.attackRange){
            this.moveTowardTarget(target);
            return;
        }
        
        this.monster.input.set(0,0,0);
        // 如果游戏时间 - 上一次攻击时间 > 攻击间隔，角色可以攻击
        if (game.totalTime - this.lastAttckTime > this.attackInterval){

            // 将敌人朝向玩家
            Vec3.subtract(this.monster.input, target.worldPosition, this.node.worldPosition);
            this.monster.input.normalize();
            this.monster.input.y = 0;

            // 让敌人进入攻击状态
            this.monster.changeState(ActorState.Attack);
            this.lastAttckTime = game.totalTime;
            return;
        }

        this.monster.changeState(ActorState.Idle);
    }

    // 碰撞傷害
    triggerHurt(){
        // 碰撞伤害
        this.hurtPlayer(this.monster.rungameInfo.attack);
        this.lastCrash = game.totalTime;
    }

    onFrameAttack(){
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        //1. 近战 直接造成伤害
        if (this.career == Career.Melee){
            this.hurtPlayer(this.monster.rungameInfo.attack);
            return;
        }

        // 不同的攻击方式
        let target = MonsterManager.instance.player;
        if(target == null){
            return;
        }
        
        // 伤害方向
        let hurtDirection = v3();
        Vec3.subtract(hurtDirection, target.worldPosition, this.node.worldPosition);

        hurtDirection.normalize();
        hurtDirection.y = 0;

        // 2. 远程
        if(this.career == Career.Range){
            Vec3.copy(tempRangeForward, hurtDirection);
            this.fireRangeProjectile(tempRangeForward, target, true);

            if (this.monster.isElite){
                director.getScene().emit(OnOrEmitConst.OnEliteCast, "spread", this.node.worldPosition);
                const projectileCount = Math.max(3, Math.floor(this.eliteRangeProjectileCount));
                const pairCount = Math.floor((projectileCount - 1) / 2);
                const stepRad = math.toRadian(this.eliteRangeSpreadAngle);
                for (let i = 1; i <= pairCount; i++){
                    const rad = stepRad * i;
                    MathUtil.rotateAround(tempSpreadForwardL, tempRangeForward, Vec3.UP, -rad);
                    MathUtil.rotateAround(tempSpreadForwardR, tempRangeForward, Vec3.UP, rad);
                    this.fireRangeProjectile(tempSpreadForwardL, null, false);
                    this.fireRangeProjectile(tempSpreadForwardR, null, false);
                }
            }
        }
    }

    // 近战或者碰撞伤害
    hurtPlayer(hurtNumber: number, isCrash: boolean = false){
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        let target = MonsterManager.instance.player;
        if(target == null){
            return;
        }
        
        // 伤害方向
        let hurtDirection = v3();
        Vec3.subtract(hurtDirection, target.worldPosition, this.node.worldPosition);

        let playerActor = target.getComponent(Actor);
        if (isCrash) {
            // 碰撞造成自身防御值的伤害
            playerActor.hurt(hurtNumber, hurtDirection, this.node);
            this.tryApplyMaintenanceBurden(target);
            this.node.getComponent(Monster).hurt(hurtNumber, v3(-hurtDirection.x, hurtDirection.y, -hurtDirection.z), target);
        }else {
            // 敌人与主角的距离
            let distance = hurtDirection.length();
            hurtDirection.normalize();
            hurtDirection.y = 0;

            //直接造成伤害
            if (distance < this.attackRange){
                // 敌人与主角所在的角度
                const angle = Vec3.angle(hurtDirection, this.node.forward);
                if (angle < Math.PI){
                    playerActor.hurt(hurtNumber, hurtDirection, this.node);
                    this.tryApplyMaintenanceBurden(target);
                }
            }
        }
    }

    private resolveProjectileStart(out: Vec3): Vec3{
        this.node.getWorldPosition(tempEnemyPos);
        if (this.projectleStartNode && this.projectleStartNode.isValid){
            this.projectleStartNode.getWorldPosition(out);
            if (Vec3.distance(out, tempEnemyPos) < 6){
                return out;
            }
        }
        out.set(tempEnemyPos);
        out.y += 1.0;
        return out;
    }

    private moveTowardTarget(target: Node){
        Vec3.subtract(this.monster.input, target.worldPosition, this.node.worldPosition);
        this.monster.input.y = 0;
        this.monster.input.normalize();

        // 需求变更单：在追踪方向上叠加 S 形偏移
        if (this.monster.isReqChange && this.eliteDashRemainTime <= 0){
            const zigzagRad = math.toRadian(this.reqChangeZigzagAngle * this.reqChangeZigzagSign);
            const cosA = Math.cos(zigzagRad);
            const sinA = Math.sin(zigzagRad);
            const ox = this.monster.input.x;
            const oz = this.monster.input.z;
            this.monster.input.x = ox * cosA - oz * sinA;
            this.monster.input.z = ox * sinA + oz * cosA;
            this.monster.input.normalize();
        }

        this.monster.changeState(ActorState.Run);
    }

    private fireRangeProjectile(forward: Vec3, target: Node = null, trace: boolean = true){
        if (!this.projectileEmitter){
            return;
        }
        const projectile = this.projectileEmitter.create();
        projectile.startTime = 0;
        projectile.host = this.node;
        projectile.target = trace ? target : null;
        projectile.projectileProperty.isTrace = trace && !!target;
        projectile.projectileProperty.penetration = this.monster?.isElite ? 2 : 1;
        projectile.node.worldPosition = this.resolveProjectileStart(tempProjectileStart);
        projectile.node.forward = forward;
    }

    private beginEliteDash(){
        this.eliteLastDashTime = game.totalTime;
        this.eliteDashRemainTime = this.eliteDashDuration;
        this.eliteDashBaseMoveSpeed = Math.max(this.monster.rungameInfo.moveSpeed, 0.1);
        this.monster.rungameInfo.moveSpeed = this.eliteDashBaseMoveSpeed * this.eliteDashSpeedMultiplier;
        director.getScene().emit(OnOrEmitConst.OnEliteCast, "dash", this.node.worldPosition);
    }

    private stopEliteDash(){
        this.eliteDashRemainTime = 0;
        if (this.eliteDashBaseMoveSpeed > 0){
            this.monster.rungameInfo.moveSpeed = this.eliteDashBaseMoveSpeed;
        }
    }

    private syncEliteRuntimeConfig(){
        if (!this.monster){
            return;
        }

        if (this.monster.isElite){
            if (!this.runtimeEliteConfigured){
                this.runtimeEliteConfigured = true;
                this.attackRange = this.baseAttackRange + (this.career == Career.Melee ? 0.8 : 1.2);
                this.attackInterval = Math.max(0.8, this.baseAttackInterval * 0.75);
            }
            return;
        }

        if (this.runtimeEliteConfigured){
            this.runtimeEliteConfigured = false;
            this.attackRange = this.baseAttackRange;
            this.attackInterval = this.baseAttackInterval;
            this.stopEliteDash();
        }
    }

    private tryApplyMaintenanceBurden(target: Node){
        if (!this.monster?.isElite || !target){
            return;
        }
        const playerTs = target.getComponent(PlayerTs);
        if (!playerTs){
            return;
        }
        playerTs.applyMaintenanceBurden(this.eliteBurdenScale, this.eliteBurdenDuration, "代码屎山");
    }

    // ---- 冲锋怪行为 ----
    private updateChargeEnemy(deltaTime: number) {
        const target = MonsterManager.instance.player;
        if (!target) {
            return;
        }

        switch (this.chargeState) {
            case 'idle': {
                const distance = Vec3.distance(this.node.worldPosition, target.worldPosition);
                const canCharge = game.totalTime - this.chargeLastTime >= this.chargeCooldown;
                if (canCharge && distance < 12 && distance > this.attackRange) {
                    this.chargeState = 'windup';
                    this.chargeTimer = this.chargeWindupTime;
                    this.monster.stopMove();
                    // 蓄力视觉：缩放脉冲
                    const s = this.node.scale;
                    this.node.setScale(s.x * 0.9, s.y * 1.15, s.z * 0.9);
                }
                break;
            }
            case 'windup': {
                this.chargeTimer -= deltaTime;
                // 蓄力期间持续面朝玩家
                Vec3.subtract(this.monster.input, target.worldPosition, this.node.worldPosition);
                this.monster.input.y = 0;
                this.monster.input.normalize();
                if (this.chargeTimer <= 0) {
                    // 记录冲刺方向
                    Vec3.copy(this.chargeDirection, this.monster.input);
                    this.chargeState = 'charging';
                    this.chargeTimer = this.chargeDuration;
                    this.chargeBaseMoveSpeed = Math.max(this.monster.rungameInfo.moveSpeed, 0.1);
                    this.monster.rungameInfo.moveSpeed = this.chargeBaseMoveSpeed * this.chargeSpeedMultiplier;
                    // 恢复缩放
                    const s = this.node.scale;
                    this.node.setScale(s.x / 0.9, s.y / 1.15, s.z / 0.9);
                }
                break;
            }
            case 'charging': {
                this.chargeTimer -= deltaTime;
                // 沿固定方向冲刺
                this.monster.input.set(this.chargeDirection);
                this.monster.changeState(ActorState.Run);
                // 检测是否命中玩家
                const dist = Vec3.distance(this.node.worldPosition, target.worldPosition);
                if (dist < this.attackRange * 1.2) {
                    this.hurtPlayer(this.monster.rungameInfo.attack * 1.5, false);
                    director.getScene()?.emit(OnOrEmitConst.OnChargeEnemyImpact, this.node.worldPosition);
                    this.enterChargeStun();
                    return;
                }
                if (this.chargeTimer <= 0) {
                    this.enterChargeStun();
                }
                break;
            }
            case 'stunned': {
                this.chargeTimer -= deltaTime;
                this.monster.stopMove();
                if (this.chargeTimer <= 0) {
                    this.chargeState = 'idle';
                    this.chargeLastTime = game.totalTime;
                }
                break;
            }
        }
    }

    private enterChargeStun() {
        this.chargeState = 'stunned';
        this.chargeTimer = this.chargeStunTime;
        if (this.chargeBaseMoveSpeed > 0) {
            this.monster.rungameInfo.moveSpeed = this.chargeBaseMoveSpeed;
        }
        this.monster.stopMove();
        this.monster.changeState(ActorState.Idle);
    }

    // ---- 自爆怪行为 ----
    private updateSelfDestruct(deltaTime: number) {
        const target = MonsterManager.instance.player;
        if (!target) {
            return;
        }

        const distance = Vec3.distance(this.node.worldPosition, target.worldPosition);

        if (!this.selfDestructFuseActive) {
            // 接近玩家时启动引信
            if (distance < this.selfDestructRadius) {
                this.selfDestructFuseActive = true;
                this.selfDestructFuseTimer = this.selfDestructFuseTime;
                this.selfDestructFlashTimer = 0;
                this.monster.stopMove();
            }
            return;
        }

        // 引信倒计时
        this.selfDestructFuseTimer -= deltaTime;
        // 闪烁视觉提示
        this.selfDestructFlashTimer += deltaTime;
        const flashRate = Math.max(0.1, this.selfDestructFuseTimer * 0.3);
        const isFlashOn = Math.floor(this.selfDestructFlashTimer / flashRate) % 2 === 0;
        const baseScale = this.node.scale.x > 0 ? Math.abs(this.node.scale.x) : 1;
        const flashScale = isFlashOn ? 1.15 : 0.9;
        this.node.setScale(baseScale * flashScale, baseScale * flashScale, baseScale * flashScale);

        if (this.selfDestructFuseTimer <= 0) {
            this.executeSelfDestruct();
        }
    }

    private executeSelfDestruct() {
        const target = MonsterManager.instance.player;
        if (target) {
            const distance = Vec3.distance(this.node.worldPosition, target.worldPosition);
            if (distance < this.selfDestructRadius) {
                const damage = this.monster.rungameInfo.attack * this.selfDestructDamageMultiplier;
                const hurtDir = v3();
                Vec3.subtract(hurtDir, target.worldPosition, this.node.worldPosition);
                hurtDir.normalize();
                const playerActor = target.getComponent(Actor);
                if (playerActor) {
                    playerActor.hurt(damage, hurtDir, this.node);
                }
            }
        }
        director.getScene()?.emit(OnOrEmitConst.OnSelfDestructExplode, this.node.worldPosition);
        // 自爆后自身死亡
        this.monster.rungameInfo.Hp = 0;
        this.monster.onDie();
    }
}


