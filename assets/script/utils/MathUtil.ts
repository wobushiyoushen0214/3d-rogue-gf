import { ForwardFlow, v3, Vec3 } from "cc";

let temp:Vec3 = v3();
let temp2:Vec3 = v3();
let temp3:Vec3 = v3();
export class MathUtil {
    static rotateToward(out: Vec3, form:Vec3, to:Vec3, maxAnglDelta:number) {
        Vec3.cross(temp, form, to);
        this.rotateAround(out, form, temp, maxAnglDelta);
    }

    /**
     * 罗德里得旋转公式
     * @param out           输出结果
     * @param foward        当前向量朝向
     * @param axis          旋转轴，需要绕某个轴旋转
     * @param maxAngleDelta 旋转的角度值
     */
    static rotateAround(out: Vec3, foward: Vec3, axis: Vec3, maxAngleDelta:number){
        const cos = Math.cos(maxAngleDelta);
        const sin = Math.sin(maxAngleDelta);
        Vec3.multiplyScalar(temp, foward, cos);
        Vec3.cross(temp2, axis, foward);

        Vec3.scaleAndAdd(temp3, temp, temp2, sin);

        const dot = Vec3.dot(axis, foward);
        Vec3.scaleAndAdd(out, temp3, axis, dot*(1.0-cos));

    }

    static signAngle(from:Vec3, to:Vec3, axis: Vec3): number{
        if (from.lengthSqr() <= 0.000001 || to.lengthSqr() <= 0.000001){
            return 0;
        }
        const angle = Vec3.angle(from, to);
        if (!Number.isFinite(angle)){
            return 0;
        }

        let corss = v3();
        Vec3.cross(corss, from, to);

        const sign = Math.sign(corss.x * axis.x + corss.y * axis.y + corss.z * axis.z);

        // 得到带符号的夹角
        return angle * sign; 
    }
}
