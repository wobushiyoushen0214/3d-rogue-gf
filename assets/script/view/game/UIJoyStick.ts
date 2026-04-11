import { _decorator, Component, Node, CCFloat, director, input, Input, EventTouch, v3, math, Vec3, view } from 'cc';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { VirtualInput } from '../../data/dynamicData/VirtualInput';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
const { ccclass, property } = _decorator;

@ccclass('UIJoyStick')
export class UIJoyStick extends Component {

    @property(Node)
    private stickBg: Node = null;

    @property(Node)
    private thumbnail: Node = null;

    @property({type: CCFloat})
    radius: number = 0;

    @property({type: CCFloat})
    activeAreaMaxXRatio: number = 0.5;

    @property
    limitToLeftArea: boolean = false;

    // 控制按钮初始位置
    initPosition: Vec3 = v3();

    private activeTouchId: number = -1;
    start() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        if (this.stickBg && this.stickBg.isValid){
            this.initPosition = this.stickBg.getWorldPosition().clone();
        } else {
            this.initPosition = v3();
        }
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        this.activeTouchId = -1;
        this.resetJoystickVisual();
        this.resetVirtualInput();
    }

    update(deltaTime: number) {
        
    }

    // 识别鼠标、手指按下
    onTouchStart(eventTouch: EventTouch){
        if (!this.ensureJoystickNodes()){
            this.resetVirtualInput();
            return;
        }
        if (GameStateInput.isLoading() || GameStateInput.isGameOver() || GameStateInput.isPaused() || GameStateInput.isSelectingUpgrade()){
            this.onTouchEnd();
            return;
        }
        if (this.activeTouchId !== -1){
            return;
        }
        if (GameStateInput.isReady()){
            director.getScene()?.emit(OnOrEmitConst.OnRequestStartRun, "joystick");
        }
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        let x = eventTouch.touch.getUILocationX();
        let y = eventTouch.touch.getUILocationY();
        if (this.limitToLeftArea){
            const visibleWidth = view.getVisibleSize().width;
            const ratio = math.clamp(this.activeAreaMaxXRatio, 0, 1);
            if (x > visibleWidth * ratio){
                return;
            }
        }
        this.activeTouchId = eventTouch.touch.getID();
        // 将 staick_bg 移动到手指按下的位置
        this.stickBg.setWorldPosition(x, y, 0);
    }


    // 鼠标、手指移动
    onTouchMove(eventTouch: EventTouch){
        if (!this.ensureJoystickNodes()){
            this.resetVirtualInput();
            return;
        }
        if (!GameStateInput.canUpdateWorld()){
            this.onTouchEnd();
            return;
        }
        if (eventTouch.touch.getID() !== this.activeTouchId){
            return;
        }
        // 移动 thumbnail 的位置，并限制位置
        let x = eventTouch.touch.getUILocationX();
        let y = eventTouch.touch.getUILocationY();

        let worldPosition = v3(x, y, 0);
        let localPostion = v3();

        this.stickBg.inverseTransformPoint(localPostion, worldPosition);
        let len = localPostion.length();
        localPostion.normalize();

        localPostion.multiplyScalar(math.clamp(len, 0, this.radius));
        this.thumbnail.setPosition(localPostion);

        const radius = this.radius > 0 ? this.radius : 1;
        VirtualInput.setJoystickAxis(
            this.thumbnail.position.x / radius,
            this.thumbnail.position.y / radius,
        );
    }

    // 鼠标结束
    onTouchEnd(eventTouch: EventTouch = null){
        if (eventTouch && eventTouch.touch.getID() !== this.activeTouchId){
            return;
        }
        this.activeTouchId = -1;
        this.resetJoystickVisual();
        this.resetVirtualInput();
    }

    private ensureJoystickNodes(): boolean{
        return !!(this.stickBg && this.stickBg.isValid && this.thumbnail && this.thumbnail.isValid);
    }

    private resetJoystickVisual(){
        if (this.stickBg && this.stickBg.isValid){
            this.stickBg.setWorldPosition(this.initPosition ?? Vec3.ZERO);
        }
        if (this.thumbnail && this.thumbnail.isValid){
            this.thumbnail.setPosition(Vec3.ZERO);
        }
    }

    private resetVirtualInput(){
        VirtualInput.resetJoystickAxis();
    }
}


