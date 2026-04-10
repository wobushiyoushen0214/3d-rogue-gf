import { _decorator, Component, Node, Button, director, input, Input, EventKeyboard, KeyCode, Label, UITransform, Size, BlockInputEvents, Vec3 } from 'cc';
import { EffectConst } from '../../const/EffectConst';
import { GameStateEnum } from '../../const/GameStateEnum';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { EffectManager } from '../../managerGame/EffectManager';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { PlayerTs } from './PlayerTs';
import { Simulator } from '../../utils/RVO/Simulator';
const { ccclass, property } = _decorator;
type UpgradeOption = {
    title: string;
    desc: string;
    rarity: "common" | "rare";
    weight?: number;
    apply: (player: PlayerTs) => void;
};

@ccclass('UIGame')
export class UIGame extends Component {

    @property(Node)
    stopGame:Node = null;

    @property(Node)
    gameOver:Node = null;

    private btnSetting: Node = null;
    private dynamicButtonBindings: Array<{ node: Node; handler: () => void }> = [];
    private runtimeDebugLabel: Label = null;
    private runtimeNotifyLabel: Label = null;
    private runtimeNotifyTimer = 0;
    private fpsTime = 0;
    private fpsFrames = 0;
    private fpsValue = 0;
    private bindedPlayer: Node = null;
    private upgradePanel: Node = null;
    private upgradeTitleLabel: Label = null;
    private upgradeOptionNodes: Node[] = [];
    private upgradeOptionLabels: Label[] = [];
    private currentUpgradeOptions: UpgradeOption[] = [];
    private currentUpgradeLevel = 1;
    private upgradeAutoSelectRemain = 0;
    private upgradeHotkeys = [KeyCode.DIGIT_7, KeyCode.DIGIT_8, KeyCode.DIGIT_9];

    @property
    showRuntimeDebug: boolean = true;

    @property
    upgradeAutoSelectSeconds: number = 12;

    start() {
        this.btnSetting = this.node.getChildByPath("BtnSetting");
        this.btnSetting?.on(Button.EventType.CLICK, this.onBtnSetting, this);
        director.getScene().on(OnOrEmitConst.PlayerOnDie, this.onGameOVer, this);
        director.getScene().on(OnOrEmitConst.OnEliteSpawn, this.onEliteSpawn, this);
        director.getScene().on(OnOrEmitConst.OnEliteKilled, this.onEliteKilled, this);
        director.getScene().on(OnOrEmitConst.OnEliteCast, this.onEliteCast, this);
        director.getScene().on(OnOrEmitConst.OnEliteCoreCollected, this.onEliteCoreCollected, this);
        director.getScene().on(OnOrEmitConst.OnBossWarning, this.onBossWarning, this);
        director.getScene().on(OnOrEmitConst.OnBossSpawn, this.onBossSpawn, this);
        director.getScene().on(OnOrEmitConst.OnBossKilled, this.onBossKilled, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this.bindOptionalDebugButtons();
        this.initRuntimeDebugHud();
    }

    onDestroy() {
        this.safeNodeOff(this.btnSetting, Button.EventType.CLICK, this.onBtnSetting);
        const scene = director.getScene();
        this.safeNodeOff(scene, OnOrEmitConst.PlayerOnDie, this.onGameOVer);
        this.safeNodeOff(scene, OnOrEmitConst.OnEliteSpawn, this.onEliteSpawn);
        this.safeNodeOff(scene, OnOrEmitConst.OnEliteKilled, this.onEliteKilled);
        this.safeNodeOff(scene, OnOrEmitConst.OnEliteCast, this.onEliteCast);
        this.safeNodeOff(scene, OnOrEmitConst.OnEliteCoreCollected, this.onEliteCoreCollected);
        this.safeNodeOff(scene, OnOrEmitConst.OnBossWarning, this.onBossWarning);
        this.safeNodeOff(scene, OnOrEmitConst.OnBossSpawn, this.onBossSpawn);
        this.safeNodeOff(scene, OnOrEmitConst.OnBossKilled, this.onBossKilled);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this.unbindPlayerEvents();
        for (const binding of this.dynamicButtonBindings){
            this.safeNodeOff(binding.node, Button.EventType.CLICK, binding.handler);
        }
        this.dynamicButtonBindings.length = 0;
    }

    update(deltaTime: number) {
        this.ensurePlayerEventBinding();

        if (GameStateInput.isSelectingUpgrade()){
            this.upgradeAutoSelectRemain -= deltaTime;
            if (this.upgradeAutoSelectRemain <= 0){
                this.showRuntimeNotify("升级选择超时，已自动选择第一项", 1.6);
                this.applyUpgradeOption(0);
            }
        }

        if (this.runtimeNotifyLabel && this.runtimeNotifyLabel.node.active){
            this.runtimeNotifyTimer -= deltaTime;
            if (this.runtimeNotifyTimer <= 0){
                this.runtimeNotifyLabel.node.active = false;
            }
        }

        if (!this.showRuntimeDebug || !this.runtimeDebugLabel){
            return;
        }

        this.fpsTime += deltaTime;
        this.fpsFrames += 1;
        if (this.fpsTime >= 0.5){
            this.fpsValue = this.fpsFrames / this.fpsTime;
            this.fpsFrames = 0;
            this.fpsTime = 0;
        }

        const stateName = GameStateEnum[GameStateInput.gameState];
        const monsters = MonsterManager.instance.goalvoes?.size ?? 0;
        const agents = Simulator.instance.getNumAgents();
        const obstacles = Simulator.instance.getObstacles().length;
        const playerInfo = this.getPlayerScript()?.getDebugSummary() ?? "no-player";
        this.runtimeDebugLabel.string =
            `State: ${stateName}\n` +
            `FPS: ${this.fpsValue.toFixed(1)}\n` +
            `Monster/Agent: ${monsters}/${agents}\n` +
            `Obstacles: ${obstacles}\n` +
            `Player: ${playerInfo}\n` +
            `DebugKey: 1/2/3/4/5/6/0`;
    }

    // 打开设置, 暂停游戏/开始游戏
    onBtnSetting(){
        if (GameStateInput.isGameOver()){
            return;
        }
        if (GameStateInput.isSelectingUpgrade()){
            return;
        }
        if (GameStateInput.isPaused()){
            console.log("开始游戏");
            GameStateInput.setGameState(GameStateEnum.Running);
            this.stopGame.active = false;
            director.resume();
        } else if (GameStateInput.isRunning()) {
            console.log("暂停游戏");
            GameStateInput.setGameState(GameStateEnum.Paused);
            this.stopGame.active = true;
            director.pause();
        }
    }

    onGameOVer(){
        this.hideUpgradePanel(false);
        this.stopGame.active = false;
        this.gameOver.active = true;
        GameStateInput.setGameState(GameStateEnum.GameOver);
        director.pause();
    }

    // 重新加载场景
    reloadGame(){
        GameStateInput.setGameState(GameStateEnum.Loading);
        director.reset();
        director.loadScene("gameUp"); 
        director.resume();       
    }

    // 调试入口：通过 UI 事件绑定这些方法，快速验证单局成长反馈
    onDebugAddAttack(){
        this.getPlayerScript()?.changeAttack(10);
        this.logDebugSummary("add attack");
    }

    onDebugAddProjectile(){
        this.getPlayerScript()?.changeProjectileCount(1);
        this.logDebugSummary("add projectile");
    }

    onDebugAddMoveSpeed(){
        this.getPlayerScript()?.changeMoveSpeed(1);
        this.logDebugSummary("add move speed");
    }

    onDebugAddPenetration(){
        this.getPlayerScript()?.changeProjectilePenetration(1);
        this.logDebugSummary("add penetration");
    }

    onDebugToggleTrace(){
        const player = this.getPlayerScript();
        if (!player){
            return;
        }
        const traceEnabled = player.toggleProjectileTrace();
        this.logDebugSummary(traceEnabled ? "trace on" : "trace off");
    }

    onDebugReduceAttackInterval(){
        this.getPlayerScript()?.changeAttackInterval(-0.1);
        this.logDebugSummary("reduce attack interval");
    }

    onDebugResetStats(){
        this.getPlayerScript()?.resetDebugStats();
        this.logDebugSummary("reset stats");
    }

    private getPlayerScript(): PlayerTs | null {
        return MonsterManager.instance.player?.getComponent(PlayerTs) ?? null;
    }

    private logDebugSummary(action: string){
        const player = this.getPlayerScript();
        if (!player){
            return;
        }
        console.log(`[debug:${action}] ${player.getDebugSummary()}`);
    }

    private onKeyDown(event: EventKeyboard){
        if (GameStateInput.isSelectingUpgrade()){
            const optionIndex = this.upgradeHotkeys.indexOf(event.keyCode);
            if (optionIndex >= 0){
                this.applyUpgradeOption(optionIndex);
            }
            return;
        }

        if (event.keyCode === KeyCode.KEY_R){
            this.reloadGame();
            return;
        }
        if (event.keyCode === KeyCode.KEY_P){
            this.onBtnSetting();
            return;
        }

        if (!GameStateInput.canUpdateWorld()){
            return;
        }

        switch (event.keyCode){
        case KeyCode.DIGIT_1:
            this.onDebugAddAttack();
            break;
        case KeyCode.DIGIT_2:
            this.onDebugReduceAttackInterval();
            break;
        case KeyCode.DIGIT_3:
            this.onDebugAddProjectile();
            break;
        case KeyCode.DIGIT_4:
            this.onDebugAddMoveSpeed();
            break;
        case KeyCode.DIGIT_5:
            this.onDebugAddPenetration();
            break;
        case KeyCode.DIGIT_6:
            this.onDebugToggleTrace();
            break;
        case KeyCode.DIGIT_0:
            this.onDebugResetStats();
            break;
        default:
            break;
        }
    }

    private bindOptionalDebugButtons(){
        this.bindOptionalButton("BtnDebugAtk", this.onDebugAddAttack);
        this.bindOptionalButton("BtnDebugRate", this.onDebugReduceAttackInterval);
        this.bindOptionalButton("BtnDebugProjectile", this.onDebugAddProjectile);
        this.bindOptionalButton("BtnDebugMove", this.onDebugAddMoveSpeed);
        this.bindOptionalButton("BtnDebugPen", this.onDebugAddPenetration);
        this.bindOptionalButton("BtnDebugTrace", this.onDebugToggleTrace);
        this.bindOptionalButton("BtnDebugReset", this.onDebugResetStats);
        this.bindOptionalButton("BtnReload", this.reloadGame);
    }

    private bindOptionalButton(nodeName: string, handler: () => void){
        const node = this.findNodeByName(this.node, nodeName);
        if (!node){
            return;
        }
        node.on(Button.EventType.CLICK, handler, this);
        this.dynamicButtonBindings.push({ node, handler });
    }

    private findNodeByName(root: Node, nodeName: string): Node | null {
        if (root.name === nodeName){
            return root;
        }
        for (const child of root.children){
            const matched = this.findNodeByName(child, nodeName);
            if (matched){
                return matched;
            }
        }
        return null;
    }

    private initRuntimeDebugHud(){
        if (!this.showRuntimeDebug){
            return;
        }
        let hudNode = this.findNodeByName(this.node, "RuntimeDebugHud");
        if (!hudNode){
            hudNode = new Node("RuntimeDebugHud");
            hudNode.parent = this.node;
            hudNode.setPosition(-440, 760, 0);
            const transform = hudNode.addComponent(UITransform);
            transform.setContentSize(new Size(520, 180));
            this.runtimeDebugLabel = hudNode.addComponent(Label);
        } else {
            this.runtimeDebugLabel = hudNode.getComponent(Label) ?? hudNode.addComponent(Label);
        }
        this.runtimeDebugLabel.fontSize = 18;
        this.runtimeDebugLabel.lineHeight = 22;
        this.runtimeDebugLabel.string = "Runtime HUD init...";
    }

    private ensureRuntimeNotifyLabel(){
        if (this.runtimeNotifyLabel){
            return;
        }
        let notifyNode = this.findNodeByName(this.node, "RuntimeNotify");
        if (!notifyNode){
            notifyNode = new Node("RuntimeNotify");
            notifyNode.parent = this.node;
            notifyNode.setPosition(0, 560, 0);
            const transform = notifyNode.addComponent(UITransform);
            transform.setContentSize(new Size(900, 90));
            this.runtimeNotifyLabel = notifyNode.addComponent(Label);
        } else {
            this.runtimeNotifyLabel = notifyNode.getComponent(Label) ?? notifyNode.addComponent(Label);
        }
        this.runtimeNotifyLabel.fontSize = 34;
        this.runtimeNotifyLabel.lineHeight = 42;
        this.runtimeNotifyLabel.string = "";
        this.runtimeNotifyLabel.node.active = false;
    }

    private showRuntimeNotify(content: string, duration: number = 2.6){
        this.ensureRuntimeNotifyLabel();
        this.runtimeNotifyLabel.string = content;
        this.runtimeNotifyLabel.node.active = true;
        this.runtimeNotifyTimer = duration;
    }

    private onEliteSpawn(spawnCount: number, totalAlive: number, elapsedSeconds: number){
        const minute = Math.floor(elapsedSeconds / 60);
        const second = elapsedSeconds % 60;
        const secondText = second < 10 ? `0${second}` : `${second}`;
        this.showRuntimeNotify(`妖潮异动！精英怪 x${spawnCount} 出现（${minute}:${secondText}，场上 ${totalAlive}）`);
    }

    private onEliteKilled(eliteKillCount: number, expReward: number, lootDesc: string){
        this.showRuntimeNotify(`斩杀精英！奖励 EXP+${expReward}｜战利品：${lootDesc}（累计 ${eliteKillCount}）`, 3.2);
    }

    private onEliteCast(castType: string, worldPosition: Vec3){
        if (worldPosition){
            EffectManager.instance.findEffectNode(EffectConst.EffDie, worldPosition);
        }
        if (castType === "dash"){
            this.showRuntimeNotify("精英突进预警！注意走位！", 1.3);
            return;
        }
        if (castType === "spread"){
            this.showRuntimeNotify("精英散射预警！注意扇形弹幕！", 1.3);
        }
    }

    private onEliteCoreCollected(expReward: number, healValue: number, worldPosition: Vec3){
        if (worldPosition){
            EffectManager.instance.findEffectNode(EffectConst.EffDie, worldPosition);
        }
        this.showRuntimeNotify(`拾取灵核：EXP +${expReward}，生命 +${healValue}`, 1.9);
    }

    private onBossWarning(remainSeconds: number){
        this.showRuntimeNotify(`天威降临！Boss 将在 ${remainSeconds}s 后登场`, 1.8);
    }

    private onBossSpawn(bossName: string, elapsedSeconds: number){
        const minute = Math.floor(elapsedSeconds / 60);
        const second = elapsedSeconds % 60;
        const secondText = second < 10 ? `0${second}` : `${second}`;
        this.showRuntimeNotify(`⚠ Boss【${bossName}】已降临（${minute}:${secondText}）`, 3.2);
    }

    private onBossKilled(expReward: number, playerLevel: number){
        this.showRuntimeNotify(`Boss 已被击败！EXP +${expReward}，当前境界 Lv.${playerLevel}`, 3.2);
    }

    private ensurePlayerEventBinding(){
        const player = MonsterManager.instance.player;
        if (player === this.bindedPlayer){
            return;
        }
        this.unbindPlayerEvents();
        if (player){
            this.bindedPlayer = player;
            player.on(OnOrEmitConst.OnplayerUpgrade, this.onPlayerUpgrade, this);
        }
    }

    private unbindPlayerEvents(){
        if (!this.bindedPlayer){
            return;
        }
        this.safeNodeOff(this.bindedPlayer, OnOrEmitConst.OnplayerUpgrade, this.onPlayerUpgrade);
        this.bindedPlayer = null;
    }

    private safeNodeOff(node: Node | null, eventType: string, handler: (...args: any[]) => void){
        if (!node || !node.isValid){
            return;
        }
        try {
            node.off(eventType, handler, this);
        } catch (error) {
            // 节点进入销毁阶段时，事件系统可能已释放，这里忽略卸载异常
        }
    }

    private onPlayerUpgrade(level: number){
        this.showUpgradePanel(level);
    }

    private showUpgradePanel(level: number){
        if (GameStateInput.isGameOver()){
            return;
        }
        this.currentUpgradeLevel = level;
        this.upgradeAutoSelectRemain = Math.max(3, this.upgradeAutoSelectSeconds);
        this.ensureUpgradePanel();
        this.currentUpgradeOptions = this.pickRandomUpgradeOptions(3);
        this.upgradeTitleLabel.string = `境界突破 Lv.${level}\n请选择一项强化 (按 7 / 8 / 9 快速选择)`;
        for (let i = 0; i < this.upgradeOptionLabels.length; i++){
            const option = this.currentUpgradeOptions[i];
            const key = i + 7;
            const rarityTag = option?.rarity === "rare" ? "【稀有】" : "【普通】";
            this.upgradeOptionLabels[i].string = option ? `[${key}] ${rarityTag}${option.title}\n${option.desc}` : "";
            this.upgradeOptionNodes[i].active = !!option;
        }
        this.upgradePanel.active = true;
        GameStateInput.setGameState(GameStateEnum.SelectingUpgrade);
    }

    private hideUpgradePanel(restoreRunning: boolean){
        if (this.upgradePanel){
            this.upgradePanel.active = false;
        }
        if (restoreRunning && !GameStateInput.isGameOver()){
            GameStateInput.setGameState(GameStateEnum.Running);
        }
    }

    private ensureUpgradePanel(){
        if (this.upgradePanel){
            return;
        }
        this.upgradePanel = new Node("UpgradePanel");
        this.upgradePanel.parent = this.node;
        this.upgradePanel.setPosition(0, 0, 0);
        const panelTransform = this.upgradePanel.addComponent(UITransform);
        panelTransform.setContentSize(new Size(980, 1280));
        this.upgradePanel.addComponent(BlockInputEvents);

        const titleNode = new Node("UpgradeTitle");
        titleNode.parent = this.upgradePanel;
        titleNode.setPosition(0, 420, 0);
        const titleTransform = titleNode.addComponent(UITransform);
        titleTransform.setContentSize(new Size(920, 150));
        this.upgradeTitleLabel = titleNode.addComponent(Label);
        this.upgradeTitleLabel.fontSize = 30;
        this.upgradeTitleLabel.lineHeight = 36;

        for (let i = 0; i < 3; i++){
            const optionNode = new Node(`UpgradeOption${i + 1}`);
            optionNode.parent = this.upgradePanel;
            optionNode.setPosition(0, 190 - i * 220, 0);
            const optionTransform = optionNode.addComponent(UITransform);
            optionTransform.setContentSize(new Size(860, 170));
            optionNode.addComponent(Button);

            const optionLabel = optionNode.addComponent(Label);
            optionLabel.fontSize = 26;
            optionLabel.lineHeight = 34;

            const index = i;
            const clickHandler = () => this.applyUpgradeOption(index);
            optionNode.on(Button.EventType.CLICK, clickHandler, this);
            this.dynamicButtonBindings.push({ node: optionNode, handler: clickHandler });
            this.upgradeOptionNodes.push(optionNode);
            this.upgradeOptionLabels.push(optionLabel);
        }
        this.upgradePanel.active = false;
    }

    private applyUpgradeOption(index: number){
        if (!GameStateInput.isSelectingUpgrade()){
            return;
        }
        const option = this.currentUpgradeOptions[index];
        const player = this.getPlayerScript();
        if (!option || !player){
            return;
        }
        option.apply(player);
        this.logDebugSummary(`upgrade:${option.title}`);
        this.hideUpgradePanel(true);
    }

    private pickRandomUpgradeOptions(count: number): UpgradeOption[]{
        const pool = this.createUpgradePool();
        const picked: UpgradeOption[] = [];
        const rarePool = pool.filter((item)=> item.rarity === "rare");
        const commonPool = pool.filter((item)=> item.rarity === "common");

        if (this.currentUpgradeLevel >= 3 && rarePool.length > 0){
            const rareChance = Math.min(0.2 + (this.currentUpgradeLevel - 2) * 0.12, 0.8);
            if (Math.random() < rareChance){
                const guaranteedRare = this.pickAndRemoveByWeight(rarePool);
                if (guaranteedRare){
                    picked.push(guaranteedRare);
                }
            }
        }

        const remainPool = commonPool.concat(rarePool);
        while (picked.length < count && remainPool.length > 0){
            const option = this.pickAndRemoveByWeight(remainPool);
            if (!option){
                break;
            }
            picked.push(option);
        }
        return picked;
    }

    private pickAndRemoveByWeight(pool: UpgradeOption[]): UpgradeOption | null {
        if (pool.length <= 0){
            return null;
        }
        let totalWeight = 0;
        for (const option of pool){
            const fallbackWeight = option.rarity === "rare" ? 0.45 : 1;
            totalWeight += option.weight ?? fallbackWeight;
        }
        let seed = Math.random() * totalWeight;
        for (let i = 0; i < pool.length; i++){
            const option = pool[i];
            const fallbackWeight = option.rarity === "rare" ? 0.45 : 1;
            seed -= option.weight ?? fallbackWeight;
            if (seed <= 0){
                pool.splice(i, 1);
                return option;
            }
        }
        return pool.pop();
    }

    private createUpgradePool(): UpgradeOption[]{
        return [
            {
                title: "飞剑增幅",
                desc: "攻击力 +10",
                rarity: "common",
                apply: (player) => player.changeAttack(10),
            },
            {
                title: "疾风连射",
                desc: "攻击间隔 -0.10 秒",
                rarity: "common",
                apply: (player) => player.changeAttackInterval(-0.1),
            },
            {
                title: "分光剑影",
                desc: "子弹数量 +1",
                rarity: "common",
                apply: (player) => player.changeProjectileCount(1),
            },
            {
                title: "破甲穿云",
                desc: "穿透 +1",
                rarity: "common",
                apply: (player) => player.changeProjectilePenetration(1),
            },
            {
                title: "神识牵引",
                desc: "开启追踪（已开启则攻击 +8）",
                rarity: "common",
                apply: (player) => {
                    const traceEnabled = player.isProjectileTraceEnabled();
                    player.setProjectileTraceEnabled(true);
                    if (traceEnabled){
                        player.changeAttack(8);
                    }
                },
            },
            {
                title: "御风身法",
                desc: "移动速度 +0.8",
                rarity: "common",
                apply: (player) => player.changeMoveSpeed(0.8),
            },
            {
                title: "护体真元",
                desc: "防御 +1",
                rarity: "common",
                apply: (player) => player.changeDefense(1),
            },
            {
                title: "生机回流",
                desc: "最大生命 +20 并回复 20",
                rarity: "common",
                apply: (player) => player.changeMaxHp(20, 20),
            },
            {
                title: "灵气灌体",
                desc: "立即回复 25 生命",
                rarity: "common",
                apply: (player) => player.heal(25),
            },
            {
                title: "万剑归宗",
                desc: "子弹数量 +2，穿透 +1",
                rarity: "rare",
                weight: 0.35,
                apply: (player) => {
                    player.changeProjectileCount(2);
                    player.changeProjectilePenetration(1);
                },
            },
            {
                title: "紫府淬体",
                desc: "最大生命 +40，防御 +2，并回复 40",
                rarity: "rare",
                weight: 0.4,
                apply: (player) => {
                    player.changeMaxHp(40, 40);
                    player.changeDefense(2);
                },
            },
            {
                title: "御雷疾行",
                desc: "攻速提升（间隔 -0.18）且移速 +1.2",
                rarity: "rare",
                weight: 0.38,
                apply: (player) => {
                    player.changeAttackInterval(-0.18);
                    player.changeMoveSpeed(1.2);
                },
            },
            {
                title: "斩妖真诀",
                desc: "攻击 +22，攻击间隔 -0.05 秒",
                rarity: "rare",
                weight: 0.36,
                apply: (player) => {
                    player.changeAttack(22);
                    player.changeAttackInterval(-0.05);
                },
            },
        ];
    }
}


