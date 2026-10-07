import {ProfileAvatarProvider} from './providers/ProfileAvatarProvider';
import {ChatControllers} from './pages/Chat/ChatControllers';
import {ChatMemoryProvider} from './providers/ChatMemoryProvider';
import {ChatIdentityProvider} from './providers/ChatIdentityProvider';
import {ChatRoomToolsProvider} from './providers/ChatRoomToolsProvider';
import {NativeRefsProvider} from './providers/NativeRefsProvider';
import {ChatReplyEngineProvider} from './providers/ChatReplyEngineProvider';
import {ChatVoiceProvider} from './providers/ChatVoiceProvider';
import {ChatMessagesProvider} from './providers/ChatMessagesProvider';
import {ChatReplyParser} from './pages/Chat/Room/ChatReplyParser';
import {ChatReplyTriggersProvider} from './providers/ChatReplyTriggersProvider';
import {ChatComposerProvider} from './providers/ChatComposerProvider';
import {ChatSelectionProvider} from './providers/ChatSelectionProvider';
import {ChatForwardRecords} from './pages/Chat/Room/ChatForwardRecords';
import {ChatForwardPicker} from './pages/Chat/Room/ChatForwardPicker';
import {ChatPinsProvider} from './providers/ChatPinsProvider';
import {ChatPinnedIndicators} from './pages/Chat/Room/ChatPins';
import {ChatMessageOperationsProvider} from './providers/ChatMessageOperationsProvider';
import {ChatClipboardFallback} from './pages/Chat/Room/ChatMessageOperations';
import { ChatDataDownload } from './pages/Chat/Settings/ChatDataControls';
import { ChatBubbleStyle } from './pages/Chat/Settings/ChatAppearanceControls';
import { ChatPreferencesProvider } from './providers/ChatPreferencesProvider';
import { ChatNavigationProvider } from './providers/ChatNavigationProvider';
import { ReplyNotification } from './components/shared/ReplyNotification';
import { ChatCharacterStore } from './pages/Chat/List/ChatCharacterStore';
import { ChatCharacterActions } from './pages/Chat/List/ChatCharacterActions';
import { ChatConfirmation } from './components/shared/ChatConfirmation';
import { CharacterArchive } from './pages/Chat/Characters/CharacterArchive';
import { ChatMyPresenceMenu } from './pages/Chat/Room/ChatMyPresenceMenu';
import { ChatSidebarProvider } from './providers/ChatSidebarProvider';
import { WorldProvider } from './providers/WorldProvider';
import { WorldConfirmation } from './pages/World/components/WorldConfirmation';
import { VoiceImageProvider } from './providers/VoiceImageProvider';
import { AppearanceProvider } from './providers/AppearanceProvider';
import { HomeTextsProvider } from './providers/HomeTextsProvider';
import { MusicProvider } from './providers/MusicProvider';
import { ApiProvider } from './providers/ApiProvider';
import { ChoiceProvider } from './providers/ChoiceProvider';
import { McpProvider } from './providers/McpProvider';
import { SettingsNavigationProvider } from './providers/SettingsNavigationProvider';
import { BootProvider } from './providers/BootProvider';
import { OriginalComment } from "./components/shared/OriginalComment";
import { Settings } from "./pages/Settings/Settings";
import { AboutAppModal } from "./components/shared/AboutAppModal";
import { BackgroundActivity } from "./pages/Settings/BackgroundActivity/BackgroundActivity";
import { VoiceImage } from "./pages/Settings/VoiceImage/VoiceImage";
import { VoiceImageChoiceModal } from "./components/shared/VoiceImageChoiceModal";
import { Mcp } from "./pages/Settings/Mcp/Mcp";
import { McpServiceModal } from "./components/shared/McpServiceModal";
import { McpToolsModal } from "./components/shared/McpToolsModal";
import { Api } from "./pages/Settings/Api/Api";
import { ApiProviderModal } from "./components/shared/ApiProviderModal";
import { ApiModelModal } from "./components/shared/ApiModelModal";
import { Appearance } from "./pages/Settings/Appearance/Appearance";
import { Music } from "./pages/Settings/Music/Music";
import { PersonalProfile } from "./pages/PersonalProfile/PersonalProfile";
import { Splash } from "./pages/Splash/Splash";
import { Home } from "./pages/Home/Home";
import { SaveToast } from "./components/shared/SaveToast";
import { WorldPickerModal } from "./components/shared/WorldPickerModal";

export function App() {
  return (
    <ProfileAvatarProvider><ChatMemoryProvider><NativeRefsProvider><SettingsNavigationProvider><ChatNavigationProvider><ChatPreferencesProvider><ChatMessageOperationsProvider><ChatSelectionProvider><ChatComposerProvider><ChatReplyTriggersProvider><ChatMessagesProvider><ChatVoiceProvider><ChatReplyEngineProvider><ChatRoomToolsProvider><ChatIdentityProvider><ChatPinsProvider><ChatPinnedIndicators /><ChatClipboardFallback /><ChatBubbleStyle /><ChatDataDownload /><ChoiceProvider><ApiProvider><McpProvider><HomeTextsProvider><MusicProvider><AppearanceProvider><VoiceImageProvider><WorldProvider><ChatSidebarProvider><BootProvider>
      {"\n    "}
      <OriginalComment text={" 设置页面 "} />
      {"\n    "}
      <Settings />
      {"\n\n\n    "}
      <OriginalComment text={" 应用信息弹窗 "} />
      {"\n    "}
      <AboutAppModal />
      {"\n\n\n    "}
      <OriginalComment text={" 后台活动设置二级页面 "} />
      {"\n    "}
      <BackgroundActivity />
      {"\n\n\n    "}
      <OriginalComment text={" 语音与生图设置二级页面 "} />
      {"\n    "}
      <VoiceImage />
      {"\n\n    "}
      <OriginalComment text={" 语音 / 生图 自定义选项弹窗 "} />
      {"\n    "}
      <VoiceImageChoiceModal />
      {"\n\n    "}
      <OriginalComment text={" MCP 设置二级页面 "} />
      {"\n    "}
      <Mcp />
      {"\n\n    "}
      <OriginalComment text={" MCP 添加 / 编辑服务弹窗 "} />
      {"\n    "}
      <McpServiceModal />
      {"\n\n    "}
      <OriginalComment text={" MCP 工具权限弹窗 "} />
      {"\n    "}
      <McpToolsModal />
      {"\n\n\n    "}
      <OriginalComment text={" API 设置二级页面 "} />
      {"\n    "}
      <Api />
      {"\n\n    "}
      <ApiProviderModal />
      {"\n\n    "}
      <ApiModelModal />
      {"\n\n    "}
      <OriginalComment text={" 美化设置二级页面 "} />
      {"\n    "}
      <Appearance />
      {"\n\n    "}
      <OriginalComment text={" 音乐设置二级页面 "} />
      {"\n    "}
      <Music />
      {"\n\n    "}
      <OriginalComment text={" 个人信息二级设置页面 "} />
      {"\n    "}
      <PersonalProfile />
      {"\n\n    "}
      <OriginalComment text={" 开屏画面 "} />
      {"\n    "}
      <Splash />
      {"\n\n    "}
      <OriginalComment text={" 进入后的主画面 "} />
      {"\n    "}
      <Home />
      {"\n\n"}
      <SaveToast />
      {"\n\n\n"}
      
      {"\n"}
      
      {"\n"}
      
      <ChatCharacterActions /><ReplyNotification /><ChatForwardPicker /><CharacterArchive />
      {"\n\n\n    "}
      <WorldPickerModal /><WorldConfirmation />
      {"\n\n"}
      
      {"\n\n\n"}
      
      {"\n"}
      
      {"\n"}
      
      {"\n\n"}
      
      {"\n\n"}
      
      {"\n\n"}
      <ChatReplyParser /><ChatForwardRecords /><ChatCharacterStore /><ChatConfirmation /><ChatMyPresenceMenu /><ChatControllers />
      {"\n\n\n"}
    </BootProvider></ChatSidebarProvider></WorldProvider></VoiceImageProvider></AppearanceProvider></MusicProvider></HomeTextsProvider></McpProvider></ApiProvider></ChoiceProvider></ChatPinsProvider></ChatIdentityProvider></ChatRoomToolsProvider></ChatReplyEngineProvider></ChatVoiceProvider></ChatMessagesProvider></ChatReplyTriggersProvider></ChatComposerProvider></ChatSelectionProvider></ChatMessageOperationsProvider></ChatPreferencesProvider></ChatNavigationProvider></SettingsNavigationProvider></NativeRefsProvider></ChatMemoryProvider></ProfileAvatarProvider>
  );
}
