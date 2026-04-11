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
import { CareerBranchId, CareerTechBranchConfig, CareerTechTreeConfigs, findCareerTechBranch, findCareerTechMilestone } from '../../const/TechTreeConfig';

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
    
    /**
     * 子弹发出位置
     */
    @property(Node)
    bowString: Node = null;

    // 子弹发射冷却计时
    shootTime: number = 0.0;

    // 初始子弹数量
    private _splitAngle: number[] = [0];

    // 主角击杀数量    
    private playerDoKill: number = 0;
    // 精英击杀计数
    private eliteKillCount: number = 0;

    // 工具状态：投射物追踪与穿透（用于调试入口与升级三选一）
    private projectileTraceEnabled: boolean = true;
    private projectilePenetration: number = 1;
    // 负面效果：维护负担（增大攻击间隔，降低输出频率）
    private attackIntervalDebuffScale: number = 1;
    private attackIntervalDebuffRemain: number = 0;
    private careerRoleId: CareerRoleId = 'student';
    private careerShotCounter = 0;
    private careerHitHealCooldown = 0;
    private careerBranchPoints: Record<string, number> = {};
    private careerMilestones: Record<string, number> = {};

    // 精英灵核掉落（击杀后可拾取）
    private eliteDrops: EliteDropInfo[] = [];
    private eliteDropCollectRadius = 1.8;
    private eliteDropMagnetRadius = 6.0;
    private eliteDropLifeTime = 18;
    private eliteDropRewardExp = 12;
    private eliteDropRewardHeal = 10;

    // 精英战利品（配置可调）
    private eliteLootAttack = 14;
    private eliteLootAttackInterval = -0.14;
    private eliteLootProjectile = 1;
    private eliteLootPenetration = 1;
    private eliteLootMoveSpeed = 1;
    private eliteLootMaxHp = 25;

    start() {
        this.actor = this.node.getComponent(Actor);
        // 初始化主角的参数
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
     
            // 有敌人就攻击，没有就是空闲
            let enmey = this.getNearEnemy();
            if (enmey != null) {
                // 主角需要朝着敌人方向旋转，子弹也朝向敌人
                // 敌人与主角的方向
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

    // 普通攻击
    onFrameAttackLoose(target: Node = null){
        // 发射技能
        const arrowStartPos = this.resolveShootStart(tempShootStart);
        let arrowForward: Vec3 = v3();
        const emitter = this.node.getComponent(ProjectileEmitter);
        if (!emitter){
            return;
        }

        // 循环发射角色的普通攻击
        for (let i=0; i < this.actor.rungameInfo.projectileCount; i++){
            
            MathUtil.rotateAround(arrowForward, this.actor.angleInput, Vec3.UP, this._splitAngle[i]);

            let projectile = emitter.create();
            // 重置存活时间
            projectile.startTime = 0;
            // 添加发射角色
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
            // 挂点异常时回退到主角，避免子弹固定在错误坐标
            if (Vec3.distance(out, tempPlayerPos) < 6){
                return out;
            }
        }
        out.set(tempPlayerPos);
        out.y += 1.0;
        return out;
    }

    // 修改角色的子弹数量
    setProjectileCount(count: number){
        this.actor.rungameInfo.projectileCount = count;
        this._splitAngle = [];

        // 角度转弧度
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

        // 获取敌人ID
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
        // 增加经验
        const gainExp = Math.max(1, Math.floor(expReward));
        this.addExp(gainExp);
        this.applyCareerKillReward(isEliteKill, isBossKill);

        // 记录主角击杀数量
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

        if (this.playerDoKill > this.actor.rungameInfo.projectileCount * 10){
            let a  = this.actor.rungameInfo.projectileCount + 2;

            // 给主角加攻击力
            this.actor.rungameInfo.attack *= 1.2;
            
            this.setProjectileCount(a);
            
        }
    }

    /**
     * 初始化主角参数
     */
    runGameInit():RunGameInfoVo {
        if (this.actor == undefined){
            this.actor = this.node.getComponent(Actor);
        }
        this.node.setWorldPosition(Vec3.ZERO);
        this.actor.currState = ActorState.Idle;
        this.playerDoKill = 0;
        this.eliteKillCount = 0;
        this.shootTime = 0;
        this.clearEliteDrops();

        // TODO 角色初始化值
       // gameInfo.Hp = 100;
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
        this.applyCareerRole('student', true, true);
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, 1);
        this.node.emit(OnOrEmitConst.OnExpGain, this.actor.rungameInfo.exp, this.actor.rungameInfo.maxExp, this);

        return this.actor.rungameInfo;
    }

    private getExpRequirementForLevel(level: number): number{
        const lv = Math.max(1, Math.floor(level));
        if (lv <= 1){
            // Lv1 升级体感：1-3 只怪即可升级
            return 2;
        }
        if (lv === 2){
            return 3;
        }
        if (lv === 3){
            return 5;
        }
        if (lv <= 10){
            return Math.floor(5 + Math.pow(lv - 2, 1.22));
        }
        if (lv <= 25){
            return Math.floor(12 + Math.pow(lv - 7, 1.36));
        }
        // 后期继续递增，但不封顶，支持无限等级成长
        return Math.floor(30 + Math.pow(lv - 18, 1.52));
    }

    changeAttack(delta: number){
        this.actor.rungameInfo.attack = Math.max(1, this.actor.rungameInfo.attack + delta);
    }

    changeAttackInterval(delta: number){
        this.actor.rungameInfo.attackInterval = math.clamp(this.actor.rungameInfo.attackInterval + delta, 0.15, 5);
    }

    changeMoveSpeed(delta: number){
        this.actor.rungameInfo.moveSpeed = Math.max(1, this.actor.rungameInfo.moveSpeed + delta);
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
        return CareerRoleConfigs[this.careerRoleId]?.name ?? '计算机学生';
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

    getCareerMilestoneHudText(): string{
        if (this.careerRoleId === 'student'){
            return this.canSelectSpecialization()
                ? '可专职：选择前端 / 后端 / 产品 / 项目 / 测试 / 实施方向'
                : `Lv.${CareerSpecializationUnlockLevel} 解锁专职`;
        }

        const previews = this.getCareerMilestonePreviewList();
        if (previews.length <= 0){
            return '技术树已完成全部突破';
        }

        const readyItems = previews.filter((item)=> item.ready);
        if (readyItems.length > 0){
            const target = readyItems[0];
            const moreText = readyItems.length > 1 ? ` 等${readyItems.length}项` : '';
            return `可突破：${target.branch.name}·${target.milestoneTitle}${moreText}`;
        }

        const nextMilestone = previews[0];
        if (this.getSkillPoint() > 0){
            if (nextMilestone.missingBranchLevel > 0){
                return `SP 待分配：${nextMilestone.branch.name} 还差 ${nextMilestone.missingBranchLevel} 级`;
            }
            if (nextMilestone.missingSkillPoint > 0){
                return `分支已达标：再拿 ${nextMilestone.missingSkillPoint} SP 可突破`;
            }
        }

        if (nextMilestone.missingBranchLevel <= 0){
            return `下个技能点 Lv.${this.getNextSkillPointLevel()}｜${nextMilestone.branch.name} 可突破`;
        }
        return `下个技能点 Lv.${this.getNextSkillPointLevel()}｜${nextMilestone.branch.name} Lv.${nextMilestone.requiredBranchLevel}`;
    }

    getCareerBranchStatusText(): string{
        if (this.careerRoleId === 'student'){
            return '主修：待专职';
        }
        const focus = this.getCareerBranchFocusConfig();
        if (!focus){
            return '主修：未定向';
        }
        const milestoneRank = this.getCareerMilestoneRank(focus.id);
        const suffix = milestoneRank > 0 ? `｜突破 ${milestoneRank}` : '';
        return `主修：${focus.name} Lv.${this.getCareerBranchPoint(focus.id)}${suffix}`;
    }

    addCareerBranchProgress(branchId: CareerBranchId, amount: number = 1): number{
        const branch = findCareerTechBranch(this.careerRoleId, branchId);
        if (!branch){
            return 0;
        }
        const nextLevel = this.getCareerBranchPoint(branchId) + Math.max(1, Math.floor(amount));
        this.careerBranchPoints[branchId] = nextLevel;
        this.actor.rungameInfo.careerBranchId = branch.id;
        this.actor.rungameInfo.careerBranchName = branch.name;
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
                ? '双端渲染+：每轮攻击追加四向散射'
                : '双端渲染：每轮攻击追加双侧散射';
        case 'backend':
            return this.hasCareerMilestone('backend-data-4')
                ? '链路穿透+：额外穿透，精英/BOSS再增伤'
                : '链路穿透：穿透+1，精英/BOSS增伤';
        case 'product':
            return this.hasCareerMilestone('product-insight-4')
                ? '需求回流+：追踪命中更强回复'
                : '需求回流：追踪命中回复生命';
        case 'project':
            return this.hasCareerMilestone('project-risk-4')
                ? '节奏兜底+：更强减伤并压制维护负担'
                : '节奏兜底：减伤并缩短维护负担';
        case 'qa': {
            const weakspotCycle = this.hasCareerMilestone('qa-gate-4') ? 3 : 4;
            const step = this.careerShotCounter % weakspotCycle;
            const remain = step === 0 ? weakspotCycle : (weakspotCycle - step);
            const suffix = this.hasCareerMilestone('qa-gate-4') ? '（强化）' : '';
            return `缺陷放大${suffix}：再射 ${remain} 发触发弱点`;
        }
        case 'delivery':
            return this.hasCareerMilestone('delivery-support-4')
                ? '现场托底+：低血更抗压，击杀回复提升'
                : '现场托底：低血减伤，击杀回复';
        default:
            return '基础打底：专职前均衡成长';
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
        return math.clamp(base * this.attackIntervalDebuffScale, 0.15, 8);
    }

    applyMaintenanceBurden(scale: number = 1.25, duration: number = 2.4, source: string = "代码屎山"){
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
        let scale = 1;
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
        this.actor.rungameInfo.defense = Math.max(0, this.actor.rungameInfo.defense + delta);
    }

    changeMaxHp(delta: number, heal: number = 0){
        this.actor.rungameInfo.maxHp = Math.max(1, this.actor.rungameInfo.maxHp + delta);
        this.actor.rungameInfo.Hp = Math.min(this.actor.rungameInfo.maxHp, this.actor.rungameInfo.Hp + heal);
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, this.actor.rungameInfo.Hp / this.actor.rungameInfo.maxHp);
    }

    heal(healValue: number){
        this.actor.rungameInfo.Hp = Math.min(this.actor.rungameInfo.maxHp, this.actor.rungameInfo.Hp + healValue);
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, this.actor.rungameInfo.Hp / this.actor.rungameInfo.maxHp);
    }

    resetDebugStats(){
        this.runGameInit();
    }

    getDebugSummary(): string {
        const info = this.actor.rungameInfo;
        const interval = this.getCurrentAttackInterval();
        const debuff = this.attackIntervalDebuffRemain > 0
            ? `, burden=x${this.attackIntervalDebuffScale.toFixed(2)}(${this.attackIntervalDebuffRemain.toFixed(1)}s)`
            : "";
        return `role=${this.getCareerRoleName()}, passive=${this.getCareerPassiveName()}, branch=${this.getCareerBranchStatusText()}, lv=${info.level}, sp=${this.getSkillPoint()}, hp=${info.Hp.toFixed(0)}/${info.maxHp.toFixed(0)}, atk=${info.attack.toFixed(0)}, interval=${interval.toFixed(2)}, move=${info.moveSpeed.toFixed(1)}, projectile=${info.projectileCount}, pen=${this.projectilePenetration}, trace=${this.projectileTraceEnabled ? "on" : "off"}, kill=${this.playerDoKill}, elite=${this.eliteKillCount}, core=${this.eliteDrops.length}${debuff}`;
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
            return `CI 提速（攻击间隔 ${this.eliteLootAttackInterval.toFixed(2)}）`;
        }
        if (roll < 0.58){
            this.changeProjectileCount(this.eliteLootProjectile);
            return `脚手架扩展（子弹 +${this.eliteLootProjectile}）`;
        }
        if (roll < 0.74){
            this.changeProjectilePenetration(this.eliteLootPenetration);
            return `接口贯通（穿透 +${this.eliteLootPenetration}）`;
        }
        if (roll < 0.88){
            this.changeMoveSpeed(this.eliteLootMoveSpeed);
            return `工位冲刺（移速 +${this.eliteLootMoveSpeed.toFixed(1)}）`;
        }

        this.changeMaxHp(this.eliteLootMaxHp, this.eliteLootMaxHp);
        return `应急预案（最大生命 +${this.eliteLootMaxHp}，并回复 ${this.eliteLootMaxHp}）`;
    }

    private addExp(expReward: number){
        const property = this.actor.rungameInfo;
        property.exp += Math.max(1, Math.floor(expReward));
        while (property.exp >= property.maxExp){
            property.exp -= property.maxExp;
            property.level  = property.level + 1;
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
        }
        // 广播获得经验给UI系统
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

            // 漂浮动画
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
        console.log("主角死亡");

        // 发出主角死亡，让全局知道游戏结束
        director.getScene().emit(OnOrEmitConst.PlayerOnDie);
    }

    private configureProjectile(projectile: ProjectileManager, target: Node | null, useTrace: boolean, isCareerExtraShot: boolean){
        projectile.target = useTrace ? target : null;
        projectile.projectileProperty.isTrace = useTrace;
        projectile.projectileProperty.penetration = this.projectilePenetration;
        projectile.projectileProperty.lifeTime = 3.0;
        projectile.projectileProperty.damageScale = isCareerExtraShot ? 0.58 : 1;
        projectile.projectileProperty.careerProcTag = '';

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
}


