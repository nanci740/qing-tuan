export interface ChatPinSlot {row:HTMLElement;slot:HTMLElement;}
export interface ChatPinsServices {
 syncSlots():ChatPinSlot[];
 latest():HTMLElement|null;
 quote(row:HTMLElement):string;
 clearSlot(slot:HTMLElement):void;
 canOwnSlot(slot:HTMLElement):boolean;
 highlight(row:HTMLElement,enabled:boolean):void;
 scroll(row:HTMLElement):void;
}
export interface ChatPinsBridge {refresh():void;}
