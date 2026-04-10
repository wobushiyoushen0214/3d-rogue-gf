import { sys } from "cc";
import { EquipmentVo } from "../data/povo/EquipmentVo";

export class DataTools {

    static setString(key: string, value: string){
        sys.localStorage.setItem(key, value);
    }

    static getString(key: string): string {
        let str = sys.localStorage.getItem(key);
        if (str){
            return str;
        }
        return null;
    }

    static setFloat(key: string, value: number){
        sys.localStorage.setItem(key, value.toString());
    }

    static getFloat(key: string): number {
        let str = sys.localStorage.getItem(key);
        if (str){
            return Number.parseFloat(str);
        }
        return null;
    }

    static setInt(key: string, value: number){
        sys.localStorage.setItem(key, value.toString());
    }

    static getInt(key: string): number {
        let str = sys.localStorage.getItem(key);
        if (str){
            return Number.parseInt(str);
        }
        return null;
    }

    static getMap(key: string): Map<string, string> {
        let str = sys.localStorage.getItem(key);
        if (str){
            if ("{}" == str){
                return new Map();
            }
            var a = new Map<string,string>(Object.entries(JSON.parse(str)));
            return a;
        }
        return null;
    }

    static setMap(key: string, value: Map<string, string>){
        if(value == undefined){
            return;
        }
        var a = JSON.stringify(
            Array.from(value.entries())
            .reduce((o, [key, value]) => { 
              o[key] = value; 
              return o; 
            }, {})
        );
        sys.localStorage.setItem(key, a);
    }

    static getMapByApparel(key: string): Map<string, EquipmentVo> {
        let str = sys.localStorage.getItem(key);
        if (str){
            if ("{}" == str){
                return new Map();
            }
            var a = new Map<string,EquipmentVo>(Object.entries(JSON.parse(str)));
            return a;
        }
        return null;
    }

    static setObjectArr(key: string, object: Object[]){
        sys.localStorage.setItem(key, JSON.stringify(object));
    }

    static getObjectArr(key:string){
        let str = sys.localStorage.getItem(key);
        if (str){
            if ("[]" == str){
                return [];
            }
            var a = JSON.parse(str);
            return a;
        }
        return null;
    }

    static setObject(key: string, object: Object){
        sys.localStorage.setItem(key, JSON.stringify(object));
    }

    static getObject(key:string, object: object){
        let str = sys.localStorage.getItem(key);
        if (str){
            if ("[]" == str){
                return [];
            }
            var jsonData = JSON.parse(str);
            return Object.assign(object, jsonData);
        }
        return null;
    }

    
}