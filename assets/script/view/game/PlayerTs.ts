import { _decorator, Component, Node, math, Vec3, director, v3, game,} from 'cc';
import { Actor } from '../../managerGame/Actor';
import { EffectConst } from '../../const/EffectConst';
import { RunGameInfoVo } from '../../data/povo/RunGameInfoVo';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { VirtualInput } from '../../data/dynamicData/VirtualInput';
import { ActorState } from '../../const/ActorState';
import { EffectManager } from '../../managerGame/EffectManager';
import { ProjectileEmitter } from '../../managerGame/ProjectileEmitter';
import { ProjectileManager } from '../../managerGame/ProjectileManager';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { Monster } from '../../managerGame/Monster';
import { MathUtil } from '../../utils/MathUtil';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { LevelConfigVo } from '../../data/povo/LevelConfigVo';
import { CareerRoleConfig, CareerRoleConfigs, CareerRoleId, CareerRolePerks, CareerSpecializationUnlockLevel } from '../../const/CareerConfig';
import { ActiveSkillConfig, CareerActiveSkillConfigs, CareerBranchId, CareerTechBranchConfig, CareerTechTreeConfigs, findCareerTechBranch, findCareerTechMilestone } from '../../const/TechTreeConfig';

const { ccclass, property} = _decorator;
const tempShootStart = v3();
const tempPlayerPos = v3();
const tempDropPlayerPos = v3();
const tempDropNodePos = v3();
const tempDropStep = v3();
const tempCareerForwardL = v3();
const tempCareerForwardR = v3();

type EliteDropInfo = {
    node: Node;
    bornTime: number;
    rewardExp: number;
    rewardHeal: number;
    baseY: number;
};

type CareerMilestonePreview = {
    branch: CareerTechBranchConfig;
    milestoneId: string;
    milestoneTitle: string;
    requiredBranchLevel: number;
    costSkillPoint: number;
    missingBranchLevel: number;
    missingSkillPoint: number;
    ready: boolean;
    isFocus: boolean;
};

@ccclass('PlayerTs')
export class PlayerTs extends Component {

    private actor:Actor = null;

    @property(Node)
    bowString: Node = null;

    shootTime: number = 0.0;
    private _splitAngle: number[] = [0];

    private playerDoKill: number = 0;
    private eliteKillCount: number = 0;

    private projectileTraceEnabled: boolean = true;
    private projectilePenetration: number = 1;
    private attackIntervalDebuffScale: number = 1;
    private attackIntervalDebuffRemain: number = 0;
    private careerRoleId: CareerRoleId = 'student';
    private careerShotCounter = 0;
    private careerHitHealCooldown = 0;
    private careerBranchPoints: Record<string, number> = {};
    private careerMilestones: Record<string, number> = {};

    // 主动技能系统
    private activeSkillUnlocked = false;
    private activeSkillConfig: ActiveSkillConfig | null = null;
    private activeSkillCooldownRemain = 0;
    private activeSkillDurationRemain = 0;
    private activeSkillActive = false;
    // 后端压测：剩余强化弹数
    private stressTestShotsRemain = 0;
    // 实施救火：无敌状态
    private firefightInvincible = false;

    private eliteDrops: EliteDropInfo[] = [];
    private eliteDropCollectRadius = 1.8;
    private eliteDropMagnetRadius = 6.0;
    private eliteDropLifeTime = 18;
    private eliteDropRewardExp = 12;
    private eliteDropRewardHeal = 10;

    private eliteLootAttack = 14;
    private eliteLootAttackInterval = -0.14;
    private eliteLootProjectile = 1;
    private eliteLootPenetration = 1;
    private eliteLootMoveSpeed = 1;
    private eliteLootMaxHp = 25;

    start() {
        this.actor = this.node.getComponent(Actor);
        // 初始化角色状态
        this.runGameInit();
        // this.node.on("onFrameAttackLoose", this.onFrameAttackLoose, this);
        this.node.on(OnOrEmitConst.OnKill, this.onKill, this);
        this.node.on(OnOrEmitConst.PlayerOnDie, this.playerOnDie, this);
    }

    onDestroy(){
        this.node.off(OnOrEmitConst.OnKill, this.onKill, this);
        this.node.off(OnOrEmitConst.PlayerOnDie, this.playerOnDie, this);
        this.clearEliteDrops();
    }

    update(deltaTime: number) {
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        this.updateEliteDrops(deltaTime);
        if (this.attackIntervalDebuffRemain > 0){
            this.attackIntervalDebuffRemain -= deltaTime;
            if (this.attackIntervalDebuffRemain <= 0){
                this.attackIntervalDebuffRemain = 0;
                this.attackIntervalDebuffScale = 1;
            }
        }
        if (this.careerHitHealCooldown > 0){
            this.careerHitHealCooldown -= deltaTime;
        }
        this.updateActiveSkill(deltaTime);

        this.actor.input.x = VirtualInput.horizontal;
        this.actor.input.z = -VirtualInput.vertical;

        if (this.actor.input.length() > 0){
            this.actor.changeState(ActorState.Run);
        }else{
            this.actor.changeState(ActorState.Idle);
        }
        this.shootTime += deltaTime;
        const currentAttackInterval = this.getCurrentAttackInterval();
        if (this.shootTime > currentAttackInterval){
     
            // 查找最近的敌人并自动射击
            let enmey = this.getNearEnemy();
            if (enmey != null) {
                // 计算朝向最近敌人的方向
                // 朝敌人方向瞄准并攻击
                Vec3.subtract(this.actor.angleInput, enmey.worldPosition, this.node.worldPosition);
                this.actor.angleInput.y = 0;
                this.actor.angleInput.normalize(); 
                // this.actor.changeState(ActorState.Attack);
                this.onFrameAttackLoose(enmey);                
            }else {
                this.actor.angleInput.x = VirtualInput.horizontal;
                this.actor.angleInput.z = -VirtualInput.vertical;
                this.actor.angleInput.normalize();
            }
            this.shootTime = 0;
        }
    }

    onFrameAttackLoose(target: Node = null){
        const arrowStartPos = this.resolveShootStart(tempShootStart);
        let arrowForward: Vec3 = v3();
        const emitter = this.node.getComponent(ProjectileEmitter);
        if (!emitter){
            return;
        }

        for (let i=0; i < this.actor.rungameInfo.projectileCount; i++){
            
            MathUtil.rotateAround(arrowForward, this.actor.angleInput, Vec3.UP, this._splitAngle[i]);

            let projectile = emitter.create();
            // 创建投射物
            projectile.startTime = 0;
            projectile.host = this.node;
            const useTrace = this.projectileTraceEnabled && !!target;
            projectile.node.forward = arrowForward;
            projectile.node.worldPosition = arrowStartPos;
            this.careerShotCounter += 1;
            this.configureProjectile(projectile, useTrace ? target : null, useTrace, false);
        }
        this.trySpawnCareerExtraProjectiles(emitter, arrowStartPos, target);
    }

    private resolveShootStart(out: Vec3): Vec3{
        this.node.getWorldPosition(tempPlayerPos);
        if (this.bowString && this.bowString.isValid){
            this.bowString.getWorldPosition(out);
            if (Vec3.distance(out, tempPlayerPos) < 6){
                return out;
            }
        }
        out.set(tempPlayerPos);
        out.y += 1.0;
        return out;
    }

    // 设置投射物数量及散射角度
    setProjectileCount(count: number){
        this.actor.rungameInfo.projectileCount = count;
        this._splitAngle = [];

        // 计算每颗子弹的散射角度（弧度）
        const rad = math.toRadian(10);

        const isOdd = count % 2 != 0;
        
        const len = Math.floor(count/2);
        for (let i = 0; i < len; i++){
            this._splitAngle.push(-rad * (i+1));
            this._splitAngle.push(rad * (i+1));
        }

        if(isOdd){
            this._splitAngle.push(0);
        }
    }

    getNearEnemy():Node{
        let minDistance = 9999;
        let minNode: Node = null;

        // 遍历所有怪物，找到距离最近的敌人
        for (let goalId of MonsterManager.instance.goalvoes.keys()){
            let entrie = MonsterManager.instance.goalvoes.get(goalId);
            if (!entrie || !entrie.mSphere || !entrie.mSphere.isValid){
                continue;
            }
            let actorForOne = entrie.mSphere.getComponent(Monster);
            if (!actorForOne){
                continue;
            }
            if (actorForOne.distance < minDistance){
                minDistance = actorForOne.distance;
                minNode = entrie.mSphere;
            }
        }
        if (minNode){
            if (minNode.getComponent(Monster).distance > 600){
                minNode = null;
            }
        }
        
        return minNode;
    }

    onKill(killTarget: Node = null, expReward: number = 1, isEliteKill: boolean = false, isBossKill: boolean = false, deathPos: Vec3 = null){
        // 击杀奖励经验值
        const gainExp = Math.max(1, Math.floor(expReward));
        this.addExp(gainExp);
        this.applyCareerKillReward(isEliteKill, isBossKill);

        // 累计击杀数
        this.playerDoKill ++;

        if (isEliteKill){
            this.eliteKillCount += 1;
            const lootDesc = this.applyEliteLootReward();
            director.getScene().emit(OnOrEmitConst.OnEliteKilled, this.eliteKillCount, gainExp, lootDesc, deathPos);
            if (killTarget && killTarget.isValid){
                this.spawnEliteCoreDrop(killTarget.getWorldPosition());
            }
        }

        if (isBossKill){
            director.getScene().emit(OnOrEmitConst.OnBossKilled, gainExp, this.actor.rungameInfo.level);
        }

        if (!isEliteKill && !isBossKill && deathPos){
            director.getScene().emit(OnOrEmitConst.OnNormalKill, deathPos, this.playerDoKill);
        }

        if (this.playerDoKill > this.actor.rungameInfo.projectileCount * 10){
            let a  = this.actor.rungameInfo.projectileCount + 2;

            // 击杀达到阈值后提升攻击力并增加投射物数量
            this.actor.rungameInfo.attack *= 1.2;
            
            this.setProjectileCount(a);
            
        }
    }

    /**
     * 初始化游戏角色属性与状态
     */
    runGameInit(startRoleId: CareerRoleId = 'student'):RunGameInfoVo {
        if (this.actor == undefined){
            this.actor = this.node.getComponent(Actor);
        }
        this.node.setWorldPosition(Vec3.ZERO);
        this.actor.resetState(ActorState.Idle);
        this.actor.input.set(0, 0, 0);
        this.actor.angleInput.set(0, 0, -1);
        this.actor.rigidbody?.setLinearVelocity(Vec3.ZERO);
        this.actor.rigidbody?.setAngularVelocity(Vec3.ZERO);
        this.playerDoKill = 0;
        this.eliteKillCount = 0;
        this.shootTime = 0;
        this.clearEliteDrops();

        // TODO 后续需根据配置表初始化角色属性
       this.actor.rungameInfo.maxHp = 100;
       this.actor.rungameInfo.attack = 30;
       this.actor.rungameInfo.cooldown = 1;
       this.actor.rungameInfo.attackInterval = 1;
       this.actor.rungameInfo.criticalHitRate = 0.05;
       this.actor.rungameInfo.criticalStrike = 0;
       this.actor.rungameInfo.hpAdd = 10;
       this.actor.rungameInfo.defense = 1;
       this.actor.rungameInfo.moveSpeed = 5.0;
       this.actor.rungameInfo.level = 1;
       this.actor.rungameInfo.exp = 0;
       this.actor.rungameInfo.maxExp = this.getExpRequirementForLevel(1);
       this.actor.rungameInfo.skillPoint = 0;
       this.actor.rungameInfo.Hp = this.actor.rungameInfo.maxHp;
       this.projectileTraceEnabled = true;
       this.projectilePenetration = 1;
       this.attackIntervalDebuffScale = 1;
       this.attackIntervalDebuffRemain = 0;
       this.careerShotCounter = 0;
       this.careerHitHealCooldown = 0;
       this.careerBranchPoints = {};
        this.setProjectileCount(1);
        this.applyCareerRole(startRoleId, true, true);
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, 1);
        this.node.emit(OnOrEmitConst.OnExpGain, this.actor.rungameInfo.exp, this.actor.rungameInfo.maxExp, this);

        return this.actor.rungameInfo;
    }

    private getExpRequirementForLevel(level: number): number{
        const lv = Math.max(1, Math.floor(level));
        const earlyCurve = [2, 3, 4, 5, 7, 9, 11, 14, 17, 21];
        if (lv <= earlyCurve.length){
            return earlyCurve[lv - 1];
        }
        if (lv <= 20){
            return Math.floor(22 + Math.pow(lv - 10, 1.38) * 0.92);
        }
        if (lv <= 40){
            return Math.floor(44 + Math.pow(lv - 20, 1.46) * 1.05);
        }
        return Math.floor(127 + Math.pow(lv - 40, 1.6) * 1.28);
    }

    changeAttack(delta: number){
        const currentAttack = Number.isFinite(this.actor.rungameInfo.attack) ? this.actor.rungameInfo.attack : 1;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        this.actor.rungameInfo.attack = Math.max(1, currentAttack + safeDelta);
    }

    changeAttackInterval(delta: number){
        const currentInterval = Number.isFinite(this.actor.rungameInfo.attackInterval) ? this.actor.rungameInfo.attackInterval : 1;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        this.actor.rungameInfo.attackInterval = math.clamp(currentInterval + safeDelta, 0.15, 5);
    }

    changeMoveSpeed(delta: number){
        const currentMoveSpeed = Number.isFinite(this.actor.rungameInfo.moveSpeed) ? this.actor.rungameInfo.moveSpeed : 5;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        this.actor.rungameInfo.moveSpeed = Math.max(1, currentMoveSpeed + safeDelta);
    }

    changeProjectileCount(delta: number){
        const nextCount = math.clamp(this.actor.rungameInfo.projectileCount + delta, 1, 9);
        this.setProjectileCount(nextCount);
    }

    changeProjectilePenetration(delta: number){
        const nextPenetration = Math.round(math.clamp(this.projectilePenetration + delta, 1, 6));
        this.projectilePenetration = nextPenetration;
    }

    setProjectileTraceEnabled(enabled: boolean){
        this.projectileTraceEnabled = !!enabled;
    }

    toggleProjectileTrace(): boolean{
        this.projectileTraceEnabled = !this.projectileTraceEnabled;
        return this.projectileTraceEnabled;
    }

    isProjectileTraceEnabled(): boolean{
        return this.projectileTraceEnabled;
    }

    getCurrentLevel(): number{
        return this.actor?.rungameInfo?.level ?? 1;
    }

    getTotalKills(): number{
        return this.playerDoKill;
    }

    getEliteKillCount(): number{
        return this.eliteKillCount;
    }

    getSkillPoint(): number{
        return Math.max(0, Math.floor(this.actor?.rungameInfo?.skillPoint ?? 0));
    }

    getNextSkillPointLevel(): number{
        const currentLevel = this.getCurrentLevel();
        const step = currentLevel % 5;
        return step === 0 ? currentLevel + 5 : currentLevel + (5 - step);
    }

    getCareerRoleId(): CareerRoleId{
        return this.careerRoleId;
    }

    getCareerRoleName(): string{
        return CareerRoleConfigs[this.careerRoleId]?.name ?? '计算机专业学生';
    }
    getCareerRoleConfig(): CareerRoleConfig{
        return CareerRoleConfigs[this.careerRoleId] ?? CareerRoleConfigs.student;
    }

    getCareerStackText(): string{
        return this.getCareerRoleConfig().techStacks.join(' / ');
    }

    getCareerPassiveName(): string{
        return this.getCareerRoleConfig().passiveName;
    }

    getCareerPassiveDesc(): string{
        return this.getCareerRoleConfig().passiveDesc;
    }

    private getCareerBranchConfigs(): CareerTechBranchConfig[]{
        return CareerTechTreeConfigs[this.careerRoleId] ?? [];
    }

    private getCareerBranchFocusConfig(): CareerTechBranchConfig | null{
        let focus: CareerTechBranchConfig = null;
        let maxPoint = 0;
        for (const branch of this.getCareerBranchConfigs()){
            const points = this.getCareerBranchPoint(branch.id);
            if (points > maxPoint){
                maxPoint = points;
                focus = branch;
            }
        }
        return focus;
    }

    getCareerBranchPoint(branchId: CareerBranchId): number{
        return Math.max(0, Math.floor(this.careerBranchPoints[branchId] ?? 0));
    }

    getCareerFocusBranchId(): CareerBranchId | ''{
        return this.getCareerBranchFocusConfig()?.id ?? '';
    }

    getCareerMilestoneRank(branchId: CareerBranchId): number{
        const branch = findCareerTechBranch(this.careerRoleId, branchId);
        if (!branch){
            return 0;
        }
        let rank = 0;
        for (const milestone of branch.milestones){
            if (this.careerMilestones[milestone.id]){
                rank += 1;
            }
        }
        return rank;
    }

    hasCareerMilestone(milestoneId: string): boolean{
        return !!this.careerMilestones[milestoneId];
    }

    hasUnlockableCareerMilestone(): boolean{
        return this.getCareerMilestonePreviewList().some((item)=> item.ready);
    }

    private getCareerBranchDisplayName(branchId: string): string{
        const branch = findCareerTechBranch(this.careerRoleId, branchId);
        if (branch){
            return branch.shortName || branch.name;
        }
        return branchId;
    }

    getCareerMilestoneHudText(): string{
        if (this.careerRoleId === 'student'){
            return this.canSelectSpecialization()
                ? '可转职：前端 / 后端 / 产品 / 项目 / 测试 / 实施'
                : `Lv.${CareerSpecializationUnlockLevel} 可转职`;
        }

        const previews = this.getCareerMilestonePreviewList();
        if (previews.length <= 0){
            return '技术树已全部突破';
        }

        const readyItems = previews.filter((item)=> item.ready);
        if (readyItems.length > 0){
            const target = readyItems[0];
            const branchName = this.getCareerBranchDisplayName(target.branch.id);
            const moreText = readyItems.length > 1 ? `，另有 ${readyItems.length} 项` : '';
            return `${branchName} 可突破${moreText}`;
        }

        const nextMilestone = previews[0];
        const branchName = this.getCareerBranchDisplayName(nextMilestone.branch.id);
        if (this.getSkillPoint() > 0){
            if (nextMilestone.missingBranchLevel > 0){
                return `已持有技能点，${branchName} 还差 ${nextMilestone.missingBranchLevel} 级`;
            }
            if (nextMilestone.missingSkillPoint > 0){
                return `分支已达标，还差 ${nextMilestone.missingSkillPoint} 点技能点`;
            }
        }

        if (nextMilestone.missingBranchLevel <= 0){
            return `下个技能点 Lv.${this.getNextSkillPointLevel()}，${branchName} 待突破`;
        }
        return `下个技能点 Lv.${this.getNextSkillPointLevel()}，${branchName} 目标 Lv.${nextMilestone.requiredBranchLevel}`;
    }

    getCareerBranchStatusText(): string{
        if (this.careerRoleId === 'student'){
            return '主修：待转职';
        }
        const focus = this.getCareerBranchFocusConfig();
        if (!focus){
            return '主修：未确定';
        }
        const milestoneRank = this.getCareerMilestoneRank(focus.id);
        const suffix = milestoneRank > 0 ? ` | 突破 ${milestoneRank}` : '';
        return `主修：${this.getCareerBranchDisplayName(focus.id)} Lv.${this.getCareerBranchPoint(focus.id)}${suffix}`;
    }

    addCareerBranchProgress(branchId: CareerBranchId, amount: number = 1): number{
        const branch = findCareerTechBranch(this.careerRoleId, branchId);
        if (!branch){
            return 0;
        }
        const nextLevel = this.getCareerBranchPoint(branchId) + Math.max(1, Math.floor(amount));
        this.careerBranchPoints[branchId] = nextLevel;
        this.actor.rungameInfo.careerBranchId = branch.id;
        this.actor.rungameInfo.careerBranchName = this.getCareerBranchDisplayName(branch.id);
        return nextLevel;
    }

    getCareerBranchWeightBonus(branchId: CareerBranchId): number{
        const points = this.getCareerBranchPoint(branchId);
        if (points <= 0){
            return 0;
        }
        const focus = this.getCareerBranchFocusConfig();
        let bonus = Math.min(0.72, points * 0.18);
        if (focus?.id === branchId){
            bonus += 0.24;
        }
        return bonus;
    }

    canUnlockCareerMilestone(branchId: CareerBranchId, milestoneId: string): boolean{
        const milestone = findCareerTechMilestone(this.careerRoleId, branchId, milestoneId);
        if (!milestone){
            return false;
        }
        if (this.careerMilestones[milestone.id]){
            return false;
        }
        if (this.getSkillPoint() < milestone.costSkillPoint){
            return false;
        }
        return this.getCareerBranchPoint(branchId) >= milestone.requiredBranchLevel;
    }

    unlockCareerMilestone(branchId: CareerBranchId, milestoneId: string): boolean{
        const milestone = findCareerTechMilestone(this.careerRoleId, branchId, milestoneId);
        if (!milestone || !this.canUnlockCareerMilestone(branchId, milestoneId)){
            return false;
        }
        this.actor.rungameInfo.skillPoint = Math.max(0, this.actor.rungameInfo.skillPoint - milestone.costSkillPoint);
        this.careerMilestones[milestone.id] = 1;
        this.applyCareerPerks(milestone.perks);
        director.getScene().emit(OnOrEmitConst.OnSkillPointChanged, this.actor.rungameInfo.skillPoint, 0, this.getCurrentLevel());
        return true;
    }

    private getCareerMilestonePreviewList(): CareerMilestonePreview[]{
        if (this.careerRoleId === 'student'){
            return [];
        }

        const focusBranchId = this.getCareerBranchFocusConfig()?.id ?? '';
        const previews: CareerMilestonePreview[] = [];
        for (const branch of this.getCareerBranchConfigs()){
            const nextMilestone = branch.milestones.find((item)=> !this.careerMilestones[item.id]);
            if (!nextMilestone){
                continue;
            }

            const branchPoint = this.getCareerBranchPoint(branch.id);
            const missingBranchLevel = Math.max(0, nextMilestone.requiredBranchLevel - branchPoint);
            const missingSkillPoint = Math.max(0, nextMilestone.costSkillPoint - this.getSkillPoint());
            previews.push({
                branch,
                milestoneId: nextMilestone.id,
                milestoneTitle: nextMilestone.title,
                requiredBranchLevel: nextMilestone.requiredBranchLevel,
                costSkillPoint: nextMilestone.costSkillPoint,
                missingBranchLevel,
                missingSkillPoint,
                ready: missingBranchLevel <= 0 && missingSkillPoint <= 0,
                isFocus: focusBranchId === branch.id,
            });
        }

        previews.sort((left, right)=>{
            if (left.ready !== right.ready){
                return left.ready ? -1 : 1;
            }
            if (left.isFocus !== right.isFocus){
                return left.isFocus ? -1 : 1;
            }
            if (left.missingBranchLevel !== right.missingBranchLevel){
                return left.missingBranchLevel - right.missingBranchLevel;
            }
            if (left.missingSkillPoint !== right.missingSkillPoint){
                return left.missingSkillPoint - right.missingSkillPoint;
            }
            return left.requiredBranchLevel - right.requiredBranchLevel;
        });

        return previews;
    }

    getCareerPassiveStatusText(): string{
        switch (this.careerRoleId){
        case 'frontend':
            return this.hasCareerMilestone('frontend-component-4')
                ? '双端渲染+：每次攻击追加四向补刀'
                : '双端渲染：每次攻击追加两侧补刀';
        case 'backend':
            return this.hasCareerMilestone('backend-data-4')
                ? '链路穿透+：额外穿透，精英与 Boss 伤害更高'
                : '链路穿透：+1 穿透，精英与 Boss 伤害更高';
        case 'product':
            return this.hasCareerMilestone('product-insight-4')
                ? '需求回流+：追踪命中恢复更强'
                : '需求回流：追踪命中回复生命';
        case 'project':
            return this.hasCareerMilestone('project-risk-4')
                ? '节奏兜底+：减伤更强，维护负担更轻'
                : '节奏兜底：减伤并缩短维护负担';
        case 'qa': {
            const weakspotCycle = this.hasCareerMilestone('qa-gate-4') ? 3 : 4;
            const step = this.careerShotCounter % weakspotCycle;
            const remain = step === 0 ? weakspotCycle : (weakspotCycle - step);
            const suffix = this.hasCareerMilestone('qa-gate-4') ? '强化' : '';
            return `缺陷放大${suffix ? `(${suffix})` : ''}：再打 ${remain} 发触发弱点`;
        }
        case 'delivery':
            return this.hasCareerMilestone('delivery-support-4')
                ? '现场托底+：残血更硬，击杀回复更强'
                : '现场托底：残血减伤，击杀后恢复生命';
        default:
            return '基础打底：转职前均衡成长';
        }
    }

    getCareerUnlockLevel(): number{
        return CareerSpecializationUnlockLevel;
    }

    isSpecialized(): boolean{
        return this.careerRoleId !== 'student';
    }

    canSelectSpecialization(level?: number): boolean{
        const currentLevel = level ?? this.getCurrentLevel();
        return !this.isSpecialized() && currentLevel >= CareerSpecializationUnlockLevel;
    }

    applyCareerRole(roleId: CareerRoleId, emitEvent: boolean = true, forcePerks: boolean = false): boolean{
        const config = CareerRoleConfigs[roleId];
        if (!config){
            return false;
        }
        const changed = this.careerRoleId !== roleId;
        this.resetCareerRuntimeState();
        this.careerRoleId = roleId;
        this.actor.rungameInfo.careerRoleId = config.id;
        this.actor.rungameInfo.careerRoleName = config.name;
        if (changed || forcePerks){
            this.applyCareerPerks(config.basePerks);
        }
        if (emitEvent){
            director.getScene().emit(
                OnOrEmitConst.OnCareerChanged,
                config.id,
                config.name,
                config.techStacks.join(' / '),
                config.specialty,
            );
        }
        return changed;
    }

    getCurrentAttackInterval(): number{
        const base = this.actor?.rungameInfo?.attackInterval ?? 1;
        const safeBase = Number.isFinite(base) ? base : 1;
        const safeScale = Number.isFinite(this.attackIntervalDebuffScale) ? this.attackIntervalDebuffScale : 1;
        return math.clamp(safeBase * safeScale, 0.15, 8);
    }

    applyMaintenanceBurden(scale: number = 1.25, duration: number = 2.4, source: string = 'Code Mess'){
        let nextScale = math.clamp(scale, 1.05, 3);
        let nextDuration = duration;
        if (this.careerRoleId === 'project'){
            nextScale = math.clamp(nextScale * 0.92, 1.02, 3);
            nextDuration *= 0.65;
            if (this.hasCareerMilestone('project-risk-4')){
                nextScale = math.clamp(nextScale * 0.86, 1.01, 3);
                nextDuration *= 0.72;
            }
        } else if (this.careerRoleId === 'delivery'){
            nextScale = math.clamp(nextScale * 0.95, 1.02, 3);
            nextDuration *= 0.82;
        }
        this.attackIntervalDebuffScale = Math.max(this.attackIntervalDebuffScale, nextScale);
        this.attackIntervalDebuffRemain = Math.max(this.attackIntervalDebuffRemain, nextDuration);
        director.getScene().emit(
            OnOrEmitConst.OnEliteCast,
            "burden",
            this.node.worldPosition,
            source,
            this.attackIntervalDebuffScale,
            this.attackIntervalDebuffRemain,
        );
    }

    adjustOutgoingDamage(damage: number, monster: Monster, projectile: ProjectileManager | null = null): number{
        let result = damage * (projectile?.projectileProperty?.damageScale ?? 1);
        // 需求冻结主动技能：定身期间受伤 +30%
        if (this.isReqFreezeActive()){
            result *= 1.3;
        }
        switch (this.careerRoleId){
        case 'backend':
            result *= monster?.isBoss || monster?.isElite ? 1.35 : 1.08;
            if (this.hasCareerMilestone('backend-data-4')){
                result *= monster?.isBoss || monster?.isElite ? 1.12 : 1.05;
            }
            break;
        case 'product':
            if (projectile?.projectileProperty?.isTrace){
                result *= 1.12;
                if (this.hasCareerMilestone('product-insight-4')){
                    result *= 1.08;
                }
            }
            break;
        case 'project':
            if (this.actor.rungameInfo.Hp / Math.max(1, this.actor.rungameInfo.maxHp) <= 0.7){
                result *= 1.10;
            }
            break;
        case 'delivery':
            if (this.actor.rungameInfo.Hp / Math.max(1, this.actor.rungameInfo.maxHp) <= 0.6){
                result *= 1.15;
            }
            break;
        default:
            break;
        }
        return result;
    }

    adjustIncomingDamage(damage: number): number{
        // 实施救火无敌
        if (this.firefightInvincible){
            return 0;
        }
        let scale = 1;
        // 风险预案主动技能减伤
        if (this.isRiskPlanActive()){
            scale *= 0.4;
        }
        switch (this.careerRoleId){
        case 'project':
            scale = this.hasCareerMilestone('project-risk-4') ? 0.76 : 0.85;
            if (this.hasCareerMilestone('project-risk-4') && this.attackIntervalDebuffRemain > 0){
                scale *= 0.88;
            }
            break;
        case 'delivery':
            if (this.actor.rungameInfo.Hp / Math.max(1, this.actor.rungameInfo.maxHp) <= 0.6){
                scale = this.hasCareerMilestone('delivery-support-4') ? 0.58 : 0.75;
            } else {
                scale = this.hasCareerMilestone('delivery-support-4') ? 0.85 : 0.92;
            }
            break;
        default:
            break;
        }
        return Math.max(1, damage * scale);
    }

    onProjectileHitMonster(monster: Monster, _damage: number, projectile: ProjectileManager | null = null){
        if (!monster){
            return;
        }
        if (this.careerRoleId === 'product' && projectile?.projectileProperty?.isTrace){
            if (this.careerHitHealCooldown <= 0){
                const healAmount = this.hasCareerMilestone('product-insight-4')
                    ? (monster.isBoss || monster.isElite ? 3 : 2)
                    : 1;
                this.heal(healAmount);
                this.careerHitHealCooldown = this.hasCareerMilestone('product-insight-4') ? 0.08 : 0.12;
            }
        }
    }

    isMaintenanceBurdenActive(): boolean{
        return this.attackIntervalDebuffRemain > 0;
    }

    getMaintenanceBurdenScale(): number{
        return this.attackIntervalDebuffScale;
    }

    getMaintenanceBurdenRemain(): number{
        return Math.max(0, this.attackIntervalDebuffRemain);
    }

    changeDefense(delta: number){
        const currentDefense = Number.isFinite(this.actor.rungameInfo.defense) ? this.actor.rungameInfo.defense : 0;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        this.actor.rungameInfo.defense = Math.max(0, currentDefense + safeDelta);
    }

    changeMaxHp(delta: number, heal: number = 0){
        const currentMaxHp = Number.isFinite(this.actor.rungameInfo.maxHp) ? this.actor.rungameInfo.maxHp : 1;
        const currentHp = Number.isFinite(this.actor.rungameInfo.Hp) ? this.actor.rungameInfo.Hp : currentMaxHp;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        const safeHeal = Number.isFinite(heal) ? heal : 0;
        this.actor.rungameInfo.maxHp = Math.max(1, currentMaxHp + safeDelta);
        this.actor.rungameInfo.Hp = Math.min(this.actor.rungameInfo.maxHp, Math.max(0, currentHp + safeHeal));
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, this.actor.rungameInfo.Hp / this.actor.rungameInfo.maxHp);
    }

    heal(healValue: number){
        const currentMaxHp = Number.isFinite(this.actor.rungameInfo.maxHp) ? this.actor.rungameInfo.maxHp : 1;
        const currentHp = Number.isFinite(this.actor.rungameInfo.Hp) ? this.actor.rungameInfo.Hp : currentMaxHp;
        const safeHeal = Number.isFinite(healValue) ? healValue : 0;
        this.actor.rungameInfo.Hp = Math.min(currentMaxHp, Math.max(0, currentHp + safeHeal));
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, this.actor.rungameInfo.Hp / currentMaxHp);
    }

    resetDebugStats(){
        this.runGameInit();
    }

    getDebugSummary(): string {
        const info = this.actor.rungameInfo;
        const interval = this.getCurrentAttackInterval();
        const debuff = this.attackIntervalDebuffRemain > 0
            ? `,负担=x${this.attackIntervalDebuffScale.toFixed(2)}(${this.attackIntervalDebuffRemain.toFixed(1)}s)`
            : "";
        const hp = Number.isFinite(info.Hp) ? info.Hp : 0;
        const maxHp = Number.isFinite(info.maxHp) ? info.maxHp : 1;
        const attack = Number.isFinite(info.attack) ? info.attack : 0;
        const moveSpeed = Number.isFinite(info.moveSpeed) ? info.moveSpeed : 0;
        return `职业=${this.getCareerRoleName()}, 被动=${this.getCareerPassiveName()}, ${this.getCareerBranchStatusText()}, 等级=${info.level}, SP=${this.getSkillPoint()}, 生命=${hp.toFixed(0)}/${maxHp.toFixed(0)}, 攻击=${attack.toFixed(0)}, 攻速=${interval.toFixed(2)}, 移速=${moveSpeed.toFixed(1)}, 子弹=${info.projectileCount}, 穿透=${this.projectilePenetration}, 追踪=${this.projectileTraceEnabled ? "开" : "关"}, 击杀=${this.playerDoKill}, 精英=${this.eliteKillCount}, 灵核=${this.eliteDrops.length}${debuff}`;
    }

    getExpSnapshot(){
        return {
            exp: this.actor?.rungameInfo?.exp ?? 0,
            maxExp: this.actor?.rungameInfo?.maxExp ?? 1,
            level: this.actor?.rungameInfo?.level ?? 1,
        };
    }

    applyLevelConfig(config: LevelConfigVo | null){
        if (!config){
            return;
        }
        this.eliteDropRewardExp = Math.max(1, Math.floor(config.EliteCoreDropExp ?? this.eliteDropRewardExp));
        this.eliteDropRewardHeal = Math.max(0, Math.floor(config.EliteCoreDropHeal ?? this.eliteDropRewardHeal));
        this.eliteDropLifeTime = Math.max(3, config.EliteCoreDropLifeTime ?? this.eliteDropLifeTime);
        this.eliteDropMagnetRadius = Math.max(1.5, config.EliteCoreMagnetRadius ?? this.eliteDropMagnetRadius);
        this.eliteDropCollectRadius = Math.max(0.4, config.EliteCoreCollectRadius ?? this.eliteDropCollectRadius);

        this.eliteLootAttack = Math.max(1, config.EliteLootAttack ?? this.eliteLootAttack);
        this.eliteLootAttackInterval = config.EliteLootAttackInterval ?? this.eliteLootAttackInterval;
        this.eliteLootProjectile = Math.max(1, Math.floor(config.EliteLootProjectile ?? this.eliteLootProjectile));
        this.eliteLootPenetration = Math.max(1, Math.floor(config.EliteLootPenetration ?? this.eliteLootPenetration));
        this.eliteLootMoveSpeed = Math.max(0.1, config.EliteLootMoveSpeed ?? this.eliteLootMoveSpeed);
        this.eliteLootMaxHp = Math.max(1, config.EliteLootMaxHp ?? this.eliteLootMaxHp);
    }

    private applyEliteLootReward(): string{
        const roll = Math.random();
        if (roll < 0.20){
            this.changeAttack(this.eliteLootAttack);
            return `热路径优化（攻击 +${this.eliteLootAttack}）`;
        }
        if (roll < 0.40){
            this.changeAttackInterval(this.eliteLootAttackInterval);
            return `持续集成提速（攻速 ${this.eliteLootAttackInterval.toFixed(2)}）`;
        }
        if (roll < 0.58){
            this.changeProjectileCount(this.eliteLootProjectile);
            return `脚手架扩展（子弹 +${this.eliteLootProjectile}）`;
        }
        if (roll < 0.74){
            this.changeProjectilePenetration(this.eliteLootPenetration);
            return `接口联调（穿透 +${this.eliteLootPenetration}）`;
        }
        if (roll < 0.88){
            this.changeMoveSpeed(this.eliteLootMoveSpeed);
            return `工位冲刺（移速 +${this.eliteLootMoveSpeed.toFixed(1)}）`;
        }

        this.changeMaxHp(this.eliteLootMaxHp, this.eliteLootMaxHp);
        return `兜底扩容（生命上限 +${this.eliteLootMaxHp}，回复 ${this.eliteLootMaxHp}）`;
    }

    private addExp(expReward: number){
        const property = this.actor.rungameInfo;
        if (!Number.isFinite(property.exp) || property.exp < 0){
            property.exp = 0;
        }
        if (!Number.isFinite(property.level) || property.level < 1){
            property.level = 1;
        }
        if (!Number.isFinite(property.maxExp) || property.maxExp < 1){
            property.maxExp = this.getExpRequirementForLevel(property.level);
        }
        if (!Number.isFinite(property.maxHp) || property.maxHp <= 0){
            property.maxHp = 1;
        }
        if (!Number.isFinite(property.Hp)){
            property.Hp = property.maxHp;
        }
        if (!Number.isFinite(property.hpAdd)){
            property.hpAdd = 0;
        }
        if (!Number.isFinite(property.skillPoint) || property.skillPoint < 0){
            property.skillPoint = 0;
        }

        property.exp += Math.max(1, Math.floor(expReward));
        while (property.exp >= property.maxExp){
            property.exp -= property.maxExp;
            property.level = property.level + 1;
            property.maxExp = this.getExpRequirementForLevel(property.level);
            property.Hp = Math.min(property.maxHp, property.Hp + property.hpAdd);
            director.getScene().emit(OnOrEmitConst.OnPlayerhurt, property.Hp / property.maxHp);
            let gainedSkillPoint = 0;
            if (property.level % 5 === 0){
                property.skillPoint += 1;
                gainedSkillPoint = 1;
                director.getScene().emit(OnOrEmitConst.OnSkillPointChanged, property.skillPoint, gainedSkillPoint, property.level);
            }
            this.node.emit(OnOrEmitConst.OnplayerUpgrade, property.level, this, gainedSkillPoint, property.skillPoint);
            console.log(`[PlayerTs] emit OnplayerUpgrade Lv.${property.level}, sp=${property.skillPoint}`);
        }
        this.node.emit(OnOrEmitConst.OnExpGain, property.exp, property.maxExp, this);
    }

    private spawnEliteCoreDrop(worldPosition: Vec3){
        const scene = director.getScene();
        if (!scene){
            return;
        }
        const dropNode = new Node("EliteCoreDrop");
        scene.addChild(dropNode);
        const spawnPos = v3(worldPosition.x, worldPosition.y + 0.8, worldPosition.z);
        dropNode.setWorldPosition(spawnPos);
        EffectManager.instance.findEffectNode(EffectConst.EffDie, spawnPos);
        this.eliteDrops.push({
            node: dropNode,
            bornTime: game.totalTime,
            rewardExp: this.eliteDropRewardExp,
            rewardHeal: this.eliteDropRewardHeal,
            baseY: spawnPos.y,
        });
    }

    private updateEliteDrops(deltaTime: number){
        if (this.eliteDrops.length <= 0){
            return;
        }
        this.node.getWorldPosition(tempDropPlayerPos);

        for (let i = this.eliteDrops.length - 1; i >= 0; i--){
            const drop = this.eliteDrops[i];
            if (!drop.node || !drop.node.isValid){
                this.eliteDrops.splice(i, 1);
                continue;
            }
            const life = game.totalTime - drop.bornTime;
            if (life > this.eliteDropLifeTime){
                drop.node.destroy();
                this.eliteDrops.splice(i, 1);
                continue;
            }

            drop.node.getWorldPosition(tempDropNodePos);

            // 灵核上下浮动动画
            tempDropNodePos.y = drop.baseY + Math.sin(life * 4) * 0.16;
            drop.node.setWorldPosition(tempDropNodePos);

            const distance = Vec3.distance(tempDropNodePos, tempDropPlayerPos);
            if (distance <= this.eliteDropCollectRadius){
                this.collectEliteCoreDrop(i);
                continue;
            }

            if (distance <= this.eliteDropMagnetRadius){
                Vec3.subtract(tempDropStep, tempDropPlayerPos, tempDropNodePos);
                tempDropStep.normalize();
                const step = Math.max(3.2, 9 - distance) * deltaTime;
                Vec3.scaleAndAdd(tempDropNodePos, tempDropNodePos, tempDropStep, step);
                drop.node.setWorldPosition(tempDropNodePos);
            }
        }
    }

    private collectEliteCoreDrop(index: number){
        const drop = this.eliteDrops[index];
        if (!drop){
            return;
        }
        const rewardExp = drop.rewardExp;
        const rewardHeal = drop.rewardHeal;
        const collectPos = drop.node && drop.node.isValid ? drop.node.getWorldPosition() : this.node.getWorldPosition();
        if (drop.node && drop.node.isValid){
            drop.node.destroy();
        }
        this.eliteDrops.splice(index, 1);

        this.addExp(rewardExp);
        this.heal(rewardHeal);
        director.getScene().emit(OnOrEmitConst.OnEliteCoreCollected, rewardExp, rewardHeal, collectPos);
    }

    private clearEliteDrops(){
        for (const drop of this.eliteDrops){
            if (drop.node && drop.node.isValid){
                drop.node.destroy();
            }
        }
        this.eliteDrops.length = 0;
    }

    getEliteDropNodes(): Node[]{
        return this.eliteDrops.filter((item)=> item.node && item.node.isValid).map((item)=> item.node);
    }

    playerOnDie(){
        let a = this.node.getWorldPosition();
        a.y = 1;
        this.node.worldPosition = a;
        console.log('Player defeated');

        // Broadcast death so the level flow can enter GameOver.
        director.getScene().emit(OnOrEmitConst.PlayerOnDie);
    }

    private configureProjectile(projectile: ProjectileManager, target: Node | null, useTrace: boolean, isCareerExtraShot: boolean){
        projectile.target = useTrace ? target : null;
        projectile.projectileProperty.isTrace = useTrace;
        projectile.projectileProperty.penetration = this.projectilePenetration;
        projectile.projectileProperty.lifeTime = 3.0;
        projectile.projectileProperty.damageScale = isCareerExtraShot ? 0.58 : 1;
        projectile.projectileProperty.careerProcTag = '';

        // 后端全链路压测主动技能
        if (this.stressTestShotsRemain > 0 && !isCareerExtraShot){
            this.consumeStressTestShot();
            projectile.projectileProperty.penetration = 99;
            projectile.projectileProperty.damageScale = 2.5;
            projectile.projectileProperty.lifeTime = 5.0;
            projectile.projectileProperty.careerProcTag = 'stressTest';
            return;
        }

        switch (this.careerRoleId){
        case 'backend':
            projectile.projectileProperty.penetration += 1;
            projectile.projectileProperty.lifeTime += 0.4;
            if (this.hasCareerMilestone('backend-data-4')){
                projectile.projectileProperty.penetration += 1;
            }
            break;
        case 'product':
            if (useTrace){
                projectile.projectileProperty.careerProcTag = 'productTrace';
            }
            break;
        case 'qa':
            if (!isCareerExtraShot){
                const weakspotCycle = this.hasCareerMilestone('qa-gate-4') ? 3 : 4;
                if (this.careerShotCounter % weakspotCycle === 0){
                    projectile.projectileProperty.damageScale = this.hasCareerMilestone('qa-gate-4') ? 2.1 : 1.75;
                    projectile.projectileProperty.penetration += this.hasCareerMilestone('qa-gate-4') ? 2 : 1;
                    projectile.projectileProperty.careerProcTag = 'qaWeakspot';
                }
            }
            break;
        case 'delivery':
            projectile.projectileProperty.lifeTime += 0.2;
            break;
        default:
            break;
        }
    }

    private trySpawnCareerExtraProjectiles(emitter: ProjectileEmitter, arrowStartPos: Vec3, target: Node | null){
        if (this.careerRoleId !== 'frontend' || !target){
            return;
        }
        const spreadAngles = this.hasCareerMilestone('frontend-component-4')
            ? [-22, -11, 11, 22]
            : [-11, 11];
        for (const angle of spreadAngles){
            const tempForward = angle < 0 ? tempCareerForwardL : tempCareerForwardR;
            MathUtil.rotateAround(tempForward, this.actor.angleInput, Vec3.UP, math.toRadian(angle));
            this.spawnCareerProjectile(emitter, arrowStartPos, tempForward);
        }
    }

    private spawnCareerProjectile(emitter: ProjectileEmitter, arrowStartPos: Vec3, forward: Vec3){
        const projectile = emitter.create();
        projectile.startTime = 0;
        projectile.host = this.node;
        projectile.node.forward = forward;
        projectile.node.worldPosition = arrowStartPos;
        this.configureProjectile(projectile, null, false, true);
        projectile.projectileProperty.careerProcTag = 'frontendEcho';
    }

    private applyCareerKillReward(isEliteKill: boolean, isBossKill: boolean){
        if (this.careerRoleId !== 'delivery'){
            return;
        }
        if (isBossKill){
            this.heal(this.hasCareerMilestone('delivery-support-4') ? 35 : 25);
            return;
        }
        if (isEliteKill){
            this.heal(this.hasCareerMilestone('delivery-support-4') ? 18 : 12);
            return;
        }
        this.heal(this.hasCareerMilestone('delivery-support-4') ? 4 : 2);
    }

    private resetCareerRuntimeState(){
        this.careerShotCounter = 0;
        this.careerHitHealCooldown = 0;
        this.careerBranchPoints = {};
        this.careerMilestones = {};
        this.actor.rungameInfo.careerBranchId = '';
        this.actor.rungameInfo.careerBranchName = '';
        this.resetActiveSkillState();
    }

    private applyCareerPerks(perks: CareerRolePerks){
        if (perks.attack){
            this.changeAttack(perks.attack);
        }
        if (perks.attackInterval){
            this.changeAttackInterval(perks.attackInterval);
        }
        if (perks.projectileCount){
            this.changeProjectileCount(perks.projectileCount);
        }
        if (perks.penetration){
            this.changeProjectilePenetration(perks.penetration);
        }
        if (perks.moveSpeed){
            this.changeMoveSpeed(perks.moveSpeed);
        }
        if (perks.defense){
            this.changeDefense(perks.defense);
        }
        if (perks.maxHp){
            this.changeMaxHp(perks.maxHp, perks.heal ?? 0);
        } else if (perks.heal){
            this.heal(perks.heal);
        }
        if (typeof perks.trace === 'boolean'){
            this.setProjectileTraceEnabled(perks.trace);
        }
    }

    // ==================== 主动技能系统 ====================

    getActiveSkillConfig(): ActiveSkillConfig | null{
        return this.activeSkillConfig;
    }

    isActiveSkillUnlocked(): boolean{
        return this.activeSkillUnlocked;
    }

    isActiveSkillActive(): boolean{
        return this.activeSkillActive;
    }

    getActiveSkillCooldownRemain(): number{
        return Math.max(0, this.activeSkillCooldownRemain);
    }

    getActiveSkillDurationRemain(): number{
        return Math.max(0, this.activeSkillDurationRemain);
    }

    canUnlockActiveSkill(): boolean{
        if (this.activeSkillUnlocked || this.careerRoleId === 'student'){
            return false;
        }
        const config = CareerActiveSkillConfigs[this.careerRoleId];
        if (!config){
            return false;
        }
        return this.getSkillPoint() >= config.unlockSkillPointCost;
    }

    unlockActiveSkill(): boolean{
        if (!this.canUnlockActiveSkill()){
            return false;
        }
        const config = CareerActiveSkillConfigs[this.careerRoleId];
        if (!config){
            return false;
        }
        this.actor.rungameInfo.skillPoint = Math.max(0, this.actor.rungameInfo.skillPoint - config.unlockSkillPointCost);
        this.activeSkillUnlocked = true;
        this.activeSkillConfig = config;
        this.activeSkillCooldownRemain = 0;
        this.activeSkillDurationRemain = 0;
        this.activeSkillActive = false;
        director.getScene().emit(OnOrEmitConst.OnSkillPointChanged, this.actor.rungameInfo.skillPoint, 0, this.getCurrentLevel());
        director.getScene().emit(OnOrEmitConst.OnActiveSkillUnlocked, config.id, config.name, config.desc);
        return true;
    }

    canCastActiveSkill(): boolean{
        return this.activeSkillUnlocked && !this.activeSkillActive && this.activeSkillCooldownRemain <= 0;
    }

    castActiveSkill(): boolean{
        if (!this.canCastActiveSkill() || !this.activeSkillConfig){
            return false;
        }
        this.activeSkillActive = true;
        this.activeSkillDurationRemain = this.activeSkillConfig.duration;
        this.activeSkillCooldownRemain = this.activeSkillConfig.cooldown;
        this.applyActiveSkillStart();
        director.getScene().emit(
            OnOrEmitConst.OnActiveSkillCast,
            this.activeSkillConfig.id,
            this.activeSkillConfig.name,
            this.activeSkillConfig.duration,
            this.activeSkillConfig.cooldown,
        );
        return true;
    }

    private updateActiveSkill(deltaTime: number){
        if (!this.activeSkillUnlocked || !this.activeSkillConfig){
            return;
        }
        if (this.activeSkillActive){
            this.activeSkillDurationRemain -= deltaTime;
            if (this.activeSkillDurationRemain <= 0){
                this.activeSkillDurationRemain = 0;
                this.activeSkillActive = false;
                this.applyActiveSkillEnd();
            }
        }
        if (this.activeSkillCooldownRemain > 0){
            this.activeSkillCooldownRemain -= deltaTime;
            if (this.activeSkillCooldownRemain <= 0){
                this.activeSkillCooldownRemain = 0;
                director.getScene().emit(OnOrEmitConst.OnActiveSkillReady, this.activeSkillConfig.id, this.activeSkillConfig.name);
            }
        }
    }

    private applyActiveSkillStart(){
        if (!this.activeSkillConfig){
            return;
        }
        switch (this.activeSkillConfig.id){
        case 'frontend-hotReload':
            // 攻速翻倍（攻击间隔减半），子弹 +2
            this.changeAttackInterval(-this.actor.rungameInfo.attackInterval * 0.5);
            this.changeProjectileCount(2);
            break;
        case 'backend-stressTest':
            // 下 3 发穿透无限，伤害 x2.5
            this.stressTestShotsRemain = 3;
            break;
        case 'product-reqFreeze':
            // 全场怪物定身 3 秒 —— 通过设置所有怪物移速为 0 实现
            this.freezeAllMonsters(true);
            break;
        case 'project-riskPlan':
            // 8 秒内减伤 60%，移速 +30%
            this.changeMoveSpeed(this.actor.rungameInfo.moveSpeed * 0.3);
            break;
        case 'qa-fullRegression':
            // 对屏幕内所有怪物造成攻击力 x3 伤害
            this.dealAoeDamage(this.actor.rungameInfo.attack * 3);
            break;
        case 'delivery-firefight':
            // 回复 40% 最大生命，5 秒无敌
            this.heal(Math.floor(this.actor.rungameInfo.maxHp * 0.4));
            this.firefightInvincible = true;
            break;
        }
    }

    private applyActiveSkillEnd(){
        if (!this.activeSkillConfig){
            return;
        }
        switch (this.activeSkillConfig.id){
        case 'frontend-hotReload':
            // 恢复攻速和子弹
            this.changeAttackInterval(this.actor.rungameInfo.attackInterval);
            this.changeProjectileCount(-2);
            break;
        case 'backend-stressTest':
            this.stressTestShotsRemain = 0;
            break;
        case 'product-reqFreeze':
            this.freezeAllMonsters(false);
            break;
        case 'project-riskPlan':
            this.changeMoveSpeed(-this.actor.rungameInfo.moveSpeed * 0.23);
            break;
        case 'qa-fullRegression':
            // 瞬发技能，无需恢复
            break;
        case 'delivery-firefight':
            this.firefightInvincible = false;
            break;
        }
    }

    isInvincible(): boolean{
        return this.firefightInvincible;
    }

    isStressTestActive(): boolean{
        return this.stressTestShotsRemain > 0;
    }

    consumeStressTestShot(): boolean{
        if (this.stressTestShotsRemain <= 0){
            return false;
        }
        this.stressTestShotsRemain -= 1;
        return true;
    }

    isReqFreezeActive(): boolean{
        return this.activeSkillActive && this.activeSkillConfig?.id === 'product-reqFreeze';
    }

    isRiskPlanActive(): boolean{
        return this.activeSkillActive && this.activeSkillConfig?.id === 'project-riskPlan';
    }

    private freezeAllMonsters(freeze: boolean){
        const entries = MonsterManager.instance.goalvoes;
        if (!entries){
            return;
        }
        for (const goalId of entries.keys()){
            const entry = entries.get(goalId);
            const monster = entry?.mSphere?.getComponent(Monster);
            if (!monster){
                continue;
            }
            if (freeze){
                monster.runtimeMoveSpeedScale = 0;
            } else {
                monster.runtimeMoveSpeedScale = 1;
            }
        }
    }

    private dealAoeDamage(damage: number){
        const entries = MonsterManager.instance.goalvoes;
        if (!entries){
            return;
        }
        const playerPos = this.node.getWorldPosition();
        const maxRange = 30;
        for (const goalId of entries.keys()){
            const entry = entries.get(goalId);
            const node = entry?.mSphere;
            if (!node || !node.isValid || !node.activeInHierarchy){
                continue;
            }
            const monster = node.getComponent(Monster);
            if (!monster || monster.currState === ActorState.Die){
                continue;
            }
            const dist = Vec3.distance(node.worldPosition, playerPos);
            if (dist > maxRange){
                continue;
            }
            const hurtDir = v3();
            Vec3.subtract(hurtDir, node.worldPosition, playerPos);
            hurtDir.normalize();
            monster.hurt(damage, hurtDir, this.node);
        }
    }

    private resetActiveSkillState(){
        if (this.activeSkillActive){
            this.applyActiveSkillEnd();
        }
        this.activeSkillUnlocked = false;
        this.activeSkillConfig = null;
        this.activeSkillCooldownRemain = 0;
        this.activeSkillDurationRemain = 0;
        this.activeSkillActive = false;
        this.stressTestShotsRemain = 0;
        this.firefightInvincible = false;
    }
}


