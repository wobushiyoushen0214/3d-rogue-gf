export class RunGameInfoVo {

    // 最大血量
    private _maxHp: number = 0;
    public get maxHp(): number {
        return this._maxHp;
    }
    public set maxHp(value: number) {
        this._maxHp = value;
    }

    // 血量
    private _Hp: number = 0;
    public get Hp(): number {
        return this._Hp;
    }
    public set Hp(value: number) {
        this._Hp = value;
    }

    // 攻击力
    private _attack: number = 0;
    public get attack(): number {
        return this._attack;
    }
    public set attack(value: number) {
        this._attack = value;
    }

    // 防御力
    private _defense: number = 0;
    public get defense(): number {
        return this._defense;
    }
    public set defense(value: number) {
        this._defense = value;
    }

    // 移速
    private _moveSpeed: number = 10.0;
    public get moveSpeed(): number {
        return this._moveSpeed;
    }
    public set moveSpeed(value: number) {
        this._moveSpeed = value;
    }

    // 暴击率
    private _criticalHitRate: number = 0;
    public get criticalHitRate(): number {
        return this._criticalHitRate;
    }
    public set criticalHitRate(value: number) {
        this._criticalHitRate = value;
    }

    // 暴击值
    private _criticalStrike: number = 0.0;
    public get criticalStrike(): number {
        return this._criticalStrike;
    }
    public set criticalStrike(value: number) {
        this._criticalStrike = value;
    }

    // 技能冷却缩短
    private _cooldown: number = 0.0;
    public get cooldown(): number {
        return this._cooldown;
    }
    public set cooldown(value: number) {
        this._cooldown = value;
    }

    // 攻击间隔 单位 S 秒
    private _attackInterval: number = 0.0;
    public get attackInterval(): number {
        return this._attackInterval;
    }
    public set attackInterval(value: number) {
        this._attackInterval = value;
    }

    // 升级回血
    private _hpAdd: number = 0;
    public get hpAdd(): number {
        return this._hpAdd;
    }
    public set hpAdd(value: number) {
        this._hpAdd = value;
    }

    // 角色游戏中的等级
    private _level: number = 1;
    public get level():number{
        return this._level;
    }
    public set level(level: number){
        this._level = level;
    }

    // 经验值
    private _exp: number = 0;
    public get exp():number{
        return this._exp;
    }
    public set exp(exp: number){
        this._exp = exp;
    }

    // 升级所需经验
    private _maxExp: number = 100;
    public get maxExp():number{
        return this._maxExp;
    }
    public set maxExp(exp: number){
        this._maxExp = exp;
    }

    // 当前角色普攻数量
    private _projectileCount: number = 1;
    public get projectileCount():number{
        return this._projectileCount;
    }
    public set projectileCount(projectileCount: number){
        this._projectileCount = projectileCount;
    }

    // 当前职业 ID
    private _careerRoleId: string = "student";
    public get careerRoleId(): string {
        return this._careerRoleId;
    }
    public set careerRoleId(value: string) {
        this._careerRoleId = value;
    }

    // 当前职业名称
    private _careerRoleName: string = "计算机学生";
    public get careerRoleName(): string {
        return this._careerRoleName;
    }
    public set careerRoleName(value: string) {
        this._careerRoleName = value;
    }

    // 当前技术树主修分支 ID
    private _careerBranchId: string = "";
    public get careerBranchId(): string {
        return this._careerBranchId;
    }
    public set careerBranchId(value: string) {
        this._careerBranchId = value;
    }

    // 当前技术树主修分支名称
    private _careerBranchName: string = "";
    public get careerBranchName(): string {
        return this._careerBranchName;
    }
    public set careerBranchName(value: string) {
        this._careerBranchName = value;
    }

    // 技能点（每 5 级获得 1 点）
    private _skillPoint: number = 0;
    public get skillPoint(): number {
        return this._skillPoint;
    }
    public set skillPoint(value: number) {
        this._skillPoint = value;
    }
}


