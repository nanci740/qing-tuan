import {writeSettingsBatch} from '../utils/settingsPersistence';
import { useHomeTexts } from './HomeTextsProvider';
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, PointerEvent, ReactNode } from 'react';
import type { MusicMode, MusicTrack } from '../types/music';
import { AUTO_KEY, CURRENT_KEY, MODE_KEY, PLAYLIST_KEY, SHOW_NOTES_KEY, compressMusicCover, createTrackId, deleteMusicBlob, getMusicBlob, loadMusicState, putMusicBlob, readMusicBool, saveMusicValue } from '../utils/musicStorage';
import { showToast } from '../utils/toast';
import { useSettingsNavigation } from './SettingsNavigationProvider';
interface DragState { sourceId: string; track: MusicTrack; index: number; current: boolean; editing: boolean; startY: number; offsetY: number; moved: boolean; style: CSSProperties; indices: Map<string, number> }
function useMusicState() {
  const { registerDestination } = useSettingsNavigation();
  const { setText } = useHomeTexts();
  const [state, setState] = useState(() => { const saved = loadMusicState(); return { ...saved, editingId: saved.currentId || saved.playlist[0]?.id || '' }; }), live = useRef(state);
  const update = useCallback((changes: Partial<typeof state>) => { const next = { ...live.current, ...changes }; live.current = next; setState(next); return next; }, []);
  const [view, setView] = useState(state);
  // 原版读入播放模式后，按钮仍保持初始的“列表”；首次点击才更新外观。
  const [displayMode, setDisplayMode] = useState<MusicMode>('list');
  const audio = useRef<HTMLAudioElement>(null), pageRef = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null), coverInput = useRef<HTMLInputElement>(null);
  const urlBoxRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>()), objectUrl = useRef(''), replaceTarget = useRef(''), pendingCover = useRef<string | null>(null);
  const [pageOpen, setPageOpen] = useState(false), [urlOpen, setUrlOpen] = useState(false), [url, setUrl] = useState(''), [title, setTitle] = useState('');
  const [coverPreview, setCoverPreview] = useState(''), [editorTitle, setEditorTitle] = useState('未选择音乐'), [miniCover, setMiniCover] = useState('');
  const [autoPlay, setAutoPlay] = useState(() => readMusicBool(AUTO_KEY,false)), [showNotes, setShowNotes] = useState(() => readMusicBool(SHOW_NOTES_KEY,true));
  const [revision, setRevision] = useState(0), [drag, setDrag] = useState<DragState | null>(null), dragRef = useRef<DragState | null>(null);
  const currentTrack = () => live.current.playlist.find(t=>t.id === live.current.currentId) || live.current.playlist[0] || null;
  const editingTrack = () => live.current.playlist.find(t=>t.id === live.current.editingId) || currentTrack();
  const savePlaylist = () => saveMusicValue(PLAYLIST_KEY, JSON.stringify(live.current.playlist));
  const renderPlaylist = () => { setView(live.current); setRevision(value=>value+1); };
  function applyMeta(track: Pick<MusicTrack,'title'|'coverData'> | null) {
    const value = track?.title || 'Fortune arrives'; setText('songTitle',value); saveMusicValue('player_song_title',value); setMiniCover(track?.coverData || '');
  }
  function refreshMetaForm() { const track = editingTrack(); setTitle(track?.title || ''); setCoverPreview(pendingCover.current !== null ? pendingCover.current : track?.coverData || ''); setEditorTitle(track?.title || '未选择音乐'); }
  async function loadTrack(track: MusicTrack | null, autoplay = false) {
    if (!track) return; update({ currentId: track.id, editingId: track.id }); saveMusicValue(CURRENT_KEY,track.id);
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ''; }
    try {
      if (track.type === 'file') { const blob = await getMusicBlob(track.id); if (!blob) throw new Error('本地音乐文件不存在'); objectUrl.current = URL.createObjectURL(blob); if (audio.current) audio.current.src = objectUrl.current; }
      else if (audio.current) audio.current.src = track.url;
      applyMeta(track); pendingCover.current = null; renderPlaylist(); refreshMetaForm();
      if (autoplay) try { await audio.current?.play(); } catch {}
    } catch { showToast('音乐载入失败'); }
  }
  function renameStorage(title: string): Record<string,string> {
    const track=currentTrack();if(!track)return {};
    return {[PLAYLIST_KEY]:JSON.stringify(live.current.playlist.map(t=>t.id===track.id?{...t,title:(title||'').trim()||'Fortune arrives'}:t))};
  }
  function renameTrack(title: string, persist=true) {
    const track=currentTrack();if(!track)return true;
    const finalTitle=(title||'').trim()||'Fortune arrives';
    if(persist)try{writeSettingsBatch({...renameStorage(finalTitle),player_song_title:finalTitle});}catch(error){showToast((error as Error).message);return false;}
    update({playlist:live.current.playlist.map(t=>t.id===track.id?{...t,title:finalTitle}:t)});
    setText('songTitle',finalTitle);if(track.id===live.current.editingId)refreshMetaForm();renderPlaylist();return true;
  }
  function saveFlag(key:string,value:string,apply:()=>void){try{writeSettingsBatch({[key]:value});apply();}catch(error){showToast((error as Error).message);}}
  useLayoutEffect(() => {
    const unregister = registerDestination('settingMusic',()=>{ setPageOpen(true); renderPlaylist(); refreshMetaForm(); setShowNotes(readMusicBool(SHOW_NOTES_KEY,true)); });
    const close = () => setPageOpen(false), rename = (event: Event) => renameTrack((event as CustomEvent<string>).detail);
    window.addEventListener('qingtuan:close-settings',close); window.addEventListener('qingtuan:rename-track',rename);
    refreshMetaForm(); const track = currentTrack(); if (track) void loadTrack(track,readMusicBool(AUTO_KEY,false)); else applyMeta({title:'Fortune arrives',coverData:''});
    return () => { unregister(); window.removeEventListener('qingtuan:close-settings',close); window.removeEventListener('qingtuan:rename-track',rename); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
  }, [registerDestination]);
  function finishDrag(event: globalThis.PointerEvent) {
    const current = dragRef.current; if (!current) return; event.preventDefault(); dragRef.current = null; setDrag(null);
    if (current.moved) { savePlaylist(); renderPlaylist(); refreshMetaForm(); showToast('音乐顺序已更新'); }
  }
  useLayoutEffect(() => {
    const move = (event: globalThis.PointerEvent) => {
      const current = dragRef.current; if (!current) return; event.preventDefault();
      const next = { ...current, moved: current.moved || Math.abs(event.clientY-current.startY)>3, style: { ...current.style, top: (event.clientY-current.offsetY)+'px' } }; dragRef.current = next; setDrag(next);
      const other = live.current.playlist.filter(t=>t.id!==current.sourceId); let position = other.length;
      for (let i=0;i<other.length;i++) { const rect = rowRefs.current.get(other[i].id)?.getBoundingClientRect(); if (rect && event.clientY < rect.top+rect.height/2) { position = i; break; } }
      const source = live.current.playlist.find(t=>t.id===current.sourceId); if (!source) return;
      const ordered = [...other.slice(0,position),source,...other.slice(position)]; if (ordered.some((t,i)=>t.id !== live.current.playlist[i]?.id)) { update({playlist:ordered}); setView(previous=>({...previous,playlist:ordered})); }
    };
    window.addEventListener('pointermove',move,{passive:false}); window.addEventListener('pointerup',finishDrag,{passive:false}); window.addEventListener('pointercancel',finishDrag,{passive:false});
    return () => { window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',finishDrag); window.removeEventListener('pointercancel',finishDrag); };
  }, [update]);
  function beginSort(event: PointerEvent, track: MusicTrack, index: number) {
    if ((event.pointerType==='mouse' && event.button!==0) || live.current.playlist.length<=1) return;
    const row = rowRefs.current.get(track.id); if (!row) return; event.preventDefault(); event.stopPropagation(); const rect = row.getBoundingClientRect();
    const current: DragState = { sourceId:track.id,track,index,current:track.id===live.current.currentId,editing:track.id===live.current.editingId,startY:event.clientY,offsetY:event.clientY-rect.top,moved:false,style:{width:rect.width+'px',height:rect.height+'px',left:rect.left+'px',top:rect.top+'px'},indices:new Map(live.current.playlist.map((t,i)=>[t.id,i])) };
    dragRef.current = current; setDrag(current); try { row.setPointerCapture(event.pointerId); } catch {}
  }
  function chooseFiles(id = '') { replaceTarget.current = id; if (id) { update({editingId:id}); pendingCover.current = null; } if (fileInput.current) { fileInput.current.value=''; fileInput.current.click(); } }
  async function replaceFile(targetId: string, file: File) {
    const track = live.current.playlist.find(t=>t.id===targetId); if (!track || !file.type.startsWith('audio/')) { showToast('请选择音乐文件'); return; }
    // 如果原本就是本地文件，沿用相同 id 覆盖；如果原本是链接音乐，也改成本地文件。
    await putMusicBlob(track.id,file); let title; try { title = decodeURIComponent(file.name.replace(/\.[^.]+$/,'')) || '未命名音乐'; } catch { title = file.name.replace(/\.[^.]+$/,'') || '未命名音乐'; }
    // 换成新音乐后，不沿用旧封面，避免封面和音乐对不上。
    const next: MusicTrack = { ...track,type:'file',url:'',name:file.name,title,coverData:'' }; update({playlist:live.current.playlist.map(t=>t.id === next.id ? next : t),editingId:next.id}); savePlaylist(); pendingCover.current = null;
    if (next.id===live.current.currentId) await loadTrack(next,false); else { renderPlaylist(); refreshMetaForm(); } showToast('音乐已替换');
  }
  async function addFiles(files: File[]) {
    const remaining = Math.max(0,3-live.current.playlist.length); if (remaining<=0) { showToast('最多保存 3 首音乐'); return; }
    const all = files.filter(file=>file.type.startsWith('audio/')), valid = all.slice(0,remaining); if (!valid.length) { showToast('没有可添加的音乐'); return; }
    for (const file of valid) { const id = createTrackId('f_'); await putMusicBlob(id,file); update({playlist:[...live.current.playlist,{id,type:'file',title:file.name.replace(/\.[^.]+$/,'') || '未命名音乐',name:file.name,url:'',coverData:''}]}); }
    savePlaylist(); const latest = live.current.playlist.at(-1); if (!live.current.currentId && live.current.playlist[0]) await loadTrack(live.current.playlist[0],false); else if (latest) { update({editingId:latest.id}); pendingCover.current=null; refreshMetaForm(); renderPlaylist(); }
    showToast(valid.length<all.length ? '最多保存 3 首，已添加可用音乐' : '音乐已添加');
  }
  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget, files = Array.from(input.files || []); if (replaceTarget.current) { const target = replaceTarget.current; replaceTarget.current=''; const file = files.find(f=>f.type.startsWith('audio/')); if (file) await replaceFile(target,file); input.value=''; return; }
    await addFiles(files); input.value='';
  }
  async function addUrl() {
    const clean = url.trim(); if (!/^https?:\/\//i.test(clean)) { showToast('请输入音乐直链'); return; } if (live.current.playlist.length>=3) { showToast('最多保存 3 首音乐'); return; }
    let pathname=''; try { pathname=new URL(clean).pathname; } catch {} const raw=decodeURIComponent(pathname.split('/').pop() || '链接音乐').replace(/\.[^.]+$/,'');
    const track: MusicTrack={id:createTrackId('u_'),type:'url',title:raw || '链接音乐',name:raw || '链接音乐',url:clean,coverData:''}; update({playlist:[...live.current.playlist,track]}); savePlaylist();
    if (!live.current.currentId) await loadTrack(track,false); else { update({editingId:track.id}); pendingCover.current=null; refreshMetaForm(); renderPlaylist(); } setUrl(''); if(document.activeElement instanceof HTMLElement && urlBoxRef.current?.contains(document.activeElement))document.activeElement.blur(); setUrlOpen(false); showToast('音乐已添加');
  }
  async function deleteTrack(track: MusicTrack) {
    const wasCurrent = live.current.currentId===track.id, wasEditing=live.current.editingId===track.id; update({playlist:live.current.playlist.filter(t=>t.id!==track.id)}); if (track.type==='file') await deleteMusicBlob(track.id); savePlaylist();
    if (wasCurrent) { audio.current?.pause(); audio.current?.removeAttribute('src'); audio.current?.load(); const id=live.current.playlist[0]?.id || ''; update({currentId:id}); if (id) await loadTrack(live.current.playlist[0],false); else { applyMeta({title:'Fortune arrives',coverData:''}); window.dispatchEvent(new Event('qingtuan:player-reset')); } }
    if (wasEditing) update({editingId:live.current.currentId || live.current.playlist[0]?.id || ''}); pendingCover.current=null; renderPlaylist(); refreshMetaForm(); showToast('音乐已删除');
  }
  function saveMeta() {
    const track=editingTrack() || live.current.playlist[0]; if (!track) { showToast('请添加音乐'); return; }
    const next={...track,title:title.trim() || 'Fortune arrives',coverData:pendingCover.current!==null ? pendingCover.current || '' : track.coverData};
    const playlist=live.current.playlist.map(t=>t.id===track.id ? next : t);
    try{writeSettingsBatch({[PLAYLIST_KEY]:JSON.stringify(playlist),...(track.id===live.current.currentId?{player_song_title:next.title}:{})});}
    catch(error){showToast((error as Error).message);return;}
    pendingCover.current=null;update({playlist});if(track.id===live.current.currentId)applyMeta(next);renderPlaylist();refreshMetaForm();showToast('音乐信息已保存');
  }
  async function onCover(event: ChangeEvent<HTMLInputElement>) { const file=event.currentTarget.files?.[0]; if (!file) return; try { pendingCover.current=await compressMusicCover(file); refreshMetaForm(); } catch(error) { showToast(error instanceof Error ? error.message || '封面处理失败' : '封面处理失败'); } }
  async function moveTrack(delta: number) { const {playlist,currentId,mode}=live.current; if (!playlist.length) return; let index=playlist.findIndex(t=>t.id===currentId); if(index<0)index=0; if(mode==='random') return loadTrack(playlist[Math.floor(Math.random()*playlist.length)],true); return loadTrack(playlist[(index+delta+playlist.length)%playlist.length],true); }
  async function onEnded() { if(live.current.mode==='single') { if(audio.current)audio.current.currentTime=0; try { await audio.current?.play(); } catch {} return; } if(live.current.playlist.length) await moveTrack(1); }
  async function togglePlay() { if(!live.current.playlist.length)return; if(!audio.current?.src)await loadTrack(currentTrack(),false); try { if(audio.current?.paused)await audio.current.play(); else audio.current?.pause(); } catch {} }
  function seek(clientX: number, container: HTMLDivElement | null) { const media=audio.current; if (!media?.src || !Number.isFinite(media.duration) || !container)return; const rect=container.getBoundingClientRect(); media.currentTime=Math.max(0,Math.min(media.duration,((clientX-rect.left)/rect.width)*media.duration)); }
  return { ...state, displayMode, playlist: view.playlist, currentId: view.currentId, editingId: view.editingId, audio, pageRef, pageOpen, closePage:()=>{ if(document.activeElement instanceof HTMLElement && pageRef.current?.contains(document.activeElement))document.activeElement.blur(); setPageOpen(false); }, fileInput, coverInput, rowRefs, revision, drag, beginSort, urlBoxRef, urlOpen, toggleUrl:()=>setUrlOpen(v=>!v), url, setUrl, addUrl, onFiles, chooseFiles,
    title, setTitle, editorTitle, coverPreview, miniCover, saveMeta, onCover, chooseCover:()=>{ if(coverInput.current) { coverInput.current.value=''; coverInput.current.click(); } }, removeCover:()=>{ pendingCover.current=''; refreshMetaForm(); },
    autoPlay, toggleAuto:()=>saveFlag(AUTO_KEY,autoPlay?'0':'1',()=>setAutoPlay(!autoPlay)), showNotes, toggleNotes:()=>saveFlag(SHOW_NOTES_KEY,showNotes?'0':'1',()=>setShowNotes(!showNotes)), setMode:(mode:MusicMode)=>saveFlag(MODE_KEY,mode,()=>{setDisplayMode(mode);update({mode});}),
    selectTrack:(track:MusicTrack)=>{void loadTrack(track,false);showToast('已切换音乐');},deleteTrack,renameTrack,renameStorage,moveTrack,onEnded,togglePlay,seek };
}
const Context=createContext<ReturnType<typeof useMusicState> | null>(null);
export function MusicProvider({children}:{children:ReactNode}) { const state=useMusicState();return <Context.Provider value={state}>{children}</Context.Provider>; }
export function useMusic() { const value=useContext(Context);if(!value)throw new Error('MusicProvider is required');return value; }
