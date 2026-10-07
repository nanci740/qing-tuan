export interface WorldEntry { id:string;title:string;keys:string;secondaryKeys:string;content:string;enabled:boolean;trigger:string;match:string;probability:number;position:string;role:string;depth:number;sticky:number;caseSensitive:boolean;recursive:boolean;priority:number }
export interface WorldBook { id:string;name:string;description:string;enabled:boolean;bindId:string;cover?:string;entries:WorldEntry[] }
export type WorldBookDraft = Pick<WorldBook,'name'|'description'|'enabled'|'bindId'> & Partial<WorldBook>;
export interface WorldCharacter { archiveId:string;name?:string }

export type WorldEntryDraft = Omit<WorldEntry,'probability'|'priority'|'depth'|'sticky'> & {probability:number|string;priority:number|string;depth:number|string;sticky:number|string};
