import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MutableRefObject } from 'react';
import type { ChatPreferenceServices, ChatPreferences } from '../types/chatPreferences';
import { useChatNavigation } from '../providers/ChatNavigationProvider';
import { saveChatPreferences, saveChatPreferencesOrThrow } from '../utils/chatPreferences';
import { showToast } from '../utils/toast';
import { readChatWallpaper, writeChatWallpaper, deleteChatWallpaper, readChatFont, writeChatFont, deleteChatFont, scopeChatBubbleCss } from '../utils/chatAppearance';
async function readyAsset<T>(promise: Promise<T>): Promise<T> {
 let timer: ReturnType<typeof setTimeout> | undefined;
 try { return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('聊天资源加载超时，请重试')),5000);})]); }
 finally { clearTimeout(timer); }
}
export function useChatAppearance(services: MutableRefObject<ChatPreferenceServices | null>) {
 const navigation = useChatNavigation();
 const [view, setView] = useState({wallpaperState:'未设置', wallpaperEnabled:false, backgroundImage:'', fontName:'跟随全站字体',fontSource:'只调整当前聊天室的气泡文字',fontBadge:'DEFAULT',fontStatus:'',fontUrl:'',urlVersion:0,bubbleStyle:''});
 const state = useRef(view);
 const wallpaperRequest=useRef(0), fontRequest=useRef(0), wallpaperOwner=useRef(''), wallpaperLoaded=useRef(false), fontOwner=useRef(''), assetBusy=useRef(false);
 const wallpaperUrl=useRef(''),fontObjectUrl=useRef(''),fontLoadKey=useRef(''),fontFace=useRef<FontFace|null>(null);
 function update(patch: Partial<typeof view>) {state.current={...state.current,...patch};flushSync(()=>setView(state.current));}
 function save() {saveChatPreferences(services.current!.currentKey(), services.current!.readCurrent());}
 useLayoutEffect(()=>()=>{wallpaperRequest.current++;fontRequest.current++;if(wallpaperUrl.current)URL.revokeObjectURL(wallpaperUrl.current);if(fontObjectUrl.current)URL.revokeObjectURL(fontObjectUrl.current);if(fontFace.current)document.fonts.delete(fontFace.current);},[]);
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
            const blob = await readChatWallpaper(key);
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
            update({backgroundImage: next ? `url("${next}")` : '', wallpaperState: blob ? '已设置当前角色壁纸' : '未设置'});
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
    function showChatFontStatus(message = '') { update({fontStatus: message}); }
    function updateChatFontSummary(name = '', source = '', badge = 'DEFAULT') {
        update({fontName: name || '跟随全站字体', fontSource: source || '只调整当前聊天室的气泡文字', fontBadge: badge, fontUrl: services.current!.readCurrent().fontType === 'url' ? services.current!.readCurrent().fontUrl : '', urlVersion: state.current.urlVersion + 1});
    }
    function clearActiveChatFont() {
        if (fontFace.current && document.fonts?.delete) document.fonts.delete(fontFace.current);
        if (fontObjectUrl.current) URL.revokeObjectURL(fontObjectUrl.current);
        fontFace.current = null;
        fontObjectUrl.current = '';
        fontLoadKey.current = '';
        navigation.appearanceStyle('--chat-message-font-family', 'var(--font-active)');
    }
    async function applyChatFont(force = false) {
        const key = services.current!.currentKey(), prefs = {...services.current!.readCurrent()}, request = ++fontRequest.current;
        const current = () => request === fontRequest.current && key === services.current!.currentKey();
        const loadKey = [key, prefs.fontType, prefs.fontName, prefs.fontUrl].join('|');
        if (fontOwner.current !== key) {clearActiveChatFont();fontOwner.current = key;}
        if (prefs.fontType === 'inherit') {
            clearActiveChatFont(); updateChatFontSummary(); showChatFontStatus(''); return true;
        }
        if (!force && fontLoadKey.current === loadKey && fontFace.current) return true;
        let objectUrl = '';
        try {
            let source = prefs.fontUrl;
            if (prefs.fontType === 'file') {
                const blob = await readChatFont(key);
                if (!blob) throw new Error('找不到已保存的字体文件');
                if (!current()) return false;
                source = objectUrl = URL.createObjectURL(blob);
            }
            if (!source) throw new Error('字体来源为空');
            const face = await readyAsset(new FontFace('SmallPhoneChatCustomFont', `url(${JSON.stringify(source)})`).load());
            if (!current()) return false;
            clearActiveChatFont(); document.fonts.add(face);
            fontFace.current = face; fontObjectUrl.current = objectUrl; objectUrl = '';
            fontLoadKey.current = loadKey;
            navigation.appearanceStyle('--chat-message-font-family', '"SmallPhoneChatCustomFont", var(--font-active)');
            updateChatFontSummary(prefs.fontName || '聊天室字体', prefs.fontType === 'file' ? '本地字体文件' : source, 'CUSTOM');
            showChatFontStatus('字体已载入'); return true;
        } catch (error) {
            if (current()) showChatFontStatus((error as Error)?.message || '字体载入失败');
            return false;
        } finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
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
    async function changeFont(patch: Pick<ChatPreferences, 'fontType' | 'fontName' | 'fontUrl'>, file?: File) {
        if (assetBusy.current) return showChatFontStatus('正在保存，请稍候');
        assetBusy.current = true;
        const key = services.current!.currentKey(), preferences = {...services.current!.readCurrent(), ...patch};
        try {
            // Validate before replacing either the saved file or its metadata.
            if (file) await new FontFace('ChatFontValidation', await file.arrayBuffer()).load();
            else if (patch.fontType === 'url') await new FontFace('ChatFontValidation', `url(${JSON.stringify(patch.fontUrl)})`).load();
            if (key !== services.current!.currentKey()) return;
            const old = patch.fontType === 'url' ? undefined : await readChatFont(key);
            if (file) await writeChatFont(key, file);
            else if (patch.fontType === 'inherit') await deleteChatFont(key);
            try { saveChatPreferencesOrThrow(key, preferences); }
            catch (error) {
                if (old !== undefined) {
                    try { if (old) await writeChatFont(key, old); else await deleteChatFont(key); }
                    catch { throw new Error('设置保存失败，字体文件恢复失败，请重新选择字体'); }
                }
                throw error;
            }
            if (key !== services.current!.currentKey()) return;
            Object.assign(services.current!.readCurrent(), preferences);
            if (await applyChatFont(true)) showToast(patch.fontType === 'inherit' ? '已恢复跟随全站字体' : '当前聊天室字体已保存并载入');
        } catch (error) {
            if (key === services.current!.currentKey()) showChatFontStatus((error as Error)?.message || '字体保存失败，请重试');
        } finally {assetBusy.current = false;}
    }
    async function importFont(file: File) {
        if (!file) return;
        if (!/\.(ttf|otf|woff|woff2)$/i.test(file.name)) return showChatFontStatus('请选择 TTF、OTF、WOFF 或 WOFF2 字体文件');
        if (file.size > 20 * 1024 * 1024) return showChatFontStatus('字体文件不能超过 20 MB');
        await changeFont({fontType: 'file', fontName: file.name, fontUrl: ''}, file);
    }
    async function applyChatFontUrl(rawInput: string) {
        try {
            const parsed = new URL(String(rawInput || '').trim());
            if (!/^https?:$/.test(parsed.protocol)) throw new Error('请填写 HTTP 或 HTTPS 字体直链');
            await changeFont({fontType: 'url', fontName: decodeURIComponent(parsed.pathname.split('/').pop() || '网络字体').slice(0, 160), fontUrl: parsed.href});
        } catch (error) {showChatFontStatus((error as Error)?.message || '字体链接载入失败');}
    }
    async function resetFont() {await changeFont({fontType: 'inherit', fontName: '', fontUrl: ''});}
    function applyBubble(raw: string) {
        try {
            scopeChatBubbleCss(raw || '');
            services.current!.readCurrent().bubbleCss = String(raw || '').slice(0, 5000);
            save(); services.current!.apply();
            showToast(services.current!.readCurrent().bubbleCss ? '专属气泡样式已应用' : '已使用默认气泡样式');
        } catch (error) { showToast((error as Error).message || '气泡 CSS 格式不正确'); }
    }
    function resetBubble() {
        services.current!.readCurrent().bubbleCss = '';
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

 function sync() {applyChatWallpaperEffects();updateChatFontSummary(services.current!.readCurrent().fontType==='inherit'?'':services.current!.readCurrent().fontName,services.current!.readCurrent().fontType==='file'?'本地字体文件':services.current!.readCurrent().fontUrl,services.current!.readCurrent().fontType==='inherit'?'DEFAULT':'CUSTOM');return applyChatAppearance();}
 function range(key: 'wallpaperFade'|'wallpaperBlur', value: number) {services.current!.readCurrent()[key]=value;applyChatWallpaperEffects();save();}
 return {view,sync,range,importFont,applyChatFontUrl,resetFont,applyBubble,resetBubble,importWallpaper,removeWallpaper,applyChatFont,applyChatWallpaper,applyChatWallpaperEffects};
}
