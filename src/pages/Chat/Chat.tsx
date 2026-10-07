import {ChatMemoryInput} from './List/ChatMemoryPhoto';
import {ChatMessageMenu,ChatDeleteModal,ChatRecallModal,ChatEditModal} from './Room/ChatMessageOperations';
import { ChatNavigationSurface } from '../../components/shared/ChatNavigationSurface';
import { OriginalElement } from "../../components/shared/OriginalElement";
import { ChatList } from "./List/ChatList";
import { ChatRoom } from "./Room/ChatRoom";
import { ChatSettings } from "./Settings/ChatSettings";

/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function Chat() {
  return (
    <ChatNavigationSurface surface="app" tag="section" id="chatAppPage" className="chat-app-page" hidden={true}>
      {"\n    "}
      <ChatList />
      {"\n\n    "}
      <ChatRoom />
      {"\n    "}
      <ChatSettings />
      {"\n    "}
      <ChatMessageMenu />
      {"\n    "}
      <ChatDeleteModal />
      {"\n    "}
      <ChatRecallModal />
      {"\n    "}
      <ChatEditModal />
      {"\n"}
    <ChatMemoryInput /></ChatNavigationSurface>
  );
}
