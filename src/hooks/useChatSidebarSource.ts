import {useLayoutEffect,useState} from 'react';
import {useChatRoomRevision} from '../providers/ChatNavigationProvider';
import {useChatIdentity} from '../providers/ChatIdentityProvider';
import {useChatReplyEngineState} from '../providers/ChatReplyEngineProvider';
import {DEFAULT_AVATAR} from '../utils/defaultAvatar';
import {useProfileAvatar} from '../providers/ProfileAvatarProvider';
import {readChatCharacters} from '../utils/chatCharacterStorage';
import {groupMembers,isGroup,memberName} from '../utils/chatGroups';
import {contactName} from '../utils/contactsStorage';
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
 // 群聊：右边栏换成成员名单（各自的在线状态）和群公告
 const characters=readChatCharacters(),active=characters.find(item=>item.archiveId===view.activeKey);
 const group=isGroup(active)?{notice:active.group.notice,members:groupMembers(active,characters).map(member=>{const state=presenceMap[member.archiveId]?.online;
  return {key:member.archiveId,name:contactName(member.archiveId,memberName(member)),avatar:member.photoUrl||DEFAULT_AVATAR,online:['在线','忙碌','离开','隐身'].includes(state)?state:'在线'};})}:null;
 return {key:view.activeKey,peerAvatar:raw?new URL(raw,document.baseURI).href:'',peerName:view.text.chatRoomName||'聊天',selfAvatar,online,status:String(saved?.status||'').slice(0,30),group};
}
