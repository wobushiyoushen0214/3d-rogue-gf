import { _decorator, Component, Node, Prefab, Pool, director, instantiate } from 'cc';
import { OnOrEmitConst } from '../const/OnOrEmitConst';
import { ProjectileManager } from './ProjectileManager';
const { ccclass, property } = _decorator;

// 投射物发射器
@ccclass('ProjectileEmitter')
export class ProjectileEmitter extends Component {

    @property(Prefab)
    arrowPrefab: Prefab = null;

    pool:Pool<Node> = null;

    start() {
        if (this.arrowPrefab){
            this.pool = new Pool(()=>{
                return instantiate(this.arrowPrefab);
            }, 10, (node: Node)=>{
                node.removeFromParent();
            });
        }
        
    }

    onDestroy(){
        if (this.pool){
            this.pool.destroy();
        }
        
    }

    create():ProjectileManager{
        let node = this.pool.alloc();
        if (node.parent == null){
            director.getScene().addChild(node);
        }
        node.active = true;
        let projectile = node.getComponent(ProjectileManager);
        projectile.resetState();
        node.off(OnOrEmitConst.OnprojectileDead, this.onjProjectileDead, this);
        node.on(OnOrEmitConst.OnprojectileDead, this.onjProjectileDead, this);
        return projectile;
    }

    onjProjectileDead(projectile: ProjectileManager){
        projectile.node.off(OnOrEmitConst.OnprojectileDead, this.onjProjectileDead, this);
        projectile.node.active = false;
        this.pool.free(projectile.node);
    }
}


