import {useImportPreview} from '../hooks/useImportPreview';
import {matchingNames} from '../utils/importMatching';
import { storeImage, prepareCoverRecords } from '../utils/imageAssets';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import type { WorldBook, WorldBookDraft, WorldEntry, WorldEntryDraft } from '../types/world';
import { writeWorldBooks, readWorldBooks, readWorldCharacters, worldUid, newWorldEntry, cleanImportWorldBook, compressWorldCover } from '../utils/worldStorage';
import { showToast } from '../utils/toast';
type WorldView='list'|'book'|'bookForm'|'entry';
type ConfirmState={revision:number;open:boolean;message:string;title:string;danger:boolean};
function useWorldState(){
 const importPreview=useImportPreview(),importBusy=useRef(false);
 const [books,setBooks]=useState(readWorldBooks),liveBooks=useRef(books),[open,setOpen]=useState(false),[view,setView]=useState<WorldView>('list'),[bookId,setBookId]=useState(''),[entryId,setEntryId]=useState(''),[draft,setDraft]=useState<WorldEntryDraft|null>(null),[bookDraft,setBookDraft]=useState<WorldBookDraft|null>(null),[revision,setRevision]=useState(0),[menuOpen,setMenuOpen]=useState(false);
 const [entrySearch,setEntrySearch]=useState(''),[entryFilter,setEntryFilterState]=useState('all'),[usedFilters,setUsedFilters]=useState<string[]>([]),[coverName,setCoverName]=useState(''),[addressTitle,setAddressTitle]=useState('');
 const pageRef=useRef<HTMLDivElement>(null),menuRef=useRef<HTMLDivElement>(null),topActionRef=useRef<HTMLButtonElement>(null),searchRef=useRef<HTMLInputElement>(null),coverInput=useRef<HTMLInputElement>(null),importInput=useRef<HTMLInputElement>(null);
 const [pickerExpanded,setPickerExpanded]=useState<Record<string,boolean>>({});
 const [picker,setPicker]=useState({open:false,title:'选择选项',selected:'',options:[] as [string,string][],field:''}),[pickerRevision,setPickerRevision]=useState(0);
 const [confirmation,setConfirmationState]=useState<ConfirmState|null>(null),confirmationResolve=useRef<((value:boolean|string)=>void)|null>(null),confirmationTimer=useRef<ReturnType<typeof setTimeout>|null>(null),confirmationRevision=useRef(0);
 const confirmationLive=useRef<ConfirmState|null>(null);function setConfirmation(next:ConfirmState|null|((current:ConfirmState|null)=>ConfirmState|null)){const value=typeof next==='function'?next(confirmationLive.current):next;confirmationLive.current=value;setConfirmationState(value);}
 const book=books.find(value=>value.id===bookId),characters=readWorldCharacters();
 const roleName=(id:string)=>characters.find(value=>value.archiveId===id)?.name||'已删除的角色';
 async function commit(next:WorldBook[],persist=true){liveBooks.current=next;setBooks(next);if(persist&&!await writeWorldBooks(next)){liveBooks.current=readWorldBooks();setBooks(liveBooks.current);return false;}return true;}
 function setEntryFilter(next:string){setUsedFilters(current=>[...new Set([...current,entryFilter,next])]);setEntryFilterState(next);}
 function rerender(nextView:WorldView){setUsedFilters([]);setPickerExpanded({});setPicker(current=>({...current,field:''}));setView(nextView);setRevision(value=>value+1);if(nextView!=='list')setMenuOpen(false);}
 function openWorld(){++coverRevision.current;coverSaving.current=false;setMenuOpen(false);setBookId('');setEntryId('');setDraft(null);setBookDraft(null);setOpen(true);rerender('list');}
 function closeWorld(){++coverRevision.current;coverSaving.current=false;setMenuOpen(false);setOpen(false);}
 function back(){++coverRevision.current;coverSaving.current=false;if(menuOpen){setMenuOpen(false);return;}setPicker(value=>({...value,open:false}));if(view==='entry'){setDraft(null);setEntryId('');rerender('book');}else if(view==='bookForm'){setBookDraft(null);rerender(bookId?'book':'list');}else if(view==='book'){setBookId('');rerender('list');}else closeWorld();}
 function newBook(){++coverRevision.current;coverSaving.current=false;setMenuOpen(false);setBookId('');setBookDraft({name:'',description:'',enabled:true,bindId:'all'});setCoverName('');rerender('bookForm');}
 function openBook(id:string){setBookId(id);setEntrySearch('');setEntryFilter('all');rerender('book');}
 function editBook(){++coverRevision.current;coverSaving.current=false;if(!book)return;setBookDraft({...book});setCoverName(book.name);rerender('bookForm');}
 function newEntry(){setDraft(newWorldEntry());setEntryId('');setAddressTitle('');rerender('entry');}
 const suppressEntryClickUntil=useRef(0);
 function openEntry(id:string){if(Date.now()<suppressEntryClickUntil.current)return;const entry=book?.entries.find(value=>value.id===id);if(!entry)return;setEntryId(id);setDraft({...entry});setAddressTitle(entry.title);rerender('entry');}
 function topAction(){if(view==='list')setMenuOpen(value=>!value);else if(view==='book')newEntry();else if(view==='entry')saveEntry();else saveBook();}
 function updateBookDraft<K extends keyof WorldBookDraft>(key:K,value:WorldBookDraft[K]){if(key==='cover'&&!value){++coverRevision.current;coverSaving.current=false;}setBookDraft(current=>current?{...current,[key]:value}:current);if(key==='name'&&!bookDraft?.cover&&String(value).trim())setCoverName(String(value).trim());}
 function updateEntry<K extends keyof WorldEntryDraft>(key:K,value:WorldEntryDraft[K]){setDraft(current=>current?{...current,[key]:value}:current);}
 function toggleBook(id:string,enabled:boolean){commit(liveBooks.current.map(value=>value.id===id?{...value,enabled}:value));}
 function toggleEntry(id:string,enabled:boolean){commit(liveBooks.current.map(value=>value.id===bookId?{...value,entries:value.entries.map(entry=>entry.id===id?{...entry,enabled}:entry)}:value));}
 async function copyEntry(id:string){const current=liveBooks.current.find(value=>value.id===bookId),index=current?.entries.findIndex(entry=>entry.id===id)??-1;if(!current||index<0)return;const source=current.entries[index],copy={...source,id:worldUid(),title:(source.title||'未命名条目')+'（副本）'},entries=[...current.entries];entries.splice(index+1,0,copy);if(!await commit(liveBooks.current.map(value=>value.id===bookId?{...value,entries}:value)))return;setEntrySearch('');setEntryFilter('all');rerender('book');showToast('已复制条目');}
 const savingBook=useRef(false);
 async function saveBook(){if(coverSaving.current){showToast('封面正在保存，请稍候');return;}if(!bookDraft||savingBook.current)return;const name=bookDraft.name.trim();if(!name){showToast('先为世界书取个名字');return;}const saveRevision=coverRevision.current;savingBook.current=true;try{await prepareCoverRecords([bookDraft]);if(saveRevision!==coverRevision.current)return;}catch{showToast('封面保存失败，请检查浏览器存储空间');return;}finally{savingBook.current=false;}const old=liveBooks.current.find(value=>value.id===bookId),next:WorldBook={...(old||{id:worldUid(),entries:[]}),name,description:bookDraft.description.trim(),bindId:bookDraft.bindId,enabled:bookDraft.enabled,cover:typeof bookDraft.cover==='string'?bookDraft.cover:''};if(!await commit(old?liveBooks.current.map(value=>value.id===old.id?next:value):[...liveBooks.current,next]))return;setBookId(next.id);setBookDraft(null);rerender('book');showToast('世界书已保存');}
 async function saveEntry(){if(!draft)return;const title=draft.title.trim(),content=draft.content.trim();if(!title||!content){showToast('先填写标题和设定内容');return;}const current=liveBooks.current.find(value=>value.id===bookId);if(!current)return;const next:WorldEntry={id:entryId||worldUid(),title,content,keys:draft.keys.trim(),secondaryKeys:draft.secondaryKeys.trim(),enabled:draft.enabled,trigger:draft.trigger,match:draft.match,probability:Number(draft.probability),position:draft.position,role:draft.role,priority:Number(draft.priority)||0,depth:Math.max(1,Number(draft.depth)||10),sticky:Math.max(0,Number(draft.sticky)||0),caseSensitive:draft.caseSensitive,recursive:draft.recursive};const entries=entryId?current.entries.map(value=>value.id===entryId?next:value):[...current.entries,next];if(!await commit(liveBooks.current.map(value=>value.id===bookId?{...value,entries}:value)))return;setDraft(null);setEntryId('');rerender('book');showToast('条目已保存');}
 function confirm(message:string,title='确认操作',danger=false){return new Promise<boolean|string>(resolve=>{confirmationResolve.current?.(false);if(confirmationTimer.current)clearTimeout(confirmationTimer.current);confirmationResolve.current=resolve;setConfirmation({revision:++confirmationRevision.current,open:false,message,title,danger});});}
 useEffect(()=>{if(!confirmation||confirmation.open)return;const frame=requestAnimationFrame(()=>setConfirmation(current=>current?.revision===confirmation.revision?{...current,open:true}:current));return()=>cancelAnimationFrame(frame);},[confirmation?.revision]);
 function finishConfirm(value:boolean|string){const resolve=confirmationResolve.current;if(!resolve)return;confirmationResolve.current=null;setConfirmation(current=>current?{...current,open:false}:current);const closedRevision=confirmation?.revision;confirmationTimer.current=setTimeout(()=>{setConfirmation(current=>current?.revision===closedRevision?null:current);},180);resolve(value);}
 async function deleteBook(){if(!await confirm('删除后，这本世界书和其中全部条目都会一起消失。','删除世界书？',true))return;if(!await commit(liveBooks.current.filter(value=>value.id!==bookId)))return;setBookId('');rerender('list');showToast('世界书已删除');}
 async function deleteEntry(){if(!await confirm('删除后，这条世界设定不会再参与世界书。','删除条目？',true))return;if(!await commit(liveBooks.current.map(value=>value.id===bookId?{...value,entries:value.entries.filter(entry=>entry.id!==entryId)}:value)))return;setEntryId('');setDraft(null);rerender('book');showToast('条目已删除');}
 function closePicker(){setPickerExpanded(current=>({...current,[picker.field]:false}));setPicker(current=>({...current,open:false}));}
 function openPicker(field:string,label:string,options:[string,string][],value:string){setPickerExpanded(current=>({...current,[field]:true}));setPicker({open:true,title:label||'选择选项',selected:value||options[0]?.[0]||'',options,field});setPickerRevision(value=>value+1);}
 function confirmPicker(){if(picker.selected){if(picker.field==='wbBind')updateBookDraft('bindId',picker.selected);else{const fields:Record<string,'trigger'|'match'|'position'|'role'>={weTrigger:'trigger',weMatch:'match',wePosition:'position',weRole:'role'};const key=fields[picker.field];if(key)updateEntry(key,picker.selected);}}closePicker();}
 function chooseCover(){if(coverInput.current){coverInput.current.value='';coverInput.current.click();}}
 const coverSaving=useRef(false),coverRevision=useRef(0);
 async function onCover(event:ChangeEvent<HTMLInputElement>){const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(!file)return;const revision=++coverRevision.current;coverSaving.current=true;try{const cover=await compressWorldCover(file);await storeImage(cover);if(revision!==coverRevision.current)return;updateBookDraft('cover',cover);if(bookDraft?.name.trim())setCoverName(bookDraft.name.trim());}catch{showToast('封面保存失败，请检查图片或浏览器存储空间');}finally{if(revision===coverRevision.current)coverSaving.current=false;}}
 function exportJson(){const values=liveBooks.current;if(!values.length){showToast('还没有可导出的世界书');return;}const payload={format:'qingtuan-worldbook',version:1,exportedAt:new Date().toISOString(),books:values},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='qingtuan-worldbook-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);showToast('世界书 JSON 已导出');}
 async function importJson(event:ChangeEvent<HTMLInputElement>){
  const input=event.currentTarget,file=input.files?.[0];input.value='';if(!file)return;
  if(importBusy.current){showToast('正在处理导入，请稍候');return;}importBusy.current=true;
  try{
   if(file.size>5*1024*1024)throw Error('JSON 文件不可超过 5 MB');
   let parsed;try{parsed=JSON.parse(await file.text());}catch{throw Error('JSON 文件无法读取');}
   const raw=Array.isArray(parsed)?parsed:Array.isArray(parsed?.books)?parsed.books:Array.isArray(parsed?.entries)?[parsed]:null;
   if(!raw||!raw.length||raw.length>200||raw.some((value:Record<string,unknown>)=>!value||!Array.isArray(value.entries)||value.entries.length>2000))throw Error('不是有效的世界书 JSON');
   if(raw.some((value:Record<string,unknown>)=>(value.entries as unknown[]).some(entry=>!entry||typeof entry!=='object'||Array.isArray(entry))))throw Error('世界书中有无效条目，请检查文件');
   const cleaned=raw.map(cleanImportWorldBook);if(cleaned.some((value:WorldBook|null)=>!value))throw Error('世界书 JSON 格式不符');
   const imported=cleaned as WorldBook[],previous=liveBooks.current;
   const conflicts=imported.map(value=>matchingNames(previous,value.name));
   const duplicateCount=conflicts.filter(values=>values.length).length;
   const unambiguous=imported.every((value,index)=>conflicts[index].length<=1&&matchingNames(imported,value.name).length===1);
   const mode=await importPreview.open({title:'导入世界书',kind:'world',message:`共 ${imported.length} 本，${imported.reduce((count,value)=>count+value.entries.length,0)} 个条目。${duplicateCount?`其中 ${duplicateCount} 本与现有世界书同名，请核对。`: '请核对后选择导入方式。'}${duplicateCount&&!unambiguous?'存在多个同名书籍，不能直接覆盖同名。':''}`,rows:imported.map((value,index)=>({name:value.name||'未命名世界书',detail:`${value.entries.length} 个条目`,conflict:conflicts[index].length?`已有 ${conflicts[index].length} 本同名世界书`:undefined})),choices:[{value:'append',label:'新增导入',primary:true},...(duplicateCount&&unambiguous?[{value:'merge',label:'覆盖同名 其余新增'}]:[]),{value:'replace',label:'覆盖全部世界书',danger:true},{value:'cancel',label:'取消'}]});
   if(mode==='cancel')return;
   if(liveBooks.current!==previous)throw Error('世界书已发生变化，请重新导入并核对');
   if(mode==='replace'&&!await confirm('现有全部世界书将被文件替换。','确定覆盖全部？',true))return;
   if(mode==='merge'&&!await confirm('只替换预览中同名的世界书内容，保留原编号和角色关联；其他世界书保留。','确定覆盖同名？',true))return;
   if(liveBooks.current!==previous)throw Error('世界书已发生变化，请重新导入并核对');
   await prepareCoverRecords(imported);
   if(liveBooks.current!==previous)throw Error('世界书已发生变化，请重新导入并核对');
   let next=mode==='replace'?imported:[...previous,...imported];
   if(mode==='merge'){
    next=[...previous];for(const value of imported){const target=matchingNames(previous,value.name)[0];if(target)next=next.map(book=>book.id===target.id?{...value,id:target.id,bindId:target.bindId}:book);else next.push(value);}
   }
   if(!await commit(next))return;rerender('list');showToast(`已导入 ${imported.length} 本世界书`);
  }catch(error){showToast((error as Error).message||'世界书导入失败，原数据已保留');}
  finally{importBusy.current=false;}
 }
 useEffect(()=>{const pointer=(event:PointerEvent)=>{if(!menuOpen||menuRef.current?.contains(event.target as Node)||topActionRef.current?.contains(event.target as Node))return;setMenuOpen(false);},key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menuOpen){setMenuOpen(false);topActionRef.current?.focus();}};document.addEventListener('pointerdown',pointer);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',key);};},[menuOpen]);
 useEffect(()=>()=>{if(confirmationTimer.current)clearTimeout(confirmationTimer.current);},[]);
 // 未迁移的聊天功能仍读取世界书服务；聊天迁移后改用此 Context 服务。
 useLayoutEffect(()=>{window.smallphoneWorldbooks={getBooks:()=>liveBooks.current,forCharacter:id=>liveBooks.current.filter(value=>value.enabled!==false&&(value.bindId==='all'||value.bindId===id)),getEntries:id=>liveBooks.current.filter(value=>value.enabled!==false&&(value.bindId==='all'||value.bindId===id)).flatMap(value=>(value.entries||[]).filter(entry=>entry.enabled!==false).map(entry=>({...entry,book:value.name})))};return()=>{delete window.smallphoneWorldbooks;};},[]);
 function setField(id:string,value:string|boolean){const bookFields:Record<string,string>={wbName:'name',wbDesc:'description',wbBind:'bindId',wbEnabled:'enabled'},entryFields:Record<string,string>={weTitle:'title',weContent:'content',weKeys:'keys',weSecondary:'secondaryKeys',weEnabled:'enabled',weTrigger:'trigger',weMatch:'match',weProbability:'probability',wePosition:'position',weRole:'role',wePriority:'priority',weDepth:'depth',weSticky:'sticky',weCase:'caseSensitive',weRecursive:'recursive'};if(bookFields[id]){setBookDraft(current=>current?{...current,[bookFields[id]]:value}:current);if(id==='wbName'&&!bookDraft?.cover&&String(value).trim())setCoverName(String(value).trim());}else if(entryFields[id])setDraft(current=>current?{...current,[entryFields[id]]:value}:current);}
 const cleanPath=(value:string)=>String(value).replace(/[\\/]/g,'-'),root='C:\\青团\\世界书\\',bookName=cleanPath(book?.name||'未命名世界书');
 const title=({list:'World',book:'世界书',bookForm:bookId?'编辑世界书':'新建世界书',entry:entryId?'编辑条目':'新建条目'})[view];
 const address=({list:root,book:root+bookName+'\\',bookForm:bookId?root+bookName+'\\属性':root+'新建世界书\\',entry:root+bookName+'\\'+(entryId?cleanPath(addressTitle||'未命名条目'):'新建条目')+'.txt'})[view];
 const query=entrySearch.trim().toLocaleLowerCase(),filteredEntryCount=(book?.entries||[]).filter(entry=>(!query||[entry.title,entry.keys,entry.secondaryKeys].some(value=>String(value||'').toLocaleLowerCase().includes(query)))&&(entryFilter==='all'||(entryFilter==='enabled'?entry.enabled!==false:entry.enabled===false))).length;
 return{importPreview,selectPicker:(value:string)=>{setPicker(current=>({...current,selected:value}));setPickerRevision(current=>current+1);},filteredEntryCount,setField,books,liveBooks,book,bookId,entryId,view,open,pageRef,title,address,revision,menuOpen,menuRef,topActionRef,setMenuOpen,openWorld,closeWorld,back,topAction,newBook,openBook,editBook,newEntry,openEntry,bookDraft,coverName,draft,updateBookDraft,updateEntry,toggleBook,toggleEntry,copyEntry,saveBook,saveEntry,deleteBook,deleteEntry,roleName,characters,entrySearch,setEntrySearch,entryFilter,setEntryFilter,usedFilters,searchRef,coverInput,chooseCover,onCover,importInput,importJson,exportJson,picker,pickerExpanded,closePicker,pickerRevision,setPicker,openPicker,confirmPicker,confirmation,finishConfirm,suppressEntryClickUntil,commit,rerender};
}
const Context=createContext<ReturnType<typeof useWorldState>|null>(null);
export function WorldProvider({children}:{children:ReactNode}){const value=useWorldState();return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useWorld(){const value=useContext(Context);if(!value)throw Error('WorldProvider is required');return value;}
