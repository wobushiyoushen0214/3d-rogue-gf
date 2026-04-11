import { _decorator, Animation, CCFloat, Collider, Component, director, game, ICollisionEvent, Node, PhysicsSystem, RigidBody, SkeletalAnimation, SkeletalAnimationState, v3, Vec3 } from 'cc';
import { ActorState } from '../const/ActorState';
import { ColliderGroup } from '../const/ColliderGroup';
import { OnOrEmitConst } from '../const/OnOrEmitConst';
import { GameStateInput } from '../data/dynamicData/GameStateInput';
import { RunGameInfoVo } from '../data/povo/RunGameInfoVo';
import { MathUtil } from '../utils/MathUtil';
import { Monster } from './Monster';
import { ProjectileManager } from './ProjectileManager';
import type { PlayerTs } from '../view/game/PlayerTs';

const { ccclass, property } = _decorator;

@ccclass('Actor')
export class Actor extends Component {
    tempVelocity = v3();
    tempVelocity2 = v3();

    currState: ActorState = ActorState.Idle;

    @property(SkeletalAnimation)
    skeletalAnimation: SkeletalAnimation = null;

    rigidbody: RigidBody = null;
    collider: Collider = null;

    @property(CCFloat)
    angularSpeed: number = 10;

    input: Vec3 = v3();
    angleInput: Vec3 = v3();
    angleForZ: Vec3 = v3(0, 0, -1);

    rungameInfo: RunGameInfoVo = new RunGameInfoVo();
    playerLevel: number = 1;

    private isCrash = false;

    start() {
        this.rigidbody = this.node.getComponent(RigidBody);
        this.collider = this.node.getComponent(Collider);

        this.collider?.on('onTriggerEnter', this.onTriggerEnter, this);
        this.collider?.on('onCollisionStay', this.onCollision, this);

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

    update(_deltaTime: number) {
        const _elapsed = game.totalTime;
        if (!GameStateInput.canUpdateWorld()) {
            return;
        }

        if (this.currState === ActorState.Run) {
            this.doMove();
        }

        this.playerDoRotate();
    }

    playerDoRotate() {
        if (!this.rigidbody) {
            return;
        }

        this.tempVelocity.x = 0;
        this.tempVelocity.z = 0;

        const angleIn = this.angleInput;
        if (
            !Number.isFinite(angleIn.x) ||
            !Number.isFinite(angleIn.y) ||
            !Number.isFinite(angleIn.z) ||
            angleIn.lengthSqr() <= 0.000001
        ) {
            this.tempVelocity.y = 0;
            this.rigidbody.setAngularVelocity(this.tempVelocity);
            return;
        }

        const angle = MathUtil.signAngle(this.node.forward, angleIn, Vec3.UP);
        if (!Number.isFinite(angle)) {
            this.tempVelocity.y = 0;
            this.rigidbody.setAngularVelocity(this.tempVelocity);
            return;
        }

        this.tempVelocity.y = angle * this.angularSpeed;
        this.rigidbody.setAngularVelocity(this.tempVelocity);
    }

    doMove() {
        if (!this.rigidbody) {
            return;
        }

        const moveSpeed = Number.isFinite(this.rungameInfo.moveSpeed) ? this.rungameInfo.moveSpeed : 0;
        const speed = this.input.length() * moveSpeed;
        if (!Number.isFinite(speed) || speed <= 0) {
            this.stopMove();
            return;
        }

        this.tempVelocity.set(this.input);
        this.tempVelocity.normalize();
        this.tempVelocity.x *= speed;
        this.tempVelocity.z *= speed;

        this.rigidbody.getLinearVelocity(this.tempVelocity2);
        this.tempVelocity.y = this.tempVelocity2.y;
        this.rigidbody.setLinearVelocity(this.tempVelocity);
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

    onCollision(event: ICollisionEvent) {
        if (!GameStateInput.canUpdateWorld() || this.currState === ActorState.Die) {
            return;
        }
        if (event.otherCollider.getGroup() === PhysicsSystem.PhysicsGroup.DEFAULT) {
            return;
        }
        if (event.otherCollider.getGroup() !== ColliderGroup.monster) {
            return;
        }
        if (this.isCrash) {
            return;
        }

        const monster = event.otherCollider.getComponent(Monster);
        if (!monster) {
            return;
        }

        this.isCrash = true;
        this.scheduleOnce(() => {
            this.isCrash = false;
        }, 1);

        let attack = monster.rungameInfo.attack;
        attack *= 0.66;
        if (attack == null || attack == undefined) {
            return;
        }

        const hurtDirection = v3();
        Vec3.subtract(hurtDirection, this.node.worldPosition, monster.node.worldPosition);
        hurtDirection.normalize();

        this.hurt(attack, hurtDirection, monster.node);
        monster.hurt(this.rungameInfo.defense * 0.66, hurtDirection, this.node);
    }

    onTriggerEnter(event: ICollisionEvent) {
        if (!GameStateInput.canUpdateWorld() || this.currState === ActorState.Die) {
            return;
        }
        if (event.otherCollider.getGroup() === PhysicsSystem.PhysicsGroup.DEFAULT) {
            return;
        }

        const projectile = event.otherCollider.getComponent(ProjectileManager);
        if (!projectile || !projectile.host || !projectile.host.isValid) {
            return;
        }

        let attack: number = null;
        const monster = projectile.host.getComponent(Monster);
        if (monster) {
            attack = monster.rungameInfo.attack;
        }
        if (attack == null || attack == undefined) {
            return;
        }

        const hurtDirection = v3();
        Vec3.subtract(hurtDirection, this.node.worldPosition, projectile.node.worldPosition);
        hurtDirection.normalize();
        this.hurt(attack, hurtDirection, projectile.host);
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

        const playerTs = this.node.getComponent('PlayerTs') as PlayerTs | null;
        if (playerTs) {
            damage = playerTs.adjustIncomingDamage(damage);
        }
        if (!Number.isFinite(damage)) {
            damage = 1;
        }

        if (this.rungameInfo.defense > damage) {
            damage = 1;
        } else {
            damage = damage - this.rungameInfo.defense;
        }

        damage = Math.max(1, damage);
        this.rungameInfo.Hp = Math.max(0, this.rungameInfo.Hp - damage);
        director.getScene()?.emit(
            OnOrEmitConst.OnPlayerhurt,
            Math.max(0, Math.min(1, this.rungameInfo.Hp / this.rungameInfo.maxHp)),
        );

        if (this.rungameInfo.Hp <= 0) {
            this.onDie();
            if (hurtSrc && hurtSrc.isValid) {
                hurtSrc.emit(OnOrEmitConst.OnKill, this);
            }
        }

        if (
            this.rigidbody &&
            Number.isFinite(hurtDiretion.x) &&
            Number.isFinite(hurtDiretion.y) &&
            Number.isFinite(hurtDiretion.z)
        ) {
            hurtDiretion.multiplyScalar(5.0);
            this.rigidbody.applyImpulse(hurtDiretion);
        }
    }

    onDie() {
        this.node.emit(OnOrEmitConst.PlayerOnDie, this.node);
        this.changeState(ActorState.Die);
    }
}
