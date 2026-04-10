import { instantiate, Pool, Prefab, resources, Vec3, Node, director, ParticleSystem } from "cc";
import { HurtNumber } from "../view/game/HurtNumber";
import { EffectConfigTS } from "../view/game/EffectConfigTS";

/**
 * 播放特效管理类
 * */ 
export class EffectManager{

    private static _instance: EffectManager = null;
    
    static get instance(): EffectManager{
        if (this._instance == undefined){
            this._instance = new EffectManager();
        }
        return this._instance;
    }

    effectMap: Map<string, Pool<Node>> = null;

    prefabMap: Map<string, Prefab> = null;

    init(onComplete:()=>void = ()=>{}){

        this.effectMap = new Map();
        this.prefabMap = new Map();

        resources.loadDir('prefab/effect/', Prefab, (err:Error, prefabs: Prefab[])=>{
            for(let prefab of prefabs){
                this.prefabMap.set(prefab.name, prefab);
                let pool = new Pool(()=>{
                    let node = instantiate(prefab);
                    director.getScene().addChild(node);
                    node.getComponent(EffectConfigTS).effectName = prefab.name;
                    node.active = false;
                    return node;
                }, 5, (node: Node)=>{
                    node.removeFromParent();
                });
                
                this.effectMap.set(prefab.name, pool);
                onComplete();
            }
        })
    }

    destroy(){
        if (this.effectMap){
            for (let key of this.effectMap.keys())
            if (this.effectMap.get(key)){
                this.effectMap.get(key).destroy();
            }
        }
        if (this.prefabMap){
            this.prefabMap = null;
        }
    }

    findEffectNode(effectName: string, positon: Vec3) :Node {
        let node = null;
        if (effectName){
            if (this.effectMap.get(effectName)){
                node = this.effectMap.get(effectName).alloc();
            }else if (this.prefabMap.get(effectName)){
                node = instantiate(this.prefabMap.get(effectName));
            }else {
                let that = this;
                resources.load('prefab/effect/'+effectName, Prefab, (err:Error, prefab: Prefab)=>{
                    if (err) {
                        console.log("动效加载失败");
                        return;
                    }
                    this.prefabMap.set(prefab.name, prefab);
                    let pool = new Pool(()=>{
                        let node = instantiate(prefab);
                        director.getScene().addChild(node);
                        that.doPlayeEffect(effectName, node, positon);
                        node.getComponent(EffectConfigTS).effectName = prefab.name;
                        node.active = false;
                        return node;
                    }, 5, (node: Node)=>{
                        node.removeFromParent();
                    });
                    this.effectMap.set(prefab.name, pool);
                });
                return node;
            }
            this.doPlayeEffect(effectName, node, positon);
            return node;
        }
        return null;
    }

    doPlayeEffect(effectname: string, effectNode: Node, positon: Vec3 = null){
        effectNode.active = true;
        if (positon){
            effectNode.worldPosition = positon;
        }else {
            effectNode.position = Vec3.ZERO;
        }
        let particleSystem = effectNode.getComponent(ParticleSystem);
        particleSystem.play();
    }

    /**
     * 播放伤害数字特效
     */
    doPlayHurtNumber(hurtNumber: number, positon: Vec3){
        let effectName = "hurtNumber";
        let node: Node = null;
        if (this.effectMap.get(effectName)){
            node = this.effectMap.get(effectName).alloc();
        }else if (this.prefabMap.get(effectName)){
            node = instantiate(this.prefabMap.get(effectName));
        }else {
            resources.load('prefab/effect/'+effectName, Prefab, (err:Error, prefab: Prefab)=>{
                if (err) {
                    console.log("动效加载失败");
                    return;
                }
                this.prefabMap.set(prefab.name, prefab);
                let pool = new Pool(()=>{
                    let node = instantiate(prefab);
                    node.getComponent(EffectConfigTS).effectName = prefab.name;
                    this.hurtNumberInit(node, hurtNumber, positon);
                    return node;
                }, 5, (node: Node)=>{
                    node.removeFromParent();
                });
                this.effectMap.set(prefab.name, pool);
            });
            return;
        }
        this.hurtNumberInit(node, hurtNumber, positon);
    }

    hurtNumberInit(node: Node, hurtNumber: number, postion: Vec3){
        let hm = node.getComponent(HurtNumber);
        if (hm){
            hm.init(hurtNumber, postion);
        }
    }
}