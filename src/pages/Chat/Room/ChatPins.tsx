import {createPortal} from 'react-dom';
import {useChatPins} from '../../../providers/ChatPinsProvider';
export function ChatPinIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>;}
const pinMarkup='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>';
/** 保留旧置顶摘要的 HTML 解析方式，避免改变含标签或实体的已存消息展示。 */
export function ChatPinBar(){const {view,click}=useChatPins();return <div className="chat-message-pinbar" hidden={!view.hasPinned} onClick={click} dangerouslySetInnerHTML={{__html:view.hasPinned?pinMarkup+'<span class="chat-message-pinbar-text">'+view.text+'</span>':''}}/>;}

export function ChatPinnedIndicators(){const {view}=useChatPins();return <>{view.slots.map(item=>createPortal(<ChatPinIcon/>,item.slot,item.key))}</>;}
