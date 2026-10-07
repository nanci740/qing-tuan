import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MutableRefObject } from 'react';
import type { ChatPreferenceServices } from '../types/chatPreferences';
import { useChatNavigation } from '../providers/ChatNavigationProvider';
import { saveChatPreferences } from '../utils/chatPreferences';
import { showToast } from '../utils/toast';
import { readChatWallpaper, writeChatWallpaper, deleteChatWallpaper, readChatFont, writeChatFont, deleteChatFont, scopeChatBubbleCss } from '../utils/chatAppearance';
export function useChatAppearance(services: MutableRefObject<ChatPreferenceServices | null>) {
 const navigation = useChatNavigation();
 const [view, setView] = useState({wallpaperState:'未设置', wallpaperEnabled:false, backgroundImage:'', fontName:'跟随全站字体',fontSource:'只调整当前聊天室的气泡文字',fontBadge:'DEFAULT',fontStatus:'',fontUrl:'',urlVersion:0,bubbleStyle:''});
 const state = useRef(view);
 const wallpaperUrl=useRef(''),fontObjectUrl=useRef(''),fontLoadKey=useRef(''),fontFace=useRef<FontFace|null>(null);
 function update(patch: Partial<typeof view>) {state.current={...state.current,...patch};flushSync(()=>setView(state.current));}
 function save() {saveChatPreferences(services.current!.currentKey(), services.current!.readCurrent());}
 useLayoutEffect(()=>()=>{if(wallpaperUrl.current)URL.revokeObjectURL(wallpaperUrl.current);if(fontObjectUrl.current)URL.revokeObjectURL(fontObjectUrl.current);if(fontFace.current)document.fonts.delete(fontFace.current);},[]);
    async function applyChatWallpaper() {
        const key = services.current!.currentKey();
        if (wallpaperUrl.current) URL.revokeObjectURL(wallpaperUrl.current);
        wallpaperUrl.current = '';
        try {
            const blob = await readChatWallpaper(key);
            if (key !== services.current!.currentKey()) return;
            if (blob) {
                wallpaperUrl.current = URL.createObjectURL(blob);
                update({backgroundImage: `url("${wallpaperUrl.current}")`});
                navigation.appearanceClass('chat-wallpaper-on', true);
                update({wallpaperState: '已设置当前角色壁纸'});
                setChatWallpaperControlsEnabled(true);
            } else {
                update({backgroundImage: ''});
                navigation.appearanceClass('chat-wallpaper-on', false);
                update({wallpaperState: '未设置'});
                setChatWallpaperControlsEnabled(false);
            }
        } catch (error) {
            update({backgroundImage: ''});
            navigation.appearanceClass('chat-wallpaper-on', false);
            update({wallpaperState: '当前环境无法读取壁纸'});
            setChatWallpaperControlsEnabled(false);
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
        if (force) fontLoadKey.current = '';
        const key = services.current!.currentKey();
        const type = services.current!.readCurrent().fontType;
        const loadKey = [key, type, services.current!.readCurrent().fontName, services.current!.readCurrent().fontUrl].join('|');
        if (type === 'inherit') {
            clearActiveChatFont();
            updateChatFontSummary();
            showChatFontStatus('');
            return true;
        }
        if (fontLoadKey.current === loadKey && fontFace.current) {
            updateChatFontSummary(services.current!.readCurrent().fontName || '聊天室字体', type === 'file' ? '本地字体文件' : services.current!.readCurrent().fontUrl, 'CUSTOM');
            return true;
        }
        clearActiveChatFont();
        try {
            let source = services.current!.readCurrent().fontUrl;
            if (type === 'file') {
                const blob = await readChatFont(key);
                if (!blob) throw new Error('找不到已保存的字体文件');
                if (key !== services.current!.currentKey()) return false;
                fontObjectUrl.current = URL.createObjectURL(blob);
                source = fontObjectUrl.current;
            }
            if (!source) throw new Error('字体来源为空');
            const face = new FontFace('SmallPhoneChatCustomFont', `url(${JSON.stringify(source)})`);
            await face.load();
            if (key !== services.current!.currentKey()) return false;
            document.fonts.add(face);
            fontFace.current = face;
            fontLoadKey.current = loadKey;
            navigation.appearanceStyle('--chat-message-font-family', '"SmallPhoneChatCustomFont", var(--font-active)');
            updateChatFontSummary(services.current!.readCurrent().fontName || '聊天室字体', type === 'file' ? '本地字体文件' : source, 'CUSTOM');
            showChatFontStatus('字体已载入');
            return true;
        } catch (error) {
            clearActiveChatFont();
            updateChatFontSummary(services.current!.readCurrent().fontName || '字体载入失败', type === 'url' ? services.current!.readCurrent().fontUrl : '请重新选择字体文件', 'ERROR');
            showChatFontStatus((error as Error)?.message || '字体载入失败');
            return false;
        }
    }
    function applyChatAppearance() {
        navigation.appearanceStyle('--chat-message-font-size', `${services.current!.readCurrent().fontSize}px`);
        applyChatFont();
        try {
            update({bubbleStyle: scopeChatBubbleCss(services.current!.readCurrent().bubbleCss)});
            navigation.appearanceClass('chat-custom-bubble-active', Boolean(services.current!.readCurrent().bubbleCss.trim()));
        } catch (error) {
            update({bubbleStyle: ''});
            navigation.appearanceClass('chat-custom-bubble-active', false);
        }
        applyChatWallpaper();
    }
    async function importFont(file: File) {
        if (!file) return;
        if (!/\.(ttf|otf|woff|woff2)$/i.test(file.name)) {
            showChatFontStatus('请选择 TTF、OTF、WOFF 或 WOFF2 字体文件');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            showChatFontStatus('字体文件不能超过 20 MB');
            return;
        }
        try {
            await writeChatFont(services.current!.currentKey(), file);
            services.current!.readCurrent().fontType = 'file';
            services.current!.readCurrent().fontName = file.name;
            services.current!.readCurrent().fontUrl = '';
            fontLoadKey.current = '';
            save();
            await applyChatFont();
            showToast('当前聊天室字体已载入');
        } catch (error) { showChatFontStatus((error as Error)?.message || '字体文件载入失败'); }
    }
    async function applyChatFontUrl(rawInput: string) {
        const raw = String(rawInput || '').trim();
        try {
            const parsed = new URL(raw);
            if (!/^https?:$/.test(parsed.protocol)) throw new Error('请填写 HTTP 或 HTTPS 字体直链');
            services.current!.readCurrent().fontType = 'url';
            services.current!.readCurrent().fontName = decodeURIComponent(parsed.pathname.split('/').pop() || '网络字体').slice(0, 160);
            services.current!.readCurrent().fontUrl = parsed.href;
            fontLoadKey.current = '';
            save();
            const loaded = await applyChatFont();
            if (loaded) showToast('当前聊天室字体已载入');
        } catch (error) { showChatFontStatus((error as Error)?.message || '字体链接载入失败'); }
    }
    async function resetFont() {
        await deleteChatFont(services.current!.currentKey()).catch(() => {});
        services.current!.readCurrent().fontType = 'inherit';
        services.current!.readCurrent().fontName = '';
        services.current!.readCurrent().fontUrl = '';
        save();
        await applyChatFont();
        showToast('已恢复跟随全站字体');
    }
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
    async function importWallpaper(file: File) {
        if (!file) return;
        if (!file.type.startsWith('image/')) return showToast('请选择图片文件');
        if (file.size > 12 * 1024 * 1024) return showToast('壁纸请控制在 12 MB 以内');
        try {
            await writeChatWallpaper(services.current!.currentKey(), file);
            await applyChatWallpaper();
            showToast('当前角色壁纸已保存');
        } catch (error) { showToast((error as Error).message || '壁纸保存失败'); }
    }
    async function removeWallpaper() {
        try {
            await deleteChatWallpaper(services.current!.currentKey());
            await applyChatWallpaper();
            showToast('已移除当前角色壁纸');
        } catch (error) { showToast((error as Error).message || '壁纸移除失败'); }
    }

 function sync() {applyChatWallpaperEffects();updateChatFontSummary(services.current!.readCurrent().fontType==='inherit'?'':services.current!.readCurrent().fontName,services.current!.readCurrent().fontType==='file'?'本地字体文件':services.current!.readCurrent().fontUrl,services.current!.readCurrent().fontType==='inherit'?'DEFAULT':'CUSTOM');applyChatAppearance();}
 function range(key: 'wallpaperFade'|'wallpaperBlur', value: number) {services.current!.readCurrent()[key]=value;applyChatWallpaperEffects();save();}
 return {view,sync,range,importFont,applyChatFontUrl,resetFont,applyBubble,resetBubble,importWallpaper,removeWallpaper,applyChatFont,applyChatWallpaper,applyChatWallpaperEffects};
}
