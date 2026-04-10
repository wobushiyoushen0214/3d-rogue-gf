import { _decorator, Component, Node, Prefab, NodePool, instantiate, resources, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

interface IDictPoll {
    [name: string]: NodePool;
}
interface IDictPrefab {
    [name: string]: Prefab;
}
interface CYSpriteFrame {
    [name: string]: SpriteFrame;
}
@ccclass('PoolManager')
export class PoolManager extends Component{

    public static get instance(){
        if (!this._instace){
            this._instace = new PoolManager();
        }
        return this._instace;
    }

    private _dictPool : IDictPoll = {};
    private _dictPrefab: IDictPrefab = {};
    private _cySpriteFrame: CYSpriteFrame = {};
    private static _instace: PoolManager;

    public getNode(prefab: Prefab, parent: Node, onComplet: () => void = ()=>{}): Node{
        let name = prefab.name;
        let node : Node = null;
        this._dictPrefab[name] = prefab;
        const pool = this._dictPool[name];
        if(pool){
            if (pool.size() > 0){
                node = pool.get();
            }else {
                node = instantiate(prefab);
            }
        }else {
            this._dictPool[name] = new NodePool();
            node = instantiate(prefab);
        }

        node.setParent(parent);
        node.active = true;
        onComplet();
        return node;
    }

    public getNodeByName(nodeName: string, parent:Node = null): Node{
        let node : Node = null;
        const pool = this._dictPool[nodeName];
        if(pool){
            if (pool.size() > 0){
                node = pool.get();
            }
        }
        if (node == undefined){
            const prefab = this._dictPrefab[nodeName];
            if (prefab){
                node = instantiate(prefab);
            }
        }
        if (parent != undefined){
            node.active = true;
            node.parent = parent;
        }
        return node;
    }

    public putNode(node: Node){
        let name = node.name;
        node.parent = null;
        if (!this._dictPool[name]){
            this._dictPool[name] = new NodePool();
        }
        node.active = false;
        this._dictPool[name].put(node);
    }

    public putPrefab(prefabName:string, prefab: Prefab) {
        this._dictPrefab[prefabName] = prefab;
    }

    public getPrefab(prefabName: string) {
        return this._dictPrefab[prefabName];
    }

    public getCySpriteFrame(name: string){
        return this._cySpriteFrame[name];
    }

    public putCySpriteFrame(name: string, spriteFrame: SpriteFrame){
        if (this._cySpriteFrame[name]){
            return;
        }else {
            this._cySpriteFrame[name] = spriteFrame;
        }
    }
    /**
     * 关闭并销毁所有面板
     */
     clearAllNodes() {
        this._dictPool = {};
        this._dictPrefab = {};
        this._cySpriteFrame = {};
    }
}

