import { ChatPixelIcon } from '../../../components/shared/ChatPixelIcon';
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
import { ChatMessageWallpaper, ChatWallpaperMessageList } from '../Settings/ChatAppearanceControls';
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
      <ChatMessageWallpaper /><ChatPinBar /><ChatWallpaperMessageList />
      {"\n\n        "}
      <ChatQuickActions>
        {"\n            "}

        {"\n            "}

        {"\n            "}
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-quick-action"},{"name":"type","value":"button"},{"name":"data-chat-action","value":"draw"}]}>
          {"\n                "}
          <ChatPixelIcon name="sparkle" />
          {"\n                "}
          <OriginalElement tag="span" attributes={[]}>
            {"Generate"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-quick-action"},{"name":"type","value":"button"},{"name":"data-chat-action","value":"location"}]}>
          {"\n                "}
          <ChatPixelIcon name="location" />
          {"\n                "}
          <OriginalElement tag="span" attributes={[]}>
            {"Location"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-quick-action"},{"name":"type","value":"button"},{"name":"data-chat-action","value":"world"}]}>
          {"\n                "}
          <ChatPixelIcon name="book" />
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
          <ChatPixelIcon name="mic" />
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
          <ChatPixelIcon name="image" />
          {"\n                "}
          <OriginalElement tag="span" attributes={[]}>
            {"Image"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        <OriginalElement tag="button" attributes={[{"name":"class","value":"chat-quick-action"},{"name":"type","value":"button"},{"name":"data-chat-action","value":"camera"}]}>
          {"\n                "}
          <ChatPixelIcon name="camera" />
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
