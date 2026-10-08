import {useChatMessages,ChatMessageContent} from '../../../providers/ChatMessagesProvider';
import {useChatSelection} from '../../../providers/ChatSelectionProvider';
import {useMessageOperations} from '../../../providers/ChatMessageOperationsProvider';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
import { useChatRoomRevision } from '../../../providers/ChatNavigationProvider';
import { PressedButton } from '../../../components/shared/PressedButton';
export function ChatAppearanceText({id,tag='span',className}:{id:string;tag?:'span'|'strong'|'div';className?:string}) {
 const {values,appearance:{view}}=useChatPreferences();
 const text:Record<string,string>={chatWallpaperState:view.wallpaperState,chatFontName:view.fontName,chatFontSource:view.fontSource,chatFontBadge:view.fontBadge,chatFontImportStatus:view.fontStatus,chatWallpaperFadeValue:`${values.wallpaperFade}%`,chatWallpaperBlurValue:`${values.wallpaperBlur} px`,chatFontSizeValue:`${values.fontSize.toFixed(1)} px`};
 const Tag=tag;return <Tag id={id} className={className} aria-live={id==='chatFontImportStatus'?'polite':undefined}>{text[id]}</Tag>;
}
export function ChatAppearanceRangeRow({id,children}:{id:string;children:ReactNode}) {const {appearance:{view}}=useChatPreferences();return <div id={id} className={'chat-setting-range-row'+(view.wallpaperEnabled?'':' is-disabled')}>{children}</div>;}
export function ChatAppearanceRange({setting}:{setting:'wallpaperFade'|'wallpaperBlur'|'fontSize'}) {
 const {values,syncVersion,change,appearance:{view}}=useChatPreferences(),input=useRef<HTMLInputElement|null>(null);
 useLayoutEffect(()=>{if(input.current)input.current.value=String(values[setting]);},[values[setting],syncVersion]);
 const font=setting==='fontSize',fade=setting==='wallpaperFade';return <input ref={input} className="chat-setting-range" id={font?'chatFontSize':fade?'chatWallpaperFade':'chatWallpaperBlur'} type="range" min={font?9:0} max={font?16:fade?85:8} step={font?0.5:fade?5:1} defaultValue={font?10.5:fade?54:0} aria-label={font?'对话字号':fade?'壁纸淡化强度':'壁纸模糊度'} disabled={font?undefined:!view.wallpaperEnabled} onInput={e=>change(setting,Number(e.currentTarget.value)||(font?10.5:0))}/>;
}
export function ChatAppearanceAction({id,className,children}:{id:string;className:string;children:ReactNode}) {
 const {appearance}=useChatPreferences();return <PressedButton id={id} className={className} type="button" onClick={()=>{window.dispatchEvent(new CustomEvent('qingtuan:chat-appearance-action',{detail:id}));if(id==='chatFontReset')void appearance.resetFont();if(id==='chatBubbleReset')appearance.resetBubble();if(id==='chatWallpaperRemove')void appearance.removeWallpaper();}}>{children}</PressedButton>;
}
export function ChatAppearanceFile({font=false}:{font?:boolean}) {
 const {appearance}=useChatPreferences(),input=useRef<HTMLInputElement|null>(null);
 useLayoutEffect(()=>{const choose=(e:Event)=>{if((e as CustomEvent<string>).detail===(font?'chatFontChoose':'chatWallpaperChoose')&&input.current){input.current.value='';input.current.click();}};window.addEventListener('qingtuan:chat-appearance-action',choose);return()=>window.removeEventListener('qingtuan:chat-appearance-action',choose);},[font]);
 return <input ref={input} id={font?'chatFontFileInput':'chatWallpaperInput'} type="file" accept={font?'.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/font-woff,application/font-sfnt':'image/*'} hidden onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void(font?appearance.importFont(file):appearance.importWallpaper(file));}}/>;
}
export function ChatAppearanceDraft({bubble=false}:{bubble?:boolean}) {
 const {values,syncVersion,appearance}=useChatPreferences(),input=useRef<HTMLInputElement & HTMLTextAreaElement|null>(null);const [draft,setDraft]=useState('');const latest=useRef(appearance);latest.current=appearance;
 useLayoutEffect(()=>{const value=bubble?values.bubbleCss:appearance.view.fontUrl;setDraft(value);if(input.current)input.current.value=value;},[bubble?syncVersion:appearance.view.urlVersion]);
 useLayoutEffect(()=>{const apply=(e:Event)=>{if((e as CustomEvent<string>).detail===(bubble?'chatBubbleApply':'chatFontUrlApply')){const value=input.current?.value??draft;if(bubble)latest.current.applyBubble(value);else void latest.current.applyChatFontUrl(value);}};window.addEventListener('qingtuan:chat-appearance-action',apply);return()=>window.removeEventListener('qingtuan:chat-appearance-action',apply);},[bubble,draft]);
 if(bubble)return <textarea ref={input} className="chat-setting-code" id="chatBubbleCss" maxLength={5000} spellCheck={false} placeholder={'.chat-message-row.is-user .chat-bubble {\n  color: var(--color-text);\n}'} onInput={e=>setDraft(e.currentTarget.value)}/>;
 return <input ref={input} className="theme-font-url-input" id="chatFontUrlInput" type="url" inputMode="url" placeholder="粘贴 .ttf / .woff2 字体直链" aria-label="当前聊天室字体链接" onInput={e=>setDraft(e.currentTarget.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void appearance.applyChatFontUrl(e.currentTarget.value);}}}/>;
}
export function ChatBubbleStyle() {const {appearance:{view}}=useChatPreferences();return createPortal(<style id="chatCustomBubbleStyle">{view.bubbleStyle}</style>,document.head);}
/** 壁纸层只覆盖消息框的内侧，不参与消息滚动或页面布局。 */
export function ChatMessageWallpaper() {
 const layer=useRef<HTMLDivElement>(null);
 const revision=useChatRoomRevision(),{appearance:{view}}=useChatPreferences();
 const source=view.backgroundImage?JSON.parse(view.backgroundImage.slice(4,-1)) as string:'';
 useLayoutEffect(()=>{
  // 壁纸层与消息框都是聊天室的直接子元素，从自身父元素取得，避免全局 ID 查找。
  const room=layer.current?.parentElement,panel=room?.querySelector<HTMLElement>(':scope > .chat-message-list');
  if(!panel||!room)return;
  const sync=()=>{if(!layer.current)return;const p=panel.getBoundingClientRect(),r=room.getBoundingClientRect();Object.assign(layer.current.style,{left:`${p.left-r.left+panel.clientLeft}px`,top:`${p.top-r.top+panel.clientTop}px`,width:`${panel.clientWidth}px`,height:`${panel.clientHeight}px`});};
  sync();const observer=new ResizeObserver(sync);observer.observe(panel);observer.observe(room);window.addEventListener('resize',sync);
  return()=>{observer.disconnect();window.removeEventListener('resize',sync);};
 },[revision,source]);
 return <div ref={layer} className="chat-message-wallpaper" aria-hidden="true">{source&&<img src={source} alt="" decoding="sync"/>}</div>;
}
export function ChatWallpaperMessageList() {const operations=useMessageOperations();const selection=useChatSelection();const messages=useChatMessages();return <div ref={messages.list} onClickCapture={selection.clickCapture} onKeyDown={event=>messages.api.keyDown(event.nativeEvent)} onClick={event=>{messages.api.click(event.nativeEvent);const card=(event.target as Element).closest('[data-forward-record-id]');const id=card?.getAttribute('data-forward-record-id');if(id)window.dispatchEvent(new CustomEvent('qingtuan:record-detail-open',{detail:id}));}} onPointerDown={operations.pointerDown} onPointerMove={operations.pointerMove} onPointerUp={operations.cancelLongPress} onPointerCancel={operations.cancelLongPress} onContextMenu={operations.contextMenu} onScroll={operations.closeMenu} className="chat-message-list" id="chatMessageList" aria-live="polite"><ChatMessageContent/></div>;}
