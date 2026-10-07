import { PressedButton } from '../../../components/shared/PressedButton';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChatSidebarSources } from '../../../providers/ChatSidebarProvider';
import { useChatMyPresenceState } from '../../../providers/ChatSidebarProvider';
import { useLegacyChatSidebarSource } from '../../../hooks/useLegacyChatSidebarSource';
import { photoBackground } from '../../../utils/chatPresence';
/** 聊天室右边栏：对方形象、TA 的动态、我的形象与在线状态。 */
export function ChatSidebar(){const refs=useChatSidebarSources(),[mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);const source=useLegacyChatSidebarSource(),{me,button,toggle}=useChatMyPresenceState();
 return mounted&&refs.room.current ? createPortal(<aside className="cr-side" aria-label="聊天资料栏">{'\n        '}<section className="cr-panel cr-peer-panel"><div className="cr-panel-head cr-presence" data-cr-presence="" data-state={source.online}><i/><span>{source.online}</span></div><div className="cr-photo" data-cr-peer-photo="" style={source.peerAvatar?{backgroundImage:photoBackground(source.peerAvatar)}:undefined}/><div className="cr-panel-name" data-cr-peer-name="">{source.peerName}</div><div className="cr-status" data-cr-status="" hidden={!source.status}>{source.status}</div></section>{'\n        '}<section className="cr-panel cr-feed"><div className="cr-panel-head">TA 的动态</div><div className="cr-feed-body">还没有新动态。<br/>TA 更新朋友圈或日记时会显示在这里。</div></section>{'\n        '}<section className="cr-panel cr-self-panel"><PressedButton type="button" className="cr-panel-head cr-presence cr-my-presence" data-cr-my-presence="" aria-haspopup="menu" aria-label="切换我的在线状态" data-state={me.custom?'自定义':me.online} ref={button} onClick={event=>{event.stopPropagation();toggle();}}><i/><span>{me.online}</span><b className="cr-my-caret" aria-hidden="true"/></PressedButton><div className="cr-photo" data-cr-self-photo="" style={{backgroundImage:photoBackground(source.selfAvatar)}}/><div className="cr-panel-name">我</div></section></aside>,refs.room.current):null;
}
