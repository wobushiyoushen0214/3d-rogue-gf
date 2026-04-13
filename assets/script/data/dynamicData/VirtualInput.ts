export class VirtualInput{
    static vertical: number = 0;
    static horizontal: number = 0;
    static keyboardVertical: number = 0;
    static keyboardHorizontal: number = 0;
    static joystickVertical: number = 0;
    static joystickHorizontal: number = 0;

    static setKeyboardAxis(horizontal: number, vertical: number) {
        this.keyboardHorizontal = this.clampAxis(horizontal);
        this.keyboardVertical = this.clampAxis(vertical);
        this.refreshAxis();
    }

    static setJoystickAxis(horizontal: number, vertical: number) {
        this.joystickHorizontal = this.clampAxis(horizontal);
        this.joystickVertical = this.clampAxis(vertical);
        this.refreshAxis();
    }

    static resetKeyboardAxis() {
        this.keyboardHorizontal = 0;
        this.keyboardVertical = 0;
        this.refreshAxis();
    }

    static resetJoystickAxis() {
        this.joystickHorizontal = 0;
        this.joystickVertical = 0;
        this.refreshAxis();
    }

    private static refreshAxis() {
        const nextHorizontal = this.keyboardHorizontal + this.joystickHorizontal;
        const nextVertical = this.keyboardVertical + this.joystickVertical;
        this.horizontal = this.clampAxis(nextHorizontal);
        this.vertical = this.clampAxis(nextVertical);
    }

    private static clampAxis(value: number): number {
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.max(-1, Math.min(1, value));
    }
}
