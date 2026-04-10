export class ProjectileProperty{
    
    // 子弹是否有追踪效果
    isTrace: boolean = false;
    
    // 子弹存活时间
    lifeTime: number = 3.0;

    // 子弹穿透值
    penetration: number = 0;

    // 子弹额外伤害倍率
    damageScale: number = 1;

    // 子弹职业触发标签
    careerProcTag: string = "";


}
