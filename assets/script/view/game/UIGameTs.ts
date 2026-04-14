
import { _decorator, BlockInputEvents, Button, Color, Component, director, EventKeyboard, Graphics, Input, input, KeyCode, Label, Layers, Node, Size, UITransform, Vec3 } from 'cc';
import { CareerRoleConfigs, CareerRoleId, CareerSpecializationOrder, CareerSpecializationUnlockLevel } from '../../const/CareerConfig';
import { GameStateEnum } from '../../const/GameStateEnum';
import {
    META_PROGRESS_DEFAULT_PLAYER_ID,
    MetaProgressSave,
    SettlementGrade,
    compareSettlementGrade,
    createDefaultMetaProgress,
    getCertificationPointByGrade,
    normalizeSettlementGrade,
    sanitizeMetaProgressSave,
} from '../../const/MetaProgressConfig';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { CareerBranchId, CareerMilestoneId, CareerTechBranchConfig, CareerTechTreeConfigs, CareerActiveSkillConfigs } from '../../const/TechTreeConfig';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { VirtualInput } from '../../data/dynamicData/VirtualInput';
import { MetaProgressApi } from '../../managerGame/MetaProgressApi';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { Simulator } from '../../utils/RVO/Simulator';
import { PlayerTs } from './PlayerTs';
import { level } from './level';

const { ccclass, property } = _decorator;

type UpgradeOption = {
    title: string;
    desc: string;
    rarity: 'common' | 'rare';
    weight?: number;
    roleId?: CareerRoleId;
    branchId?: CareerBranchId;
    milestoneId?: CareerMilestoneId;
    apply: (player: PlayerTs) => void;
};

type UpgradePanelMode = 'upgrade' | 'specialize';

@ccclass('UIGame')
export class UIGame extends Component {
    @property(Node)
    stopGame: Node = null;

    @property(Node)
    gameOver: Node = null;

    @property
    showRuntimeDebug = true;

    @property
    upgradeAutoSelectSeconds = 8;

    @property
    specializationAutoSelectSeconds = 12;

    private btnSetting: Node = null;
    private dynamicButtonBindings: Array<{ node: Node; handler: () => void }> = [];
    private runtimeDebugLabel: Label = null;
    private runtimeNotifyLabel: Label = null;
    private runtimeNotifyTimer = 0;
    private fpsTime = 0;
    private fpsFrames = 0;
    private fpsValue = 0;

    private keyboardMoveX = 0;
    private keyboardMoveY = 0;
    private pressedMoveKeys: Set<KeyCode> = new Set();

    private selectedStartRoleId: CareerRoleId = 'student';
    private readyHintShown = false;
    private menuMode: 'home' | 'role' = 'home';
    private homePanel: Node = null;
    private homeSummaryLabel: Label = null;
    private rolePanel: Node = null;
    private roleTitleLabel: Label = null;
    private roleSummaryLabel: Label = null;
    private roleOptionNodes: Node[] = [];
    private roleOptionLabels: Label[] = [];

    private bindedPlayer: Node = null;
    private upgradePanel: Node = null;
    private upgradeTitleLabel: Label = null;
    private upgradeOptionNodes: Node[] = [];
    private upgradeOptionLabels: Label[] = [];
    private upgradeCountdownLabel: Label = null;
    private currentUpgradeOptions: UpgradeOption[] = [];
    private currentUpgradeLevel = 1;
    private upgradePanelMode: UpgradePanelMode = 'upgrade';
    private upgradeAutoSelectRemain = 0;
    private pendingUpgradeLevels: number[] = [];
    private readonly upgradeHotkeys = [
        KeyCode.DIGIT_1,
        KeyCode.DIGIT_2,
        KeyCode.DIGIT_3,
        KeyCode.DIGIT_4,
        KeyCode.DIGIT_5,
        KeyCode.DIGIT_6,
    ];

    private readonly upgradeCommonColor = new Color(232, 240, 255, 255);
    private readonly upgradeRareColor = new Color(255, 220, 132, 255);
    private readonly menuTitleColor = new Color(132, 220, 255, 255);
    private readonly menuSummaryColor = new Color(210, 232, 255, 255);
    private readonly menuSelectedColor = new Color(255, 228, 126, 255);
    private readonly menuOptionColor = new Color(236, 244, 255, 255);

    private settlementPanel: Node = null;
    private settlementTitleLabel: Label = null;
    private settlementStatsLabel: Label = null;
    private settlementRatingLabel: Label = null;

    private readonly settlementTitleColor = new Color(255, 212, 96, 255);
    private readonly settlementStatsColor = new Color(210, 232, 255, 255);
    private readonly settlementRatingColors: Color[] = [
        new Color(180, 180, 180, 255),  // D
        new Color(140, 220, 255, 255),  // C
        new Color(120, 255, 180, 255),  // B
        new Color(255, 220, 100, 255),  // A
        new Color(255, 160, 80, 255),   // S
        new Color(255, 100, 100, 255),  // SS
    ];
    private metaProgress: MetaProgressSave = createDefaultMetaProgress();
    private readonly metaPlayerId = META_PROGRESS_DEFAULT_PLAYER_ID;
    private metaPersistQueue: Promise<void> = Promise.resolve();
    private settlementRewardApplied = false;
    private settlementRewardValue = 0;

    start() {
        this.btnSetting = this.node.getChildByPath('BtnSetting');
        this.btnSetting?.on(Button.EventType.CLICK, this.onBtnSetting, this);

        const scene = director.getScene();
        scene?.on(OnOrEmitConst.PlayerOnDie, this.onGameOVer, this);
        scene?.on(OnOrEmitConst.OnEliteSpawn, this.onEliteSpawn, this);
        scene?.on(OnOrEmitConst.OnEliteKilled, this.onEliteKilled, this);
        scene?.on(OnOrEmitConst.OnEliteCast, this.onEliteCast, this);
        scene?.on(OnOrEmitConst.OnEliteCoreCollected, this.onEliteCoreCollected, this);
        scene?.on(OnOrEmitConst.OnBossWarning, this.onBossWarning, this);
        scene?.on(OnOrEmitConst.OnBossSpawn, this.onBossSpawn, this);
        scene?.on(OnOrEmitConst.OnBossKilled, this.onBossKilled, this);
        scene?.on(OnOrEmitConst.OnCareerChanged, this.onCareerChanged, this);
        scene?.on(OnOrEmitConst.OnSkillPointChanged, this.onSkillPointChanged, this);
        scene?.on(OnOrEmitConst.OnRequestStartRun, this.onRequestStartRun, this);
        scene?.on(OnOrEmitConst.OnDropCollected, this.onDropCollected, this);
        scene?.on(OnOrEmitConst.OnBuffGained, this.onBuffGained, this);
        scene?.on(OnOrEmitConst.OnActiveSkillCast, this.onActiveSkillCast, this);
        scene?.on(OnOrEmitConst.OnActiveSkillReady, this.onActiveSkillReady, this);
        scene?.on(OnOrEmitConst.OnActiveSkillUnlocked, this.onActiveSkillUnlocked, this);
        scene?.on(OnOrEmitConst.OnTechDebtAuraStack, this.onTechDebtAuraStack, this);
        scene?.on(OnOrEmitConst.OnSpecialWave, this.onSpecialWave, this);
        scene?.on(OnOrEmitConst.OnShieldEnemyBlock, this.onShieldEnemyBlock, this);
        scene?.on(OnOrEmitConst.OnChargeEnemyImpact, this.onChargeEnemyImpact, this);
        scene?.on(OnOrEmitConst.OnSelfDestructExplode, this.onSelfDestructExplode, this);

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        this.bindOptionalDebugButtons();
        this.initRuntimeDebugHud();
        this.loadMetaProgress();
        this.ensureStartPanels();
        this.ensureUpgradePanel();
        this.ensureSettlementPanel();
        this.syncStartPanelsVisibility();
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
        this.safeNodeOff(scene, OnOrEmitConst.OnSkillPointChanged, this.onSkillPointChanged);
        this.safeNodeOff(scene, OnOrEmitConst.OnRequestStartRun, this.onRequestStartRun);
        this.safeNodeOff(scene, OnOrEmitConst.OnDropCollected, this.onDropCollected);
        this.safeNodeOff(scene, OnOrEmitConst.OnBuffGained, this.onBuffGained);
        this.safeNodeOff(scene, OnOrEmitConst.OnActiveSkillCast, this.onActiveSkillCast);
        this.safeNodeOff(scene, OnOrEmitConst.OnActiveSkillReady, this.onActiveSkillReady);
        this.safeNodeOff(scene, OnOrEmitConst.OnActiveSkillUnlocked, this.onActiveSkillUnlocked);
        this.safeNodeOff(scene, OnOrEmitConst.OnTechDebtAuraStack, this.onTechDebtAuraStack);
        this.safeNodeOff(scene, OnOrEmitConst.OnSpecialWave, this.onSpecialWave);
        this.safeNodeOff(scene, OnOrEmitConst.OnShieldEnemyBlock, this.onShieldEnemyBlock);
        this.safeNodeOff(scene, OnOrEmitConst.OnChargeEnemyImpact, this.onChargeEnemyImpact);
        this.safeNodeOff(scene, OnOrEmitConst.OnSelfDestructExplode, this.onSelfDestructExplode);

        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);

        this.resetKeyboardMoveInput();
        this.unbindPlayerEvents();
        for (const binding of this.dynamicButtonBindings) {
            this.safeNodeOff(binding.node, Button.EventType.CLICK, binding.handler);
        }
        this.dynamicButtonBindings.length = 0;
    }

    update(deltaTime: number) {
        this.ensurePlayerEventBinding();
        this.syncStartPanelsVisibility();

        if (GameStateInput.isReady()) {
            if (!this.readyHintShown) {
                this.readyHintShown = true;
                this.showRuntimeNotify('按 Enter / Space 或移动开始，按 C 选择职业。', 3);
            }
        } else if (GameStateInput.isLoading()) {
            this.readyHintShown = false;
        }

        if (GameStateInput.isSelectingUpgrade() && this.upgradeAutoSelectRemain > 0) {
            this.upgradeAutoSelectRemain -= deltaTime;
            if (this.upgradeCountdownLabel) {
                const remain = Math.max(0, this.upgradeAutoSelectRemain);
                this.upgradeCountdownLabel.string = `自动选择倒计时：${remain.toFixed(1)} 秒`;
            }
            if (this.upgradeAutoSelectRemain <= 0 && this.currentUpgradeOptions.length > 0) {
                this.upgradeAutoSelectRemain = 0;
                this.showRuntimeNotify(
                    this.upgradePanelMode === 'specialize'
                        ? '转职选择超时，已自动选择第一项。'
                        : '升级选择超时，已自动选择第一项。',
                    1.6,
                );
                this.applyUpgradeOption(0);
            }
        }

        // 安全兜底：如果处于 SelectingUpgrade 但面板不可见且没有选项，强制恢复 Running
        if (GameStateInput.isSelectingUpgrade() && (!this.upgradePanel?.active || this.currentUpgradeOptions.length <= 0)) {
            console.warn(`[UIGame] safety fallback: SelectingUpgrade but panel=${this.upgradePanel?.active}, options=${this.currentUpgradeOptions.length}, forcing Running`);
            if (this.upgradePanel) {
                this.upgradePanel.active = false;
            }
            this.currentUpgradeOptions = [];
            this.upgradeAutoSelectRemain = 0;
            this.pendingUpgradeLevels.length = 0;
            GameStateInput.setGameState(GameStateEnum.Running);
        }

        if (this.runtimeNotifyLabel && this.runtimeNotifyLabel.node.active) {
            this.runtimeNotifyTimer -= deltaTime;
            if (this.runtimeNotifyTimer <= 0) {
                this.runtimeNotifyLabel.node.active = false;
            }
        }

        if (!this.showRuntimeDebug || !this.runtimeDebugLabel) {
            return;
        }

        this.fpsTime += deltaTime;
        this.fpsFrames += 1;
        if (this.fpsTime >= 0.5) {
            this.fpsValue = this.fpsFrames / this.fpsTime;
            this.fpsFrames = 0;
            this.fpsTime = 0;
        }

        const stateName = GameStateEnum[GameStateInput.gameState];
        const monsters = MonsterManager.instance.goalvoes?.size ?? 0;
        const agents = Simulator.instance.getNumAgents();
        const obstacles = Simulator.instance.getObstacles().length;
        const playerInfo = this.getPlayerScript()?.getDebugSummary() ?? 'no-player';
        const activeSkillInfo = this.getActiveSkillHudText();
        this.runtimeDebugLabel.string =
            `状态：${stateName}\n` +
            `帧率：${this.fpsValue.toFixed(1)}\n` +
            `怪物/代理：${monsters}/${agents}\n` +
            `障碍：${obstacles}\n` +
            `玩家：${playerInfo}\n` +
            `${activeSkillInfo}` +
            `调试键：1/2/3/4/5/6/0 | Q=技能`;
    }

    onBtnSetting() {
        if (GameStateInput.isGameOver() || GameStateInput.isLoading() || GameStateInput.isReady() || GameStateInput.isSelectingUpgrade()) {
            return;
        }
        if (GameStateInput.isPaused()) {
            GameStateInput.setGameState(GameStateEnum.Running);
            if (this.stopGame) {
                this.stopGame.active = false;
            }
            director.resume();
            return;
        }
        if (GameStateInput.isRunning()) {
            GameStateInput.setGameState(GameStateEnum.Paused);
            if (this.stopGame) {
                this.stopGame.active = true;
            }
            director.pause();
        }
    }

    onGameOVer() {
        if (GameStateInput.isGameOver()) {
            return;
        }
        this.hideStartPanels();
        this.hideUpgradePanel(false);
        this.pendingUpgradeLevels.length = 0;
        if (this.stopGame) {
            this.stopGame.active = false;
        }
        if (this.gameOver) {
            this.gameOver.active = false;
        }
        GameStateInput.setGameState(GameStateEnum.GameOver);
        this.showSettlementPanel();
        director.pause();
    }

    reloadGame() {
        GameStateInput.setGameState(GameStateEnum.Loading);
        this.pendingUpgradeLevels.length = 0;
        VirtualInput.resetKeyboardAxis();
        VirtualInput.resetJoystickAxis();
        director.reset();
        director.loadScene('gameUp');
        director.resume();
    }
    onDebugAddAttack() {
        this.getPlayerScript()?.changeAttack(10);
        this.logDebugSummary('add attack');
    }

    onDebugReduceAttackInterval() {
        this.getPlayerScript()?.changeAttackInterval(-0.1);
        this.logDebugSummary('reduce attack interval');
    }

    onDebugAddProjectile() {
        this.getPlayerScript()?.changeProjectileCount(1);
        this.logDebugSummary('add projectile');
    }

    onDebugAddMoveSpeed() {
        this.getPlayerScript()?.changeMoveSpeed(1);
        this.logDebugSummary('add move speed');
    }

    onDebugAddPenetration() {
        this.getPlayerScript()?.changeProjectilePenetration(1);
        this.logDebugSummary('add penetration');
    }

    onDebugToggleTrace() {
        const player = this.getPlayerScript();
        if (!player) {
            return;
        }
        const traceEnabled = player.toggleProjectileTrace();
        this.logDebugSummary(traceEnabled ? 'trace on' : 'trace off');
    }

    onDebugResetStats() {
        this.getPlayerScript()?.resetDebugStats();
        this.logDebugSummary('reset stats');
    }

    private getPlayerScript(): PlayerTs | null {
        return MonsterManager.instance.player?.getComponent(PlayerTs) ?? null;
    }

    private getActiveSkillHudText(): string {
        const player = this.getPlayerScript();
        if (!player) {
            return '';
        }
        const config = player.getActiveSkillConfig();
        if (!config) {
            if (player.canUnlockActiveSkill()) {
                return '技能：可解锁（升级时选择）\n';
            }
            return player.isSpecialized() ? '技能：未解锁\n' : '';
        }
        if (player.isActiveSkillActive()) {
            return `技能：${config.name} 生效中（${player.getActiveSkillDurationRemain().toFixed(1)}s）\n`;
        }
        const cd = player.getActiveSkillCooldownRemain();
        if (cd > 0) {
            return `技能：${config.name} 冷却中（${cd.toFixed(1)}s）| Q 释放\n`;
        }
        return `技能：${config.name} 就绪 | Q 释放\n`;
    }

    private logDebugSummary(action: string) {
        const player = this.getPlayerScript();
        if (!player) {
            return;
        }
        console.log(`[debug:${action}] ${player.getDebugSummary()}`);
    }

    private onKeyDown(event: EventKeyboard) {
        if (this.isMovementKey(event.keyCode)) {
            this.updateKeyboardMoveInput(event.keyCode, true);
            if (GameStateInput.isReady()) {
                this.startSelectedRun();
            }
        }

        if (GameStateInput.isReady()) {
            if (this.rolePanel?.active) {
                const roleIndex = [
                    KeyCode.DIGIT_1,
                    KeyCode.DIGIT_2,
                    KeyCode.DIGIT_3,
                    KeyCode.DIGIT_4,
                    KeyCode.DIGIT_5,
                    KeyCode.DIGIT_6,
                    KeyCode.DIGIT_7,
                ].indexOf(event.keyCode);
                if (roleIndex >= 0) {
                    this.selectStartRoleByIndex(roleIndex);
                    return;
                }
                if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
                    this.startSelectedRun();
                    return;
                }
                if (event.keyCode === KeyCode.ESCAPE) {
                    this.openHomePanel();
                    return;
                }
            }

            if (this.homePanel?.active) {
                if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
                    this.startSelectedRun();
                    return;
                }
                if (event.keyCode === KeyCode.KEY_C) {
                    this.openRolePanel();
                    return;
                }
            }
            return;
        }

        if (GameStateInput.isSelectingUpgrade()) {
            const optionIndex = this.upgradeHotkeys.indexOf(event.keyCode);
            if (optionIndex >= 0 && optionIndex < this.currentUpgradeOptions.length) {
                this.applyUpgradeOption(optionIndex);
            }
            return;
        }

        if (event.keyCode === KeyCode.KEY_R) {
            this.reloadGame();
            return;
        }
        if (event.keyCode === KeyCode.KEY_P) {
            this.onBtnSetting();
            return;
        }
        if (!GameStateInput.canUpdateWorld()) {
            return;
        }

        // Q 键释放主动技能
        if (event.keyCode === KeyCode.KEY_Q) {
            const player = this.getPlayerScript();
            if (player) {
                if (player.canCastActiveSkill()) {
                    player.castActiveSkill();
                } else if (player.isActiveSkillUnlocked()) {
                    const cd = player.getActiveSkillCooldownRemain();
                    if (cd > 0) {
                        this.showRuntimeNotify(`技能冷却中：${cd.toFixed(1)} 秒`, 1);
                    } else if (player.isActiveSkillActive()) {
                        this.showRuntimeNotify('技能生效中', 0.8);
                    }
                }
            }
            return;
        }

        switch (event.keyCode) {
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

    private onKeyUp(event: EventKeyboard) {
        if (!this.isMovementKey(event.keyCode)) {
            return;
        }
        this.updateKeyboardMoveInput(event.keyCode, false);
    }

    private isMovementKey(keyCode: KeyCode): boolean {
        switch (keyCode) {
        case KeyCode.KEY_W:
        case KeyCode.KEY_A:
        case KeyCode.KEY_S:
        case KeyCode.KEY_D:
        case KeyCode.ARROW_UP:
        case KeyCode.ARROW_DOWN:
        case KeyCode.ARROW_LEFT:
        case KeyCode.ARROW_RIGHT:
            return true;
        default:
            return false;
        }
    }

    private updateKeyboardMoveInput(keyCode: KeyCode, isPressed: boolean) {
        if (isPressed) {
            this.pressedMoveKeys.add(keyCode);
        } else {
            this.pressedMoveKeys.delete(keyCode);
        }

        let moveX = 0;
        let moveY = 0;
        for (const one of this.pressedMoveKeys.values()) {
            switch (one) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                moveX -= 1;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                moveX += 1;
                break;
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                moveY += 1;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                moveY -= 1;
                break;
            default:
                break;
            }
        }

        this.keyboardMoveX = moveX;
        this.keyboardMoveY = moveY;
        VirtualInput.setKeyboardAxis(this.keyboardMoveX, this.keyboardMoveY);
    }

    private resetKeyboardMoveInput() {
        this.keyboardMoveX = 0;
        this.keyboardMoveY = 0;
        this.pressedMoveKeys.clear();
        VirtualInput.resetKeyboardAxis();
    }

    private bindOptionalDebugButtons() {
        this.bindOptionalButton('BtnDebugAtk', this.onDebugAddAttack);
        this.bindOptionalButton('BtnDebugRate', this.onDebugReduceAttackInterval);
        this.bindOptionalButton('BtnDebugProjectile', this.onDebugAddProjectile);
        this.bindOptionalButton('BtnDebugMove', this.onDebugAddMoveSpeed);
        this.bindOptionalButton('BtnDebugPen', this.onDebugAddPenetration);
        this.bindOptionalButton('BtnDebugTrace', this.onDebugToggleTrace);
        this.bindOptionalButton('BtnDebugReset', this.onDebugResetStats);
        this.bindOptionalButton('BtnReload', this.reloadGame);
    }

    private bindOptionalButton(nodeName: string, handler: () => void) {
        const node = this.findNodeByName(this.node, nodeName);
        if (!node) {
            return;
        }
        node.on(Button.EventType.CLICK, handler, this);
        this.dynamicButtonBindings.push({ node, handler });
    }

    private findNodeByName(root: Node, nodeName: string): Node | null {
        if (root.name === nodeName) {
            return root;
        }
        for (const child of root.children) {
            const matched = this.findNodeByName(child, nodeName);
            if (matched) {
                return matched;
            }
        }
        return null;
    }

    private getLevelController(): level | null {
        const scene = director.getScene();
        return scene?.getComponentInChildren(level)
            ?? scene?.getChildByName('Level')?.getComponent(level)
            ?? null;
    }

    private onRequestStartRun() {
        if (!GameStateInput.isReady()) {
            return;
        }
        this.startSelectedRun();
    }
    private ensureStartPanels() {
        if (!this.homePanel) {
            this.homePanel = this.createUINode('HomePanel');
            this.homePanel.parent = this.node;
            this.homePanel.addComponent(UITransform).setContentSize(new Size(980, 1280));
            this.homePanel.addComponent(BlockInputEvents);

            // 首页背景遮罩
            this.drawSolidBackground(this.homePanel, new Color(10, 15, 30, 210), new Size(980, 1280));

            const titleNode = this.createUINode('HomeTitle');
            titleNode.parent = this.homePanel;
            titleNode.setPosition(0, 430, 0);
            titleNode.addComponent(UITransform).setContentSize(new Size(900, 120));
            const titleLabel = titleNode.addComponent(Label);
            titleLabel.fontSize = 42;
            titleLabel.lineHeight = 52;
            titleLabel.color = this.menuTitleColor;
            titleLabel.string = 'IT Career Rogue\n技术人生生存战';

            const summaryNode = this.createUINode('HomeSummary');
            summaryNode.parent = this.homePanel;
            summaryNode.setPosition(0, 190, 0);
            summaryNode.addComponent(UITransform).setContentSize(new Size(860, 220));
            this.homeSummaryLabel = summaryNode.addComponent(Label);
            this.homeSummaryLabel.fontSize = 22;
            this.homeSummaryLabel.lineHeight = 30;
            this.homeSummaryLabel.color = this.menuSummaryColor;

            this.createMenuButton(this.homePanel, 'HomeStartBtn', '开始战斗', new Vec3(0, -40, 0), () => {
                this.startSelectedRun();
            });
            this.createMenuButton(this.homePanel, 'HomeRoleBtn', '选择职业', new Vec3(0, -190, 0), () => {
                this.openRolePanel();
            });

            const hintNode = this.createUINode('HomeHint');
            hintNode.parent = this.homePanel;
            hintNode.setPosition(0, -330, 0);
            hintNode.addComponent(UITransform).setContentSize(new Size(860, 80));
            const hintLabel = hintNode.addComponent(Label);
            hintLabel.fontSize = 18;
            hintLabel.lineHeight = 24;
            hintLabel.color = this.menuSummaryColor;
            hintLabel.string = 'Enter / Space 开始 | C 选择职业 | WASD 也可直接开局';
        }

        if (!this.rolePanel) {
            this.rolePanel = this.createUINode('RolePanel');
            this.rolePanel.parent = this.node;
            this.rolePanel.addComponent(UITransform).setContentSize(new Size(980, 1280));
            this.rolePanel.addComponent(BlockInputEvents);

            // 职业选择页背景遮罩
            this.drawSolidBackground(this.rolePanel, new Color(10, 15, 30, 210), new Size(980, 1280));

            const titleNode = this.createUINode('RoleTitle');
            titleNode.parent = this.rolePanel;
            titleNode.setPosition(0, 500, 0);
            titleNode.addComponent(UITransform).setContentSize(new Size(900, 80));
            this.roleTitleLabel = titleNode.addComponent(Label);
            this.roleTitleLabel.fontSize = 38;
            this.roleTitleLabel.lineHeight = 46;
            this.roleTitleLabel.color = this.menuTitleColor;

            const summaryNode = this.createUINode('RoleSummary');
            summaryNode.parent = this.rolePanel;
            summaryNode.setPosition(0, 410, 0);
            summaryNode.addComponent(UITransform).setContentSize(new Size(900, 72));
            this.roleSummaryLabel = summaryNode.addComponent(Label);
            this.roleSummaryLabel.fontSize = 18;
            this.roleSummaryLabel.lineHeight = 24;
            this.roleSummaryLabel.color = this.menuSummaryColor;

            const optionY = [280, 170, 60, -50, -160, -270, -380];
            const roleIds = this.getMenuRoleOptions();
            for (let i = 0; i < roleIds.length; i++) {
                const roleId = roleIds[i];
                const buttonNode = this.createUINode(`RoleOption${i + 1}`);
                buttonNode.parent = this.rolePanel;
                buttonNode.setPosition(0, optionY[i], 0);
                buttonNode.addComponent(UITransform).setContentSize(new Size(900, 94));
                buttonNode.addComponent(Button);
                const label = buttonNode.addComponent(Label);
                label.fontSize = 18;
                label.lineHeight = 24;
                const clickHandler = () => this.setSelectedStartRole(roleId);
                buttonNode.on(Button.EventType.CLICK, clickHandler, this);
                this.dynamicButtonBindings.push({ node: buttonNode, handler: clickHandler });
                this.roleOptionNodes.push(buttonNode);
                this.roleOptionLabels.push(label);
            }

            this.createMenuButton(this.rolePanel, 'RoleBackBtn', '返回首页', new Vec3(-220, -545, 0), () => {
                this.openHomePanel();
            }, new Size(260, 80));
            this.createMenuButton(this.rolePanel, 'RoleConfirmBtn', '开始战斗', new Vec3(220, -545, 0), () => {
                this.startSelectedRun();
            }, new Size(260, 80));

            const hintNode = this.createUINode('RoleHint');
            hintNode.parent = this.rolePanel;
            hintNode.setPosition(0, -620, 0);
            hintNode.addComponent(UITransform).setContentSize(new Size(900, 60));
            const hintLabel = hintNode.addComponent(Label);
            hintLabel.fontSize = 16;
            hintLabel.lineHeight = 22;
            hintLabel.color = this.menuSummaryColor;
            hintLabel.string = '1-7 选择职业 | Enter 开始 | Esc 返回';
        }
    }

    private createMenuButton(parent: Node, nodeName: string, text: string, position: Vec3, onClick: () => void, size: Size = new Size(320, 96)) {
        const buttonNode = this.createUINode(nodeName);
        buttonNode.parent = parent;
        buttonNode.setPosition(position);
        buttonNode.addComponent(UITransform).setContentSize(size);
        buttonNode.addComponent(Button);
        const label = buttonNode.addComponent(Label);
        label.fontSize = 24;
        label.lineHeight = 30;
        label.color = this.menuSelectedColor;
        label.string = text;
        buttonNode.on(Button.EventType.CLICK, onClick, this);
        this.dynamicButtonBindings.push({ node: buttonNode, handler: onClick });
        return buttonNode;
    }

    private getMenuRoleOptions(): CareerRoleId[] {
        return (['student'] as CareerRoleId[]).concat(CareerSpecializationOrder);
    }

    private syncStartPanelsVisibility() {
        if (!this.homePanel || !this.rolePanel) {
            return;
        }
        if (!GameStateInput.isReady()) {
            this.hideStartPanels();
            return;
        }
        if (this.menuMode === 'role') {
            this.openRolePanel();
            return;
        }
        this.openHomePanel();
    }

    private hideStartPanels() {
        if (this.homePanel) {
            this.homePanel.active = false;
        }
        if (this.rolePanel) {
            this.rolePanel.active = false;
        }
    }

    private openHomePanel() {
        this.menuMode = 'home';
        this.refreshStartPanelContent();
        this.homePanel.active = true;
        this.rolePanel.active = false;
    }

    private openRolePanel() {
        this.menuMode = 'role';
        this.refreshStartPanelContent();
        this.homePanel.active = false;
        this.rolePanel.active = true;
    }

    private refreshStartPanelContent() {
        const selectedRole = CareerRoleConfigs[this.selectedStartRoleId];
        if (this.homeSummaryLabel) {
            this.homeSummaryLabel.string =
                `当前角色：${selectedRole.name}\n` +
                `${this.getStartRoleSummary(this.selectedStartRoleId)}\n` +
                `技术栈：${selectedRole.techStacks.join(' / ')}\n` +
                `${this.getHomeMetaSummaryText()}`;
        }
        if (this.roleTitleLabel) {
            this.roleTitleLabel.string = '选择起始职业';
        }
        if (this.roleSummaryLabel) {
            this.roleSummaryLabel.string = `当前选择：${selectedRole.name} | ${selectedRole.specialty}\n技术栈：${selectedRole.techStacks.join(' / ')}`;
        }

        const roleIds = this.getMenuRoleOptions();
        for (let i = 0; i < this.roleOptionLabels.length; i++) {
            const label = this.roleOptionLabels[i];
            const roleId = roleIds[i];
            const config = CareerRoleConfigs[roleId];
            const selected = roleId === this.selectedStartRoleId;
            label.string =
                `[${i + 1}] ${config.name}\n` +
                `${this.getStartRoleSummary(roleId)}\n` +
                `技术栈：${config.techStacks.join(' / ')}`;
            label.color = selected ? this.menuSelectedColor : this.menuOptionColor;
            this.roleOptionNodes[i].active = true;
        }
    }

    private getStartRoleSummary(roleId: CareerRoleId): string {
        const config = CareerRoleConfigs[roleId];
        if (roleId === 'student') {
            return `成长路线：Lv.${CareerSpecializationUnlockLevel} 可转职，适合稳健开局。`;
        }
        return `${config.passiveName} | ${config.specialty}`;
    }

    private getHomeMetaSummaryText(): string {
        if (this.metaProgress.totalRuns <= 0) {
            return '认证点：0 | 累计局数：0 | 历史最佳：暂无';
        }
        return `认证点：${this.metaProgress.certificationPoint} | 累计局数：${this.metaProgress.totalRuns}\n` +
            `历史最佳：${this.metaProgress.bestGrade}（${this.metaProgress.bestScore} 分）`;
    }

    private loadMetaProgress() {
        this.metaProgress = createDefaultMetaProgress();
        this.metaPersistQueue = this.metaPersistQueue.then(async () => {
            try {
                const progress = await MetaProgressApi.load(this.metaPlayerId);
                this.metaProgress = sanitizeMetaProgressSave(progress);
            } catch (error) {
                console.warn('[UIGame] loadMetaProgress from db failed', error);
                this.metaProgress = createDefaultMetaProgress();
            } finally {
                this.refreshStartPanelContent();
            }
        });
    }

    private saveMetaProgress() {
        this.metaPersistQueue = this.metaPersistQueue.then(async () => {
            try {
                const snapshot = sanitizeMetaProgressSave(this.metaProgress);
                const progress = await MetaProgressApi.save(this.metaPlayerId, snapshot);
                this.metaProgress = sanitizeMetaProgressSave(progress);
                this.refreshStartPanelContent();
            } catch (error) {
                console.warn('[UIGame] saveMetaProgress to db failed', error);
            }
        });
    }

    private applySettlementMetaProgress(
        grade: SettlementGrade,
        score: number,
        maxLevel: number,
        totalKills: number,
        roleId: CareerRoleId,
    ): number {
        const normalizedGrade = normalizeSettlementGrade(grade);
        const rewardPoint = getCertificationPointByGrade(normalizedGrade);
        this.metaProgress.certificationPoint += rewardPoint;
        this.metaProgress.totalRuns += 1;
        this.metaProgress.bestScore = Math.max(this.metaProgress.bestScore, Math.floor(score));
        if (compareSettlementGrade(normalizedGrade, this.metaProgress.bestGrade) > 0) {
            this.metaProgress.bestGrade = normalizedGrade;
        }
        this.metaProgress.highestLevel = Math.max(this.metaProgress.highestLevel, Math.floor(maxLevel));
        this.metaProgress.totalKills += Math.max(0, Math.floor(totalKills));
        this.metaProgress.lastRoleId = roleId;
        this.metaProgress.updatedAt = Date.now();
        this.saveMetaProgress();
        return rewardPoint;
    }

    private selectStartRoleByIndex(index: number) {
        const roleIds = this.getMenuRoleOptions();
        if (index < 0 || index >= roleIds.length) {
            return;
        }
        this.setSelectedStartRole(roleIds[index]);
    }

    private setSelectedStartRole(roleId: CareerRoleId) {
        this.selectedStartRoleId = roleId;
        this.refreshStartPanelContent();
    }

    private startSelectedRun() {
        const levelController = this.getLevelController();
        if (!levelController) {
            this.showRuntimeNotify('未找到关卡控制器，无法开始。', 2.4);
            console.warn('[start-run] level controller not found');
            return;
        }
        if (!levelController.startRun(this.selectedStartRoleId)) {
            const stateName = GameStateEnum[GameStateInput.gameState];
            this.showRuntimeNotify(`当前状态无法开始：${stateName}`, 2.2);
            console.warn(`[start-run] failed in state ${stateName}`);
            return;
        }
        this.pendingUpgradeLevels.length = 0;
        director.resume();
        this.hideStartPanels();
        const roleName = CareerRoleConfigs[this.selectedStartRoleId]?.name ?? '未知职业';
        this.showRuntimeNotify(`开始战斗：${roleName}`, 1.8);
    }

    private initRuntimeDebugHud() {
        if (!this.showRuntimeDebug) {
            return;
        }
        let hudNode = this.findNodeByName(this.node, 'RuntimeDebugHud');
        if (!hudNode) {
            hudNode = this.createUINode('RuntimeDebugHud');
            hudNode.parent = this.node;
            hudNode.setPosition(-440, 760, 0);
            hudNode.addComponent(UITransform).setContentSize(new Size(520, 180));
            this.runtimeDebugLabel = hudNode.addComponent(Label);
        } else {
            this.runtimeDebugLabel = hudNode.getComponent(Label) ?? hudNode.addComponent(Label);
        }
        this.runtimeDebugLabel.fontSize = 18;
        this.runtimeDebugLabel.lineHeight = 22;
        this.runtimeDebugLabel.string = 'Runtime HUD init...';
    }

    private ensureRuntimeNotifyLabel() {
        if (this.runtimeNotifyLabel) {
            return;
        }
        const notifyNode = this.createUINode('RuntimeNotify');
        notifyNode.parent = this.node;
        notifyNode.setPosition(0, 560, 0);
        notifyNode.addComponent(UITransform).setContentSize(new Size(920, 110));
        this.runtimeNotifyLabel = notifyNode.addComponent(Label);
        this.runtimeNotifyLabel.fontSize = 28;
        this.runtimeNotifyLabel.lineHeight = 36;
        this.runtimeNotifyLabel.color = this.menuSelectedColor;
        this.runtimeNotifyLabel.node.active = false;
    }

    private showRuntimeNotify(content: string, duration: number = 2.6) {
        this.ensureRuntimeNotifyLabel();
        this.runtimeNotifyLabel.string = content;
        this.runtimeNotifyLabel.node.active = true;
        this.runtimeNotifyTimer = duration;
    }
    private ensurePlayerEventBinding() {
        const player = MonsterManager.instance.player;
        if (player === this.bindedPlayer) {
            return;
        }
        this.unbindPlayerEvents();
        if (player) {
            this.bindedPlayer = player;
            player.on(OnOrEmitConst.OnplayerUpgrade, this.onPlayerUpgrade, this);
            console.log('[UIGame] bound OnplayerUpgrade to player node');
        }
    }

    private unbindPlayerEvents() {
        if (!this.bindedPlayer) {
            return;
        }
        this.bindedPlayer.off(OnOrEmitConst.OnplayerUpgrade, this.onPlayerUpgrade, this);
        this.bindedPlayer = null;
    }

    private ensureUpgradePanel() {
        if (this.upgradePanel) {
            return;
        }
        this.upgradePanel = this.createUINode('UpgradePanel');
        this.upgradePanel.parent = this.node;
        this.upgradePanel.addComponent(UITransform).setContentSize(new Size(980, 1280));
        this.upgradePanel.addComponent(BlockInputEvents);
        this.upgradePanel.active = false;

        // 半透明黑色背景遮罩，让面板在 3D 场景上清晰可见
        this.drawSolidBackground(this.upgradePanel, new Color(0, 0, 0, 180), new Size(980, 1280));

        // 标题
        const titleNode = this.createUINode('UpgradeTitle');
        titleNode.parent = this.upgradePanel;
        titleNode.setPosition(0, 470, 0);
        titleNode.addComponent(UITransform).setContentSize(new Size(900, 120));
        this.upgradeTitleLabel = titleNode.addComponent(Label);
        this.upgradeTitleLabel.fontSize = 30;
        this.upgradeTitleLabel.lineHeight = 38;
        this.upgradeTitleLabel.color = this.menuTitleColor;

        // 倒计时提示
        const countdownNode = this.createUINode('UpgradeCountdown');
        countdownNode.parent = this.upgradePanel;
        countdownNode.setPosition(0, 390, 0);
        countdownNode.addComponent(UITransform).setContentSize(new Size(900, 36));
        this.upgradeCountdownLabel = countdownNode.addComponent(Label);
        this.upgradeCountdownLabel.fontSize = 18;
        this.upgradeCountdownLabel.lineHeight = 24;
        this.upgradeCountdownLabel.color = new Color(255, 200, 100, 200);

        // 选项卡片（带底板背景）
        const optionY = [280, 130, -20, -170, -320, -470];
        for (let i = 0; i < optionY.length; i++) {
            const optionNode = this.createUINode(`UpgradeOption${i + 1}`);
            optionNode.parent = this.upgradePanel;
            optionNode.setPosition(0, optionY[i], 0);
            optionNode.addComponent(UITransform).setContentSize(new Size(860, 120));
            optionNode.addComponent(Button);

            // 选项底板背景（深蓝半透明）
            this.drawSolidBackground(optionNode, new Color(30, 50, 80, 200), new Size(860, 120));

            const label = optionNode.addComponent(Label);
            label.fontSize = 20;
            label.lineHeight = 28;
            const clickHandler = () => this.applyUpgradeOption(i);
            optionNode.on(Button.EventType.CLICK, clickHandler, this);
            this.dynamicButtonBindings.push({ node: optionNode, handler: clickHandler });
            this.upgradeOptionNodes.push(optionNode);
            this.upgradeOptionLabels.push(label);
        }

        // 底部操作提示
        const hintNode = this.createUINode('UpgradeHint');
        hintNode.parent = this.upgradePanel;
        hintNode.setPosition(0, -590, 0);
        hintNode.addComponent(UITransform).setContentSize(new Size(860, 40));
        const hintLabel = hintNode.addComponent(Label);
        hintLabel.fontSize = 16;
        hintLabel.lineHeight = 22;
        hintLabel.color = this.menuSummaryColor;
        hintLabel.string = '点击选项或按数字键 1-6 选择 | 超时将自动选择第一项';
    }

    private showUpgradePanel(mode: UpgradePanelMode, levelValue: number, options: UpgradeOption[], title: string) {
        this.ensureUpgradePanel();
        const ut = this.upgradePanel.getComponent(UITransform);
        const parentUt = this.node.getComponent(UITransform);
        console.log(`[UIGame] showUpgradePanel mode=${mode} Lv.${levelValue} options=${options.length} panelParent=${this.upgradePanel?.parent?.name} panelSize=${ut?.contentSize.width}x${ut?.contentSize.height} parentSize=${parentUt?.contentSize.width}x${parentUt?.contentSize.height} panelPos=${this.upgradePanel.position.toString()} autoSelect=${this.upgradeAutoSelectSeconds}s`);
        this.upgradePanelMode = mode;
        this.currentUpgradeLevel = levelValue;
        this.currentUpgradeOptions = options;
        this.upgradeAutoSelectRemain = mode === 'specialize' ? this.specializationAutoSelectSeconds : this.upgradeAutoSelectSeconds;
        this.upgradeTitleLabel.string = title;
        if (this.upgradeCountdownLabel) {
            this.upgradeCountdownLabel.string = `自动选择倒计时：${this.upgradeAutoSelectRemain.toFixed(1)} 秒`;
        }
        this.upgradePanel.active = true;
        GameStateInput.setGameState(GameStateEnum.SelectingUpgrade);

        for (let i = 0; i < this.upgradeOptionLabels.length; i++) {
            const node = this.upgradeOptionNodes[i];
            const label = this.upgradeOptionLabels[i];
            const option = options[i];
            node.active = !!option;
            if (!option) {
                continue;
            }
            label.color = option.rarity === 'rare' ? this.upgradeRareColor : this.upgradeCommonColor;
            label.string = `[${i + 1}] ${option.title}\n${option.desc}`;
        }
    }

    private hideUpgradePanel(resumeRunning: boolean) {
        console.log(`[UIGame] hideUpgradePanel resumeRunning=${resumeRunning}, pending=${this.pendingUpgradeLevels.length}, isGameOver=${GameStateInput.isGameOver()}`);
        if (this.upgradePanel) {
            this.upgradePanel.active = false;
        }
        this.currentUpgradeOptions = [];
        this.upgradeAutoSelectRemain = 0;
        if (this.tryPresentQueuedUpgrade()) {
            return;
        }
        if (resumeRunning && !GameStateInput.isGameOver()) {
            GameStateInput.setGameState(GameStateEnum.Running);
        }
    }

    private onPlayerUpgrade(levelValue: number, player?: PlayerTs) {
        const playerTs = player ?? this.getPlayerScript();
        if (!playerTs) {
            console.warn('[UIGame] onPlayerUpgrade: no playerTs');
            return;
        }
        console.log(`[UIGame] onPlayerUpgrade Lv.${levelValue}, panelActive=${this.upgradePanel?.active}, state=${GameStateInput.gameState}, pending=${this.pendingUpgradeLevels.length}`);
        if (this.upgradePanel?.active || GameStateInput.isSelectingUpgrade()) {
            this.pendingUpgradeLevels.push(levelValue);
            return;
        }
        if (!this.presentUpgradeForLevel(levelValue, playerTs)) {
            console.warn(`[UIGame] onPlayerUpgrade: presentUpgradeForLevel returned false for Lv.${levelValue}`);
            return;
        }
    }

    private tryPresentQueuedUpgrade(): boolean {
        while (this.pendingUpgradeLevels.length > 0) {
            const playerTs = this.getPlayerScript();
            if (!playerTs) {
                this.pendingUpgradeLevels.length = 0;
                return false;
            }
            const nextLevel = this.pendingUpgradeLevels.shift();
            if (!Number.isFinite(nextLevel)) {
                continue;
            }
            if (this.presentUpgradeForLevel(nextLevel, playerTs)) {
                return true;
            }
        }
        return false;
    }

    private presentUpgradeForLevel(levelValue: number, playerTs: PlayerTs): boolean {
        if (playerTs.canSelectSpecialization(levelValue)) {
            this.presentSpecializationChoices(levelValue);
            return true;
        }
        return this.presentUpgradeChoices(playerTs, levelValue);
    }

    private presentSpecializationChoices(levelValue: number) {
        const options = CareerSpecializationOrder.map((roleId) => {
            const role = CareerRoleConfigs[roleId];
            return {
                title: `转职：${role.name}`,
                desc: `${role.passiveName}\n技术栈：${role.techStacks.join(' / ')}\n${role.specialty}`,
                rarity: 'rare' as const,
                roleId,
                weight: 1,
                apply: (player: PlayerTs) => {
                    player.applyCareerRole(roleId, true, true);
                },
            };
        });
        this.showUpgradePanel(
            'specialize',
            levelValue,
            options,
            `Lv.${levelValue} 达到转职门槛，选择一个职业方向`,
        );
    }

    private presentUpgradeChoices(player: PlayerTs, levelValue: number): boolean {
        const options = this.pickUpgradeOptions(this.buildUpgradeOptions(player), 3);
        if (options.length <= 0) {
            return false;
        }
        this.showUpgradePanel(
            'upgrade',
            levelValue,
            options,
            `Lv.${levelValue} 升级\n职业：${player.getCareerRoleName()} | 被动：${player.getCareerPassiveName()}`,
        );
        return true;
    }

    private buildUpgradeOptions(player: PlayerTs): UpgradeOption[] {
        const options: UpgradeOption[] = [];
        options.push(...this.buildCommonUpgradeOptions(player));
        if (player.isSpecialized()) {
            options.push(...this.buildCareerBranchOptions(player));
            options.push(...this.buildCareerMilestoneOptions(player));
            // 主动技能解锁选项
            if (player.canUnlockActiveSkill()) {
                const skillConfig = CareerActiveSkillConfigs[player.getCareerRoleId()];
                if (skillConfig) {
                    options.push({
                        title: `解锁主动技能：${skillConfig.name}`,
                        desc: `${skillConfig.desc}\n冷却 ${skillConfig.cooldown} 秒 | 消耗 ${skillConfig.unlockSkillPointCost} 技能点`,
                        rarity: 'rare',
                        weight: 3.0,
                        apply: (target: PlayerTs) => {
                            target.unlockActiveSkill();
                        },
                    });
                }
            }
        }
        return options;
    }

    private buildCommonUpgradeOptions(player: PlayerTs): UpgradeOption[] {
        return [
            { title: '输出调优', desc: '攻击 +8', rarity: 'common', weight: 1.1, apply: (target) => target.changeAttack(8) },
            { title: '快速构建', desc: '攻击间隔 -0.08', rarity: 'common', weight: 1.1, apply: (target) => target.changeAttackInterval(-0.08) },
            { title: '脚手架扩展', desc: '子弹 +1', rarity: 'common', weight: 0.9, apply: (target) => target.changeProjectileCount(1) },
            { title: '接口联调', desc: '穿透 +1', rarity: 'common', weight: 0.9, apply: (target) => target.changeProjectilePenetration(1) },
            { title: '工位冲刺', desc: '移速 +0.6', rarity: 'common', weight: 1, apply: (target) => target.changeMoveSpeed(0.6) },
            {
                title: '防线预案',
                desc: '防御 +1，生命上限 +12，回复 12',
                rarity: 'common',
                weight: 1,
                apply: (target) => {
                    target.changeDefense(1);
                    target.changeMaxHp(12, 12);
                },
            },
            {
                title: player.isProjectileTraceEnabled() ? '追踪增强' : '启用追踪',
                desc: player.isProjectileTraceEnabled() ? '攻击 +6，移速 +0.4' : '启用追踪弹并获得攻击 +4',
                rarity: 'common',
                weight: 0.85,
                apply: (target) => {
                    if (!target.isProjectileTraceEnabled()) {
                        target.setProjectileTraceEnabled(true);
                        target.changeAttack(4);
                        return;
                    }
                    target.changeAttack(6);
                    target.changeMoveSpeed(0.4);
                },
            },
        ];
    }

    private buildCareerBranchOptions(player: PlayerTs): UpgradeOption[] {
        const roleId = player.getCareerRoleId();
        const branches = CareerTechTreeConfigs[roleId] ?? [];
        return branches.map((branch) => ({
            title: `技术树：${this.getBranchDisplayName(branch)}`,
            desc: `分支等级 +1\n${this.getBranchUpgradeDesc(branch.id)}`,
            rarity: 'common' as const,
            weight: 1.1 + player.getCareerBranchWeightBonus(branch.id),
            branchId: branch.id,
            apply: (target: PlayerTs) => {
                target.addCareerBranchProgress(branch.id, 1);
                this.applyBranchUpgrade(target, branch.id);
            },
        }));
    }

    private buildCareerMilestoneOptions(player: PlayerTs): UpgradeOption[] {
        const roleId = player.getCareerRoleId();
        const branches = CareerTechTreeConfigs[roleId] ?? [];
        const options: UpgradeOption[] = [];
        for (const branch of branches) {
            const nextMilestone = branch.milestones.find((item) => !player.hasCareerMilestone(item.id));
            if (!nextMilestone) {
                continue;
            }
            if (!player.canUnlockCareerMilestone(branch.id, nextMilestone.id)) {
                continue;
            }
            options.push({
                title: `突破：${this.getBranchDisplayName(branch)}`,
                desc: `${this.getMilestoneDisplayName(branch, nextMilestone.id)}\n消耗 ${nextMilestone.costSkillPoint} 点技能点，解锁关键强化`,
                rarity: 'rare',
                weight: 2.6,
                branchId: branch.id,
                milestoneId: nextMilestone.id,
                apply: (target: PlayerTs) => {
                    target.unlockCareerMilestone(branch.id, nextMilestone.id);
                },
            });
        }
        return options;
    }
    private pickUpgradeOptions(options: UpgradeOption[], count: number): UpgradeOption[] {
        const pool = options.slice();
        const result: UpgradeOption[] = [];
        while (pool.length > 0 && result.length < count) {
            const totalWeight = pool.reduce((sum, item) => sum + Math.max(0.01, item.weight ?? 1), 0);
            let roll = Math.random() * totalWeight;
            let pickIndex = 0;
            for (let i = 0; i < pool.length; i++) {
                roll -= Math.max(0.01, pool[i].weight ?? 1);
                if (roll <= 0) {
                    pickIndex = i;
                    break;
                }
            }
            result.push(pool.splice(pickIndex, 1)[0]);
        }
        return result;
    }

    private applyUpgradeOption(index: number) {
        const option = this.currentUpgradeOptions[index];
        const player = this.getPlayerScript();
        console.log(`[UIGame] applyUpgradeOption index=${index}, hasOption=${!!option}, hasPlayer=${!!player}`);
        console.trace('[UIGame] applyUpgradeOption callstack');
        if (!option || !player) {
            this.hideUpgradePanel(true);
            return;
        }
        option.apply(player);
        this.hideUpgradePanel(true);
        this.showRuntimeNotify(`已获得：${option.title}`, 1.8);
    }
    private applyBranchUpgrade(player: PlayerTs, branchId: string) {
        switch (branchId) {
        case 'frontend-component':
            player.changeAttack(4);
            break;
        case 'frontend-engineering':
            player.changeAttackInterval(-0.04);
            player.changeMoveSpeed(0.2);
            break;
        case 'frontend-performance':
            player.changeAttack(6);
            break;
        case 'backend-service':
            player.changeMaxHp(8, 8);
            player.changeDefense(1);
            break;
        case 'backend-data':
            player.changeProjectilePenetration(1);
            break;
        case 'backend-concurrency':
            player.changeAttack(8);
            player.changeAttackInterval(-0.03);
            break;
        case 'product-insight':
            player.changeMaxHp(6, 6);
            player.setProjectileTraceEnabled(true);
            break;
        case 'product-design':
            player.changeMaxHp(10, 10);
            player.changeDefense(1);
            break;
        case 'product-growth':
            player.changeAttackInterval(-0.04);
            break;
        case 'project-schedule':
            player.changeAttack(4);
            player.changeAttackInterval(-0.04);
            break;
        case 'project-risk':
            player.changeMaxHp(8, 8);
            player.changeDefense(1);
            break;
        case 'project-collab':
            player.changeMoveSpeed(0.4);
            break;
        case 'qa-automation':
            player.setProjectileTraceEnabled(true);
            player.changeAttackInterval(-0.04);
            break;
        case 'qa-performance':
            player.changeAttack(8);
            break;
        case 'qa-gate':
            player.changeProjectilePenetration(1);
            player.changeAttack(4);
            break;
        case 'delivery-deploy':
            player.changeMaxHp(10, 10);
            player.changeDefense(1);
            break;
        case 'delivery-adaptation':
            player.changeAttack(6);
            player.changeMaxHp(4, 8);
            break;
        case 'delivery-support':
            player.changeMoveSpeed(0.4);
            player.changeDefense(1);
            break;
        default:
            player.changeAttack(5);
            break;
        }
    }

    private getBranchUpgradeDesc(branchId: string): string {
        const descMap: Record<string, string> = {
            'frontend-component': '攻击 +4，补刀覆盖更广',
            'frontend-engineering': '攻击间隔 -0.04，移速 +0.2',
            'frontend-performance': '攻击 +6，单发伤害更高',
            'backend-service': '生命上限 +8，防御 +1',
            'backend-data': '穿透 +1，精英伤害更强',
            'backend-concurrency': '攻击 +8，攻击间隔 -0.03',
            'product-insight': '生命上限 +6，追踪续航更强',
            'product-design': '生命上限 +10，防御 +1',
            'product-growth': '攻击间隔 -0.04，成长更顺滑',
            'project-schedule': '攻击 +4，攻击间隔 -0.04',
            'project-risk': '生命上限 +8，防御 +1',
            'project-collab': '移速 +0.4，跑图控场更稳',
            'qa-automation': '启用追踪，攻击间隔 -0.04',
            'qa-performance': '攻击 +8，弱点打击更强',
            'qa-gate': '穿透 +1，攻击 +4',
            'delivery-deploy': '生命上限 +10，防御 +1',
            'delivery-adaptation': '攻击 +6，续航更强',
            'delivery-support': '移速 +0.4，防御 +1',
        };
        return descMap[branchId] ?? '均衡成长';
    }

    private getBranchDisplayName(branch: CareerTechBranchConfig | string): string {
        if (typeof branch !== 'string') {
            return branch.shortName || branch.name;
        }
        for (const roleId in CareerTechTreeConfigs) {
            const branches = CareerTechTreeConfigs[roleId as CareerRoleId] ?? [];
            const matched = branches.find((item) => item.id === branch);
            if (matched) {
                return matched.shortName || matched.name;
            }
        }
        return branch;
    }

    private getMilestoneDisplayName(branch: CareerTechBranchConfig, milestoneId: string): string {
        const order = branch.milestones.findIndex((item) => item.id === milestoneId) + 1;
        const suffix = order <= 1 ? '一阶突破' : '二阶突破';
        return `${this.getBranchDisplayName(branch)} ${suffix}`;
    }

    private onEliteSpawn(spawnCount: number, totalAlive: number, elapsedSeconds: number, eliteName: string = 'Code Mess') {
        const minute = Math.floor(elapsedSeconds / 60);
        const second = elapsedSeconds % 60;
        const secondText = second < 10 ? `0${second}` : `${second}`;
        this.showRuntimeNotify(`警报：精英 [${eliteName}] x${spawnCount}（${minute}:${secondText}，在场 ${totalAlive}）`);
    }

    private onEliteKilled(eliteKillCount: number, expReward: number, lootDesc: string) {
        this.showRuntimeNotify(`精英已清除：经验 +${expReward} | 战利品：${lootDesc} | 累计 ${eliteKillCount}`, 3);
    }

    private onEliteCast(castType: string, _worldPosition?: Vec3, source: string = '', scale: number = 0, duration: number = 0) {
        switch (castType) {
        case 'dash':
            this.showRuntimeNotify('代码屎山正在冲刺，快拉开身位。', 1.5);
            break;
        case 'spread':
            this.showRuntimeNotify('代码屎山正在释放扇形弹幕。', 1.5);
            break;
        case 'burden':
            this.showRuntimeNotify(`${source || '代码屎山'} 施加维护负担 x${scale.toFixed(2)}，持续 ${duration.toFixed(1)} 秒`, 2.2);
            break;
        case 'bossRush':
            this.showRuntimeNotify('老板的大饼：愿景冲刺已开启。', 2.2);
            break;
        case 'demandSurge':
            this.showRuntimeNotify(`需求轰炸：追加 ${Math.max(1, Math.floor(scale))} 波任务涌入`, 2.4);
            break;
        case 'scheduleRush':
            this.showRuntimeNotify(`排期冲刺：${duration.toFixed(0)} 秒内怪潮更快更近，额外压入 ${Math.max(1, Math.floor(scale))} 波`, 2.8);
            break;
        case 'projectReview':
            this.showRuntimeNotify(`项目评审：评审团入场 x${Math.max(1, Math.floor(scale))}，更近、更硬、移速压迫 x${Math.max(1, duration).toFixed(2)}`, 2.8);
            break;
        case 'incident':
            this.showRuntimeNotify(`线上事故：故障波涌入 x${Math.max(1, Math.floor(scale))}，速度压迫 x${Math.max(1, duration).toFixed(2)}，注意冲线方向`, 2.8);
            break;
        case 'pie':
            this.showRuntimeNotify('老板的大饼在场上投下了画饼陷阱。', 2.2);
            break;
        case 'pieHit':
            this.showRuntimeNotify('踩中了画饼陷阱，输出被拖慢了。', 1.8);
            break;
        case 'finalStand':
            this.showRuntimeNotify('Boss 进入最后阶段：加班怪潮来袭。', 2.4);
            break;
        case 'techShare':
            this.showRuntimeNotify(`技术分享会：${Math.max(1, Math.floor(scale))} 个知识点已出现，拾取获得临时增益！`, 3);
            break;
        case 'techDebtAura':
            this.showRuntimeNotify(`技术债利息叠层 ${Math.floor(scale)}/${Math.floor(duration)}，全场怪物更强！`, 2.2);
            break;
        case 'codeReview':
            this.showRuntimeNotify(`代码 Review：${Math.max(1, Math.floor(scale))} 只怪物被标记为问题代码，击杀获得双倍经验！`, 3);
            break;
        default:
            break;
        }
    }

    private onEliteCoreCollected(expReward: number, healValue: number) {
        this.showRuntimeNotify(`拾取技术灵核：经验 +${expReward}，回复 +${healValue}`, 1.8);
    }

    private onBossWarning(remainSeconds: number, bossName: string = '老板的大饼') {
        this.showRuntimeNotify(`预警：${bossName} 将在 ${remainSeconds} 秒后登场`, 1.8);
    }

    private onBossSpawn(bossName: string, elapsedSeconds: number) {
        const minute = Math.floor(elapsedSeconds / 60);
        const second = elapsedSeconds % 60;
        const secondText = second < 10 ? `0${second}` : `${second}`;
        this.showRuntimeNotify(`Boss [${bossName}] 已入场（${minute}:${secondText}）`, 3.2);
    }

    private onBossKilled(expReward: number, playerLevel: number) {
        this.showRuntimeNotify(`Boss 已击败！经验 +${expReward}，当前 Lv.${playerLevel}`, 3.2);
    }

    private onCareerChanged(roleId: CareerRoleId, roleName: string, stackText: string, specialty: string) {
        if (roleId === 'student') {
            this.showRuntimeNotify(`当前职业：${roleName} | ${stackText}`, 2.4);
            return;
        }
        this.showRuntimeNotify(`完成转职：${roleName} | ${stackText} | ${specialty}`, 3.4);
    }

    private onSkillPointChanged(totalSkillPoint: number, gainedThisTime: number, levelValue: number) {
        if (gainedThisTime <= 0) {
            return;
        }
        const player = this.getPlayerScript();
        const milestoneHint = player?.getCareerMilestoneHudText();
        const suffix = milestoneHint ? ` | ${milestoneHint}` : '';
        this.showRuntimeNotify(`技能点 +${gainedThisTime} | 当前 ${totalSkillPoint} | Lv.${levelValue}${suffix}`, 3);
    }

    private onDropCollected(_type: string, desc: string) {
        this.showRuntimeNotify(desc, 1.8);
    }

    private onBuffGained(type: string, duration: number) {
        const nameMap: Record<string, string> = {
            energyDrink: '能量饮料',
            techShareAtk: '知识充能',
        };
        const name = nameMap[type] ?? type;
        this.showRuntimeNotify(`获得增益：${name}（${duration} 秒）`, 2);
    }

    private onActiveSkillCast(_id: string, name: string, duration: number, cooldown: number) {
        this.showRuntimeNotify(`释放技能：${name}（持续 ${duration.toFixed(1)} 秒，冷却 ${cooldown} 秒）| 按 Q 释放`, 3);
    }

    private onActiveSkillReady(_id: string, name: string) {
        this.showRuntimeNotify(`技能就绪：${name} | 按 Q 释放`, 2);
    }

    private onActiveSkillUnlocked(_id: string, name: string, desc: string) {
        this.showRuntimeNotify(`解锁主动技能：${name} — ${desc} | 按 Q 释放`, 4);
    }

    private onTechDebtAuraStack(stacks: number, maxStacks: number) {
        if (stacks <= 0) {
            this.showRuntimeNotify('技术债利息光环已消退', 1.5);
        } else {
            this.showRuntimeNotify(`技术债利息：全场增益 ${stacks}/${maxStacks} 层，优先击杀！`, 2);
        }
    }

    private onSpecialWave(_type: string, name: string, count: number, _elapsed: number) {
        this.showRuntimeNotify(`⚠ 特殊波次：${name} x${count} 来袭！`, 3);
    }

    private onShieldEnemyBlock(_pos: any) {
        this.showRuntimeNotify('护盾格挡！绕到背后攻击', 1.2);
    }

    private onChargeEnemyImpact(_pos: any) {
        this.showRuntimeNotify('冲锋命中！注意走位闪避', 1.5);
    }

    private onSelfDestructExplode(_pos: any) {
        this.showRuntimeNotify('自爆！远离爆炸范围', 1.5);
    }

    private safeNodeOff(target: Node, eventName: string, handler: (...args: any[]) => void) {
        if (!target) {
            return;
        }
        target.off(eventName, handler, this);
    }

    /** 创建一个 UI_2D 层的节点，确保 UI Camera 能渲染 */
    private createUINode(name: string): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        return node;
    }

    /** 用 Graphics 在节点上绘制纯色矩形背景 */
    private drawSolidBackground(parent: Node, color: Color, size: Size): Node {
        const bgNode = this.createUINode('SolidBg');
        bgNode.parent = parent;
        bgNode.setPosition(0, 0, 0);
        // 确保背景在最底层
        bgNode.setSiblingIndex(0);
        const transform = bgNode.addComponent(UITransform);
        transform.setContentSize(size);
        const graphics = bgNode.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        graphics.fill();
        return bgNode;
    }

    // ==================== 结算页面 ====================

    private ensureSettlementPanel() {
        if (this.settlementPanel) {
            return;
        }
        this.settlementPanel = this.createUINode('SettlementPanel');
        this.settlementPanel.parent = this.node;
        this.settlementPanel.addComponent(UITransform).setContentSize(new Size(980, 1280));
        this.settlementPanel.addComponent(BlockInputEvents);
        this.settlementPanel.active = false;

        // 结算页背景遮罩
        this.drawSolidBackground(this.settlementPanel, new Color(5, 10, 25, 220), new Size(980, 1280));

        // 标题
        const titleNode = this.createUINode('SettlementTitle');
        titleNode.parent = this.settlementPanel;
        titleNode.setPosition(0, 460, 0);
        titleNode.addComponent(UITransform).setContentSize(new Size(900, 80));
        this.settlementTitleLabel = titleNode.addComponent(Label);
        this.settlementTitleLabel.fontSize = 42;
        this.settlementTitleLabel.lineHeight = 52;
        this.settlementTitleLabel.color = this.settlementTitleColor;

        // 评级
        const ratingNode = this.createUINode('SettlementRating');
        ratingNode.parent = this.settlementPanel;
        ratingNode.setPosition(0, 340, 0);
        ratingNode.addComponent(UITransform).setContentSize(new Size(900, 100));
        this.settlementRatingLabel = ratingNode.addComponent(Label);
        this.settlementRatingLabel.fontSize = 64;
        this.settlementRatingLabel.lineHeight = 72;

        // 统计信息
        const statsNode = this.createUINode('SettlementStats');
        statsNode.parent = this.settlementPanel;
        statsNode.setPosition(0, 40, 0);
        statsNode.addComponent(UITransform).setContentSize(new Size(860, 400));
        this.settlementStatsLabel = statsNode.addComponent(Label);
        this.settlementStatsLabel.fontSize = 22;
        this.settlementStatsLabel.lineHeight = 32;
        this.settlementStatsLabel.color = this.settlementStatsColor;

        // 重新开始按钮
        this.createMenuButton(this.settlementPanel, 'SettlementRestartBtn', '重新开始', new Vec3(-160, -280, 0), () => {
            this.hideSettlementPanel();
            this.reloadGame();
        }, new Size(280, 90));

        // 返回首页按钮
        this.createMenuButton(this.settlementPanel, 'SettlementHomeBtn', '返回首页', new Vec3(160, -280, 0), () => {
            this.hideSettlementPanel();
            this.reloadGame();
        }, new Size(280, 90));

        // 底部提示
        const hintNode = this.createUINode('SettlementHint');
        hintNode.parent = this.settlementPanel;
        hintNode.setPosition(0, -380, 0);
        hintNode.addComponent(UITransform).setContentSize(new Size(860, 50));
        const hintLabel = hintNode.addComponent(Label);
        hintLabel.fontSize = 16;
        hintLabel.lineHeight = 22;
        hintLabel.color = this.menuSummaryColor;
        hintLabel.string = '按 R 重新开始 | 按 Enter 返回首页';
    }

    private showSettlementPanel() {
        this.ensureSettlementPanel();
        const player = this.getPlayerScript();
        const levelCtrl = this.getLevelController();
        const stats = levelCtrl?.getBattleStats();

        // 格式化时间
        const elapsed = stats?.elapsed ?? 0;
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        // 获取玩家信息
        const roleName = player?.getCareerRoleName() ?? '未知';
        const maxLevel = stats?.maxLevel ?? (player?.getCurrentLevel() ?? 1);
        const totalKills = stats?.totalKills ?? 0;
        const eliteKills = stats?.eliteKills ?? 0;
        const bossKills = stats?.bossKills ?? 0;
        const eventsTriggered = stats?.eventsTriggered ?? 0;
        const branchStatus = player?.getCareerBranchStatusText() ?? '';
        const skillPoint = player?.getSkillPoint() ?? 0;

        // 计算评级
        const rating = this.calculateRating(elapsed, maxLevel, totalKills, eliteKills, bossKills);
        if (!this.settlementRewardApplied) {
            this.settlementRewardValue = this.applySettlementMetaProgress(
                rating.grade,
                rating.score,
                maxLevel,
                totalKills,
                player?.getCareerRoleId() ?? 'student',
            );
            // 认证徽章加成：本局击杀 Boss 后拾取认证徽章，认证点 x2
            const levelCtrl = this.getLevelController();
            if (levelCtrl?.certBadgeCollected) {
                this.settlementRewardValue *= 2;
                this.metaProgress.certificationPoint += this.settlementRewardValue / 2;
                this.saveMetaProgress();
            }
            this.settlementRewardApplied = true;
            this.refreshStartPanelContent();
        }
        const certPointReward = this.settlementRewardValue;
        const badgeText = this.getLevelController()?.certBadgeCollected ? ' (认证徽章 x2)' : '';

        // 设置标题
        this.settlementTitleLabel.string = '战斗结算';

        // 设置评级
        this.settlementRatingLabel.string = rating.grade;
        const ratingIndex = ['D', 'C', 'B', 'A', 'S', 'SS'].indexOf(rating.grade);
        this.settlementRatingLabel.color = this.settlementRatingColors[Math.max(0, ratingIndex)] ?? this.settlementRatingColors[0];

        // 设置统计信息
        this.settlementStatsLabel.string =
            `职业：${roleName}\n` +
            `${branchStatus}\n` +
            `\n` +
            `生存时间：${timeText}\n` +
            `最高等级：Lv.${maxLevel}\n` +
            `总击杀数：${totalKills}\n` +
            `精英击杀：${eliteKills}\n` +
            `Boss 击杀：${bossKills}\n` +
            `事件应对：${eventsTriggered} 次\n` +
            `剩余技能点：${skillPoint}\n` +
            `\n` +
            `综合评分：${rating.score} 分\n` +
            `认证点奖励：+${certPointReward}${badgeText}\n` +
            `累计认证点：${this.metaProgress.certificationPoint}\n` +
            `累计对局：${this.metaProgress.totalRuns}\n` +
            `历史最佳：${this.metaProgress.bestGrade}（${this.metaProgress.bestScore} 分）\n` +
            `\n` +
            `${rating.comment}`;

        this.settlementPanel.active = true;
    }

    private hideSettlementPanel() {
        if (this.settlementPanel) {
            this.settlementPanel.active = false;
        }
    }

    private calculateRating(
        elapsed: number,
        maxLevel: number,
        totalKills: number,
        eliteKills: number,
        bossKills: number,
    ): { score: number; grade: SettlementGrade; comment: string } {
        // 生存时间分（最高 30 分）
        const timePart = Math.min(30, Math.floor(elapsed / 20));
        // 等级分（最高 25 分）
        const levelPart = Math.min(25, Math.floor(maxLevel * 1.2));
        // 击杀分（最高 25 分）
        const killPart = Math.min(25, Math.floor(totalKills / 8));
        // 精英/Boss 加分（最高 20 分）
        const elitePart = Math.min(20, eliteKills * 4 + bossKills * 10);

        const score = timePart + levelPart + killPart + elitePart;

        let grade: SettlementGrade = 'D';
        let comment: string;
        if (score >= 90) {
            grade = 'SS';
            comment = '传说级表现！你就是技术之神！';
        } else if (score >= 75) {
            grade = 'S';
            comment = '卓越表现！堪称团队核心骨干。';
        } else if (score >= 60) {
            grade = 'A';
            comment = '优秀！已经具备独当一面的能力。';
        } else if (score >= 40) {
            grade = 'B';
            comment = '不错的表现，继续打磨技术栈。';
        } else if (score >= 20) {
            grade = 'C';
            comment = '还需要更多实战经验，加油！';
        } else {
            grade = 'D';
            comment = '刚入行的菜鸟，多练练吧。';
        }

        return { score, grade, comment };
    }
}
