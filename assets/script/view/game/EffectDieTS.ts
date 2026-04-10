import { _decorator, Component, Node, ParticleSystem } from 'cc';
import { EffectManager } from '../../managerGame/EffectManager';
import { EffectConfigTS } from './EffectConfigTS';
const { ccclass, requireComponent } = _decorator;

@ccclass('EffectDieTS')
@requireComponent(EffectConfigTS)
export class EffectDieTS extends Component {

    particleSystem: ParticleSystem = null;

    private runnintTime:number = 0;

    effectConfig:EffectConfigTS = null;

    start() {
        this.effectConfig = this.node.getComponent(EffectConfigTS);

        this.runnintTime = 0;
        this.particleSystem = this.node.getComponent(ParticleSystem);
    }

    update(deltaTime: number) {
        this.runnintTime += deltaTime;
        if (this.runnintTime >= this.particleSystem.duration){
            this.runnintTime = 0;
            this.particleSystem.stop();
            this.node.active = false;
            EffectManager.instance.effectMap.get(this.effectConfig.effectName).free(this.node);
        }
    }
}


