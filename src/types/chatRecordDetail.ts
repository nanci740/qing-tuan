export interface ForwardRecordItem {side?:unknown;speaker?:unknown;sentAt?:unknown;time?:unknown;text?:unknown;}
export interface ForwardRecord {title?:unknown;subtitle?:unknown;sourceName?:unknown;items?:ForwardRecordItem[];}
export interface RecordDetailServices {host:HTMLElement;read(id:string):ForwardRecord|undefined;avatars(record:ForwardRecord):{selfAvatar:string;peerAvatar:string};accept(api:{close():void}):void;}
export interface RecordDetailRow {continued:boolean;avatar:string;speaker:string;time:string;text:string;}
export interface RecordDetailView {open:boolean;title:string;subtitle:string;rows:RecordDetailRow[];generation:number;}
