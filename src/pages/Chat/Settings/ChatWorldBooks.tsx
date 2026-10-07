import {useMemo} from 'react';
import {useChatPreferences} from '../../../providers/ChatPreferencesProvider';
import {readChatWorldBooks} from '../../../utils/chatWorldContext';
/** 世界书勾选由 React 管理，保留原存储格式和选项顺序。 */
export function ChatWorldBooks(){const {values,syncVersion,change}=useChatPreferences();const books=useMemo(readChatWorldBooks,[syncVersion]);return books.length?books.map((book,index)=><label className="chat-worldbook-option" key={index}><span>{String(book.name||'未命名世界书')}</span><input type="checkbox" checked={values.linkedWorldBooks.includes(String(book.id))} onChange={event=>{const ids=new Set(values.linkedWorldBooks);if(event.target.checked)ids.add(String(book.id));else ids.delete(String(book.id));change('linkedWorldBooks',[...ids]);}}/></label>):<div className="chat-setting-empty">暂时没有世界书</div>;}
