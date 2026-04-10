export class EquipmentVo {
    // 道具名称
    private _equipmentName: string;
    public get equipmentName(): string {
        return this._equipmentName;
    }
    public set equipmentName(value: string) {
        this._equipmentName = value;
    }

    // 道具编号
    private _equipmentNo: string;
    public get equipmentNo(): string {
        return this._equipmentNo;
    }
    public set equipmentNo(value: string) {
        this._equipmentNo = value;
    }

    // 道具预设路径
    private _equipmentUri: string;
    public get equipmentUri(): string {
        return this._equipmentUri;
    }
    public set equipmentUri(value: string) {
        this._equipmentUri = value;
    }

    // 道具等级
    private _equipmentLevel: number;
    public get equipmentLevel(): number {
        return this._equipmentLevel;
    }
    public set equipmentLevel(value: number) {
        this._equipmentLevel = value;
    }

    // 血量
    private _maxHp: number = 0;
    public get maxHp(): number {
        return this._maxHp;
    }
    public set maxHp(value: number) {
        this._maxHp = value;
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
    private _moveSpeed: number = 0;
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

    // 升级回血
    private _hpAdd: number = 0;
    public get hpAdd(): number {
        return this._hpAdd;
    }
    public set hpAdd(value: number) {
        this._hpAdd = value;
    }
}


