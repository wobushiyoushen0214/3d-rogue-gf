import { log, Asset, assetManager, error, Node, Vec3, sp, tween, Layers, Camera, Sprite, Button, Label, ProgressBar, ScrollView, EventHandler, js, ToggleContainer, Toggle, SpriteFrame } from 'cc';

export default class Utils {
    public static checkIsToDay(time:number): boolean {

        var date = new Date(time);
        var dateNow = new Date(Utils.getServerTime());
        let bSameDay = false;

        if (date.getFullYear() == dateNow.getFullYear() &&
            date.getMonth() == dateNow.getMonth() &&
            date.getDate() == dateNow.getDate()
        ) {
            bSameDay = true;
        }
        return bSameDay;
    }


    public static getRandom(lower, upper): number {
        return Math.random() * (upper - lower) + lower;
    };

    public static getRandomInt(lower, upper): number {
        return Math.floor(Math.random() * (upper - lower)) + lower;
    };

    public static seed: number = 5;

    public static seedRandom(): number {
        return Utils.getRandom(0, 1);
    }

    public static seedRandomInt(lower, upper): number {
        return Utils.getRandomInt(lower, upper);
    }

    public static getPowNum(p) {
        return Math.pow(10, p);
    };

    public static setServerTime(time: number) {
        Utils.timeOffset = time - new Date().getTime();
        log("timeOffset:", Utils.timeOffset)
    }

    public static timeOffset: number = 0;
    public static getServerTime() {
        return new Date().getTime() + Utils.timeOffset;
    }

    static formatDate(t) {
        var date = new Date(t);
        var YY = date.getFullYear() + '-';
        var MM = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
        var DD = (date.getDate() < 10 ? '0' + (date.getDate()) : date.getDate());
        var hh = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
        var mm = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
        var ss = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());
        return YY + MM + DD + " " + hh + mm + ss;
    }

    public static cloneObj(obj: any) {
        obj = JSON.stringify(obj);
        obj = JSON.parse(obj);
        return obj;
    }

    public static getTimeStrByS(second: number) {
        second = Math.floor(second);
        if (second < 0) second = 0;
        var d = Math.floor(second / 3600 / 24);
        second -= d * 3600 * 24;
        var h = Math.floor(second / 3600);
        second -= h * 3600;
        var m = Math.floor(second / 60);
        second -= m * 60;
        var front = "00";
        if (h > 9) {
            front = "" + h;
        } else {
            front = "0" + h;
        }
        var mid = "00";
        if (m > 9) {
            mid = "" + m;
        } else {
            mid = "0" + m;
        }
        var back = "00";
        if (second > 9) {
            back = "" + second;
        } else {
            back = "0" + second;
        }

        if (d > 0) {
            return d + "天" + h + "时" + m + "分";
        }
        else {
            var longTime = h > 0;
            if (longTime) {
                return front + ":" + mid ;
            } else {
                return mid + ":" + back ;//+ '秒';
            }
        }
    }

    public static getClockStrByS(second: number,showsecond:boolean = true,showhour:boolean = true) {
        second = Math.floor(second);
        if (second < 0) second = 0;
        var h = Math.floor(second / 3600);
        second -= h * 3600;
        var m = Math.floor(second / 60);
        second -= m * 60;
        var front = "00";
        if (h > 9) {
            front = "" + h;
        } else {
            front = "0" + h;
        }
        var mid = "00";
        if (m > 9) {
            mid = "" + m;
        } else {
            mid = "0" + m;
        }

        let str = ""
        if(showhour)
        {
            str += front;
            str += ":" 
        }
        str += mid;
    
        if(showsecond)
            str += ":" + (second<10?"0":"")+second;

            return str
    }

    public static checkObjEmpty(obj: any) {
        if (obj) {
            for (var i in obj) {
                return false;
            }
            return true;
        } else {
            return true;
        }
    }

    public static checkOrderOver(orderTime: number) {
        var date = new Date(orderTime);
        var dateNow = new Date(Utils.getServerTime());

        if (date.getFullYear() == dateNow.getFullYear() &&
            date.getMonth() == dateNow.getMonth() &&
            date.getDate() == dateNow.getDate()
        ) {
            return false;
        } else {
            return true;
        }
    }

    public static loadBundler(name:string)
    {
        return new Promise((resolve,reject)=>{
            assetManager.loadBundle(name,(err,ret)=>{
                console.log(ret)
                resolve(null);
            })
        })
    }

    public static loadRes(path: string, type: typeof Asset,callback:any=null) {
        return new Promise((resolve, reject) => {
            let bundel = "resources";
            let arr = path.split(":")
            if(arr.length == 2)
            {
                bundel = arr[0];
                path = arr[1];
            }

            if(type == SpriteFrame)
            {
                path += "/spriteFrame";
            }

            let ret = assetManager.getBundle(bundel).get(path,type);
            if(ret)
            {
                if(callback)
                    callback(null,ret);
                resolve(ret);
                return;
            }

            // console.log(bundel,path);
            assetManager.getBundle(bundel).load(path,type,(err,ret)=>{
                if (err) {
                    error(path, err);
                    callback(err,null);
                    reject(null);
                }
                else {
                    if(callback)
                        callback(null,ret);
                    resolve(ret);
                }
            });
        })
    }

    public static weight(v: number[]): number {
        var mTotalWeight = 0;
        for (var i = 0; i < v.length; ++i) {
            mTotalWeight += v[i];
        }
        if (mTotalWeight <= 0) return -1;
        var randnum = Math.round(Math.random() * Number.MAX_VALUE) % mTotalWeight;
        for (var i = 0; i < v.length; ++i) {
            if (randnum < v[i]) {
                return i;
            }
            else {
                randnum -= v[i];
            }
        }
        return -1;
    }

    public static shuffle(arr:any[]) {
        for (let i = arr.length - 1; i >= 0; i--) {
            let rIndex = Math.floor(Math.random() * (i + 1));
            let temp = arr[rIndex];
            arr[rIndex] = arr[i];
            arr[i] = temp;
        }
        return arr;
    }

    public static getDate(time: number): string {
        var now = new Date(time),
            y = now.getFullYear(),
            m = now.getMonth() + 1,
            d = now.getDate();
        return y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d) + " " + now.toTimeString().substr(0, 8);
    }

    //货币进位
    public static goldCrarryBit(gold: number): string {

        var array = [
            [100000000, 'N'],
            [10000000, 'T'],
            [1000000, 'G'],
            [100000, 'M'],
            [10000, 'K'],
            [1000, 'B'],
        ];
        for (var i = 0; i < array.length; i++) {
            var value = gold / (array[i][0] as number);
            if (value > 1) {
                return '' + value.toFixed(1) + array[i][1];
            }
        }
        return gold.toString();
    }
    //定点数
    public static fixFloat(val: number, count: number = 2) {
        var a =Math.pow(10,count)
        return Math.floor(val * a) / a;
    }

    public static WorldToScreen2(camera:Camera, point:Vec3)
    {
        let p:Vec3 = new Vec3();
        camera.worldToScreen(point,p)
        return p;
    }


    static formatString(s: string, ...arg: string[]) {

        for (var i = 0; i < arg.length; i++) {
            var reg = new RegExp("\\{" + i + "\\}", "gm");
            s = s.replace(reg, arg[i]);
        }
        return s;
    }

    static count(obj:any) {
        if (!obj) return 0;
        var num = 0;
        for (var k in obj) {
            num++;
        }
        return num;
    };
    static getStrNum(str: string): number {
        var num = str.replace(/[^0-9]/ig, "");
        return parseInt(num)
    }
    static copy(obj:any) {
        var newObj = Object.create(obj);
        Object.assign(newObj, obj);
        return newObj;
    }

    static async playSkAni(file: string, name: string, parent: Node, pos: Vec3, removetime: number = -1) {
        var node = new Node()
        node.parent = parent;
        node.position = pos;
        node.layer = Layers.BitMask.UI_2D;
        var skd = node.addComponent(sp.Skeleton);
        var data = await Utils.loadRes(file, sp.SkeletonData) as sp.SkeletonData;
        skd.skeletonData = data;
        skd.setAnimation(0, name, false);
        if (removetime != -1) {
            tween(node).delay(removetime).call(()=>{
                node.removeFromParent();
                node.destroy();
            }).start();
        }
        return node;
    }
     //自动绑定属性
    //组件前缀Sprite-sp,Label-txt,Button-btn,ScrollView-sv,ProgressBar-progress,
    static autoBindProperty(node: Node, context) {
        let name = node.name
        let nameList = name.split('_')
        if (nameList.length > 1) {
            let prex = nameList[0]
            if (prex == 'sp') {
                context[name] = node.getComponent(Sprite);
            } else if (prex == 'txt') {
                context[name] = node.getComponent(Label);
            } else if (prex == 'btn') {
                console.log(name)
                context[name] = node.getComponent(Button);
                if (context[name]) {
                    let eventHandler = new EventHandler();                    
                    eventHandler.target = context.node;
                    eventHandler.component = js.getClassName(context);
                    eventHandler.handler = 'onButtonClick';
                    eventHandler.customEventData = name;

                    let clickEvents = node.getComponent(Button).clickEvents;
                    clickEvents.push(eventHandler);
                }
            } else if (prex == 'progress') {
                context[name] = node.getComponent(ProgressBar);
            } else if (prex == 'sv') {
                context[name] = node.getComponent(ScrollView);
            } else if (prex == 'skel') {
                context[name] = node.getComponent(sp.Skeleton);
            }
            else if(prex == "tgc")
            {
                context[name] = node.getComponent(ToggleContainer);
            } 
            else if(prex == "tg")
            {
                context[name] = node.getComponent(Toggle);
                if (context[name]) {
                    let eventHandler = new EventHandler();                    
                    eventHandler.target = context.node;
                    eventHandler.component = js.getClassName(context);
                    eventHandler.handler = 'onButtonClick';
                    eventHandler.customEventData = name;
                    let checkEvents = node.getComponent(Toggle).checkEvents;
                    checkEvents.push(eventHandler);
                }
            } 
            else if(prex=='node') {
                context[name] = node
            }
        } else {
            //this[name] = node
        }
        if (node.children.length == 0) return
        for (var i = 0; i < node.children.length; ++i) {
            var tmp = node.children[i]
            Utils.autoBindProperty(tmp, context)
        }
    }
};