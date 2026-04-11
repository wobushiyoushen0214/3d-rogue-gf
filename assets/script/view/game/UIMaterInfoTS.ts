import { _decorator, Camera, Color, Component, director, find, game, Label, Node, ProgressBar, Size, UITransform, Vec3 } from 'cc';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { Monster } from '../../managerGame/Monster';
import { PlayerTs } from './PlayerTs';

const { ccclass, property } = _decorator;

@ccclass('UIMaterInfoTS')
export class UIMaterInfoTS extends Component {
    public uiCamera: Camera = null;
    public masterCamera: Camera = null;

    private parentTransform: UITransform = null;

    @property(ProgressBar)
    private hpProgressBar: ProgressBar = null;

    @property(ProgressBar)
    ExpProgressBar: ProgressBar = null;

    @property(Label)
    levelNumLabel: Label = null;

    private bindedPlayer: Node = null;
    private enemyTags: Map<string, Node> = new Map();
    private coreTags: Map<string, Node> = new Map();
    private pieTags: Map<string, Node> = new Map();

    private readonly normalTagColor: Color = new Color(255, 255, 255, 220);
    private readonly eliteTagColor: Color = new Color(255, 212, 96, 255);
    private readonly bossTagColor: Color = new Color(255, 104, 104, 255);
    private readonly coreTagColor: Color = new Color(174, 121, 255, 255);
    private readonly pieTagColor: Color = new Color(255, 166, 64, 255);
    private readonly dangerTagColor: Color = new Color(255, 86, 86, 255);
    private readonly burdenWarnMildColor: Color = new Color(255, 186, 72, 255);
    private readonly burdenWarnHeavyColor: Color = new Color(255, 92, 92, 255);
    private readonly careerBaseColor: Color = new Color(112, 226, 255, 255);
    private readonly careerReadyColor: Color = new Color(255, 222, 108, 255);
    private readonly careerHoldColor: Color = new Color(172, 236, 255, 255);
    private readonly milestoneHintIdleColor: Color = new Color(138, 188, 214, 220);
    private readonly milestoneHintHoldColor: Color = new Color(170, 236, 255, 230);
    private readonly milestoneHintReadyColor: Color = new Color(255, 232, 128, 255);

    private burdenIconLabel: Label = null;
    private burdenWarnLabel: Label = null;
    private careerLabel: Label = null;
    private passiveLabel: Label = null;
    private skillPointHintLabel: Label = null;
    private tagRefreshTimer = 0;

    @property
    showNormalMonsterTags: boolean = false;

    @property
    maxNormalMonsterTags: number = 12;

    @property
    tagRefreshInterval: number = 0.12;

    start() {
        if (!this.hpProgressBar) {
            this.hpProgressBar = this.node.getChildByName('hp_bg')?.getComponent(ProgressBar);
        }
        if (!this.levelNumLabel) {
            const levelNode = this.findNodeByName(this.node, 'levelNum');
            if (levelNode && levelNode.isValid) {
                this.levelNumLabel = levelNode.getComponent(Label);
            }
        }

        this.uiCamera = find('UIRoot/Camera')?.getComponent(Camera);
        this.masterCamera = find('Main Camera')?.getComponent(Camera);
        this.parentTransform = this.node.parent?.getComponent(UITransform);
        this.ensureBurdenWarnLabel();
        this.ensureCareerLabel();
        this.ensurePassiveLabel();
        this.ensureSkillPointHintLabel();

        director.getScene().on(OnOrEmitConst.OnPlayerhurt, this.playerHurt, this);
    }

    onDestroy() {
        director.getScene().off(OnOrEmitConst.OnPlayerhurt, this.playerHurt, this);
        this.unbindPlayerEvents();
        this.clearEnemyTags();
        this.clearCoreTags();
        this.clearPieTags();
    }

    update(deltaTime: number) {
        const player = MonsterManager.instance.player;
        if (player !== this.bindedPlayer) {
            this.unbindPlayerEvents();
            this.bindPlayerEvents(player);
        }

        const showBattleHud = this.shouldShowBattleHud();

        if (player && this.masterCamera && this.uiCamera && this.parentTransform && showBattleHud) {
            this.setMainHudVisible(true);
            const worldPosition = player.getWorldPosition();
            worldPosition.y += 1.5;
            const screenPos = this.masterCamera.worldToScreen(worldPosition);
            this.showAt(screenPos);
            this.updatePlayerBurdenHint(player);
            this.updateCareerLabel(player);
            this.updatePassiveLabel(player);
            this.updateSkillPointHint(player);
        } else {
            this.setMainHudVisible(false);
            if (this.burdenWarnLabel) {
                this.burdenWarnLabel.node.active = false;
            }
            if (this.burdenIconLabel) {
                this.burdenIconLabel.node.active = false;
            }
            if (this.careerLabel) {
                this.careerLabel.node.active = false;
            }
            if (this.passiveLabel) {
                this.passiveLabel.node.active = false;
            }
            if (this.skillPointHintLabel) {
                this.skillPointHintLabel.node.active = false;
            }
        }

        if (!showBattleHud) {
            this.clearEnemyTags();
            this.clearCoreTags();
            this.clearPieTags();
            return;
        }

        this.tagRefreshTimer -= deltaTime;
        if (this.tagRefreshTimer <= 0) {
            this.tagRefreshTimer = this.tagRefreshInterval;
            this.updateEnemyTags();
            this.updateEliteCoreTags();
            this.updateBossPieTags();
        }
    }

    public showAt(scenePos: Vec3): void {
        this.showNodeAt(this.node, scenePos);
    }

    public showNodeAt(targetNode: Node, scenePos: Vec3): void {
        if (!this.uiCamera || !this.parentTransform) {
            return;
        }
        const worldPos = this.uiCamera.screenToWorld(scenePos);
        const pos = this.parentTransform.convertToNodeSpaceAR(worldPos);
        targetNode.setPosition(pos);
    }

    playerHurt(hp: number) {
        if (this.hpProgressBar) {
            this.hpProgressBar.progress = hp;
        }
    }

    private bindPlayerEvents(player: Node) {
        if (!player) {
            return;
        }
        this.bindedPlayer = player;
        player.on(OnOrEmitConst.OnExpGain, this.onExpGain, this);
        player.on(OnOrEmitConst.OnplayerUpgrade, this.onPlayerUpgrade, this);
        const playerTs = player.getComponent(PlayerTs);
        if (playerTs) {
            this.updateLevelLabel(playerTs.getCurrentLevel());
        }
    }

    private unbindPlayerEvents() {
        if (!this.bindedPlayer) {
            return;
        }
        this.bindedPlayer.off(OnOrEmitConst.OnExpGain, this.onExpGain, this);
        this.bindedPlayer.off(OnOrEmitConst.OnplayerUpgrade, this.onPlayerUpgrade, this);
        this.bindedPlayer = null;
    }

    private onExpGain(exp: number, maxExp: number, playerTs?: PlayerTs) {
        if (this.ExpProgressBar && maxExp > 0) {
            const progress = exp / maxExp;
            this.ExpProgressBar.progress = Math.max(0, Math.min(1, progress));
        }
        if (playerTs) {
            this.updateLevelLabel(playerTs.getCurrentLevel());
        }
    }

    private onPlayerUpgrade(level: number) {
        this.updateLevelLabel(level);
    }

    private updateLevelLabel(level: number) {
        if (!this.levelNumLabel) {
            return;
        }
        this.levelNumLabel.string = `${Math.max(1, Math.floor(level))}`;
    }

    private shouldShowBattleHud(): boolean {
        return GameStateInput.isRunning() || GameStateInput.isPaused() || GameStateInput.isSelectingUpgrade();
    }

    private setMainHudVisible(visible: boolean) {
        if (this.hpProgressBar?.node) {
            this.hpProgressBar.node.active = visible;
        }
        if (this.ExpProgressBar?.node) {
            this.ExpProgressBar.node.active = visible;
        }
        if (this.levelNumLabel?.node) {
            this.levelNumLabel.node.active = visible;
        }
    }

    private ensureBurdenWarnLabel() {
        if (this.burdenWarnLabel && this.burdenIconLabel) {
            return;
        }

        const iconNode = new Node('BurdenWarnIcon');
        iconNode.parent = this.node;
        iconNode.setPosition(-190, -95, 0);
        iconNode.addComponent(UITransform).setContentSize(new Size(44, 36));
        this.burdenIconLabel = iconNode.addComponent(Label);
        this.burdenIconLabel.fontSize = 26;
        this.burdenIconLabel.lineHeight = 28;
        this.burdenIconLabel.string = '!';
        this.burdenIconLabel.color = this.burdenWarnMildColor;
        this.burdenIconLabel.node.active = false;

        const warnNode = new Node('BurdenWarnLabel');
        warnNode.parent = this.node;
        warnNode.setPosition(10, -95, 0);
        warnNode.addComponent(UITransform).setContentSize(new Size(420, 36));
        this.burdenWarnLabel = warnNode.addComponent(Label);
        this.burdenWarnLabel.fontSize = 20;
        this.burdenWarnLabel.lineHeight = 24;
        this.burdenWarnLabel.color = this.pieTagColor;
        this.burdenWarnLabel.string = '';
        this.burdenWarnLabel.node.active = false;
    }

    private ensureCareerLabel() {
        if (this.careerLabel) {
            return;
        }
        const roleNode = new Node('CareerLabel');
        roleNode.parent = this.node;
        roleNode.setPosition(0, 78, 0);
        roleNode.addComponent(UITransform).setContentSize(new Size(420, 32));
        this.careerLabel = roleNode.addComponent(Label);
        this.careerLabel.fontSize = 18;
        this.careerLabel.lineHeight = 22;
        this.careerLabel.color = this.careerBaseColor;
        this.careerLabel.string = '计算机学生';
        this.careerLabel.node.active = false;
    }

    private ensurePassiveLabel() {
        if (this.passiveLabel) {
            return;
        }
        const passiveNode = new Node('CareerPassiveLabel');
        passiveNode.parent = this.node;
        passiveNode.setPosition(0, 52, 0);
        passiveNode.addComponent(UITransform).setContentSize(new Size(560, 30));
        this.passiveLabel = passiveNode.addComponent(Label);
        this.passiveLabel.fontSize = 14;
        this.passiveLabel.lineHeight = 20;
        this.passiveLabel.color = new Color(166, 236, 255, 220);
        this.passiveLabel.string = '基础打底';
        this.passiveLabel.node.active = false;
    }

    private ensureSkillPointHintLabel() {
        if (this.skillPointHintLabel) {
            return;
        }
        const hintNode = new Node('SkillPointHintLabel');
        hintNode.parent = this.node;
        hintNode.setPosition(0, 28, 0);
        hintNode.addComponent(UITransform).setContentSize(new Size(620, 26));
        this.skillPointHintLabel = hintNode.addComponent(Label);
        this.skillPointHintLabel.fontSize = 13;
        this.skillPointHintLabel.lineHeight = 18;
        this.skillPointHintLabel.color = this.milestoneHintIdleColor;
        this.skillPointHintLabel.string = '';
        this.skillPointHintLabel.node.active = false;
    }

    private updateCareerLabel(playerNode: Node) {
        if (!this.careerLabel) {
            return;
        }
        const playerTs = playerNode.getComponent(PlayerTs);
        if (!playerTs) {
            this.careerLabel.node.active = false;
            return;
        }
        const isStudent = playerTs.getCareerRoleId() === 'student';
        const canSpecialize = isStudent && playerTs.canSelectSpecialization();
        const hasReadyMilestone = !isStudent && playerTs.hasUnlockableCareerMilestone();
        const hasSkillPoint = playerTs.getSkillPoint() > 0;
        const readyPulse = (Math.sin(game.totalTime * 6) + 1) * 0.5;

        if (isStudent) {
            const suffix = canSpecialize ? '可转职' : `Lv.${playerTs.getCareerUnlockLevel()} 转职`;
            this.careerLabel.string = `计算机学生 | ${suffix}`;
        } else {
            const suffix = hasReadyMilestone ? '可突破' : (hasSkillPoint ? 'SP 待分配' : `下个 SP Lv.${playerTs.getNextSkillPointLevel()}`);
            this.careerLabel.string = `${playerTs.getCareerRoleName()} | SP ${playerTs.getSkillPoint()} | ${suffix}`;
        }

        if (canSpecialize || hasReadyMilestone) {
            const alpha = Math.floor(205 + readyPulse * 50);
            this.careerLabel.color = this.blendColor(this.careerBaseColor, this.careerReadyColor, 0.45 + readyPulse * 0.55, alpha);
            this.careerLabel.node.setScale(1 + readyPulse * 0.03, 1 + readyPulse * 0.03, 1);
        } else if (hasSkillPoint) {
            this.careerLabel.color = this.blendColor(this.careerBaseColor, this.careerHoldColor, 0.55, 245);
            this.careerLabel.node.setScale(1, 1, 1);
        } else {
            this.careerLabel.color = this.careerBaseColor;
            this.careerLabel.node.setScale(1, 1, 1);
        }
        this.careerLabel.node.active = true;
    }

    private updatePassiveLabel(playerNode: Node) {
        if (!this.passiveLabel) {
            return;
        }
        const playerTs = playerNode.getComponent(PlayerTs);
        if (!playerTs) {
            this.passiveLabel.node.active = false;
            return;
        }
        this.passiveLabel.string = `${playerTs.getCareerPassiveStatusText()} | ${playerTs.getCareerBranchStatusText()}`;
        this.passiveLabel.node.active = true;
    }

    private updateSkillPointHint(playerNode: Node) {
        if (!this.skillPointHintLabel) {
            return;
        }
        const playerTs = playerNode.getComponent(PlayerTs);
        if (!playerTs) {
            this.skillPointHintLabel.node.active = false;
            return;
        }

        const hintText = playerTs.getCareerMilestoneHudText();
        if (!hintText) {
            this.skillPointHintLabel.node.active = false;
            return;
        }

        const isStudent = playerTs.getCareerRoleId() === 'student';
        const readyState = isStudent ? playerTs.canSelectSpecialization() : playerTs.hasUnlockableCareerMilestone();
        const hasSkillPoint = playerTs.getSkillPoint() > 0;
        this.skillPointHintLabel.string = hintText;

        if (readyState) {
            const pulse = (Math.sin(game.totalTime * 7.2) + 1) * 0.5;
            const alpha = Math.floor(188 + pulse * 60);
            this.skillPointHintLabel.color = this.blendColor(this.milestoneHintHoldColor, this.milestoneHintReadyColor, 0.4 + pulse * 0.6, alpha);
            this.skillPointHintLabel.node.setScale(1 + pulse * 0.04, 1 + pulse * 0.04, 1);
        } else if (hasSkillPoint) {
            this.skillPointHintLabel.color = this.milestoneHintHoldColor;
            this.skillPointHintLabel.node.setScale(1, 1, 1);
        } else {
            this.skillPointHintLabel.color = this.milestoneHintIdleColor;
            this.skillPointHintLabel.node.setScale(1, 1, 1);
        }

        this.skillPointHintLabel.node.active = true;
    }
    private updatePlayerBurdenHint(playerNode: Node) {
        if (!this.burdenWarnLabel || !this.burdenIconLabel) {
            return;
        }
        const playerTs = playerNode.getComponent(PlayerTs);
        if (!playerTs || !playerTs.isMaintenanceBurdenActive()) {
            this.burdenWarnLabel.node.active = false;
            this.burdenIconLabel.node.active = false;
            return;
        }

        const scale = playerTs.getMaintenanceBurdenScale();
        const remain = playerTs.getMaintenanceBurdenRemain();
        const severity = Math.max(0, Math.min(1, (scale - 1.05) / 0.95));
        const pulse = (Math.sin(game.totalTime * (4 + severity * 8)) + 1) * 0.5;
        const alpha = Math.floor(180 + pulse * 75);
        const color = this.blendColor(this.burdenWarnMildColor, this.burdenWarnHeavyColor, severity, alpha);

        this.burdenIconLabel.color = color;
        this.burdenWarnLabel.color = color;
        this.burdenIconLabel.string = severity >= 0.6 ? '!!' : '!';
        this.burdenWarnLabel.string = severity >= 0.6
            ? `严重维护负担 x${scale.toFixed(2)} ${remain.toFixed(1)}s`
            : `维护负担 x${scale.toFixed(2)} ${remain.toFixed(1)}s`;
        this.burdenWarnLabel.node.active = true;
        this.burdenIconLabel.node.active = true;
    }

    private findNodeByName(root: Node, nodeName: string): Node | null {
        if (!root) {
            return null;
        }
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

    private updateEnemyTags() {
        const entries = MonsterManager.instance.goalvoes;
        if (!entries || !this.masterCamera || !this.uiCamera) {
            this.clearEnemyTags();
            return;
        }

        const activeIds: Set<string> = new Set();
        const candidateNormals: Array<{ goalId: string; monster: Monster }> = [];

        for (const goalId of entries.keys()) {
            const entry = entries.get(goalId);
            if (!entry?.mSphere || !entry.mSphere.isValid || !entry.mSphere.activeInHierarchy) {
                continue;
            }
            const monster = entry.mSphere.getComponent(Monster);
            if (!monster) {
                continue;
            }
            if (monster.isElite) {
                this.renderMonsterTag(goalId, monster, activeIds);
                continue;
            }
            if (!this.showNormalMonsterTags) {
                continue;
            }
            candidateNormals.push({ goalId, monster });
        }

        if (this.showNormalMonsterTags && candidateNormals.length > 0) {
            candidateNormals.sort((a, b) => (a.monster.distance ?? Number.MAX_SAFE_INTEGER) - (b.monster.distance ?? Number.MAX_SAFE_INTEGER));
            const maxCount = Math.max(0, Math.floor(this.maxNormalMonsterTags));
            const renderCount = Math.min(maxCount, candidateNormals.length);
            for (let i = 0; i < renderCount; i++) {
                const one = candidateNormals[i];
                this.renderMonsterTag(one.goalId, one.monster, activeIds);
            }
        }

        for (const [goalId, tagNode] of Array.from(this.enemyTags.entries())) {
            if (activeIds.has(goalId)) {
                continue;
            }
            tagNode.destroy();
            this.enemyTags.delete(goalId);
        }
    }

    private renderMonsterTag(goalId: string, monster: Monster, activeIds: Set<string>) {
        activeIds.add(goalId);
        let tagNode = this.enemyTags.get(goalId);
        if (!tagNode) {
            tagNode = this.createEnemyTag(goalId);
        }
        this.updateEnemyTagPosition(tagNode, monster);
        this.updateEnemyTagText(tagNode, monster);
    }

    private createEnemyTag(goalId: string): Node {
        const tagNode = new Node(`EnemyTag_${goalId.slice(0, 6)}`);
        tagNode.parent = this.node.parent;
        tagNode.addComponent(UITransform).setContentSize(new Size(220, 40));
        const label = tagNode.addComponent(Label);
        label.fontSize = 18;
        label.lineHeight = 22;
        label.string = '';
        this.enemyTags.set(goalId, tagNode);
        return tagNode;
    }

    private updateEnemyTagPosition(tagNode: Node, monster: Monster) {
        const worldPosition = monster.node.getWorldPosition();
        worldPosition.y += 2.2 * monster.node.worldScale.y;
        const screenPos = this.masterCamera.worldToScreen(worldPosition);
        if (screenPos.z <= 0) {
            tagNode.active = false;
            return;
        }
        tagNode.active = true;
        this.showNodeAt(tagNode, screenPos);
    }

    private updateEnemyTagText(tagNode: Node, monster: Monster) {
        const label = tagNode.getComponent(Label);
        if (!label) {
            return;
        }
        const hp = monster.rungameInfo.Hp;
        const maxHp = monster.rungameInfo.maxHp > 0 ? monster.rungameInfo.maxHp : hp;
        const percent = Math.ceil(Math.max(0, Math.min(1, maxHp <= 0 ? 0 : hp / maxHp)) * 100);
        if (monster.isBoss) {
            label.string = `大饼 Boss ${percent}%`;
            label.color = this.bossTagColor;
            return;
        }
        if (monster.isElite) {
            label.string = `屎山精英 ${percent}%`;
            label.color = this.eliteTagColor;
            return;
        }
        label.string = `${percent}%`;
        label.color = this.normalTagColor;
    }

    private clearEnemyTags() {
        for (const tagNode of this.enemyTags.values()) {
            tagNode.destroy();
        }
        this.enemyTags.clear();
    }

    private updateEliteCoreTags() {
        const playerNode = MonsterManager.instance.player;
        if (!playerNode) {
            this.clearCoreTags();
            return;
        }
        const playerTs = playerNode.getComponent(PlayerTs);
        if (!playerTs) {
            this.clearCoreTags();
            return;
        }

        const dropNodes = playerTs.getEliteDropNodes();
        const activeIds: Set<string> = new Set();
        for (const dropNode of dropNodes) {
            if (!dropNode || !dropNode.isValid) {
                continue;
            }
            activeIds.add(dropNode.uuid);
            let tagNode = this.coreTags.get(dropNode.uuid);
            if (!tagNode) {
                tagNode = this.createCoreTag(dropNode.uuid);
            }
            this.updateCoreTagPosition(tagNode, dropNode);
        }

        for (const [key, tagNode] of Array.from(this.coreTags.entries())) {
            if (activeIds.has(key)) {
                continue;
            }
            tagNode.destroy();
            this.coreTags.delete(key);
        }
    }

    private createCoreTag(key: string): Node {
        const tagNode = new Node(`CoreTag_${key.slice(0, 6)}`);
        tagNode.parent = this.node.parent;
        tagNode.addComponent(UITransform).setContentSize(new Size(240, 40));
        const label = tagNode.addComponent(Label);
        label.fontSize = 20;
        label.lineHeight = 24;
        label.color = this.coreTagColor;
        label.string = '技术灵核';
        this.coreTags.set(key, tagNode);
        return tagNode;
    }

    private updateCoreTagPosition(tagNode: Node, dropNode: Node) {
        const worldPosition = dropNode.getWorldPosition();
        worldPosition.y += 0.7;
        const screenPos = this.masterCamera.worldToScreen(worldPosition);
        if (screenPos.z <= 0) {
            tagNode.active = false;
            return;
        }
        tagNode.active = true;
        this.showNodeAt(tagNode, screenPos);
    }

    private clearCoreTags() {
        for (const tagNode of this.coreTags.values()) {
            tagNode.destroy();
        }
        this.coreTags.clear();
    }

    private updateBossPieTags() {
        const scene = director.getScene();
        if (!scene || !scene.isValid) {
            this.clearPieTags();
            return;
        }

        const activeIds: Set<string> = new Set();
        for (const child of scene.children) {
            if (!child || !child.isValid || !child.activeInHierarchy || child.name !== 'BossPieTrap') {
                continue;
            }
            activeIds.add(child.uuid);
            let tagNode = this.pieTags.get(child.uuid);
            if (!tagNode) {
                tagNode = this.createPieTag(child.uuid);
            }
            this.updatePieTag(tagNode, child);
        }

        for (const [key, tagNode] of Array.from(this.pieTags.entries())) {
            if (activeIds.has(key)) {
                continue;
            }
            tagNode.destroy();
            this.pieTags.delete(key);
        }
    }

    private createPieTag(key: string): Node {
        const tagNode = new Node(`PieTag_${key.slice(0, 6)}`);
        tagNode.parent = this.node.parent;
        tagNode.addComponent(UITransform).setContentSize(new Size(260, 44));
        const label = tagNode.addComponent(Label);
        label.fontSize = 20;
        label.lineHeight = 24;
        label.color = this.pieTagColor;
        label.string = '! 画饼陷阱';
        this.pieTags.set(key, tagNode);
        return tagNode;
    }

    private updatePieTag(tagNode: Node, trapNode: Node) {
        const label = tagNode.getComponent(Label);
        const expireAt = (trapNode as any).__pieExpireGameTime as number;
        const radius = (trapNode as any).__pieRadius as number;
        const playerNode = MonsterManager.instance.player;
        let distanceToPlayer = -1;
        if (playerNode && playerNode.isValid) {
            distanceToPlayer = Vec3.distance(trapNode.worldPosition, playerNode.worldPosition);
        }

        if (label && typeof expireAt === 'number') {
            const remain = Math.max(0, expireAt - game.totalTime);
            const safeRadius = typeof radius === 'number' ? Math.max(0.1, radius) : 1.8;
            const nearScore = distanceToPlayer >= 0 ? Math.max(0, 1 - distanceToPlayer / (safeRadius * 2.2)) : 0;
            const timeScore = remain <= 2.5 ? Math.max(0, (2.5 - remain) / 2.5) : 0;
            const dangerScore = Math.max(nearScore, timeScore);
            const pulse = (Math.sin(game.totalTime * (2 + dangerScore * 9)) + 1) * 0.5;
            const alpha = Math.floor(160 + pulse * (60 + dangerScore * 25));
            label.color = this.blendColor(this.pieTagColor, this.dangerTagColor, dangerScore, alpha);

            const prefix = dangerScore > 0.55 ? '!!' : '!';
            const pulseScale = 1 + dangerScore * 0.18 + pulse * dangerScore * 0.08;
            tagNode.setScale(pulseScale, pulseScale, 1);

            if (typeof radius === 'number') {
                if (distanceToPlayer >= 0) {
                    label.string = `${prefix} 画饼陷阱 ${remain.toFixed(1)}s  r=${radius.toFixed(1)}  d=${distanceToPlayer.toFixed(1)}`;
                } else {
                    label.string = `${prefix} 画饼陷阱 ${remain.toFixed(1)}s  r=${radius.toFixed(1)}`;
                }
            } else {
                label.string = `${prefix} 画饼陷阱 ${remain.toFixed(1)}s`;
            }
        }

        const worldPosition = trapNode.getWorldPosition();
        worldPosition.y += 0.6;
        const screenPos = this.masterCamera.worldToScreen(worldPosition);
        if (screenPos.z <= 0) {
            tagNode.active = false;
            return;
        }
        tagNode.active = true;
        this.showNodeAt(tagNode, screenPos);
    }

    private clearPieTags() {
        for (const tagNode of this.pieTags.values()) {
            tagNode.destroy();
        }
        this.pieTags.clear();
    }

    private blendColor(from: Color, to: Color, t: number, alpha: number = 255): Color {
        const ratio = Math.max(0, Math.min(1, t));
        const r = Math.round(from.r + (to.r - from.r) * ratio);
        const g = Math.round(from.g + (to.g - from.g) * ratio);
        const b = Math.round(from.b + (to.b - from.b) * ratio);
        return new Color(r, g, b, Math.max(0, Math.min(255, alpha)));
    }
}
