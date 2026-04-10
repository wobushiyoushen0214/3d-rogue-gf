import { _decorator, Component, Node, resources, Prefab, instantiate, Vec3, v3, director, game} from 'cc';
import { PoolManager } from '../utils/PoolManager';
import { MapDirTS } from '../view/game/MapDirTS';
import { level } from '../view/game/level';
import { Simulator } from '../utils/RVO/Simulator';
import { MonsterManager } from './MonsterManager';
const { ccclass, property } = _decorator;

/**
 * 地图控制器
 */
export class GameMapManager {
    static _instance: GameMapManager;

    static get instance(): GameMapManager {
        if (this._instance == null) {
            this._instance = new GameMapManager();
        }
        return this._instance;
    }

    /**
     * Map(游戏地图组成)
     */
    private Map: string[][];

    /**
     * 加载完成标志
     */
    private isDown: Number = 0;
    
    /**
     * 地图缓存矩阵
     */
    private cashMap: Node[][][][] = [[]];
    
    /**
     * 障碍物坐标点缓存，避免重复
     */
    public wallSites: Map<string, string> = new Map();

    /**
     * 
     * @param maptype 
     * @param map 
     * @param onComplet 
     * @returns 
     */
    init(map: string[][], onComplet: ()=>void = ()=>{}) {
        this.cashMap = [[]];
        this.resetObstacleCache();

        this.isDown = 0;
        if (map == null || map.length < 1) {
            console.log("地图配置异常");
            return;
        }
        this.Map = map;

        let mapUrls: string[] = [];
        for (let i = 0; i < this.Map.length; i++) {
            for (let j = 0; j < this.Map[i].length; j++) {
                mapUrls[i * this.Map[0].length + j] = "prefab/map/" + this.Map[i][j];
            }
        }
        resources.load(mapUrls, Prefab, (err: Error, prefabs: Prefab[]) => {
            if (err) {
                throw err;
            }

            for (let j = 0; j < prefabs.length; j++) {
                let node = instantiate(prefabs[j]);
                node.active = false;
                PoolManager.instance.putPrefab(prefabs[j].name, prefabs[j]);
                PoolManager.instance.putNode(node);
            }
            // 加载完成之后绘制地图
            this.resetMap(onComplet);
        });
    }

    // 初始化地图位置
    resetMap(onComplet: () => void) {
        this.resetObstacleCache();

        // 初始化地图
        // 中心坐标在 (0,0)
        // 暂定 4 行   5 列
        for (let i = 0; i < 5; i++) {
            this.cashMap[i] = [];
            let posZ = i - 3;

            let column = 5;

            for (let j = 0; j < column; j++) {
                let posX = j - Math.floor(column / 2);

                let mapDoSet: Node[][] = [[]];

                for (let mapi = 0; mapi < this.Map.length; mapi++) {
                    let displaceZ = Math.floor(this.Map.length / 2);
                    let displaceX = Math.floor(this.Map[mapi].length / 2);

                    let posz = mapi - displaceX;
                    for (let mapj = 0; mapj < this.Map[mapi].length; mapj++) {
                        let posx = mapj - displaceZ;

                        let positionX = (posX * this.Map[mapi].length + posx);
                        let positionZ = (posZ * this.Map.length + posz);
                        let node = PoolManager.instance.getNodeByName(this.Map[mapi][mapj]);
                        if (node == null) {
                            let prefab = PoolManager.instance.getPrefab(this.Map[mapi][mapj]);
                            if (prefab) {
                                let node = instantiate(prefab);
                                mapDoSet[mapi][mapj] = this.assembleNode(node, positionX, positionZ);
                            } else {
                                resources.load("level/prefab/" + this.Map[mapi][mapj], Prefab, (err: Error, prefab: Prefab) => {
                                    if (err) {
                                        throw err;
                                    }
                                    mapDoSet[mapi][mapj] = this.assembleNode(instantiate(prefab), positionX, positionZ);
                                });
                            }
                        } else {
                            mapDoSet[mapi][mapj] = this.assembleNode(node, positionX, positionZ);
                        }
                    }
                }
                this.cashMap[i][j] = mapDoSet;
            }
        }
        Simulator.instance.processObstacles(); 

        this.isDown = 1;
        onComplet();
    }

    /**
     * 将地图快放到指定位置
     * @param node      当前操作地图块
     * @param sitX      地图坐标横坐标点
     * @param sitZ      地图坐标纵坐标点
     * @returns 
     */
    assembleNode(node: Node, sitX: number, sitZ: number, worldPostion: Vec3 = null): Node {
        node.parent = director.getScene();
        node.active = true;
        if (worldPostion == undefined){
            worldPostion = MonsterManager.instance.player.getWorldPosition();
        }
        // 根据地图坐标放置到世界坐标
        node.getComponent(MapDirTS).setCenterBottom(v3(sitX, 0, sitZ), worldPostion);

        return node;
    }
    /**
     * 刷新地图
    */
    flashMap() {
        // 获取主角所在坐标点
        let postion = MonsterManager.instance.player.getWorldPosition();

        // 大块地图中心坐标
        let a = Math.floor(this.cashMap.length / 2);
        a = a < this.cashMap.length-1? a+1: a;
        let b = Math.floor(this.cashMap[0].length/2);

        let mapDoSet = this.cashMap[a][b];

        // 小块地图中心
        let miniDoSet =  mapDoSet[Math.floor(mapDoSet.length / 2)][Math.floor(mapDoSet[0].length/2)];

        let miniPostion = miniDoSet.getWorldPosition();

        // 计算主角所在的地图坐标
        let sX = postion.x - miniPostion.x;
        let sZ = postion.z - miniPostion.z;

        let posX = (sX / (mapDoSet[0].length * miniDoSet.getComponent(MapDirTS).size.x * 2))| 0;
        
        let posZ = (sZ / (mapDoSet.length * miniDoSet.getComponent(MapDirTS).size.z * 2)) | 0;

        if (posX == 0 && posZ == 0){
            return;
        }

        let cashNodes: Node[][][] = this.cashMap[0]; 
        if (posZ > 0) {
            for (let i = 0; i < this.cashMap.length; i++){
                let z = (this.cashMap.length + posZ + i) % this.cashMap.length;
                cashNodes = this.cashMap[i];
                this.cashMap[i] = this.cashMap[z];
                this.cashMap[z] = cashNodes;
            }
        }

        if (posZ < 0) {
            for (let i = this.cashMap.length -1; i >= 0 ; i--){
                let z = (this.cashMap.length + posZ + i) % this.cashMap.length;
                cashNodes = this.cashMap[i];
                this.cashMap[i] = this.cashMap[z];
                this.cashMap[z] = cashNodes;
            }
        }

        if (posX != 0) {
            for (let i = 0; i < this.cashMap[0].length; i++){

                let cashNodes2: Node[][] =  this.cashMap[i][(this.cashMap[i].length + posX) % this.cashMap[i].length]; 
                if (posX > 0) {
                    for (let j = 0;  j < this.cashMap[i].length; j++){
                        let x = (this.cashMap[i].length + posX+j) % this.cashMap[i].length;
                        cashNodes2 = this.cashMap[i][j];
                        this.cashMap[i][j] = this.cashMap[i][x];
                        this.cashMap[i][x] = cashNodes2;
                    }
                }

                if (posX < 0) {
                    for (let j = this.cashMap[i].length-1;  j >= 0; j--){
                        let x = (this.cashMap[i].length + posX+j) % this.cashMap[i].length;
                        cashNodes2 = this.cashMap[i][j];
                        this.cashMap[i][j] = this.cashMap[i][x];
                        this.cashMap[i][x] = cashNodes2;
                    }
                }
            }
        }
        

        mapDoSet = this.cashMap[a][b];
        miniDoSet =  mapDoSet[Math.floor(mapDoSet.length / 2)][Math.floor(mapDoSet[0].length/2)];

        this.resetObstacleCache();
        // 刷新地图
        for (let i = 0; i < this.cashMap.length; i++) {
            let posZ = i - 3;

            for (let j = 0; j < this.cashMap[i].length; j++) {
                let posX = j - Math.floor( this.cashMap[i].length / 2);

                let mapDoSet: Node[][] = this.cashMap[i][j];

                for (let mapi = 0; mapi < mapDoSet.length; mapi++) {
                    let displaceZ = Math.floor(this.Map.length / 2);
                    let displaceX = Math.floor(this.Map[mapi].length / 2);

                    let posz = mapi - displaceX;
                    for (let mapj = 0; mapj < mapDoSet[mapi].length; mapj++) {
                        let posx = mapj - displaceZ;

                        let positionX = (posX * this.Map[mapi].length + posx);
                        let positionZ = (posZ * this.Map.length + posz);
                        let node: Node = mapDoSet[mapi][mapj];
                        this.assembleNode(node, positionX, positionZ, miniDoSet.getWorldPosition());
                    }
                }
            }
        }
        let ab = game.totalTime;
        Simulator.instance.processObstacles(); 
        if (game.totalTime - ab > 1){
            console.log("更新地图耗时毫秒："+ (game.totalTime - ab));
        }
    }

    private resetObstacleCache() {
        this.wallSites.clear();
        Simulator.instance.obstacles.length = 0;
        Simulator.instance.obstacles = [];
    }
}


