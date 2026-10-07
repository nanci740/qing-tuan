export interface ChatComposerServices {currentKey():string;voiceReady():boolean;send():void;inputDelay():void;}
export interface ChatComposerApi {hasField():boolean;text():string;focus():void;resize():void;load():void;sentText():void;read(key?:string):string;erase(key:unknown):void;}
