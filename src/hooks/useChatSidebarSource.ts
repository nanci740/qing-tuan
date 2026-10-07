import {useLayoutEffect,useState} from 'react';
import {useChatRoomRevision} from '../providers/ChatNavigationProvider';
import {useChatIdentity} from '../providers/ChatIdentityProvider';
import {useChatReplyEngineState} from '../providers/ChatReplyEngineProvider';
import {DEFAULT_AVATAR} from '../utils/defaultAvatar';
import {useProfileAvatar} from '../providers/ProfileAvatarProvider';
/** 侧栏直接订阅角色资料、头像和在线状态，不从渲染结果反向同步。 */
export function useChatSidebarSource(){
 const {view}=useChatIdentity(),{presenceMap}=useChatReplyEngineState(),profile=useProfileAvatar();
 const revision=useChatRoomRevision();
 const [selfAvatar,setSelfAvatar]=useState(()=>profile.api.sidebarAvatar());
 // 保留原版资料刷新的时机：切换会话、在线状态和初次头像恢复。
 useLayoutEffect(()=>setSelfAvatar(profile.api.sidebarAvatar()),[view.attributes.chatRoomAvatar,view.text.chatRoomName,view.activeKey,presenceMap,revision,profile.restoreRevision]);
 const saved=presenceMap[view.activeKey];
 const online=['在线','忙碌','离开','隐身'].includes(saved?.online)?saved.online:'在线';
 const raw=view.attributes.chatRoomAvatar?.src||DEFAULT_AVATAR;
 return {peerAvatar:raw?new URL(raw,document.baseURI).href:'',peerName:view.text.chatRoomName||'聊天',selfAvatar,online,status:String(saved?.status||'').slice(0,30)};
}
