import { sys } from "cc";
import { EquipmentVo } from "../data/povo/EquipmentVo";

export class DataTools {

    private static parseStoredObject(key: string): Record<string, any> | null {
        const str = sys.localStorage.getItem(key);
        if (!str || str === "{}" || str === "[]") {
            return null;
        }
        return JSON.parse(str) as Record<string, any>;
    }

    private static recordToMap<T>(record: Record<string, T> | null): Map<string, T> | null {
        if (!record) {
            return null;
        }
        const result = new Map<string, T>();
        for (const oneKey in record) {
            if (Object.prototype.hasOwnProperty.call(record, oneKey)) {
                result.set(oneKey, record[oneKey]);
            }
        }
        return result;
    }

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
        const record = this.parseStoredObject(key);
        if (record == null){
            return new Map();
        }
        return this.recordToMap<string>(record);
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
        const record = this.parseStoredObject(key);
        if (record == null){
            return new Map();
        }
        return this.recordToMap<EquipmentVo>(record);
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