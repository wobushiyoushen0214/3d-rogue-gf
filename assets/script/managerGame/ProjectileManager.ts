import { _decorator, Component, CCFloat, Collider, ICollisionEvent, v3, Vec3, Node, math } from "cc";
import { GameStateInput } from "../data/dynamicData/GameStateInput";
import { OnOrEmitConst } from "../const/OnOrEmitConst";
import { MathUtil } from "../utils/MathUtil";
import { ProjectileProperty } from "../data/povo/ProjectileProperty";
const {ccclass, property} = _decorator;

let tempPosition:Vec3 = v3();
let forward:Vec3 = v3();

// 投射物功能
@ccclass('ProjectileManager')
export class ProjectileManager extends Component{
    
    @property(CCFloat)
    linearSpeed: number = 3;

    @property(CCFloat)
    angularSpeed:number = 180;

    // 发射角色
    host:Node = null;

    // 追踪节点
    target: Node = null;

    // 存活时间记录
    startTime: number = 0;

    projectileProperty: ProjectileProperty = new ProjectileProperty();

    collider: Collider = null;

    start(){
        this.collider = this.node.getComponent(Collider);
        this.collider.on("onTriggerEnter", this.onTriggerEnter, this);
    }

    onDestroy(){
        if (this.collider){
            this.collider.off("onTriggerEnter", this.onTriggerEnter, this);
        }
    }

    resetState() {
        this.host = null;
        this.target = null;
        this.startTime = 0;
        this.projectileProperty.isTrace = false;
        this.projectileProperty.lifeTime = 3.0;
        this.projectileProperty.penetration = 1;
    }

    update(deltaTime: number){
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        this.startTime += deltaTime;
        if (this.startTime >= this.projectileProperty.lifeTime){
            this.node.emit(OnOrEmitConst.OnprojectileDead, this);
            return;
        }

        // 子弹跟踪
        if (this.projectileProperty.isTrace && this.target != null){
            if (!this.target.isValid || !this.target.activeInHierarchy){
                this.target = null;
            }
        }

        if (this.projectileProperty.isTrace && this.target != null){

            // this.target.worldPosition - this.node.worldPosition;
            Vec3.subtract(tempPosition, this.target.worldPosition, this.node.worldPosition);
            tempPosition.normalize();

            const angle = math.toRadian(this.angularSpeed) * deltaTime;

            MathUtil.rotateToward(forward, this.node.forward, tempPosition, angle);
            this.node.forward = forward;
        }

        // 子弹移
        Vec3.scaleAndAdd(tempPosition, this.node.worldPosition, this.node.forward, this.linearSpeed * deltaTime);
        this.node.worldPosition = tempPosition;
        
    }

    onTriggerEnter(event: ICollisionEvent){
        
        this.projectileProperty.penetration --;
        if (this.projectileProperty.penetration <= 0){
            this.node.emit(OnOrEmitConst.OnprojectileDead, this);
        }
    }
}
