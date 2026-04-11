import { CareerRoleId, CareerRolePerks } from './CareerConfig';

export type CareerBranchId = string;
export type CareerMilestoneId = string;

export type CareerTechMilestoneConfig = {
    id: CareerMilestoneId;
    requiredBranchLevel: number;
    costSkillPoint: number;
    title: string;
    desc: string;
    perks: CareerRolePerks;
};

export type CareerTechBranchConfig = {
    id: CareerBranchId;
    roleId: CareerRoleId;
    name: string;
    shortName: string;
    intro: string;
    milestones: CareerTechMilestoneConfig[];
};

export const CareerTechTreeConfigs: Record<CareerRoleId, CareerTechBranchConfig[]> = {
    student: [],
    frontend: [
        {
            id: 'frontend-component',
            roleId: 'frontend',
            name: '组件化流',
            shortName: '组件化',
            intro: '偏向多弹道、广覆盖和稳定清怪。',
            milestones: [
                { id: 'frontend-component-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '组件复用', desc: '子弹 +1，攻击 +6。', perks: { projectileCount: 1, attack: 6 } },
                { id: 'frontend-component-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '微前端联调', desc: '追加更外侧的散射补刀，并额外获得子弹 +1。', perks: { projectileCount: 1 } },
            ],
        },
        {
            id: 'frontend-engineering',
            roleId: 'frontend',
            name: '工程化流',
            shortName: '工程化',
            intro: '偏向节奏提速、连续输出和跑图效率。',
            milestones: [
                { id: 'frontend-engineering-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '构建提速', desc: '攻击间隔 -0.08 秒，移速 +0.4。', perks: { attackInterval: -0.08, moveSpeed: 0.4 } },
                { id: 'frontend-engineering-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '流水线稳定', desc: '攻击 +8，攻击间隔 -0.08 秒。', perks: { attack: 8, attackInterval: -0.08 } },
            ],
        },
        {
            id: 'frontend-performance',
            roleId: 'frontend',
            name: '性能优化流',
            shortName: '性能优化',
            intro: '偏向单发强化和弹幕质量提升。',
            milestones: [
                { id: 'frontend-performance-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '首屏优化', desc: '攻击 +12，穿透 +1。', perks: { attack: 12, penetration: 1 } },
                { id: 'frontend-performance-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '渲染压榨', desc: '攻击 +18，子弹 +1。', perks: { attack: 18, projectileCount: 1 } },
            ],
        },
    ],
    backend: [
        {
            id: 'backend-service',
            roleId: 'backend',
            name: '服务治理流',
            shortName: '服务治理',
            intro: '偏向稳定伤害、容错和链路治理。',
            milestones: [
                { id: 'backend-service-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '熔断兜底', desc: '最大生命 +14，防御 +1。', perks: { maxHp: 14, defense: 1 } },
                { id: 'backend-service-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '服务发现', desc: '攻击 +12，防御 +1，最大生命 +10。', perks: { attack: 12, defense: 1, maxHp: 10 } },
            ],
        },
        {
            id: 'backend-data',
            roleId: 'backend',
            name: '数据链路流',
            shortName: '数据链路',
            intro: '偏向穿透、回转和持续输出。',
            milestones: [
                { id: 'backend-data-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '缓存穿透治理', desc: '穿透 +1，攻击 +8。', perks: { penetration: 1, attack: 8 } },
                { id: 'backend-data-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '链路追踪', desc: '投射物额外穿透，并且对精英和 Boss 伤害更高。', perks: { penetration: 1, attack: 8 } },
            ],
        },
        {
            id: 'backend-concurrency',
            roleId: 'backend',
            name: '高并发流',
            shortName: '高并发',
            intro: '偏向爆发伤害和高压场景对抗。',
            milestones: [
                { id: 'backend-concurrency-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '削峰填谷', desc: '攻击 +14，攻击间隔 -0.05 秒。', perks: { attack: 14, attackInterval: -0.05 } },
                { id: 'backend-concurrency-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '异步解耦', desc: '攻击 +18，最大生命 +12。', perks: { attack: 18, maxHp: 12 } },
            ],
        },
    ],
    product: [
        {
            id: 'product-insight',
            roleId: 'product',
            name: '需求洞察流',
            shortName: '需求洞察',
            intro: '偏向追踪、续航和目标识别。',
            milestones: [
                { id: 'product-insight-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '用户画像', desc: '攻击 +6，回复 8，并开启追踪弹。', perks: { attack: 6, heal: 8, trace: true } },
                { id: 'product-insight-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '优先级排序', desc: '追踪命中回流增强，高压目标触发更高回复。', perks: { attack: 8, maxHp: 12 } },
            ],
        },
        {
            id: 'product-design',
            roleId: 'product',
            name: '方案设计流',
            shortName: '方案设计',
            intro: '偏向身板、调度和综合成长。',
            milestones: [
                { id: 'product-design-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '验收标准', desc: '最大生命 +14，防御 +1。', perks: { maxHp: 14, defense: 1 } },
                { id: 'product-design-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '方案评审', desc: '攻击 +8，最大生命 +18。', perks: { attack: 8, maxHp: 18 } },
            ],
        },
        {
            id: 'product-growth',
            roleId: 'product',
            name: '增长实验流',
            shortName: '增长实验',
            intro: '偏向攻速、投射物和成长提速。',
            milestones: [
                { id: 'product-growth-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '留存实验', desc: '攻击间隔 -0.06 秒，子弹 +1。', perks: { attackInterval: -0.06, projectileCount: 1 } },
                { id: 'product-growth-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '漏斗优化', desc: '攻击 +10，攻击间隔 -0.08 秒。', perks: { attack: 10, attackInterval: -0.08 } },
            ],
        },
    ],
    project: [
        {
            id: 'project-schedule',
            roleId: 'project',
            name: '排期管理流',
            shortName: '排期管理',
            intro: '偏向冷却、攻防和节奏压缩。',
            milestones: [
                { id: 'project-schedule-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '关键路径', desc: '攻击间隔 -0.08 秒，攻击 +8。', perks: { attackInterval: -0.08, attack: 8 } },
                { id: 'project-schedule-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '里程碑压缩', desc: '攻击 +12，移速 +0.5。', perks: { attack: 12, moveSpeed: 0.5 } },
            ],
        },
        {
            id: 'project-risk',
            roleId: 'project',
            name: '风险管理流',
            shortName: '风险管理',
            intro: '偏向防御、回复和复杂局面托底。',
            milestones: [
                { id: 'project-risk-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '风险前置', desc: '防御 +1，最大生命 +16。', perks: { defense: 1, maxHp: 16 } },
                { id: 'project-risk-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '预案演练', desc: '维护负担进一步减弱，低血量时减伤更强。', perks: { defense: 1, maxHp: 14, heal: 14 } },
            ],
        },
        {
            id: 'project-collab',
            roleId: 'project',
            name: '协作推进流',
            shortName: '协作推进',
            intro: '偏向机动、覆盖和多线推进。',
            milestones: [
                { id: 'project-collab-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '跨组同步', desc: '子弹 +1，移速 +0.6。', perks: { projectileCount: 1, moveSpeed: 0.6 } },
                { id: 'project-collab-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '阻塞清除', desc: '攻击间隔 -0.05 秒，子弹 +1。', perks: { attackInterval: -0.05, projectileCount: 1 } },
            ],
        },
    ],
    qa: [
        {
            id: 'qa-automation',
            roleId: 'qa',
            name: '自动化流',
            shortName: '自动化',
            intro: '偏向追踪、持续回归和覆盖率。',
            milestones: [
                { id: 'qa-automation-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '回归矩阵', desc: '攻击间隔 -0.06 秒，并开启追踪弹。', perks: { attackInterval: -0.06, trace: true } },
                { id: 'qa-automation-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '自动巡检', desc: '子弹 +1，攻击 +10。', perks: { projectileCount: 1, attack: 10 } },
            ],
        },
        {
            id: 'qa-performance',
            roleId: 'qa',
            name: '压测分析流',
            shortName: '压测分析',
            intro: '偏向重击、频率和压力测试。',
            milestones: [
                { id: 'qa-performance-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '瓶颈定位', desc: '攻击 +14，攻击间隔 -0.05 秒。', perks: { attack: 14, attackInterval: -0.05 } },
                { id: 'qa-performance-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '极限压测', desc: '攻击 +18，穿透 +1。', perks: { attack: 18, penetration: 1 } },
            ],
        },
        {
            id: 'qa-gate',
            roleId: 'qa',
            name: '质量门禁流',
            shortName: '质量门禁',
            intro: '偏向穿透、卡点和质量压制。',
            milestones: [
                { id: 'qa-gate-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '质量红线', desc: '穿透 +1，攻击 +8。', perks: { penetration: 1, attack: 8 } },
                { id: 'qa-gate-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '发布门禁', desc: '弱点射击改为每 3 发一次，并且弱点伤害和穿透更高。', perks: { penetration: 1, attack: 8 } },
            ],
        },
    ],
    delivery: [
        {
            id: 'delivery-deploy',
            roleId: 'delivery',
            name: '部署交付流',
            shortName: '部署交付',
            intro: '偏向身板、容错和稳定推进。',
            milestones: [
                { id: 'delivery-deploy-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '灰度发布', desc: '最大生命 +16，防御 +1。', perks: { maxHp: 16, defense: 1 } },
                { id: 'delivery-deploy-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '回滚预案', desc: '最大生命 +20，并回复 20。', perks: { maxHp: 20, heal: 20 } },
            ],
        },
        {
            id: 'delivery-adaptation',
            roleId: 'delivery',
            name: '业务适配流',
            shortName: '业务适配',
            intro: '偏向输出、补血和持续作战。',
            milestones: [
                { id: 'delivery-adaptation-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '业务落地', desc: '攻击 +10，并回复 12。', perks: { attack: 10, heal: 12 } },
                { id: 'delivery-adaptation-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '流程适配', desc: '攻击 +14，子弹 +1。', perks: { attack: 14, projectileCount: 1 } },
            ],
        },
        {
            id: 'delivery-support',
            roleId: 'delivery',
            name: '现场支援流',
            shortName: '现场支援',
            intro: '偏向应急机动、防守和残局处理。',
            milestones: [
                { id: 'delivery-support-2', requiredBranchLevel: 2, costSkillPoint: 1, title: '现场排障', desc: '移速 +0.6，防御 +1。', perks: { moveSpeed: 0.6, defense: 1 } },
                { id: 'delivery-support-4', requiredBranchLevel: 4, costSkillPoint: 1, title: '驻场托底', desc: '低血量托底更强，击杀回复进一步提升。', perks: { defense: 1, maxHp: 14, heal: 14 } },
            ],
        },
    ],
};

export function findCareerTechBranch(roleId: CareerRoleId, branchId: CareerBranchId): CareerTechBranchConfig | null {
    return CareerTechTreeConfigs[roleId].find((item) => item.id === branchId) ?? null;
}

export function findCareerTechMilestone(roleId: CareerRoleId, branchId: CareerBranchId, milestoneId: CareerMilestoneId): CareerTechMilestoneConfig | null {
    return findCareerTechBranch(roleId, branchId)?.milestones.find((item) => item.id === milestoneId) ?? null;
}