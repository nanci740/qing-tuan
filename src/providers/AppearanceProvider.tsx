import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useSettingsNavigation } from './SettingsNavigationProvider';
import { defaultHomeTexts, homeTextStorageKeys, useHomeTexts } from './HomeTextsProvider';
import type { HomeTextId, HomeTextValues } from './HomeTextsProvider';
import { useMusic } from './MusicProvider';
import { DEFAULT_THEME_COLOR, normalizeThemeColor, themeColorToRgb, themeFrameRgb, hexToHsv, hsvToHex } from '../utils/appearanceColors';
import { compressWallpaper, compressCustomIcon, CUSTOM_FONT_FAMILY, saveLocalFontRecord, readLocalFontRecord, clearLocalFontRecord } from '../utils/appearanceStorage';
import { showToast } from '../utils/toast';
export const iconConfigs = {app:[{key:'ledger',label:'Ledger'},{key:'memos',label:'Memos'},{key:'world',label:'World'},{key:'memories',label:'Memories'}],dock:[{key:'home',label:'Home'},{key:'chat',label:'Chat'},{key:'diary',label:'Diary'},{key:'space',label:'Space'},{key:'settings',label:'Settings'}]};
export type IconKind = keyof typeof iconConfigs;
type Icons = Record<IconKind,Record<string,string>>;
function read(key:string,fallback=''){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function write(key:string,value:string){try{localStorage.setItem(key,value);}catch{}}
function readIcons():Icons{return Object.fromEntries(Object.entries(iconConfigs).map(([kind,items])=>[kind,Object.fromEntries(items.map(({key})=>[key,read(`smallphone_${kind}_icon_${key}`)]))])) as Icons;}
function initialAppearance(){let color=DEFAULT_THEME_COLOR,wallpaper='',opacity=100;try{color=localStorage.getItem('smallphone_theme_color')||color;
 // 旧的淡青 #C0D6D8 已换成新的淡青 #DDF2F4，之前存的旧值自动换成新色。
 if(color.toUpperCase()==='#C0D6D8'){color=DEFAULT_THEME_COLOR;localStorage.setItem('smallphone_theme_color',color);}wallpaper=localStorage.getItem('smallphone_main_wallpaper')||'';opacity=Number(localStorage.getItem('smallphone_wallpaper_opacity'))||100;}catch{}
 let glass=50;try{const value=Number(localStorage.getItem('smallphone_glass_strength'));if(Number.isFinite(value))glass=value;}catch{}
 const splash=read('smallphone_splash_mode','always');return{color:normalizeThemeColor(color),savedColor:color,wallpaper,opacity:Math.min(100,Math.max(20,opacity)),glass:Math.min(100,Math.max(0,glass||0)),splash:['always','daily','off'].includes(splash)?splash:'always'};}
function useAppearanceState(){
 const navigation=useSettingsNavigation(),home=useHomeTexts(),music=useMusic();
 const [initial]=useState(initialAppearance),[color,setColor]=useState(initial.color),[hex,setHex]=useState(initial.color),savedColor=useRef(initial.savedColor);
 const [wallpaper,setWallpaper]=useState(initial.wallpaper),[opacity,setOpacityState]=useState(initial.opacity),opacityRef=useRef(opacity),[glass,setGlassState]=useState(initial.glass),[splash,setSplashState]=useState(initial.splash);
 const [pageOpen,setPageOpen]=useState(false),pageRef=useRef<HTMLDivElement>(null),modalRef=useRef<HTMLDivElement>(null),[modalOpen,setModalOpen]=useState(false),[previous,setPrevious]=useState(DEFAULT_THEME_COLOR),[draftColor,setDraftColor]=useState(DEFAULT_THEME_COLOR),[modalHex,setModalHex]=useState(''),[hsv,setHsv]=useState<number[]>([0,0,0]),[modalReady,setModalReady]=useState(false);
 const [texts,setTexts]=useState<HomeTextValues>(()=>Object.fromEntries(Object.keys(defaultHomeTexts).map(key=>[key,''])) as HomeTextValues);
 const [icons,setIcons]=useState(readIcons),[iconDrafts,setIconDrafts]=useState(readIcons),pendingIcon=useRef<{kind:IconKind;key:string}|null>(null);
 const wallpaperInput=useRef<HTMLInputElement>(null),iconInput=useRef<HTMLInputElement>(null),fontInput=useRef<HTMLInputElement>(null);
 const [fontUrl,setFontUrl]=useState(''),[font,setFont]=useState({name:'默认字体',source:'霞鹜圆体 / Georgia',badge:'DEFAULT',active:false});
 function applyColor(value:string,save=true){const next=normalizeThemeColor(value);setColor(next);setHex(next);if(save){savedColor.current=next;write('smallphone_theme_color',next);}}
 // body 上的 --theme-rgb 用「框架色」，跟 CSS 里 body 的 --theme-color 对应。
 useLayoutEffect(()=>{const rgb=themeColorToRgb(color);document.documentElement.style.setProperty('--theme-color',color);document.documentElement.style.setProperty('--theme-rgb',rgb.join(', '));document.body.style.setProperty('--theme-rgb',themeFrameRgb(rgb).join(', '));},[color]);
 useLayoutEffect(()=>{
 // 50% 对应当前设计：约 8% 白底、3px 模糊、40% 左上高光。
 const values={'--ui-glass-alpha':(.03+glass*.001).toFixed(3),'--ui-glass-blur':(1+glass*.04).toFixed(2)+'px','--ui-glass-edge-highlight-alpha':(.20+glass*.004).toFixed(3),'--ui-glass-edge-soft-alpha':(.06+glass*.0016).toFixed(3),'--tama-jelly':(glass/100).toFixed(2)};
 // 电子宠物的果冻壳：0 最透明清透，1 最饱满磨砂；50% 就是原本的样子。
 Object.entries(values).forEach(([key,value])=>document.documentElement.style.setProperty(key,value));},[glass]);
 useLayoutEffect(()=>{if(font.active){
 /* 以后只改一个变量。主画面、设置、美化、个人信息、票根、对话框、输入内容、SVG 文字都会一起跟随。 */
 document.documentElement.style.setProperty('--font-active',`"${CUSTOM_FONT_FAMILY}", Georgia, "LXGW 975 Yuan SC 400W", "PingFang SC", "Times New Roman", serif`);document.body.classList.add('custom-ui-font-active');
 }else{document.documentElement.style.removeProperty('--font-active');document.body.classList.remove('custom-ui-font-active');}},[font.active]);
 useEffect(()=>navigation.registerDestination('settingTheme',async()=>{if(document.fonts?.load)try{await document.fonts.load('15px "LXGW WenKai TC"','美化设置界面配色主画面背景');}catch{}setTexts(home.getTexts());setPageOpen(true);}),[navigation.registerDestination,home.getTexts]);
 useEffect(()=>{const close=()=>setPageOpen(false);window.addEventListener('qingtuan:close-settings',close);return()=>window.removeEventListener('qingtuan:close-settings',close);},[]);
 function blurWithin(ref:typeof pageRef){if(document.activeElement instanceof HTMLElement&&ref.current?.contains(document.activeElement))document.activeElement.blur();}
 function closePage(){blurWithin(pageRef);setPageOpen(false);}
 function applyHex(){const raw=hex.trim().toUpperCase(),value=raw.startsWith('#')?raw:`#${raw}`;if(!/^#[0-9A-F]{6}$/.test(value)){setHex(normalizeThemeColor(savedColor.current));showToast('请输入正确的 HEX 颜色');return;}applyColor(value);showToast('自定义颜色已保存');}
 function modalFromColor(value:string){const next=normalizeThemeColor(value);setHsv(hexToHsv(next));setDraftColor(next);setModalHex(next);setModalReady(true);}
 function openModal(){setPrevious(color);modalFromColor(color);setModalOpen(true);}
 function closeModal(restore=true){if(restore)applyColor(previous,false);setModalOpen(false);}
 function modalApplyHex(silent=false){const raw=modalHex.trim().toUpperCase(),value=raw.startsWith('#')?raw:`#${raw}`;if(!/^#[0-9A-F]{6}$/.test(value)){if(!silent)showToast('请输入正确的 HEX 颜色');return;}modalFromColor(value);}
 function setRange(index:number,value:number){const next=hsv.map((v,i)=>i===index?value:v),nextColor=hsvToHex(next[0],next[1],next[2]);setHsv(next);setDraftColor(nextColor);setModalHex(nextColor);setModalReady(true);}
 function setGlass(value:number){const safe=Math.min(100,Math.max(0,value||0));setGlassState(safe);write('smallphone_glass_strength',String(safe));}
 function setSplash(value:string){const safe=['always','daily','off'].includes(value)?value:'always';setSplashState(safe);try{localStorage.setItem('smallphone_splash_mode',safe);
 /* 切换成“每天一次”时清掉旧日期，让下一次打开能够正常作为当天第一次显示。 */
 if(safe==='daily')localStorage.removeItem('smallphone_splash_last_shown');}catch{}}
 function setOpacity(value:number){const safe=Math.min(100,Math.max(20,Number.isFinite(value)?value:100));opacityRef.current=safe;setOpacityState(safe);write('smallphone_wallpaper_opacity',String(safe));}
 const veil=Math.max(0,Math.min(.8,1-opacity/100)).toFixed(2),wallpaperLayers=wallpaper?`linear-gradient(rgba(250, 249, 246, ${veil}), rgba(250, 249, 246, ${veil})), url("${wallpaper}")`:'';
 async function onWallpaper(event:ChangeEvent<HTMLInputElement>){const input=event.currentTarget,file=input.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){showToast('请选择图片文件');input.value='';return;}showToast('正在处理图片…');try{const data=await compressWallpaper(file);setWallpaper(data);try{localStorage.setItem('smallphone_main_wallpaper',data);localStorage.setItem('smallphone_wallpaper_opacity',String(opacityRef.current));showToast('主画面背景已保存');}catch{showToast('图片已应用，但储存空间不足');}}catch(error){showToast(error instanceof Error?error.message:'图片处理失败');}input.value='';}
 function removeWallpaper(){setWallpaper('');try{localStorage.removeItem('smallphone_main_wallpaper');}catch{}if(wallpaperInput.current)wallpaperInput.current.value='';showToast('已恢复默认背景');}
 function saveTexts(values=texts){const next=Object.fromEntries(Object.entries(values).map(([id,value])=>[id,value.trim()||defaultHomeTexts[id as HomeTextId]])) as HomeTextValues;setTexts(next);Object.entries(next).forEach(([key,value])=>{const id=key as HomeTextId;home.setText(id,value);write(homeTextStorageKeys[id],value);if(id==='songTitle')music.renameTrack(value);});showToast('主画面文字已保存');}
 function chooseIcon(kind:IconKind,key:string){pendingIcon.current={kind,key};if(iconInput.current){iconInput.current.value='';iconInput.current.click();}}
 async function onIcon(event:ChangeEvent<HTMLInputElement>){const input=event.currentTarget,file=input.files?.[0],target=pendingIcon.current;pendingIcon.current=null;if(!file||!target)return;if(!file.type.startsWith('image/')){input.value='';return;}try{const data=await compressCustomIcon(file);setIconDrafts(values=>({...values,[target.kind]:{...values[target.kind],[target.key]:data}}));}catch{}input.value='';}
 function resetIcons(){setIconDrafts({app:Object.fromEntries(iconConfigs.app.map(item=>[item.key,''])),dock:Object.fromEntries(iconConfigs.dock.map(item=>[item.key,'']))});}
 function saveIcons(){try{for(const kind of ['app','dock'] as const)for(const {key} of iconConfigs[kind]){const data=(iconDrafts[kind][key]||'').trim(),storageKey=`smallphone_${kind}_icon_${key}`;if(data)localStorage.setItem(storageKey,data);else localStorage.removeItem(storageKey);setIcons(values=>({...values,[kind]:{...values[kind],[key]:data}}));}showToast('已保存');}catch{showToast('保存失败');}}
 function deactivateFont(){setFont({name:'默认字体',source:'霞鹜圆体 / Georgia',badge:'DEFAULT',active:false});setFontUrl('');}
 async function loadBlob(blob:Blob,name:string){const face=new FontFace(CUSTOM_FONT_FAMILY,await blob.arrayBuffer());await face.load();document.fonts.add(face);setFont({name:name||'本地字体',source:`本地文件 · ${name||'Font file'}`,badge:'CUSTOM',active:true});}
 async function loadUrl(raw:string,displayName=''){const parsed=new URL(raw,window.location.href);if(!/^https?:$/.test(parsed.protocol))throw Error('请输入 http 或 https 字体直链');const face=new FontFace(CUSTOM_FONT_FAMILY,`url("${parsed.href.replace(/"/g,'%22')}")`);await face.load();document.fonts.add(face);const name=displayName||decodeURIComponent(parsed.pathname.split('/').pop()||parsed.hostname)||'网络字体';setFont({name,source:`网络直链 · ${parsed.hostname}`,badge:'CUSTOM',active:true});return{href:parsed.href,name};}
 useEffect(()=>{void(async()=>{const type=read('smallphone_custom_font_type'),name=read('smallphone_custom_font_name');if(type==='url'){const url=read('smallphone_custom_font_url');if(!url)return;setFontUrl(url);try{await loadUrl(url,name);}catch{deactivateFont();showToast('已保存的链接字体暂时无法载入');}}else if(type==='file')try{const record=await readLocalFontRecord();if(record?.blob)await loadBlob(record.blob,name||record.name);}catch{deactivateFont();showToast('已保存的本地字体暂时无法载入');}})();},[]);
 async function onFont(event:ChangeEvent<HTMLInputElement>){const file=event.currentTarget.files?.[0];if(!file)return;if(!/\.(ttf|otf|woff|woff2)$/i.test(file.name)){showToast('请选择 TTF、OTF、WOFF 或 WOFF2 字体文件');return;}showToast('正在载入字体…');try{await loadBlob(file,file.name);await saveLocalFontRecord(file);try{localStorage.setItem('smallphone_custom_font_type','file');localStorage.setItem('smallphone_custom_font_name',file.name);localStorage.removeItem('smallphone_custom_font_url');}catch{}setFontUrl('');showToast('字体文件已载入并保存');}catch(error){showToast(error instanceof Error?error.message:'字体文件载入失败');}}
 async function applyFontUrl(){const raw=fontUrl.trim();if(!raw){showToast('请先粘贴字体文件链接');return;}showToast('正在从链接载入字体…');try{const loaded=await loadUrl(raw);try{localStorage.setItem('smallphone_custom_font_type','url');localStorage.setItem('smallphone_custom_font_url',loaded.href);localStorage.setItem('smallphone_custom_font_name',loaded.name);}catch{}await clearLocalFontRecord();setFontUrl(loaded.href);showToast('网络字体已载入并保存');}catch(error){showToast(error instanceof Error?error.message:'链接字体载入失败，请确认是可访问的字体直链');}}
 async function resetFont(){deactivateFont();try{for(const key of ['type','url','name'])localStorage.removeItem('smallphone_custom_font_'+key);}catch{}await clearLocalFontRecord();showToast('已恢复默认字体');}
 return{pageOpen,pageRef,closePage,color,hex,setHex,applyColor,applyHex,glass,setGlass,splash,setSplash,wallpaper,wallpaperLayers,opacity,setOpacity,wallpaperInput,onWallpaper,removeWallpaper,modalRef,modalOpen,previous,draftColor,modalHex,setModalHex,hsv,modalReady,openModal,closeModal,modalApplyHex,setRange,confirmModal:()=>{applyColor(draftColor);closeModal(false);showToast('主题颜色已保存');},texts,setTexts,saveTexts,resetTexts:()=>saveTexts(defaultHomeTexts),icons,iconDrafts,chooseIcon,onIcon,resetIcons,saveIcons,iconInput,font,fontUrl,setFontUrl,fontInput,onFont,applyFontUrl,resetFont};
}
const Context=createContext<ReturnType<typeof useAppearanceState>|null>(null);
export function AppearanceProvider({children}:{children:ReactNode}){const value=useAppearanceState();return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useAppearance(){const value=useContext(Context);if(!value)throw Error('AppearanceProvider is required');return value;}
