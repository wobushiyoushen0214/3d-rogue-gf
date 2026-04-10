import { CareerRoleId } from './CareerConfig';

export type CareerBranchId = string;

export type CareerTechBranchConfig = {
    id: CareerBranchId;
    roleId: CareerRoleId;
    name: string;
    shortName: string;
    intro: string;
};

export const CareerTechTreeConfigs: Record<CareerRoleId, CareerTechBranchConfig[]> = {
    student: [],
    frontend: [
        { id: 'frontend-component', roleId: 'frontend', name: '组件化流', shortName: '组件化', intro: '偏向多弹道、覆盖面和稳定清怪。' },
        { id: 'frontend-engineering', roleId: 'frontend', name: '工程化流', shortName: '工程化', intro: '偏向节奏提速、连续输出和跑图效率。' },
        { id: 'frontend-performance', roleId: 'frontend', name: '性能优化流', shortName: '性能优化', intro: '偏向单次强化和弹幕质量提升。' },
    ],
    backend: [
        { id: 'backend-service', roleId: 'backend', name: '服务治理流', shortName: '服务治理', intro: '偏向稳定伤害、容错和链路治理。' },
        { id: 'backend-data', roleId: 'backend', name: '数据链路流', shortName: '数据链路', intro: '偏向穿透、回转和持续输出。' },
        { id: 'backend-concurrency', roleId: 'backend', name: '高并发流', shortName: '高并发', intro: '偏向爆发伤害与高压场景对抗。' },
    ],
    product: [
        { id: 'product-insight', roleId: 'product', name: '需求洞察流', shortName: '需求洞察', intro: '偏向追踪、续航和目标识别。' },
        { id: 'product-design', roleId: 'product', name: '方案设计流', shortName: '方案设计', intro: '偏向身板、调度和综合成长。' },
        { id: 'product-growth', roleId: 'product', name: '增长实验流', shortName: '增长实验', intro: '偏向攻速、投射物和成长提速。' },
    ],
    project: [
        { id: 'project-schedule', roleId: 'project', name: '计划排期流', shortName: '计划排期', intro: '偏向冷却、攻防和节奏压缩。' },
        { id: 'project-risk', roleId: 'project', name: '风险管理流', shortName: '风险管理', intro: '偏向防御、回复和复杂局面托底。' },
        { id: 'project-collab', roleId: 'project', name: '协作机制流', shortName: '协作机制', intro: '偏向机动、覆盖和多线推进。' },
    ],
    qa: [
        { id: 'qa-automation', roleId: 'qa', name: '自动化流', shortName: '自动化', intro: '偏向追踪、连续回归和覆盖率。' },
        { id: 'qa-performance', roleId: 'qa', name: '性能压测流', shortName: '性能压测', intro: '偏向重击、频率和压力测试。' },
        { id: 'qa-gate', roleId: 'qa', name: '质量门禁流', shortName: '质量门禁', intro: '偏向穿透、卡点和质量压制。' },
    ],
    delivery: [
        { id: 'delivery-deploy', roleId: 'delivery', name: '部署交付流', shortName: '部署交付', intro: '偏向身板、容错和稳定推进。' },
        { id: 'delivery-adaptation', roleId: 'delivery', name: '业务适配流', shortName: '业务适配', intro: '偏向输出、补血和持续作战。' },
        { id: 'delivery-support', roleId: 'delivery', name: '现场支援流', shortName: '现场支援', intro: '偏向应急机动、防守和残局处理。' },
    ],
};

export function findCareerTechBranch(roleId: CareerRoleId, branchId: CareerBranchId): CareerTechBranchConfig | null {
    return CareerTechTreeConfigs[roleId].find((item)=> item.id === branchId) ?? null;
}
