export type CareerRoleId =
    | 'student'
    | 'frontend'
    | 'backend'
    | 'product'
    | 'project'
    | 'qa'
    | 'delivery';

export type CareerRolePerks = {
    attack?: number;
    attackInterval?: number;
    projectileCount?: number;
    penetration?: number;
    moveSpeed?: number;
    defense?: number;
    maxHp?: number;
    heal?: number;
    trace?: boolean;
};

export type CareerRoleConfig = {
    id: CareerRoleId;
    name: string;
    shortName: string;
    intro: string;
    specialty: string;
    passiveName: string;
    passiveDesc: string;
    techStacks: string[];
    basePerks: CareerRolePerks;
};

export const CareerSpecializationUnlockLevel = 3;

export const CareerRoleConfigs: Record<CareerRoleId, CareerRoleConfig> = {
    student: {
        id: 'student',
        name: '计算机学生',
        shortName: '学生',
        intro: '开局通用职业，先打基础，再决定专职方向。',
        specialty: '基础均衡，适合过渡到任意技术岗位。',
        passiveName: '基础打底',
        passiveDesc: '提供稳定基础属性，作为专职前的过渡阶段。',
        techStacks: ['数据结构', '计算机网络', '操作系统'],
        basePerks: {
            attack: 4,
            attackInterval: -0.03,
            trace: true,
        },
    },
    frontend: {
        id: 'frontend',
        name: '前端工程师',
        shortName: '前端',
        intro: '高频输出与范围清场担当，擅长快速反馈。',
        specialty: '攻速快、弹道多、机动性强。',
        passiveName: '双端渲染',
        passiveDesc: '每轮攻击追加双侧散射补刀，形成更强弹幕覆盖。',
        techStacks: ['TypeScript', 'Vue', 'React', 'Vite'],
        basePerks: {
            attackInterval: -0.10,
            projectileCount: 1,
            moveSpeed: 0.5,
            trace: true,
        },
    },
    backend: {
        id: 'backend',
        name: '后端工程师',
        shortName: '后端',
        intro: '稳态输出核心，擅长单体爆发与链路穿透。',
        specialty: '攻击高、穿透强、生存稳。',
        passiveName: '链路穿透',
        passiveDesc: '投射物自带额外穿透，对精英和 Boss 造成更高伤害。',
        techStacks: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
        basePerks: {
            attack: 14,
            penetration: 1,
            maxHp: 12,
            defense: 1,
        },
    },
    product: {
        id: 'product',
        name: '产品经理',
        shortName: '产品',
        intro: '偏增益与控场，擅长规划节奏和目标优先级。',
        specialty: '续航强，辅助型成长明显。',
        passiveName: '需求回流',
        passiveDesc: '追踪命中可稳定回复生命，越能贴近目标越稳。',
        techStacks: ['PRD', 'Figma', 'Axure', 'A/B Test'],
        basePerks: {
            attack: 6,
            maxHp: 18,
            heal: 18,
            moveSpeed: 0.3,
        },
    },
    project: {
        id: 'project',
        name: '项目经理',
        shortName: '项目',
        intro: '擅长降冷却与团队节奏管理，能顶住复杂局面。',
        specialty: '均衡增益，容错高。',
        passiveName: '节奏兜底',
        passiveDesc: '受到伤害更低，且维护负担持续时间更短。',
        techStacks: ['Scrum', 'Kanban', 'Jira', '风险管理'],
        basePerks: {
            attackInterval: -0.06,
            defense: 1,
            moveSpeed: 0.5,
            maxHp: 10,
        },
    },
    qa: {
        id: 'qa',
        name: '测试工程师',
        shortName: '测试',
        intro: '擅长找弱点、打穿透、施加质量压制。',
        specialty: '破甲强，节奏快，克制高压目标。',
        passiveName: '缺陷放大',
        passiveDesc: '每第 4 发触发弱点打击，显著提高单发伤害与穿透。',
        techStacks: ['Python', 'Selenium', 'Cypress', 'JMeter'],
        basePerks: {
            attack: 10,
            attackInterval: -0.05,
            penetration: 1,
        },
    },
    delivery: {
        id: 'delivery',
        name: '实施顾问',
        shortName: '实施',
        intro: '生存与支援能力最强，适合抗压推进。',
        specialty: '防御高、恢复强、站得住。',
        passiveName: '现场托底',
        passiveDesc: '低血量时减伤更高，击杀目标后获得额外恢复。',
        techStacks: ['ERP/CRM', 'SQL', 'Linux', 'API 集成'],
        basePerks: {
            maxHp: 22,
            heal: 20,
            defense: 2,
            moveSpeed: 0.2,
        },
    },
};

export const CareerSpecializationOrder: CareerRoleId[] = [
    'frontend',
    'backend',
    'product',
    'project',
    'qa',
    'delivery',
];
