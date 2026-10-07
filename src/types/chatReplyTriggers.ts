export interface ChatReplyTriggerServices {currentKey():string;recording():boolean;configured():boolean;reply():Promise<unknown>;}
export interface ChatReplyTriggerApi {schedule():void;input():void;flush(nextKey:unknown):void;setDelay(value:unknown):void;}
