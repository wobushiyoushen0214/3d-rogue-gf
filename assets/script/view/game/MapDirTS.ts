import { _decorator, Component, Node, Prefab, Vec2, CCString, Collider, MeshRenderer, ModelComponent, v3, Vec3, BoxCollider } from 'cc';
import { Vector2 } from '../../utils/RVO/Common';
import { Simulator } from '../../utils/RVO/Simulator';
import { GameMapManager } from '../../managerGame/GameMapManager';

const { ccclass, property } = _decorator;

@ccclass('MapDirTS')
export class MapDirTS extends Component {

    // 地图名称
    @property(CCString)
    mapName: string = '';

    @property(Node)
    mapNode: Node = null;

    // 固定的墙体
    @property({type: Node})
    wallNodes: Node[] = [];

    // 模型包围盒的长宽一半
    size: Vec3 = null;

    // 被墙体包围的范围
    spaceSize: number = 0;

    start() {
        if (this.size == null){
            // 这里使用的boxcollider做地板，所以可以使用boxcollider 的大小为地图大小
             let worldBounds = this.mapNode.getComponent(BoxCollider).size;
            // 计算模型的尺寸
            this.size = v3(worldBounds.x /2, worldBounds.y/2, worldBounds.z/2);

            // 如果使用了地图模型，可以尝试获取模型大小来确定地图大小
            //let worldBounds = this.mapNode.getComponent(MeshRenderer).model.worldBounds;
            // this.size = worldBounds.halfExtents;
        }
    }

    /**
     * 设置节点世界坐标
     * @param positon           地图坐标位置
     * @param worldPostion      地图中心坐标位置
     * */ 
    setCenterBottom(positon: Vec3 = null, worldPostion: Vec3){
        if (!this.size){
            // 这里使用的boxcollider做地板，所以可以使用boxcollider 的大小为地图大小
            let worldBounds = this.mapNode.getComponent(BoxCollider).size;
            // 计算模型的尺寸
            this.size = v3(worldBounds.x /2, worldBounds.y/2, worldBounds.z/2);

            // 如果使用了地图模型，可以尝试获取模型大小来确定地图大小
            //let worldBounds = this.mapNode.getComponent(MeshRenderer).model.worldBounds;
            // this.size = worldBounds.halfExtents;  
        }
   
        if (positon == null || this.size == null){
            return;
        }

        positon.z = worldPostion.z + (positon.z * this.size.z * 2);
        positon.x = worldPostion.x + (positon.x * this.size.x * 2);
        this.node.setWorldPosition(positon);

        // 将墙放到动态避障中
        if (this.wallNodes){
            for (let i = 0; i < this.wallNodes.length; i++){
                let wallSize = this.wallNodes[i].getComponent(BoxCollider).size;

                // 取出障碍物的边长
                wallSize.x = wallSize.x/2;
                wallSize.z = wallSize.z/2;
                
                let pos = this.wallNodes[i].getWorldPosition();
                let minX = pos.x - wallSize.x;
                let maxX = pos.x + wallSize.x;
                let minY = pos.z - wallSize.z;
                let maxY = pos.z + wallSize.z;

                var mapStr = Math.floor(minX) + "::" + Math.floor(maxX) + "::" + Math.floor(minY) + "::" + Math.floor(maxY);

                if (GameMapManager.instance.wallSites.has(mapStr)){
                    continue;
                }
                GameMapManager.instance.wallSites.set(mapStr, "1");

                let obstacle: Array<Vector2> = [];
                obstacle[obstacle.length] = new Vector2(maxX, maxY);
                obstacle[obstacle.length] = new Vector2(minX, maxY);
                obstacle[obstacle.length] = new Vector2(minX, minY);
                obstacle[obstacle.length] = new Vector2(maxX, minY);

                Simulator.instance.addObstacle(obstacle);
            }
        } 
    }

    // 获取地图有效范围
    getMapUseSize(out:Vec3 = null):Vec3{
        if (out == null){
            out = v3();
        }
        if (this.size == null){
            // 获取墙的位置
            let worldBounds = this.mapNode.getComponent(MeshRenderer).model.worldBounds;
            // 计算模型的尺寸
            this.size = worldBounds.halfExtents;      
        }

        // 地图可用宽度暂定8
        out.x = 8;
        out.z = this.size.z;
        out.y = this.size.y;
        return out;
    }
}


