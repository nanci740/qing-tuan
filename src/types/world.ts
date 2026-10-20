export interface WorldEntry { id:string;title:string;keys:string;secondaryKeys:string;content:string;enabled:boolean;trigger:string;match:string;probability:number;position:string;role:string;depth:number;insertDepth:number;sticky:number;caseSensitive:boolean;recursive:boolean;priority:number }
/** bindId 为 'all' 时关联全部角色；否则看 bindIds（可多个角色），旧资料只有 bindId 一个角色。 */
export interface WorldBook { id:string;name:string;description:string;enabled:boolean;bindId:string;bindIds?:string[];cover?:string;entries:WorldEntry[] }
export type WorldBookDraft = Pick<WorldBook,'name'|'description'|'enabled'|'bindId'> & Partial<WorldBook>;
export interface WorldCharacter { archiveId:string;name?:string }

export type WorldEntryDraft = Omit<WorldEntry,'probability'|'priority'|'depth'|'insertDepth'|'sticky'> & {probability:number|string;priority:number|string;depth:number|string;insertDepth:number|string;sticky:number|string};
