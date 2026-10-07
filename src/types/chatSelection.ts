export type SelectionTool = 'cancel' | 'search' | 'forward' | 'copy' | 'favorite' | 'delete';
export interface ChatSelectionServices {
 host:HTMLElement;
 rows():HTMLElement[];clear():void;search():void;
 quote(row:HTMLElement):string;favorite(row:HTMLElement):boolean;setFavorite(row:HTMLElement,value:boolean):void;
 copy(text:string):Promise<void>;forward(rows:HTMLElement[]):void;remove(rows:HTMLElement[]):Promise<void>;
 notice(text:string):void;error(error:unknown):string;
}
export interface MessageSelectionServices {
 list:HTMLDivElement|null;
 allRows():HTMLElement[];selected(row:HTMLElement):boolean;
 setSelected(row:HTMLElement,value:boolean):void;clearSelected():void;
 refreshGroups():void;notice(text:string):void;
}
export interface MessageSelectionApi {
 active():boolean;rows():HTMLElement[];begin(row?:HTMLElement):void;clear():void;longPress(row:HTMLElement):boolean;
}
