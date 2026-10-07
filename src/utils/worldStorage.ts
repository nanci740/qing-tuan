import { decodeCoverRecords, encodeCoverRecords, prepareImage } from './imageAssets';
import type { WorldEntry, WorldBook, WorldCharacter } from '../types/world';
export const WORLD_BOOKS_KEY='smallphone_world_books_v1',WORLD_CHARACTERS_KEY='smallphone_chat_characters_v1';
export const worldUid=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,7);
export function newWorldEntry():WorldEntry{return{id:worldUid(),title:'',keys:'',secondaryKeys:'',content:'',enabled:true,trigger:'keyword',match:'normal',probability:100,position:'after',role:'system',depth:10,sticky:0,caseSensitive:false,recursive:false,priority:100};}
export function readWorldBooks():WorldBook[]{try{const value=JSON.parse(localStorage.getItem(WORLD_BOOKS_KEY)||'[]');return Array.isArray(value)?decodeCoverRecords(value):[];}catch{return[];}}
export function readWorldCharacters():WorldCharacter[]{try{const value=JSON.parse(localStorage.getItem(WORLD_CHARACTERS_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
const textValue=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
// JSON 仅导入世界书数据；新增模式重建 ID，避免和已有书籍或条目冲突。
export function cleanImportWorldEntry(value:unknown):WorldEntry|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const source=value as Record<string,unknown>,defaults=newWorldEntry(),result={...defaults,id:worldUid()};
 for(const key of ['title','keys','secondaryKeys','content','trigger','match','position','role'] as const)if(typeof source[key]==='string')result[key]=source[key];
 for(const key of ['enabled','caseSensitive','recursive'] as const)if(typeof source[key]==='boolean')result[key]=source[key];
 for(const key of ['probability','depth','sticky','priority'] as const)if(typeof source[key]==='number'&&Number.isFinite(source[key]))result[key]=source[key];
 return result;
}
export function cleanImportWorldBook(value:unknown):WorldBook|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const source=value as Record<string,unknown>;if(!Array.isArray(source.entries))return null;
 return{id:worldUid(),name:textValue(source.name,'未命名世界书'),description:textValue(source.description),bindId:textValue(source.bindId,'all'),cover:typeof source.cover==='string'&&source.cover.startsWith('data:image/')?source.cover:'',enabled:source.enabled!==false,entries:source.entries.map(cleanImportWorldEntry).filter((entry):entry is WorldEntry=>entry!==null)};
}
// 封面：按原显示尺寸处理，透明图片与动图由统一图片处理器保留。
export function compressWorldCover(file:File){return prepareImage(file,480,.82);}
export function writeWorldBooks(books:WorldBook[]):boolean{try{const payload=JSON.stringify(encodeCoverRecords(books));localStorage.setItem(WORLD_BOOKS_KEY,payload);return localStorage.getItem(WORLD_BOOKS_KEY)===payload;}catch{return false;}}
