import { prepareImage } from './imageAssets';
import { readCatalogRecords, writeCatalogRecords } from './catalogStorage';
import type { WorldEntry, WorldBook, WorldCharacter } from '../types/world';
export const WORLD_BOOKS_KEY='smallphone_world_books_v1',WORLD_CHARACTERS_KEY='smallphone_chat_characters_v1';
export const worldUid=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,7);
export function newWorldEntry():WorldEntry{return{id:worldUid(),title:'',keys:'',secondaryKeys:'',content:'',enabled:true,trigger:'keyword',match:'normal',probability:100,position:'after',role:'system',depth:10,insertDepth:4,sticky:0,caseSensitive:false,recursive:false,priority:100};}
export function readWorldBooks():WorldBook[]{return readCatalogRecords('worldBooks');}
export function readWorldCharacters():WorldCharacter[]{return readCatalogRecords('chatCharacters');}
/** 这本书关联的角色：'all' 是全部角色；否则是角色档案的 archiveId 列表，可能是空的。 */
export function worldBookCharacterIds(book:{bindId?:unknown;bindIds?:unknown}):'all'|string[]{
 if(book.bindId==='all')return 'all';
 if(Array.isArray(book.bindIds))return book.bindIds.filter((id):id is string=>typeof id==='string'&&!!id);
 return typeof book.bindId==='string'&&book.bindId?[book.bindId]:[];
}
export function worldBookBoundTo(book:{bindId?:unknown;bindIds?:unknown},characterId:string){const ids=worldBookCharacterIds(book);return ids==='all'||(!!characterId&&ids.includes(characterId));}
const textValue=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
// JSON 仅导入世界书数据；新增模式重建 ID，避免和已有书籍或条目冲突。
export function cleanImportWorldEntry(value:unknown):WorldEntry|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const source=value as Record<string,unknown>,defaults=newWorldEntry(),result={...defaults,id:worldUid()};
 for(const key of ['title','keys','secondaryKeys','content','trigger','match','position','role'] as const)if(typeof source[key]==='string')result[key]=source[key];
 for(const key of ['enabled','caseSensitive','recursive'] as const)if(typeof source[key]==='boolean')result[key]=source[key];
 for(const key of ['probability','depth','insertDepth','sticky','priority'] as const)if(typeof source[key]==='number'&&Number.isFinite(source[key]))result[key]=source[key];
 return result;
}
export function cleanImportWorldBook(value:unknown):WorldBook|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const source=value as Record<string,unknown>;if(!Array.isArray(source.entries))return null;
 const bindIds=Array.isArray(source.bindIds)?source.bindIds.filter((id):id is string=>typeof id==='string'&&!!id):undefined;
 return{id:worldUid(),name:textValue(source.name,'未命名世界书'),description:textValue(source.description),bindId:textValue(source.bindId,'all'),...(bindIds?{bindIds}:{}),cover:typeof source.cover==='string'&&source.cover.startsWith('data:image/')?source.cover:'',enabled:source.enabled!==false,entries:source.entries.map(cleanImportWorldEntry).filter((entry):entry is WorldEntry=>entry!==null)};
}

// ===== 酒馆（SillyTavern）格式 =====
// 酒馆世界书的 entries 是以编号为键的对象；角色卡里内嵌的 character_book 是数组，栏位放在 extensions 里。
// 转成我们的格式后，照常走 cleanImportWorldBook。
type Raw=Record<string,unknown>;
const isRaw=(value:unknown):value is Raw=>!!value&&typeof value==='object'&&!Array.isArray(value);
const keyList=(value:unknown)=>(Array.isArray(value)?value.map(item=>String(item??'')):typeof value==='string'?value.split(/[,，]/):[]).map(item=>item.trim()).filter(Boolean);
const numberOr=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const REGEX_KEY=/^\/(.+)\/[a-z]*$/s,escapeRegex=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** 酒馆的插入位置：0 角色前、1 角色后、4 按深度插入；作者注释、示例对话前后（2、3、5、6）和 7 我们没有，放中部。 */
const ST_POSITIONS:Record<string,string>={'0':'before','1':'after','4':'depth',before_char:'before',after_char:'after'};
function convertSillyTavernEntry(value:unknown):Raw|null{
 if(!isRaw(value))return null;
 const ext=isRaw(value.extensions)?value.extensions:{},pick=(...names:string[])=>{for(const name of names){const found=value[name]??ext[name];if(found!==undefined&&found!==null)return found;}return undefined;};
 let keys=keyList(value.key??value.keys),secondary=keyList(value.keysecondary??value.secondary_keys);
 // 酒馆用 /…/ 写正则；只要有一个是正则，整条就改用正则，其他普通关键词转义成字面文字。
 const regex=[...keys,...secondary].some(key=>REGEX_KEY.test(key));
 if(regex){const convert=(key:string)=>{const match=key.match(REGEX_KEY);return match?match[1]:escapeRegex(key);};keys=keys.map(convert);secondary=secondary.map(convert);}
 // 角色卡的 position 只有 before_char / after_char，精确的位置（含按深度）在 extensions.position。
 const rawPosition=typeof ext.position==='number'?ext.position:value.position,position=ST_POSITIONS[String(rawPosition)]||(rawPosition===undefined?'after':'middle');
 const constant=pick('constant')===true,enabled=value.disable!==undefined?value.disable!==true:value.enabled!==false;
 const useProbability=pick('useProbability')!==false,roleIndex=numberOr(pick('role'),0),scanDepth=numberOr(pick('scanDepth','scan_depth'),0);
 return {
  title:String(value.comment||value.name||keys[0]||'未命名条目'),content:String(value.content??''),keys:keys.join(', '),secondaryKeys:secondary.join(', '),
  // 酒馆里没关键词又不是常驻的条目不会触发，导进来先关掉，免得变成每次都带。
  enabled:enabled&&(constant||keys.length>0),trigger:constant?'always':'keyword',match:regex?'regex':'normal',
  probability:useProbability?numberOr(pick('probability'),100):100,position,role:position==='depth'?(['system','user','assistant'][roleIndex]||'system'):'system',
  depth:scanDepth>0?scanDepth:10,insertDepth:Math.max(0,numberOr(pick('depth'),4)),sticky:Math.max(0,numberOr(pick('sticky'),0)),
  caseSensitive:pick('caseSensitive','case_sensitive')===true,recursive:pick('preventRecursion','prevent_recursion')!==true,priority:numberOr(pick('order','insertion_order'),100),
 };
}
/** 认得出是酒馆世界书或角色卡时转成我们的世界书，认不出就原样返回。 */
export function convertSillyTavernWorld(value:unknown,fallbackName='导入的世界书'):unknown{
 if(!isRaw(value))return value;
 const card=isRaw(value.data)&&isRaw(value.data.character_book)?value.data.character_book:isRaw(value.character_book)?value.character_book:null;
 const source=card||value,entries=source.entries;
 const sillyTavern=card||(isRaw(entries)&&!Array.isArray(entries))||(Array.isArray(entries)&&entries.some(entry=>isRaw(entry)&&(Array.isArray(entry.keys)||Array.isArray(entry.key)||'insertion_order' in entry||'uid' in entry)));
 if(!sillyTavern)return value;
 const list=Array.isArray(entries)?entries:isRaw(entries)?Object.values(entries):[];
 const name=String(source.name||(card&&isRaw(value.data)?value.data.name:'')||fallbackName);
 return {name,description:String(source.description||''),enabled:true,bindId:'all',entries:list.map(convertSillyTavernEntry).filter(Boolean)};
}
// 封面：按原显示尺寸处理，透明图片与动图由统一图片处理器保留。
export function compressWorldCover(file:File){return prepareImage(file,480,.82);}
export function writeWorldBooks(books:WorldBook[]):Promise<boolean>{return writeCatalogRecords('worldBooks',books);}
