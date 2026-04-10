import { Camera, Vec3, Node, UITransform} from "cc";

export default class ConversionPostionUtil{

    /**
     * 
     * @param WorldPosition3D       需要转换成2D屏幕坐标的3D世界坐标
     * @param masterCamera3D        3D主摄像机
     * @param uiCamera              UI摄像机
     * @param parentNode            2D目标节点的父节点，父节点需要用户 UITransform
     * @return                      如果参数不正确，返回0点坐标
     */
    public static ConversionTo2D(WorldPosition3D: Vec3, parentNode: Node, masterCamera3D: Camera, uiCamera: Camera):Vec3 {
        if (WorldPosition3D == undefined || parentNode == undefined || masterCamera3D == undefined || uiCamera == undefined){
            return Vec3.ZERO;
        }
        // var secnePos = masterCamera3D.worldToScreen(WorldPosition3D);

        // // 屏幕坐标转世界坐标
        // var wPos = uiCamera.screenToWorld(secnePos);
        // var pos = parentNode.getComponent(UITransform).convertToNodeSpaceAR(wPos);        
        // return pos;
        return parentNode.getComponent(UITransform).convertToNodeSpaceAR(
            uiCamera.screenToWorld(masterCamera3D.worldToScreen(WorldPosition3D))
        );
    }
}