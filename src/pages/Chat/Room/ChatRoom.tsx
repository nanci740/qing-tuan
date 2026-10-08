import type { CSSProperties } from 'react';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
import {ChatSidebar} from './ChatSidebar';
import {ChatSelectionToolbar} from './ChatSelectionToolbar';
import {ChatRecordDetail} from './ChatRecordDetail';
import {ChatIdentityField,ChatDetailButton} from '../../../components/shared/ChatIdentityField';
import {ChatRoomMoreButton,ChatActionToggle,ChatQuickActions,ChatRoomTools} from './ChatRoomTools';
import {ChatRoomStatus} from './ChatRoomStatus';
import {ChatMicrophone} from './ChatMicrophone';
import {ChatMoonReplyButton} from './ChatReplyTrigger';
import {ChatComposeField,ChatSendButton} from './ChatComposer';
import {ChatPinBar} from './ChatPins';
import {ChatQuotePreview} from './ChatMessageOperations';
import { ChatWallpaperMessageList } from '../Settings/ChatAppearanceControls';
import { ChatNavigationSurface } from '../../../components/shared/ChatNavigationSurface';
import { useChatNavigation } from '../../../providers/ChatNavigationProvider';
import { DEFAULT_AVATAR } from '../../../utils/defaultAvatar';
import { OriginalElement } from "../../../components/shared/OriginalElement";

/** 原页面的静态结构；所有页面保持挂载，由 React 控制显示状态。 */
export function ChatRoom() {
  const navigation = useChatNavigation();
  const {appearance:{view}}=useChatPreferences();
  const wallpaperStyle = {'--chat-wallpaper-image':view.backgroundImage||'none','--chat-message-panel-bg':view.backgroundImage?'transparent':'var(--color-surface)'} as CSSProperties;
  return (
    <ChatNavigationSurface surface="room" tag="div" style={wallpaperStyle} id="chatRoomView" className="chat-view chat-room-view is-hidden">
      {"\n        "}
      <OriginalElement tag="header" attributes={[{"name":"class","value":"chat-room-header"}]}>
        {"\n            "}
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-room-back"},{"name":"id","value":"chatRoomBack"},{"name":"type","value":"button"},{"name":"aria-label","value":"返回会话列表"}]} onClick={() => navigation.showList()}>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
            <OriginalElement tag="polyline" attributes={[{"name":"points","value":"15 18 9 12 15 6"}]} />
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <ChatIdentityField tag="img" attributes={[{"name":"class","value":"chat-room-avatar"},{"name":"id","value":"chatRoomAvatar"},{"name":"alt","value":"角色头像"},{"name":"src","value":DEFAULT_AVATAR}]} />
        
        {"\n            "}
        <OriginalElement tag="div" attributes={[]}>
          {"\n                "}
          <ChatIdentityField tag="div" attributes={[{"name":"class","value":"chat-room-title"},{"name":"id","value":"chatRoomName"}]}>
            {"聊天"}
          </ChatIdentityField>
          {"\n                "}
          <ChatRoomStatus />
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <ChatRoomMoreButton>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"},{"name":"stroke","value":"none"},{"name":"fill","value":"currentColor"}]}>
            <OriginalElement tag="circle" attributes={[{"name":"cx","value":"5"},{"name":"cy","value":"12"},{"name":"r","value":"1.6"}]} />
            <OriginalElement tag="circle" attributes={[{"name":"cx","value":"12"},{"name":"cy","value":"12"},{"name":"r","value":"1.6"}]} />
            <OriginalElement tag="circle" attributes={[{"name":"cx","value":"19"},{"name":"cy","value":"12"},{"name":"r","value":"1.6"}]} />
          </OriginalElement>
          {"\n            "}
        </ChatRoomMoreButton>
        {"\n        "}
      </OriginalElement>
      {"\n\n        "}
      <ChatPinBar /><ChatWallpaperMessageList />
      {"\n\n        "}
      <ChatQuickActions>
        {"\n            "}

        {"\n            "}

        {"\n            "}
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-quick-action"},{"name":"type","value":"button"},{"name":"data-chat-action","value":"draw"}]}>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"},{"name":"aria-hidden","value":"true"}]}>
            <OriginalElement tag="path" attributes={[{"name":"d","value":"m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5Z"}]} />
            <OriginalElement tag="path" attributes={[{"name":"d","value":"m19 15-.8 2.2L16 18l2.2.8L19 21l.8-2.2L22 18l-2.2-.8Z"}]} />
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="span" attributes={[]}>
            {"Generate"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-quick-action"},{"name":"type","value":"button"},{"name":"data-chat-action","value":"location"}]}>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"},{"name":"aria-hidden","value":"true"}]}>
            <OriginalElement tag="path" attributes={[{"name":"d","value":"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"}]} />
            <OriginalElement tag="circle" attributes={[{"name":"cx","value":"12"},{"name":"cy","value":"10"},{"name":"r","value":"2.5"}]} />
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="span" attributes={[]}>
            {"Location"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-quick-action"},{"name":"type","value":"button"},{"name":"data-chat-action","value":"world"}]}>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"},{"name":"aria-hidden","value":"true"}]}>
            <OriginalElement tag="path" attributes={[{"name":"d","value":"M12 7v14"}]} />
            <OriginalElement tag="path" attributes={[{"name":"d","value":"M3 18V5.5A2.5 2.5 0 0 1 5.5 3H9a3 3 0 0 1 3 3 3 3 0 0 1 3-3h3.5A2.5 2.5 0 0 1 21 5.5V18h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z"}]} />
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="span" attributes={[]}>
            {"World Book"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n        "}
      </ChatQuickActions>
      {"\n\n        "}
      <ChatQuotePreview />
      {"\n        "}
      <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-composer"}]}>
        {"\n            "}
        <ChatActionToggle>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
            <OriginalElement tag="path" attributes={[{"name":"d","value":"M12 5v14M5 12h14"}]} />
          </OriginalElement>
          {"\n            "}
        </ChatActionToggle>
        {"\n            "}
        <ChatMicrophone>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
            <OriginalElement tag="rect" attributes={[{"name":"x","value":"9"},{"name":"y","value":"2"},{"name":"width","value":"6"},{"name":"height","value":"12"},{"name":"rx","value":"3"}]} />
            <OriginalElement tag="path" attributes={[{"name":"d","value":"M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"}]} />
          </OriginalElement>
          {"\n            "}
        </ChatMicrophone>
        {"\n            "}
        <ChatComposeField />
        {"\n            "}
        <ChatMoonReplyButton>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"xmlns","value":"http://www.w3.org/2000/svg","prefix":"","namespace":"http://www.w3.org/2000/xmlns/"},{"name":"width","value":"24"},{"name":"height","value":"24"},{"name":"viewBox","value":"0 0 24 24"},{"name":"fill","value":"none"},{"name":"stroke","value":"currentColor"},{"name":"stroke-width","value":"2"},{"name":"stroke-linecap","value":"round"},{"name":"stroke-linejoin","value":"round"},{"name":"aria-hidden","value":"true"}]}>
            <OriginalElement tag="path" attributes={[{"name":"d","value":"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"}]} />
          </OriginalElement>
          {"\n            "}
        </ChatMoonReplyButton>
        {"\n            "}
        <ChatSendButton>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"xmlns","value":"http://www.w3.org/2000/svg","prefix":"","namespace":"http://www.w3.org/2000/xmlns/"},{"name":"width","value":"24"},{"name":"height","value":"24"},{"name":"viewBox","value":"0 0 24 24"},{"name":"fill","value":"none"},{"name":"stroke","value":"currentColor"},{"name":"stroke-width","value":"2"},{"name":"stroke-linecap","value":"round"},{"name":"stroke-linejoin","value":"round"},{"name":"aria-hidden","value":"true"}]}>
            <OriginalElement tag="path" attributes={[{"name":"d","value":"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"}]} />
            <OriginalElement tag="path" attributes={[{"name":"d","value":"m21.854 2.147-10.94 10.939"}]} />
          </OriginalElement>
          {"\n            "}
        </ChatSendButton>
        {"\n        "}
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-quick-action"},{"name":"type","value":"button"},{"name":"data-chat-action","value":"image"}]}>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"},{"name":"aria-hidden","value":"true"}]}>
            <OriginalElement tag="rect" attributes={[{"name":"x","value":"3"},{"name":"y","value":"4"},{"name":"width","value":"18"},{"name":"height","value":"16"},{"name":"rx","value":"2"}]} />
            <OriginalElement tag="circle" attributes={[{"name":"cx","value":"8.5"},{"name":"cy","value":"9"},{"name":"r","value":"1.5"}]} />
            <OriginalElement tag="path" attributes={[{"name":"d","value":"m21 15-5-5L5 20"}]} />
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="span" attributes={[]}>
            {"Image"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-quick-action"},{"name":"type","value":"button"},{"name":"data-chat-action","value":"camera"}]}>
          {"\n                "}
          <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"},{"name":"aria-hidden","value":"true"}]}>
            <OriginalElement tag="path" attributes={[{"name":"d","value":"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"}]} />
            <OriginalElement tag="circle" attributes={[{"name":"cx","value":"12"},{"name":"cy","value":"13"},{"name":"r","value":"3"}]} />
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="span" attributes={[]}>
            {"Camera"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
      </OriginalElement>
      {"\n    "}
    <ChatSelectionToolbar /><ChatRoomTools /><ChatRecordDetail /><ChatSidebar /></ChatNavigationSurface>
  );
}
