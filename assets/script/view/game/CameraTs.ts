import { _decorator, Component, Node, Vec3, v3, CCFloat } from 'cc';
import { level } from './level';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
const { ccclass, property } = _decorator;

let temp = new Vec3();
let temp_1 = new Vec3();

@ccclass('CameraTs')
export class CameraTs extends Component {

    initDirection: Vec3 = null;

    private target: Node = null;

    @property(CCFloat)
    followDamping: number = 8;

    start() {
    }

    update(deltaTime: number) {
        if (GameStateInput.isPaused() || GameStateInput.isGameOver()){
            return;
        }

        if (!this.target || !this.target.isValid || this.target !== MonsterManager.instance.player){
            this.target = MonsterManager.instance.player;
            this.initDirection = null;
        }
        if (!this.target){
            return;
        }

        this.target.getWorldPosition(temp_1);

        if (this.initDirection == null){
            this.initDirection = v3();
            Vec3.subtract(this.initDirection, this.node.worldPosition, temp_1);
            return;
        }

        Vec3.add(temp, temp_1, this.initDirection);
        const ratio = Math.min(1, deltaTime * this.followDamping);
        Vec3.lerp(temp, this.node.worldPosition, temp, ratio);
        this.node.worldPosition = temp;
    }
}


