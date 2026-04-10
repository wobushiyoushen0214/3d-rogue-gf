import { _decorator, Animation, AnimationState, Node, Component, find, Label, Vec3, Camera} from 'cc';
import { EffectManager } from '../../managerGame/EffectManager';
import ConversionPostionUtil from '../../utils/ConversionPostionUtil';
import { level } from './level';
import { EffectConfigTS } from './EffectConfigTS';
import { MonsterManager } from '../../managerGame/MonsterManager';
const { ccclass, property, requireComponent } = _decorator;

let preinstallParent: Node = null;

@ccclass('HurtNumber')
@requireComponent(EffectConfigTS)
export class HurtNumber extends Component {

    // UI 摄像机
    private uiCamera: Camera = null;

    // 3D 主摄像机
    public masterCamera:Camera = null;

    @property(Label)
    private hurtNumberLaber: Label = null;

    @property(Animation)
    private animation: Animation = null;

    effectConfig:EffectConfigTS = null;
    
    init(hurtNumber: number, postion: Vec3) {

        this.uiCamera = find("UIRoot/Camera").getComponent(Camera);
        this.masterCamera = find("Main Camera").getComponent(Camera);

        if (preinstallParent == undefined){
            preinstallParent = find("UIRoot/3DConversion2D");
        }
        
        this.node.parent = preinstallParent;
        this.hurtNumberLaber.string = hurtNumber.toFixed(2).toString();

        let worldPosition = MonsterManager.instance.player.getWorldPosition();
        worldPosition.y += 1.5;
        
        let postion1 = ConversionPostionUtil.ConversionTo2D(postion, this.node.parent, this.masterCamera, this.uiCamera);
        
        this.node.setPosition(postion1);

        this.node.active = true;
        this.animation.play("hurtNumber");
    }

    protected onLoad(): void {
        preinstallParent = null;
    }

    start() {
        this.effectConfig = this.node.getComponent(EffectConfigTS);
        if (this.animation){
            this.animation.on(Animation.EventType.FINISHED, (
                type: Animation.EventType, state: AnimationState) =>{
                    this.node.active = false;
                    if (EffectManager.instance.effectMap.get(this.effectConfig.effectName)){
                        EffectManager.instance.effectMap.get(this.effectConfig.effectName).free(this.node);
                    }else {
                        this.node.destroy();
                    }
                }
            );
        }
    }
}
