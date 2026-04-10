import { _decorator, Camera, Color, Component, director, find, Label, Node, ProgressBar, Size, UITransform, Vec3 } from 'cc';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { Monster } from '../../managerGame/Monster';
import { PlayerTs } from './PlayerTs';
const { ccclass, property } = _decorator;

@ccclass('UIMaterInfoTS')
export class UIMaterInfoTS extends Component {

    // UI 摄像机
    // @property(Camera)
    public uiCamera:Camera = null;

    public masterCamera:Camera = null;

    private parentTransform: UITransform = null;

    @property(ProgressBar)
    private hpProgressBar: ProgressBar = null;

    // 暂时未做处理，逻辑与血条一致
    @property(ProgressBar)
    ExpProgressBar: ProgressBar = null;

    private bindedPlayer: Node = null;
    private enemyTags: Map<string, Node> = new Map();
    private coreTags: Map<string, Node> = new Map();
    private readonly normalTagColor: Color = new Color(255, 255, 255, 220);
    private readonly eliteTagColor: Color = new Color(255, 212, 96, 255);
    private readonly bossTagColor: Color = new Color(255, 104, 104, 255);
    private readonly coreTagColor: Color = new Color(174, 121, 255, 255);
    private tagRefreshTimer = 0;

    @property
    showNormalMonsterTags: boolean = false;

    @property
    maxNormalMonsterTags: number = 12;

    @property
    tagRefreshInterval: number = 0.12;

    start() {
        if (!this.hpProgressBar){
            this.hpProgressBar = this.node.getChildByName("hp_bg").getComponent(ProgressBar);
        }
        this.uiCamera = find("UIRoot/Camera").getComponent(Camera);
        this.masterCamera = find("Main Camera").getComponent(Camera);

        this.parentTransform = this.node.parent.getComponent(UITransform);

        director.getScene().on(OnOrEmitConst.OnPlayerhurt, this.playerHurt, this);

    }

    onDestroy() {
        director.getScene().off(OnOrEmitConst.OnPlayerhurt, this.playerHurt, this);
        this.unbindPlayerEvents();
        this.clearEnemyTags();
        this.clearCoreTags();
    }

    update(deltaTime: number) {
        const player = MonsterManager.instance.player;
        if (player != this.bindedPlayer){
            this.unbindPlayerEvents();
            this.bindPlayerEvents(player);
        }

        if (player != null){
            let node: Node = player;
            let worldPosition = node.getWorldPosition();
            worldPosition.y += 1.5;
            // 将挂载点坐标转为屏幕坐标
            var screenPos = this.masterCamera.worldToScreen(worldPosition);
            this.showAt(screenPos);
        }

        this.tagRefreshTimer -= deltaTime;
        if (this.tagRefreshTimer <= 0){
            this.tagRefreshTimer = this.tagRefreshInterval;
            this.updateEnemyTags();
            this.updateEliteCoreTags();
        }
    }

    public showAt(secnePos: Vec3): void {
        this.showNodeAt(this.node, secnePos);
    }

    public showNodeAt(targetNode: Node, secnePos: Vec3): void {
        // 屏幕坐标转世界坐标
        var wPos = this.uiCamera.screenToWorld(secnePos);

        var pos = this.parentTransform.convertToNodeSpaceAR(wPos);

        targetNode.setPosition(pos);
    }

    playerHurt(hp: number){
        console.log(hp);
        
        if (this.hpProgressBar){
            this.hpProgressBar.progress = hp;
        }
    }

    private bindPlayerEvents(player: Node){
        if (!player){
            return;
        }
        this.bindedPlayer = player;
        player.on(OnOrEmitConst.OnExpGain, this.onExpGain, this);
    }

    private unbindPlayerEvents(){
        if (!this.bindedPlayer){
            return;
        }
        this.bindedPlayer.off(OnOrEmitConst.OnExpGain, this.onExpGain, this);
        this.bindedPlayer = null;
    }

    private onExpGain(exp: number, maxExp: number){
        if (!this.ExpProgressBar || maxExp <= 0){
            return;
        }
        const progress = exp / maxExp;
        this.ExpProgressBar.progress = progress < 0 ? 0 : (progress > 1 ? 1 : progress);
    }

    private updateEnemyTags(){
        const entries = MonsterManager.instance.goalvoes;
        if (!entries || !this.masterCamera || !this.uiCamera){
            this.clearEnemyTags();
            return;
        }

        const activeIds: Set<string> = new Set();
        const candidateNormals: Array<{ goalId: string; monster: Monster }> = [];

        for (let goalId of entries.keys()){
            const entrie = entries.get(goalId);
            if (!entrie || !entrie.mSphere || !entrie.mSphere.isValid || !entrie.mSphere.activeInHierarchy){
                continue;
            }
            const monster = entrie.mSphere.getComponent(Monster);
            if (!monster){
                continue;
            }
            if (monster.isElite){
                this.renderMonsterTag(goalId, monster, activeIds);
                continue;
            }
            if (!this.showNormalMonsterTags){
                continue;
            }
            candidateNormals.push({ goalId, monster });
        }

        if (this.showNormalMonsterTags && candidateNormals.length > 0){
            candidateNormals.sort((a, b)=>{
                const da = a.monster.distance ?? Number.MAX_SAFE_INTEGER;
                const db = b.monster.distance ?? Number.MAX_SAFE_INTEGER;
                return da - db;
            });
            const maxCount = Math.max(0, Math.floor(this.maxNormalMonsterTags));
            const renderCount = Math.min(maxCount, candidateNormals.length);
            for (let i = 0; i < renderCount; i++){
                const one = candidateNormals[i];
                this.renderMonsterTag(one.goalId, one.monster, activeIds);
            }
        }

        for (const [goalId, tagNode] of Array.from(this.enemyTags.entries())){
            if (activeIds.has(goalId)){
                continue;
            }
            tagNode.destroy();
            this.enemyTags.delete(goalId);
        }
    }

    private renderMonsterTag(goalId: string, monster: Monster, activeIds: Set<string>){
        activeIds.add(goalId);
        let tagNode = this.enemyTags.get(goalId);
        if (!tagNode){
            tagNode = this.createEnemyTag(goalId);
        }
        this.updateEnemyTagPosition(tagNode, monster);
        this.updateEnemyTagText(tagNode, monster);
    }

    private createEnemyTag(goalId: string): Node{
        const tagNode = new Node(`EnemyTag_${goalId.slice(0, 6)}`);
        tagNode.parent = this.node.parent;
        const transform = tagNode.addComponent(UITransform);
        transform.setContentSize(new Size(220, 40));
        const label = tagNode.addComponent(Label);
        label.fontSize = 18;
        label.lineHeight = 22;
        label.string = "";
        this.enemyTags.set(goalId, tagNode);
        return tagNode;
    }

    private updateEnemyTagPosition(tagNode: Node, monster: Monster){
        const worldPosition = monster.node.getWorldPosition();
        worldPosition.y += 2.2 * monster.node.worldScale.y;
        const screenPos = this.masterCamera.worldToScreen(worldPosition);
        if (screenPos.z <= 0){
            tagNode.active = false;
            return;
        }
        tagNode.active = true;
        this.showNodeAt(tagNode, screenPos);
    }

    private updateEnemyTagText(tagNode: Node, monster: Monster){
        const label = tagNode.getComponent(Label);
        if (!label){
            return;
        }
        const hp = monster.rungameInfo.Hp;
        const maxHp = monster.rungameInfo.maxHp > 0 ? monster.rungameInfo.maxHp : hp;
        const percentValue = maxHp <= 0 ? 0 : Math.max(0, Math.min(1, hp / maxHp));
        const percent = Math.ceil(percentValue * 100);
        if (monster.isBoss){
            label.string = `BOSS ${percent}%`;
            label.color = this.bossTagColor;
            return;
        }
        if (monster.isElite){
            label.string = `精英 ${percent}%`;
            label.color = this.eliteTagColor;
        } else {
            label.string = `${percent}%`;
            label.color = this.normalTagColor;
        }
    }

    private clearEnemyTags(){
        for (const tagNode of this.enemyTags.values()){
            tagNode.destroy();
        }
        this.enemyTags.clear();
    }

    private updateEliteCoreTags(){
        const playerNode = MonsterManager.instance.player;
        if (!playerNode){
            this.clearCoreTags();
            return;
        }
        const playerTs = playerNode.getComponent(PlayerTs);
        if (!playerTs){
            this.clearCoreTags();
            return;
        }

        const dropNodes = playerTs.getEliteDropNodes();
        const activeIds: Set<string> = new Set();
        for (const dropNode of dropNodes){
            if (!dropNode || !dropNode.isValid){
                continue;
            }
            activeIds.add(dropNode.uuid);
            let tagNode = this.coreTags.get(dropNode.uuid);
            if (!tagNode){
                tagNode = this.createCoreTag(dropNode.uuid);
            }
            this.updateCoreTagPosition(tagNode, dropNode);
        }

        for (const [key, tagNode] of Array.from(this.coreTags.entries())){
            if (activeIds.has(key)){
                continue;
            }
            tagNode.destroy();
            this.coreTags.delete(key);
        }
    }

    private createCoreTag(key: string): Node{
        const tagNode = new Node(`CoreTag_${key.slice(0, 6)}`);
        tagNode.parent = this.node.parent;
        const transform = tagNode.addComponent(UITransform);
        transform.setContentSize(new Size(240, 40));
        const label = tagNode.addComponent(Label);
        label.fontSize = 20;
        label.lineHeight = 24;
        label.color = this.coreTagColor;
        label.string = "灵核";
        this.coreTags.set(key, tagNode);
        return tagNode;
    }

    private updateCoreTagPosition(tagNode: Node, dropNode: Node){
        const worldPosition = dropNode.getWorldPosition();
        worldPosition.y += 0.7;
        const screenPos = this.masterCamera.worldToScreen(worldPosition);
        if (screenPos.z <= 0){
            tagNode.active = false;
            return;
        }
        tagNode.active = true;
        this.showNodeAt(tagNode, screenPos);
    }

    private clearCoreTags(){
        for (const tagNode of this.coreTags.values()){
            tagNode.destroy();
        }
        this.coreTags.clear();
    }
}


