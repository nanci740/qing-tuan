import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MutableRefObject } from 'react';
import type { ChatPreferenceServices, ChatPreferences } from '../types/chatPreferences';
import { useChatNavigation } from '../providers/ChatNavigationProvider';
import { saveChatPreferences, saveChatPreferencesOrThrow } from '../utils/chatPreferences';
import { CHAT_THEME_KEY } from '../utils/chatTheme';
import { showToast } from '../utils/toast';
import { readChatWallpaper, writeChatWallpaper, deleteChatWallpaper, scopeChatBubbleCss } from '../utils/chatAppearance';
async function readyAsset<T>(promise: Promise<T>): Promise<T> {
 let timer: ReturnType<typeof setTimeout> | undefined;
 try { return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('聊天资源加载超时，请重试')),5000);})]); }
 finally { clearTimeout(timer); }
}
export function useChatAppearance(services: MutableRefObject<ChatPreferenceServices | null>) {
 const navigation = useChatNavigation();
 const [view, setView] = useState({wallpaperState:'未设置', wallpaperEnabled:false, backgroundImage:'', bubbleStyle:'',own:{wallpaper:false,size:false,bubble:false}});
 const state = useRef(view);
 const wallpaperRequest=useRef(0), wallpaperOwner=useRef(''), wallpaperLoaded=useRef(false), assetBusy=useRef(false);
 const wallpaperUrl=useRef('');
 function update(patch: Partial<typeof view>) {state.current={...state.current,...patch};flushSync(()=>setView(state.current));}
 function save() {saveChatPreferences(services.current!.currentKey(), services.current!.readCurrent());}
 useLayoutEffect(()=>()=>{wallpaperRequest.current++;if(wallpaperUrl.current)URL.revokeObjectURL(wallpaperUrl.current);},[]);
    async function applyChatWallpaper(force = false) {
        const key = services.current!.currentKey();
        if (!force && wallpaperOwner.current === key && wallpaperLoaded.current) return;
        const request = ++wallpaperRequest.current;
        const current = () => request === wallpaperRequest.current && key === services.current!.currentKey();
        if (wallpaperOwner.current !== key) {
            if (wallpaperUrl.current) URL.revokeObjectURL(wallpaperUrl.current);
            wallpaperUrl.current = ''; wallpaperOwner.current = key; wallpaperLoaded.current = false;
            update({backgroundImage: '', wallpaperEnabled: false});
            navigation.appearanceClass('chat-wallpaper-on', false);
        }
        try {
            // 自己的壁纸图优先；没有自己的就用全部聊天的预设壁纸
            const prefs = services.current!.readCurrent();
            let blob = prefs.styleOwn.wallpaper ? await readChatWallpaper(key) : null, shared = false;
            if (!prefs.styleOwn.wallpaper) {
                const mine = await readChatWallpaper(key);
                // 以前就设过壁纸的聊天：照旧用它自己的
                if (mine) { blob = mine; if (current()) { prefs.styleOwn = {...prefs.styleOwn, wallpaper: true}; save(); update({own: {...prefs.styleOwn}}); } }
                else { blob = await readChatWallpaper(CHAT_THEME_KEY); shared = Boolean(blob); }
            }
            if (!current()) return;
            const next = blob ? URL.createObjectURL(blob) : '';
            if (next) {
                try { const image = new Image(); image.src = next; await readyAsset(image.decode()); }
                catch (error) { URL.revokeObjectURL(next); throw error; }
                if (!current()) { URL.revokeObjectURL(next); return; }
            }
            wallpaperLoaded.current = true;
            if (wallpaperUrl.current) URL.revokeObjectURL(wallpaperUrl.current);
            wallpaperUrl.current = next;
            update({backgroundImage: next ? `url("${next}")` : '', wallpaperState: shared ? '用的是全部聊天的壁纸' : blob ? '已设置当前角色壁纸' : '未设置'});
            navigation.appearanceClass('chat-wallpaper-on', Boolean(blob));
            setChatWallpaperControlsEnabled(Boolean(blob));
        } catch {
            if (current()) update({wallpaperState: '壁纸读取失败，请重试'});
        }
    }
    function setChatWallpaperControlsEnabled(enabled: boolean) { update({wallpaperEnabled: enabled}); }
    function applyChatWallpaperEffects() {
        const fade = Math.min(85, Math.max(0, Number(services.current!.readCurrent().wallpaperFade) || 0));
        const blur = Math.min(8, Math.max(0, Number(services.current!.readCurrent().wallpaperBlur) || 0));
        navigation.appearanceStyle('--chat-wallpaper-fade', String(fade / 100));
        navigation.appearanceStyle('--chat-wallpaper-blur', `${blur}px`);
    }
    /** 聊天室不再单独换字体：气泡文字一律跟着美化设置的全站字体。 */
    async function applyChatFont(_force = false) {
        navigation.appearanceStyle('--chat-message-font-family', 'var(--font-active)');
        return true;
    }
    async function applyChatAppearance() {
        navigation.appearanceStyle('--chat-message-font-size', `${services.current!.readCurrent().fontSize}px`);
        const fontReady = applyChatFont();
        try {
            update({bubbleStyle: scopeChatBubbleCss(services.current!.readCurrent().bubbleCss)});
            navigation.appearanceClass('chat-custom-bubble-active', Boolean(services.current!.readCurrent().bubbleCss.trim()));
        } catch (error) {
            update({bubbleStyle: ''});
            navigation.appearanceClass('chat-custom-bubble-active', false);
        }
        await Promise.all([fontReady, applyChatWallpaper()]);
    }
    function applyBubble(raw: string) {
        try {
            scopeChatBubbleCss(raw || '');
            services.current!.readCurrent().bubbleCss = String(raw || '').slice(0, 5000);
            own('bubble');
            save(); services.current!.apply();
            showToast(services.current!.readCurrent().bubbleCss ? '专属气泡样式已应用' : '已使用默认气泡样式');
        } catch (error) { showToast((error as Error).message || '气泡 CSS 格式不正确'); }
    }
    function resetBubble() {
        services.current!.readCurrent().bubbleCss = '';
        own('bubble');
        save(); services.current!.apply();
        showToast('已恢复默认气泡样式');
    }
    async function changeWallpaper(file: File | null) {
        if (assetBusy.current) return showToast('正在保存，请稍候');
        assetBusy.current = true;
        const key = services.current!.currentKey();
        let validationUrl = '';
        try {
            if (file) {
                validationUrl = URL.createObjectURL(file);
                const image = new Image(); image.src = validationUrl; await readyAsset(image.decode());
            }
            if (key !== services.current!.currentKey()) return;
            if (file) await writeChatWallpaper(key, file); else await deleteChatWallpaper(key);
            if (key !== services.current!.currentKey()) return;
            own('wallpaper'); save();
            await applyChatWallpaper(true);
            showToast(file ? '当前角色壁纸已保存' : '已移除当前角色壁纸');
        } catch (error) {
            if (key === services.current!.currentKey()) showToast((error as Error).message || '壁纸保存失败，请重试');
        } finally {if (validationUrl) URL.revokeObjectURL(validationUrl);assetBusy.current = false;}
    }
    async function importWallpaper(file: File) {
        if (!file) return;
        if (!file.type.startsWith('image/')) return showToast('请选择图片文件');
        if (file.size > 12 * 1024 * 1024) return showToast('壁纸请控制在 12 MB 以内');
        await changeWallpaper(file);
    }
    async function removeWallpaper() {await changeWallpaper(null);}

 /** 这一块改成这个聊天自己的（之后预设换了也不跟着变）。 */
 function own(group: 'wallpaper' | 'size' | 'bubble') {const prefs=services.current!.readCurrent();if(!prefs.styleOwn[group])prefs.styleOwn={...prefs.styleOwn,[group]:true};update({own:{...prefs.styleOwn}});}
 /** 跟着预设壁纸时动了淡化、模糊：先把预设那张图复制成自己的，图才不会不见。 */
 async function claimWallpaper(key: string) {const blob=await readChatWallpaper(CHAT_THEME_KEY);if(blob&&!await readChatWallpaper(key))await writeChatWallpaper(key,blob);}
 /** 改回跟着预设以后重新套一次（不管之前载入过什么）。 */
 async function refresh() {wallpaperLoaded.current=false;await sync();}
 function sync() {update({own:{...services.current!.readCurrent().styleOwn}});applyChatWallpaperEffects();return applyChatAppearance();}
 function range(key: 'wallpaperFade'|'wallpaperBlur', value: number) {services.current!.readCurrent()[key]=value;applyChatWallpaperEffects();save();}
 return {view,sync,refresh,claimWallpaper,range,applyBubble,resetBubble,importWallpaper,removeWallpaper,applyChatFont,applyChatWallpaper,applyChatWallpaperEffects};
}
