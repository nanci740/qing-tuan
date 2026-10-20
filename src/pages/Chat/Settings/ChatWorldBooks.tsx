import {useMemo,useSyncExternalStore} from 'react';
import {useChatPreferences} from '../../../providers/ChatPreferencesProvider';
import {readChatWorldBooks} from '../../../utils/chatWorldContext';
import {subscribeCatalog,catalogRevision} from '../../../utils/catalogStorage';
import {worldBookBoundTo} from '../../../utils/worldStorage';
const activeChatKey=()=>String((window as Window&{smallphoneGetActiveChatKey?:()=>unknown}).smallphoneGetActiveChatKey?.()||'');
/** 世界书勾选由 React 管理，保留原存储格式和选项顺序。关联到全部角色或这个角色的书会自动带上，勾选框锁定为已勾。 */
export function ChatWorldBooks(){const {values,syncVersion,change}=useChatPreferences();const revision=useSyncExternalStore(subscribeCatalog,()=>catalogRevision('worldBooks'));const books=useMemo(readChatWorldBooks,[syncVersion,revision]);const chatKey=useMemo(activeChatKey,[syncVersion]);return books.length?books.map((book,index)=>{const bound=worldBookBoundTo(book,chatKey);return <label className="chat-worldbook-option" key={index}><span>{String(book.name||'未命名世界书')}{bound?(book.bindId==='all'?' · 全部角色':' · 已关联'):''}</span><input type="checkbox" disabled={bound} checked={bound||values.linkedWorldBooks.includes(String(book.id))} onChange={event=>{const ids=new Set(values.linkedWorldBooks);if(event.target.checked)ids.add(String(book.id));else ids.delete(String(book.id));change('linkedWorldBooks',[...ids]);}}/></label>;}):<div className="chat-setting-empty">暂时没有世界书</div>;}
