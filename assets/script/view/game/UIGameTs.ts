import { _decorator, Component, Node, Button, director, input, Input, EventKeyboard, KeyCode, Label, UITransform, Size, BlockInputEvents, Vec3 } from 'cc';
import { EffectConst } from '../../const/EffectConst';
import { GameStateEnum } from '../../const/GameStateEnum';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { EffectManager } from '../../managerGame/EffectManager';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { PlayerTs } from './PlayerTs';
import { Simulator } from '../../utils/RVO/Simulator';
import { CareerRoleConfigs, CareerRoleId, CareerSpecializationOrder } from '../../const/CareerConfig';
import { CareerBranchId, CareerTechTreeConfigs } from '../../const/TechTreeConfig';
const { ccclass, property } = _decorator;
type UpgradeOption = {
    title: string;
    desc: string;
    rarity: "common" | "rare";
    weight?: number;
    roleId?: CareerRoleId;
    branchId?: CareerBranchId;
    branchName?: string;
    apply: (player: PlayerTs) => void;
};
type UpgradePanelMode = "upgrade" | "specialize";

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
    private upgradePanelMode: UpgradePanelMode = "upgrade";
    private upgradeAutoSelectRemain = 0;
    private upgradeHotkeys = [
        KeyCode.DIGIT_1,
        KeyCode.DIGIT_2,
        KeyCode.DIGIT_3,
        KeyCode.DIGIT_4,
        KeyCode.DIGIT_5,
        KeyCode.DIGIT_6,
    ];

    @property
    showRuntimeDebug: boolean = true;

    @property
    upgradeAutoSelectSeconds: number = 0.2;

    @property
    specializationAutoSelectSeconds: number = 6;

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
        director.getScene().on(OnOrEmitConst.OnCareerChanged, this.onCareerChanged, this);
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
        this.safeNodeOff(scene, OnOrEmitConst.OnCareerChanged, this.onCareerChanged);
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
            if (this.upgradeAutoSelectRemain > 0){
                this.upgradeAutoSelectRemain -= deltaTime;
                if (this.upgradeAutoSelectRemain <= 0){
                    this.upgradeAutoSelectRemain = 0;
                    this.showRuntimeNotify(
                        this.upgradePanelMode === "specialize"
                            ? "专职选择超时，已默认选择第一项"
                            : "升级选择超时，已自动选择第一项",
                        1.6,
                    );
                    this.applyUpgradeOption(0);
                }
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
            if (optionIndex >= 0 && optionIndex < this.currentUpgradeOptions.length){
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

    private onEliteSpawn(spawnCount: number, totalAlive: number, elapsedSeconds: number, eliteName: string = "代码屎山"){
        const minute = Math.floor(elapsedSeconds / 60);
        const second = elapsedSeconds % 60;
        const secondText = second < 10 ? `0${second}` : `${second}`;
        this.showRuntimeNotify(`告警：精英【${eliteName}】x${spawnCount} 出现（${minute}:${secondText}，场上 ${totalAlive}）`);
    }

    private onEliteKilled(eliteKillCount: number, expReward: number, lootDesc: string){
        this.showRuntimeNotify(`精英处理完成！奖励 EXP+${expReward}｜掉落：${lootDesc}（累计 ${eliteKillCount}）`, 3.2);
    }

    private onEliteCast(castType: string, worldPosition: Vec3, source: string = "", scale: number = 0, duration: number = 0){
        if (worldPosition){
            EffectManager.instance.findEffectNode(EffectConst.EffDie, worldPosition);
        }
        if (castType === "dash"){
            this.showRuntimeNotify("代码屎山突进预警！注意走位！", 1.3);
            return;
        }
        if (castType === "spread"){
            this.showRuntimeNotify("代码屎山散射预警！注意扇形弹幕！", 1.3);
            return;
        }
        if (castType === "burden"){
            const sourceText = source || "代码屎山";
            const scaleText = scale > 0 ? `x${scale.toFixed(2)}` : "x1.25";
            const durationText = duration > 0 ? duration.toFixed(1) : "2.0";
            this.showRuntimeNotify(`${sourceText}施加维护负担！攻速降低（间隔${scaleText}，${durationText}s）`, 2.0);
            return;
        }
        if (castType === "bossRush"){
            this.showRuntimeNotify("老板画饼：愿景冲刺！全场敌人移速提高！", 2.3);
            return;
        }
        if (castType === "pie"){
            this.showRuntimeNotify("老板画饼：场上出现伪增益点，谨慎接触！", 2.3);
            return;
        }
        if (castType === "pieHit"){
            this.showRuntimeNotify("踩到大饼陷阱！短时间输出效率下降！", 1.8);
            return;
        }
        if (castType === "finalStand"){
            this.showRuntimeNotify("老板：再坚持一下！需求潮进入加班冲刺阶段！", 2.6);
        }
    }

    private onEliteCoreCollected(expReward: number, healValue: number, worldPosition: Vec3){
        if (worldPosition){
            EffectManager.instance.findEffectNode(EffectConst.EffDie, worldPosition);
        }
        this.showRuntimeNotify(`拾取优化包：EXP +${expReward}，生命 +${healValue}`, 1.9);
    }

    private onBossWarning(remainSeconds: number, bossName: string = "老板的大饼"){
        this.showRuntimeNotify(`预警：${bossName} 将在 ${remainSeconds}s 后登场`, 1.8);
    }

    private onBossSpawn(bossName: string, elapsedSeconds: number){
        const minute = Math.floor(elapsedSeconds / 60);
        const second = elapsedSeconds % 60;
        const secondText = second < 10 ? `0${second}` : `${second}`;
        this.showRuntimeNotify(`⚠ Boss【${bossName}】开始输出愿景（${minute}:${secondText}）`, 3.2);
    }

    private onBossKilled(expReward: number, playerLevel: number){
        this.showRuntimeNotify(`Boss 已被击败！EXP +${expReward}，当前等级 Lv.${playerLevel}`, 3.2);
    }

    private onCareerChanged(roleId: CareerRoleId, roleName: string, stackText: string, specialty: string){
        if (roleId === "student"){
            this.showRuntimeNotify(`当前身份【${roleName}】｜${stackText}`, 2.6);
            return;
        }
        const passiveName = CareerRoleConfigs[roleId]?.passiveName ?? "职业被动";
        const branches = CareerTechTreeConfigs[roleId].map((item)=> item.shortName).join('/');
        this.showRuntimeNotify(`已专职为【${roleName}】｜${stackText}｜技术树:${branches}｜${passiveName}`, 3.8);
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
        const player = this.getPlayerScript();
        if (!player){
            return;
        }
        if (player.canSelectSpecialization(level)){
            this.showSpecializationPanel(level, player);
            return;
        }
        this.showUpgradePanel(level);
    }

    private showUpgradePanel(level: number){
        if (GameStateInput.isGameOver()){
            return;
        }
        const player = this.getPlayerScript();
        if (!player){
            return;
        }
        this.currentUpgradeLevel = level;
        this.ensureUpgradePanel();
        this.upgradePanelMode = "upgrade";
        this.currentUpgradeOptions = this.pickRandomUpgradeOptions(3, player);
        this.upgradeAutoSelectRemain = Math.max(0.05, this.upgradeAutoSelectSeconds);
        this.upgradeTitleLabel.string =
            `职业成长 Lv.${level}｜当前：${player.getCareerRoleName()}\n` +
            `技术栈：${player.getCareerStackText()}｜被动：${player.getCareerPassiveName()}｜${player.getCareerBranchStatusText()}\n` +
            `请选择一项强化 (按 1 / 2 / 3 快速选择)`;
        for (let i = 0; i < this.upgradeOptionLabels.length; i++){
            const option = this.currentUpgradeOptions[i];
            const key = i + 1;
            const rarityTag = option?.rarity === "rare" ? "【稀有】" : "【普通】";
            const branchTag = option?.branchName ? `【${option.branchName}】` : "";
            this.upgradeOptionLabels[i].string = option ? `[${key}] ${rarityTag}${branchTag}${option.title}\n${option.desc}` : "";
            this.upgradeOptionNodes[i].active = !!option;
        }
        this.upgradePanel.active = true;
        GameStateInput.setGameState(GameStateEnum.SelectingUpgrade);
    }

    private showSpecializationPanel(level: number, player: PlayerTs){
        if (GameStateInput.isGameOver()){
            return;
        }
        this.currentUpgradeLevel = level;
        this.ensureUpgradePanel();
        this.upgradePanelMode = "specialize";
        this.currentUpgradeOptions = this.createCareerSpecializationOptions();
        this.upgradeAutoSelectRemain = Math.max(0.5, this.specializationAutoSelectSeconds);
        this.upgradeTitleLabel.string =
            `Lv.${level} 达到专职门槛｜当前：${player.getCareerRoleName()}\n` +
            `请选择职业方向 (按 1 - 6 快速选择)`;
        for (let i = 0; i < this.upgradeOptionLabels.length; i++){
            const option = this.currentUpgradeOptions[i];
            const key = i + 1;
            this.upgradeOptionLabels[i].string = option ? `[${key}] 【专职】${option.title}\n${option.desc}` : "";
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

        const optionY = [300, 130, -40, -210, -380, -550];
        for (let i = 0; i < 6; i++){
            const optionNode = new Node(`UpgradeOption${i + 1}`);
            optionNode.parent = this.upgradePanel;
            optionNode.setPosition(0, optionY[i], 0);
            const optionTransform = optionNode.addComponent(UITransform);
            optionTransform.setContentSize(new Size(880, 150));
            optionNode.addComponent(Button);

            const optionLabel = optionNode.addComponent(Label);
            optionLabel.fontSize = 22;
            optionLabel.lineHeight = 30;

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
        if (option.branchId){
            const branchLevel = player.addCareerBranchProgress(option.branchId);
            if (branchLevel > 0){
                this.showRuntimeNotify(`技术树推进【${option.branchName ?? option.branchId}】Lv.${branchLevel}`, 2.4);
            }
        }
        this.logDebugSummary(`upgrade:${option.title}`);
        this.hideUpgradePanel(true);
    }

    private pickRandomUpgradeOptions(count: number, player: PlayerTs): UpgradeOption[]{
        const pool = this.createUpgradePool(player).map((item)=>({
            ...item,
            weight: this.resolveUpgradeOptionWeight(item, player),
        }));
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

    private resolveUpgradeOptionWeight(option: UpgradeOption, player: PlayerTs): number{
        const fallbackWeight = option.rarity === "rare" ? 0.45 : 1;
        let weight = option.weight ?? fallbackWeight;
        if (option.branchId){
            weight += player.getCareerBranchWeightBonus(option.branchId);
        }
        return weight;
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

    private createCareerSpecializationOptions(): UpgradeOption[]{
        return CareerSpecializationOrder.map((roleId)=>{
            const role = CareerRoleConfigs[roleId];
            const branches = CareerTechTreeConfigs[roleId].map((item)=> item.shortName).join(' / ');
            return {
                title: role.name,
                desc: `技术栈：${role.techStacks.join(' / ')}\n技术树：${branches}\n被动：${role.passiveName}｜${role.specialty}`,
                rarity: "rare",
                roleId: role.id,
                apply: (player) => {
                    player.applyCareerRole(role.id);
                },
            };
        });
    }

    private createUpgradePool(player: PlayerTs): UpgradeOption[]{
        const roleId = player.getCareerRoleId();
        if (roleId === "student"){
            return this.createStudentUpgradePool();
        }
        return this.createSharedUpgradePool().concat(this.createRoleUpgradePool(roleId));
    }

    private createStudentUpgradePool(): UpgradeOption[]{
        return [
            {
                title: "数据结构基础",
                desc: "攻击力 +8",
                rarity: "common",
                apply: (player) => player.changeAttack(8),
            },
            {
                title: "计算机网络",
                desc: "攻击间隔 -0.06 秒",
                rarity: "common",
                apply: (player) => player.changeAttackInterval(-0.06),
            },
            {
                title: "编译原理",
                desc: "穿透 +1",
                rarity: "common",
                apply: (player) => player.changeProjectilePenetration(1),
            },
            {
                title: "算法训练",
                desc: "子弹数量 +1",
                rarity: "common",
                apply: (player) => player.changeProjectileCount(1),
            },
            {
                title: "操作系统调度",
                desc: "移动速度 +0.6，防御 +1",
                rarity: "common",
                apply: (player) => {
                    player.changeMoveSpeed(0.6);
                    player.changeDefense(1);
                },
            },
            {
                title: "数据库导论",
                desc: "最大生命 +16 并回复 16",
                rarity: "common",
                apply: (player) => player.changeMaxHp(16, 16),
            },
            {
                title: "开源实验",
                desc: "开启追踪，若已开启则攻击 +10",
                rarity: "rare",
                apply: (player) => {
                    const traceEnabled = player.isProjectileTraceEnabled();
                    player.setProjectileTraceEnabled(true);
                    if (traceEnabled){
                        player.changeAttack(10);
                    }
                },
            },
            {
                title: "期末冲刺",
                desc: "攻击 +12，攻击间隔 -0.05 秒",
                rarity: "rare",
                weight: 0.38,
                apply: (player) => {
                    player.changeAttack(12);
                    player.changeAttackInterval(-0.05);
                },
            },
        ];
    }

    private createSharedUpgradePool(): UpgradeOption[]{
        return [
            {
                title: "Git 提交规范",
                desc: "攻击 +8",
                rarity: "common",
                apply: (player) => player.changeAttack(8),
            },
            {
                title: "代码评审",
                desc: "攻击间隔 -0.04 秒",
                rarity: "common",
                apply: (player) => player.changeAttackInterval(-0.04),
            },
            {
                title: "文档补齐",
                desc: "最大生命 +14 并回复 14",
                rarity: "common",
                apply: (player) => player.changeMaxHp(14, 14),
            },
            {
                title: "脚本自动化",
                desc: "移动速度 +0.5",
                rarity: "common",
                apply: (player) => player.changeMoveSpeed(0.5),
            },
            {
                title: "热修复补丁",
                desc: "立即回复 22 生命",
                rarity: "common",
                apply: (player) => player.heal(22),
            },
            {
                title: "全链路监控",
                desc: "攻击 +10，防御 +1",
                rarity: "rare",
                weight: 0.35,
                apply: (player) => {
                    player.changeAttack(10);
                    player.changeDefense(1);
                },
            },
        ];
    }

    private withBranch(option: UpgradeOption, branchId: CareerBranchId, branchName: string): UpgradeOption{
        return {
            ...option,
            branchId,
            branchName,
        };
    }

    private createRoleUpgradePool(roleId: CareerRoleId): UpgradeOption[]{
        switch (roleId){
        case "frontend":
            return [
                this.withBranch({
                    title: "Vue 组件化",
                    desc: "子弹数量 +1",
                    rarity: "common",
                    apply: (player) => player.changeProjectileCount(1),
                }, "frontend-component", "组件化流"),
                this.withBranch({
                    title: "React Hooks",
                    desc: "攻击间隔 -0.07 秒",
                    rarity: "common",
                    apply: (player) => player.changeAttackInterval(-0.07),
                }, "frontend-component", "组件化流"),
                this.withBranch({
                    title: "Vite 冷启动",
                    desc: "移动速度 +0.8",
                    rarity: "common",
                    apply: (player) => player.changeMoveSpeed(0.8),
                }, "frontend-engineering", "工程化流"),
                this.withBranch({
                    title: "TypeScript 类型收敛",
                    desc: "攻击 +8，穿透 +1",
                    rarity: "common",
                    apply: (player) => {
                        player.changeAttack(8);
                        player.changeProjectilePenetration(1);
                    },
                }, "frontend-performance", "性能优化流"),
                this.withBranch({
                    title: "前端工程化",
                    desc: "子弹数量 +1，攻击间隔 -0.08 秒",
                    rarity: "rare",
                    weight: 0.36,
                    apply: (player) => {
                        player.changeProjectileCount(1);
                        player.changeAttackInterval(-0.08);
                    },
                }, "frontend-engineering", "工程化流"),
                this.withBranch({
                    title: "WebGL 渲染优化",
                    desc: "攻击 +14，子弹数量 +1",
                    rarity: "rare",
                    weight: 0.34,
                    apply: (player) => {
                        player.changeAttack(14);
                        player.changeProjectileCount(1);
                    },
                }, "frontend-performance", "性能优化流"),
            ];
        case "backend":
            return [
                this.withBranch({
                    title: "Java 并发调优",
                    desc: "攻击 +14",
                    rarity: "common",
                    apply: (player) => player.changeAttack(14),
                }, "backend-concurrency", "高并发流"),
                this.withBranch({
                    title: "Spring Boot 治理",
                    desc: "攻击 +8，攻击间隔 -0.05 秒",
                    rarity: "common",
                    apply: (player) => {
                        player.changeAttack(8);
                        player.changeAttackInterval(-0.05);
                    },
                }, "backend-service", "服务治理流"),
                this.withBranch({
                    title: "MySQL 索引优化",
                    desc: "穿透 +1",
                    rarity: "common",
                    apply: (player) => player.changeProjectilePenetration(1),
                }, "backend-data", "数据链路流"),
                this.withBranch({
                    title: "Redis 缓存命中",
                    desc: "攻击间隔 -0.06 秒，回复 10 生命",
                    rarity: "common",
                    apply: (player) => {
                        player.changeAttackInterval(-0.06);
                        player.heal(10);
                    },
                }, "backend-data", "数据链路流"),
                this.withBranch({
                    title: "Kafka 消峰",
                    desc: "攻击 +18，最大生命 +10",
                    rarity: "rare",
                    weight: 0.38,
                    apply: (player) => {
                        player.changeAttack(18);
                        player.changeMaxHp(10, 10);
                    },
                }, "backend-concurrency", "高并发流"),
                this.withBranch({
                    title: "Docker 发布链路",
                    desc: "最大生命 +18，防御 +1，穿透 +1",
                    rarity: "rare",
                    weight: 0.34,
                    apply: (player) => {
                        player.changeMaxHp(18, 18);
                        player.changeDefense(1);
                        player.changeProjectilePenetration(1);
                    },
                }, "backend-service", "服务治理流"),
            ];
        case "product":
            return [
                this.withBranch({
                    title: "PRD 拆解",
                    desc: "攻击 +8，开启追踪",
                    rarity: "common",
                    apply: (player) => {
                        player.changeAttack(8);
                        player.setProjectileTraceEnabled(true);
                    },
                }, "product-insight", "需求洞察流"),
                this.withBranch({
                    title: "Figma 原型迭代",
                    desc: "移动速度 +0.6，回复 12 生命",
                    rarity: "common",
                    apply: (player) => {
                        player.changeMoveSpeed(0.6);
                        player.heal(12);
                    },
                }, "product-design", "方案设计流"),
                this.withBranch({
                    title: "A/B Test",
                    desc: "攻击间隔 -0.05 秒",
                    rarity: "common",
                    apply: (player) => player.changeAttackInterval(-0.05),
                }, "product-growth", "增长实验流"),
                this.withBranch({
                    title: "用户洞察",
                    desc: "最大生命 +14，攻击 +6",
                    rarity: "common",
                    apply: (player) => {
                        player.changeMaxHp(14, 14);
                        player.changeAttack(6);
                    },
                }, "product-insight", "需求洞察流"),
                this.withBranch({
                    title: "路线图推进",
                    desc: "攻击 +10，最大生命 +18，并回复 18",
                    rarity: "rare",
                    weight: 0.36,
                    apply: (player) => {
                        player.changeAttack(10);
                        player.changeMaxHp(18, 18);
                    },
                }, "product-design", "方案设计流"),
                this.withBranch({
                    title: "增长实验平台",
                    desc: "子弹数量 +1，攻击间隔 -0.06 秒",
                    rarity: "rare",
                    weight: 0.34,
                    apply: (player) => {
                        player.changeProjectileCount(1);
                        player.changeAttackInterval(-0.06);
                    },
                }, "product-growth", "增长实验流"),
            ];
        case "project":
            return [
                this.withBranch({
                    title: "Scrum 站会",
                    desc: "攻击间隔 -0.06 秒，移动速度 +0.4",
                    rarity: "common",
                    apply: (player) => {
                        player.changeAttackInterval(-0.06);
                        player.changeMoveSpeed(0.4);
                    },
                }, "project-collab", "协作机制流"),
                this.withBranch({
                    title: "Jira 排期",
                    desc: "最大生命 +12，防御 +1",
                    rarity: "common",
                    apply: (player) => {
                        player.changeMaxHp(12, 12);
                        player.changeDefense(1);
                    },
                }, "project-schedule", "计划排期流"),
                this.withBranch({
                    title: "风险清单",
                    desc: "回复 16 生命，防御 +1",
                    rarity: "common",
                    apply: (player) => {
                        player.heal(16);
                        player.changeDefense(1);
                    },
                }, "project-risk", "风险管理流"),
                this.withBranch({
                    title: "关键路径推进",
                    desc: "攻击 +8，移动速度 +0.5",
                    rarity: "common",
                    apply: (player) => {
                        player.changeAttack(8);
                        player.changeMoveSpeed(0.5);
                    },
                }, "project-risk", "风险管理流"),
                this.withBranch({
                    title: "里程碑压缩",
                    desc: "攻击 +10，攻击间隔 -0.10 秒",
                    rarity: "rare",
                    weight: 0.36,
                    apply: (player) => {
                        player.changeAttack(10);
                        player.changeAttackInterval(-0.10);
                    },
                }, "project-schedule", "计划排期流"),
                this.withBranch({
                    title: "跨团队协同",
                    desc: "子弹数量 +1，防御 +1，移动速度 +0.6",
                    rarity: "rare",
                    weight: 0.34,
                    apply: (player) => {
                        player.changeProjectileCount(1);
                        player.changeDefense(1);
                        player.changeMoveSpeed(0.6);
                    },
                }, "project-collab", "协作机制流"),
            ];
        case "qa":
            return [
                this.withBranch({
                    title: "Selenium 回归",
                    desc: "攻击 +8，穿透 +1",
                    rarity: "common",
                    apply: (player) => {
                        player.changeAttack(8);
                        player.changeProjectilePenetration(1);
                    },
                }, "qa-automation", "自动化流"),
                this.withBranch({
                    title: "Cypress 冒烟",
                    desc: "攻击间隔 -0.07 秒",
                    rarity: "common",
                    apply: (player) => player.changeAttackInterval(-0.07),
                }, "qa-automation", "自动化流"),
                this.withBranch({
                    title: "JMeter 压测",
                    desc: "攻击 +12",
                    rarity: "common",
                    apply: (player) => player.changeAttack(12),
                }, "qa-performance", "性能压测流"),
                this.withBranch({
                    title: "Postman 校验",
                    desc: "开启追踪，若已开启则子弹 +1",
                    rarity: "common",
                    apply: (player) => {
                        const traceEnabled = player.isProjectileTraceEnabled();
                        player.setProjectileTraceEnabled(true);
                        if (traceEnabled){
                            player.changeProjectileCount(1);
                        }
                    },
                }, "qa-gate", "质量门禁流"),
                this.withBranch({
                    title: "CI 质量门禁",
                    desc: "攻击 +10，穿透 +2",
                    rarity: "rare",
                    weight: 0.38,
                    apply: (player) => {
                        player.changeAttack(10);
                        player.changeProjectilePenetration(2);
                    },
                }, "qa-gate", "质量门禁流"),
                this.withBranch({
                    title: "缺陷预测模型",
                    desc: "攻击间隔 -0.08 秒，开启追踪",
                    rarity: "rare",
                    weight: 0.34,
                    apply: (player) => {
                        player.changeAttackInterval(-0.08);
                        player.setProjectileTraceEnabled(true);
                    },
                }, "qa-performance", "性能压测流"),
            ];
        case "delivery":
            return [
                this.withBranch({
                    title: "Linux 部署",
                    desc: "最大生命 +16，防御 +1",
                    rarity: "common",
                    apply: (player) => {
                        player.changeMaxHp(16, 16);
                        player.changeDefense(1);
                    },
                }, "delivery-deploy", "部署交付流"),
                this.withBranch({
                    title: "SQL 脚本调优",
                    desc: "攻击 +8，回复 10 生命",
                    rarity: "common",
                    apply: (player) => {
                        player.changeAttack(8);
                        player.heal(10);
                    },
                }, "delivery-adaptation", "业务适配流"),
                this.withBranch({
                    title: "API 集成联调",
                    desc: "子弹数量 +1",
                    rarity: "common",
                    apply: (player) => player.changeProjectileCount(1),
                }, "delivery-deploy", "部署交付流"),
                this.withBranch({
                    title: "网络配置排障",
                    desc: "移动速度 +0.5，防御 +1",
                    rarity: "common",
                    apply: (player) => {
                        player.changeMoveSpeed(0.5);
                        player.changeDefense(1);
                    },
                }, "delivery-support", "现场支援流"),
                this.withBranch({
                    title: "ERP 场景适配",
                    desc: "最大生命 +22，并回复 22",
                    rarity: "rare",
                    weight: 0.36,
                    apply: (player) => player.changeMaxHp(22, 22),
                }, "delivery-adaptation", "业务适配流"),
                this.withBranch({
                    title: "现场应急预案",
                    desc: "攻击 +8，防御 +2，回复 24 生命",
                    rarity: "rare",
                    weight: 0.34,
                    apply: (player) => {
                        player.changeAttack(8);
                        player.changeDefense(2);
                        player.heal(24);
                    },
                }, "delivery-support", "现场支援流"),
            ];
        default:
            return [];
        }
    }
}


