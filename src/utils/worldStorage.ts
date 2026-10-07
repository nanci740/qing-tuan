import type { WorldEntry, WorldBook, WorldCharacter } from '../types/world';
export const WORLD_BOOKS_KEY='smallphone_world_books_v1',WORLD_CHARACTERS_KEY='smallphone_chat_characters_v1';
export const worldUid=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,7);
export function newWorldEntry():WorldEntry{return{id:worldUid(),title:'',keys:'',secondaryKeys:'',content:'',enabled:true,trigger:'keyword',match:'normal',probability:100,position:'after',role:'system',depth:10,sticky:0,caseSensitive:false,recursive:false,priority:100};}
export function readWorldBooks():WorldBook[]{try{const value=JSON.parse(localStorage.getItem(WORLD_BOOKS_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
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
 return{id:worldUid(),name:textValue(source.name,'未命名世界书'),description:textValue(source.description),bindId:textValue(source.bindId,'all'),cover:typeof source.cover==='string'&&source.cover.startsWith('data:image/')&&source.cover.length<1600000?source.cover:'',enabled:source.enabled!==false,entries:source.entries.map(cleanImportWorldEntry).filter((entry):entry is WorldEntry=>entry!==null)};
}
// 封面：选图后缩到最长边 480px、存成 JPEG，避免占太多存储空间。
export function compressWorldCover(file:File):Promise<string>{return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);const scale=Math.min(1,480/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.82));};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('图片读取失败'));};image.src=url;});}
