import { _decorator, Animation, CCFloat, CCInteger, Collider, Component, ICollisionEvent, Material, MeshRenderer, Node, PhysicsSystem, RigidBody, SkeletalAnimation, SkeletalAnimationState, Vec3, v3 } from 'cc';
import { ActorState } from '../const/ActorState';
import { ColliderGroup } from '../const/ColliderGroup';
import { OnOrEmitConst } from '../const/OnOrEmitConst';
import { GameStateInput } from '../data/dynamicData/GameStateInput';
import { RunGameInfoVo } from '../data/povo/RunGameInfoVo';
import { MathUtil } from '../utils/MathUtil';
import { Actor } from './Actor';
import { EffectManager } from './EffectManager';
import { ProjectileManager } from './ProjectileManager';
import type { PlayerTs } from '../view/game/PlayerTs';

const { ccclass, property } = _decorator;

@ccclass('Monster')
export class Monster extends Component {
    tempVelocity = v3();
    tempVelocity2 = v3();

    currState: ActorState = ActorState.Idle;
    goalId: string = null;
    distance: number = 9999;

    @property(CCInteger)
    goalSize: number = 1;

    @property(SkeletalAnimation)
    skeletalAnimation: SkeletalAnimation = null;

    @property(Node)
    messhNodes: Node[] = [];

    @property(Material)
    oldMaterial: Material = null;

    @property(Material)
    hurtMaterial: Material = null;

    rigidbody: RigidBody = null;
    collider: Collider = null;

    @property(CCFloat)
    angularSpeed: number = 10;

    input: Vec3 = v3();
    angleInput: Vec3 = v3();
    angleForZ: Vec3 = v3(0, 0, -1);

    rungameInfo: RunGameInfoVo = new RunGameInfoVo();
    playerLevel: number = 1;
    rigidityTime = 0;
    isElite = false;
    isBoss = false;
    runtimeMoveSpeedScale = 1;
    isCodeReviewMarked = false;
    codeReviewExpMultiplier = 1;
    isTechDebt = false;
    isReqChange = false;

    private readonly restoreMaterialState = () => {
        for (let i = 0; i < this.messhNodes.length; i++) {
            const messh = this.messhNodes[i].getComponent(MeshRenderer);
            if (messh && this.oldMaterial) {
                messh.setSharedMaterial(this.oldMaterial, 0);
            }
        }
    };

    monsterInit(
        baseHP: number,
        baseAttack: number,
        hpMultiplier: number = 1,
        attackMultiplier: number = 1,
        moveSpeedMultiplier: number = 1,
        isBoss: boolean = false,
    ) {
        const resolvedBaseHp = Number.isFinite(baseHP) ? baseHP : 0;
        const resolvedBaseAttack = Number.isFinite(baseAttack) ? baseAttack : 0;
        const resolvedHpMultiplier = Number.isFinite(hpMultiplier) ? hpMultiplier : 1;
        const resolvedAttackMultiplier = Number.isFinite(attackMultiplier) ? attackMultiplier : 1;
        const resolvedMoveSpeedMultiplier = Number.isFinite(moveSpeedMultiplier) ? moveSpeedMultiplier : 1;

        this.isBoss = isBoss;
        this.isElite = !isBoss && (
            resolvedHpMultiplier > 1.01 ||
            resolvedAttackMultiplier > 1.01 ||
            resolvedMoveSpeedMultiplier > 1.01
        );
        this.runtimeMoveSpeedScale = 1;
        this.rigidityTime = 0;
        this.distance = 9999;
        this.input.set(0, 0, 0);

        this.rungameInfo.moveSpeed = 3 * resolvedMoveSpeedMultiplier;
        this.rungameInfo.Hp = 30 * (1 + resolvedBaseHp) * resolvedHpMultiplier;
        this.rungameInfo.maxHp = this.rungameInfo.Hp;
        this.rungameInfo.attack = 10 * (1 + resolvedBaseAttack) * resolvedAttackMultiplier;
        this.rungameInfo.defense = Number.isFinite(this.rungameInfo.defense) ? this.rungameInfo.defense : 0;
        this.currState = ActorState.Idle;

        this.rigidbody?.setLinearVelocity(Vec3.ZERO);
        this.rigidbody?.setAngularVelocity(Vec3.ZERO);
    }

    start() {
        this.rigidbody = this.node.getComponent(RigidBody);
        this.collider = this.node.getComponent(Collider);

        this.collider?.on('onTriggerEnter', this.onTriggerEnter, this);

        if (this.skeletalAnimation) {
            this.skeletalAnimation.on(
                Animation.EventType.FINISHED,
                (_type: Animation.EventType, state: SkeletalAnimationState) => {
                    if (state.name === ActorState.Hit) {
                        this.changeState(ActorState.Idle);
                    }
                },
                this,
            );
        }
    }

    onDisable() {
        this.unschedule(this.restoreMaterialState);
        this.restoreMaterialState();
    }

    onDestroy() {
        if (this.collider) {
            this.collider.off('onTriggerEnter', this.onTriggerEnter, this);
        }
        this.unschedule(this.restoreMaterialState);
    }

    update(deltaTime: number) {
        if (!GameStateInput.canUpdateWorld()) {
            return;
        }

        this.doRotate();

        if (this.currState === ActorState.Hit && this.skeletalAnimation == undefined) {
            this.rigidityTime += deltaTime;
            if (this.rigidityTime >= 0.5) {
                this.changeState(ActorState.Idle);
            }
        }
    }

    doRotate() {
        if (!this.rigidbody) {
            return;
        }

        this.tempVelocity.x = 0;
        this.tempVelocity.z = 0;

        if (
            !Number.isFinite(this.input.x) ||
            !Number.isFinite(this.input.y) ||
            !Number.isFinite(this.input.z) ||
            this.input.lengthSqr() <= 0.000001
        ) {
            this.tempVelocity.y = 0;
            this.rigidbody.setAngularVelocity(this.tempVelocity);
            return;
        }

        const angle = MathUtil.signAngle(this.node.forward, this.input, Vec3.UP);
        if (!Number.isFinite(angle)) {
            this.tempVelocity.y = 0;
            this.rigidbody.setAngularVelocity(this.tempVelocity);
            return;
        }

        this.tempVelocity.y = angle * this.angularSpeed;
        this.rigidbody.setAngularVelocity(this.tempVelocity);
    }

    stopMove() {
        this.rigidbody?.setLinearVelocity(Vec3.ZERO);
    }

    changeState(destState: ActorState) {
        if (this.currState === ActorState.Die) {
            return;
        }
        if (this.currState === destState) {
            return;
        }

        if (destState !== ActorState.Run) {
            this.stopMove();
        }

        this.currState = destState;
        this.playAnimation(destState);
    }

    resetState(state: ActorState) {
        this.currState = state;
        this.playAnimation(state, false);
    }

    playAnimation(state: ActorState, isCross: boolean = true) {
        if (!this.skeletalAnimation) {
            return;
        }
        if (isCross) {
            this.skeletalAnimation.crossFade(state, 0.3);
        } else {
            this.skeletalAnimation.play(state);
        }
    }

    onTriggerEnter(event: ICollisionEvent) {
        if (!GameStateInput.canUpdateWorld() || this.currState === ActorState.Die) {
            return;
        }
        if (event.otherCollider.getGroup() === PhysicsSystem.PhysicsGroup.DEFAULT) {
            return;
        }

        let attack: number = null;
        let attackNodePostion: Vec3 = null;
        let masterNode: Node = null;

        if (event.otherCollider.getGroup() === ColliderGroup.protagonistBullet) {
            const projectile = event.otherCollider.getComponent(ProjectileManager);
            if (projectile == undefined || !projectile.host || !projectile.host.isValid) {
                return;
            }

            const playerTs = projectile.host.getComponent('PlayerTs') as PlayerTs | null;
            const hostActor = projectile.host.getComponent(Actor);
            if (hostActor != undefined) {
                attack = hostActor.rungameInfo.attack;
                if (playerTs) {
                    attack = playerTs.adjustOutgoingDamage(attack, this, projectile);
                }
            } else {
                const monster = projectile.host.getComponent(Monster);
                if (monster != undefined) {
                    attack = monster.rungameInfo.attack;
                }
            }

            attackNodePostion = projectile.node.worldPosition;
            masterNode = projectile.host;
        }

        if (attack == null || attack == undefined || !attackNodePostion) {
            return;
        }

        const hurtDirection = v3();
        Vec3.subtract(hurtDirection, this.node.worldPosition, attackNodePostion);
        hurtDirection.normalize();
        this.hurt(attack, hurtDirection, masterNode);

        const playerTs = masterNode?.isValid ? masterNode.getComponent('PlayerTs') as PlayerTs | null : null;
        if (playerTs && event.otherCollider.getGroup() === ColliderGroup.protagonistBullet) {
            const projectile = event.otherCollider.getComponent(ProjectileManager);
            playerTs.onProjectileHitMonster(this, attack, projectile);
        }
    }

    hurt(damage: number, hurtDiretion: Vec3, hurtSrc: Node) {
        if (!Number.isFinite(damage)) {
            damage = 1;
        }
        if (!Number.isFinite(this.rungameInfo.maxHp) || this.rungameInfo.maxHp <= 0) {
            this.rungameInfo.maxHp = 1;
        }
        if (!Number.isFinite(this.rungameInfo.Hp)) {
            this.rungameInfo.Hp = this.rungameInfo.maxHp;
        }
        if (!Number.isFinite(this.rungameInfo.defense) || this.rungameInfo.defense < 0) {
            this.rungameInfo.defense = 0;
        }

        if (this.rungameInfo.defense > damage) {
            damage = 1;
        } else {
            damage = damage - this.rungameInfo.defense;
        }

        damage = Math.max(1, damage);
        this.rungameInfo.Hp = Math.max(0, this.rungameInfo.Hp - damage);
        this.node.emit(OnOrEmitConst.Onhurt, damage);

        if (this.rungameInfo.Hp <= 0) {
            const deathPos = v3(this.node.worldPosition.x, this.node.worldPosition.y, this.node.worldPosition.z);
            this.onDie();
            let expReward = this.isBoss ? 25 : (this.isElite ? 8 : 1);
            if (this.isCodeReviewMarked) {
                expReward = Math.floor(expReward * this.codeReviewExpMultiplier);
                this.isCodeReviewMarked = false;
            }
            if (hurtSrc && hurtSrc.isValid) {
                hurtSrc.emit(OnOrEmitConst.OnKill, this.node, expReward, this.isElite, this.isBoss, deathPos);
            }
        } else {
            this.changeState(ActorState.Hit);
        }

        EffectManager.instance.doPlayHurtNumber(damage, this.node.getWorldPosition());

        for (let i = 0; i < this.messhNodes.length; i++) {
            const messh = this.messhNodes[i].getComponent(MeshRenderer);
            if (messh && this.hurtMaterial) {
                messh.setSharedMaterial(this.hurtMaterial, 0);
            }
        }

        this.unschedule(this.restoreMaterialState);
        this.scheduleOnce(this.restoreMaterialState, 0.1);
    }

    onDie() {
        this.changeState(ActorState.Die);
        this.node.emit(OnOrEmitConst.OnDie, this.node);
    }
}
