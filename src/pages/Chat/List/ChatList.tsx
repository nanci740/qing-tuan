import {ChatMemoryPhoto} from './ChatMemoryPhoto';
import { ChatNavigationSurface } from '../../../components/shared/ChatNavigationSurface';
import { useChatNavigation } from '../../../providers/ChatNavigationProvider';
import { OriginalElement } from "../../../components/shared/OriginalElement";
import { PixelIcon } from "../../../components/shared/PixelIcon";
import { useChatSearch } from '../../../hooks/useChatSearch';
import { ChatThread } from './ChatThread';
import { PressedButton } from '../../../components/shared/PressedButton';

// 静态属性保持固定引用，避免搜索更新重置尚未迁移的消息服务标记。
const CHAT_LIST_ATTRIBUTES = [
  [{"name":"class","value":"chat-view chat-list-view"},{"name":"id","value":"chatListView"}],
  [{"name":"class","value":"chat-app-header"}],
  [{"name":"class","value":"chat-app-back"},{"name":"id","value":"chatAppBack"},{"name":"type","value":"button"},{"name":"aria-label","value":"返回主画面"}],
  [{"name":"viewBox","value":"0 0 24 24"}],
  [{"name":"points","value":"15 18 9 12 15 6"}],
  [{"name":"class","value":"chat-app-title"}],
  [{"name":"class","value":"chat-filter-tabs"},{"name":"role","value":"tablist"},{"name":"aria-label","value":"会话分类"}],
  [{"name":"class","value":"chat-memory-block"},{"name":"aria-label","value":"回忆相册"}],
  [{"name":"class","value":"chat-memory-head"}],
  [{"name":"class","value":"chat-memory-title"}],
  [{"name":"class","value":"chat-memory-subtitle"}],
  [{"name":"class","value":"chat-memory-strip"}],
  [{"name":"class","value":"chat-memory-stack"}],
  [{"name":"class","value":"chat-memory-paper"},{"name":"aria-hidden","value":"true"}],
  [{"name":"class","value":"chat-memory-photo-wrap"}],
  [{"name":"class","value":"chat-memory-photo"},{"name":"id","value":"chatMemoryStar"},{"name":"alt","value":"回忆照片"}],
  [{"name":"class","value":"chat-memory-photo"},{"name":"id","value":"chatMemoryPolaroid"},{"name":"alt","value":"回忆照片"}],
  [{"name":"class","value":"chat-memory-photo"},{"name":"id","value":"chatMemoryMoon"},{"name":"alt","value":"回忆照片"}],
  [{"name":"class","value":"chat-memory-photo"},{"name":"id","value":"chatMemoryExtra"},{"name":"alt","value":"回忆照片"}],
  [{"name":"class","value":"chat-search"},{"name":"aria-label","value":"搜索聊天"}],
  [{"name":"class","value":"chat-search-icon"},{"name":"aria-hidden","value":"true"}],
  [{"name":"class","value":"chat-conversation-panel"}],
  [{"name":"id","value":"chatThreadCard"},{"name":"type","value":"button"},{"name":"hidden","value":""},{"name":"aria-hidden","value":"true"},{"name":"tabindex","value":"-1"}],
  [{"name":"class","value":"chat-empty-icon"},{"name":"aria-hidden","value":"true"}],
  [{"name":"class","value":"px-icon"},{"name":"viewBox","value":"0 0 16 16"},{"name":"aria-hidden","value":"true"},{"name":"shape-rendering","value":"crispEdges"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"2"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"3"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"4"},{"name":"y","value":"3"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"8"},{"name":"y","value":"3"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"12"},{"name":"y","value":"3"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"4"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"3"},{"name":"y","value":"4"},{"name":"width","value":"6"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"9"},{"name":"y","value":"4"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"4"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"3"},{"name":"y","value":"5"},{"name":"width","value":"6"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"9"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"12"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"3"},{"name":"y","value":"6"},{"name":"width","value":"6"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"9"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"4"},{"name":"y","value":"7"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"8"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"8"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"9"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"4"},{"name":"y","value":"9"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"8"},{"name":"y","value":"9"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"1"},{"name":"y","value":"10"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"2"},{"name":"y","value":"10"},{"name":"width","value":"8"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"10"},{"name":"y","value":"10"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"0"},{"name":"y","value":"11"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"1"},{"name":"y","value":"11"},{"name":"width","value":"10"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"11"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"0"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"1"},{"name":"y","value":"12"},{"name":"width","value":"10"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"0"},{"name":"y","value":"13"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"1"},{"name":"y","value":"13"},{"name":"width","value":"10"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"13"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [],
  [{"name":"class","value":"px-x"},{"name":"x","value":"9"},{"name":"y","value":"2"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"13"},{"name":"y","value":"4"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"13"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"13"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"12"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"10"},{"name":"y","value":"8"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"12"},{"name":"y","value":"9"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"14"},{"name":"y","value":"10"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"15"},{"name":"y","value":"11"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"15"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"15"},{"name":"y","value":"13"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"2"},{"name":"width","value":"5"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"3"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"3"},{"name":"y","value":"3"},{"name":"width","value":"5"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"1"},{"name":"y","value":"4"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"2"},{"name":"y","value":"4"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"4"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"7"},{"name":"y","value":"4"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"1"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"2"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"4"},{"name":"y","value":"5"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"7"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"8"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"1"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"2"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"4"},{"name":"y","value":"6"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"7"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"8"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"1"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"2"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"4"},{"name":"y","value":"7"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"7"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"8"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"9"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"1"},{"name":"y","value":"8"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"2"},{"name":"y","value":"8"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"8"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"7"},{"name":"y","value":"8"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"9"},{"name":"y","value":"8"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"9"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"3"},{"name":"y","value":"9"},{"name":"width","value":"5"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"10"},{"name":"width","value":"8"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"9"},{"name":"y","value":"11"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"10"},{"name":"y","value":"12"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"13"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"chat-subnav"},{"name":"aria-label","value":"Chat navigation"}],
  [{"name":"class","value":"chat-subnav-item active"},{"name":"type","value":"button"},{"name":"aria-label","value":"Chats"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"2"},{"name":"width","value":"10"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"3"},{"name":"y","value":"3"},{"name":"width","value":"10"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"13"},{"name":"y","value":"3"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"2"},{"name":"y","value":"4"},{"name":"width","value":"12"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"14"},{"name":"y","value":"4"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"2"},{"name":"y","value":"5"},{"name":"width","value":"12"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"14"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"2"},{"name":"y","value":"6"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"4"},{"name":"y","value":"6"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"6"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"7"},{"name":"y","value":"6"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"9"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"10"},{"name":"y","value":"6"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"12"},{"name":"y","value":"6"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"14"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"2"},{"name":"y","value":"7"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"4"},{"name":"y","value":"7"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"6"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"7"},{"name":"y","value":"7"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"9"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-w"},{"name":"x","value":"10"},{"name":"y","value":"7"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"12"},{"name":"y","value":"7"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"14"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"2"},{"name":"y","value":"8"},{"name":"width","value":"12"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"14"},{"name":"y","value":"8"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"1"},{"name":"y","value":"9"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"2"},{"name":"y","value":"9"},{"name":"width","value":"12"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"14"},{"name":"y","value":"9"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"10"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"3"},{"name":"y","value":"10"},{"name":"width","value":"10"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"13"},{"name":"y","value":"10"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"11"},{"name":"width","value":"3"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"6"},{"name":"y","value":"11"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"8"},{"name":"y","value":"11"},{"name":"width","value":"5"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"6"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"7"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"8"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"6"},{"name":"y","value":"13"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"chat-subnav-item"},{"name":"type","value":"button"},{"name":"aria-label","value":"Contacts"}],
  [{"name":"class","value":"chat-subnav-item"},{"name":"type","value":"button"},{"name":"aria-label","value":"Discover"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"6"},{"name":"y","value":"1"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"2"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"10"},{"name":"y","value":"2"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"5"},{"name":"y","value":"5"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"9"},{"name":"y","value":"5"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"5"},{"name":"y","value":"6"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"7"},{"name":"y","value":"6"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"9"},{"name":"y","value":"6"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"6"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"5"},{"name":"y","value":"7"},{"name":"width","value":"6"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"8"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"5"},{"name":"y","value":"8"},{"name":"width","value":"6"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"8"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"5"},{"name":"y","value":"9"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"6"},{"name":"y","value":"9"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"10"},{"name":"y","value":"9"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"6"},{"name":"y","value":"10"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"7"},{"name":"y","value":"10"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"9"},{"name":"y","value":"10"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"11"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"7"},{"name":"y","value":"11"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"13"},{"name":"y","value":"11"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"12"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"13"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"10"},{"name":"y","value":"13"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"6"},{"name":"y","value":"14"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"chat-subnav-item"},{"name":"type","value":"button"},{"name":"aria-label","value":"Me"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"6"},{"name":"y","value":"2"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"5"},{"name":"y","value":"3"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"6"},{"name":"y","value":"3"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"10"},{"name":"y","value":"3"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"4"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"5"},{"name":"y","value":"4"},{"name":"width","value":"6"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"4"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"5"},{"name":"y","value":"5"},{"name":"width","value":"6"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"11"},{"name":"y","value":"5"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"5"},{"name":"y","value":"6"},{"name":"width","value":"6"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"5"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"6"},{"name":"y","value":"7"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"10"},{"name":"y","value":"7"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"6"},{"name":"y","value":"8"},{"name":"width","value":"4"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"4"},{"name":"y","value":"9"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"10"},{"name":"y","value":"9"},{"name":"width","value":"2"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"3"},{"name":"y","value":"10"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"4"},{"name":"y","value":"10"},{"name":"width","value":"8"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"12"},{"name":"y","value":"10"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"3"},{"name":"y","value":"11"},{"name":"width","value":"10"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"3"},{"name":"y","value":"12"},{"name":"width","value":"10"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"13"},{"name":"y","value":"12"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"2"},{"name":"y","value":"13"},{"name":"width","value":"1"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-o"},{"name":"x","value":"3"},{"name":"y","value":"13"},{"name":"width","value":"10"},{"name":"height","value":"1"}],
  [{"name":"class","value":"px-x"},{"name":"x","value":"13"},{"name":"y","value":"13"},{"name":"width","value":"1"},{"name":"height","value":"1"}]];

/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function ChatList() {
  const search = useChatSearch();
  const navigation = useChatNavigation();
  return (
    <ChatNavigationSurface surface="list" tag="div" id="chatListView" className="chat-view chat-list-view">
      {"\n        "}
      <OriginalElement tag="header" attributes={CHAT_LIST_ATTRIBUTES[1]}>
        {"\n            "}
        <OriginalElement tag="button" attributes={CHAT_LIST_ATTRIBUTES[2]} onClick={() => navigation.closeApp()}>
          {"\n                "}
          <OriginalElement tag="svg" attributes={CHAT_LIST_ATTRIBUTES[3]}>
            <OriginalElement tag="polyline" attributes={CHAT_LIST_ATTRIBUTES[4]} />
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="h1" attributes={CHAT_LIST_ATTRIBUTES[5]}>
          {"Chat"}
        </OriginalElement>
        {"\n        "}
        <PressedButton className="chat-app-add" id="chatAddCharacterBtn" type="button" aria-label="新增角色" data-title="新增角色" onClick={search.newCharacter}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></PressedButton>
      </OriginalElement>
      {"\n\n        "}
      <OriginalElement tag="div" attributes={CHAT_LIST_ATTRIBUTES[6]}>
        {"\n            "}
        <PressedButton className={'chat-filter-tab' + (search.filter === 'all' ? ' active' : '')} type="button" role="tab" aria-selected={search.filter === 'all'} data-chat-filter="all" onClick={() => search.selectFilter('all')}>{"All"}</PressedButton>
        {"\n            "}
        <PressedButton className={'chat-filter-tab' + (search.filter === 'chats' ? ' active' : '')} type="button" role="tab" aria-selected={search.filter === 'chats'} data-chat-filter="chats" onClick={() => search.selectFilter('chats')}>{"Chats"}</PressedButton>
        {"\n            "}
        <PressedButton className={'chat-filter-tab' + (search.filter === 'group' ? ' active' : '')} type="button" role="tab" aria-selected={search.filter === 'group'} data-chat-filter="group" onClick={() => search.selectFilter('group')}>{"Group"}</PressedButton>
        {"\n        "}
      </OriginalElement>
      {"\n\n        "}
      <OriginalElement tag="section" attributes={CHAT_LIST_ATTRIBUTES[7]}>
        {"\n            "}
        <OriginalElement tag="div" attributes={CHAT_LIST_ATTRIBUTES[8]}>
          {"\n                "}
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[9]}>
            {"snapshot.jpg"}
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[10]}>
            {"little moments worth keeping"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="div" attributes={CHAT_LIST_ATTRIBUTES[11]}>
          {"\n                "}
          <OriginalElement tag="div" attributes={CHAT_LIST_ATTRIBUTES[12]}>
            {"\n                    "}
            <OriginalElement tag="div" attributes={CHAT_LIST_ATTRIBUTES[13]} />
            {"\n                    "}
            <ChatMemoryPhoto attributes={CHAT_LIST_ATTRIBUTES[15]} />
            {"\n                "}
          </OriginalElement>
          {"\n                "}
          <ChatMemoryPhoto attributes={CHAT_LIST_ATTRIBUTES[16]} />
          {"\n                "}
          <ChatMemoryPhoto attributes={CHAT_LIST_ATTRIBUTES[17]} />
          {"\n                "}
          <ChatMemoryPhoto attributes={CHAT_LIST_ATTRIBUTES[18]} />
          {"\n            "}
        </OriginalElement>
        {"\n        "}
      </OriginalElement>
      {"\n\n        "}
      <OriginalElement tag="label" attributes={CHAT_LIST_ATTRIBUTES[19]}>
        {"\n            "}
        <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[20]} />
        {"\n            "}
        <input className="chat-search-input" id="chatSearchInput" type="search" placeholder="搜索角色或聊天内容…" autoComplete="off" ref={search.input} onInput={event => search.changeQuery(event.currentTarget.value)} />
        {"\n        "}
      </OriginalElement>
      {"\n\n        "}
      <OriginalElement tag="div" attributes={CHAT_LIST_ATTRIBUTES[21]}>
        {"\n            "}
        <OriginalElement tag="button" onClick={() => navigation.showRoom()} attributes={CHAT_LIST_ATTRIBUTES[22]} />
        {"\n            "}
        <div className="chat-filter-empty" id="chatCharacterEmpty" hidden={search.threads.length > 0 || search.filter === 'group'}>
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[23]}>
            <PixelIcon attributes={CHAT_LIST_ATTRIBUTES[24]}>
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[25]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[26]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[27]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[28]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[29]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[30]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[31]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[32]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[33]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[34]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[35]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[36]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[37]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[38]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[39]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[40]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[41]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[42]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[43]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[44]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[45]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[46]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[47]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[48]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[49]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[50]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[51]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[52]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[53]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[54]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[55]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[56]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[57]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[58]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[59]} />
            </PixelIcon>
          </OriginalElement>
          <OriginalElement tag="b" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"还没有角色"}
          </OriginalElement>
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"点右上角的 ＋ 添加第一位吧"}
          </OriginalElement>
        </div>
        {"\n            "}
        <div id="chatDynamicThreads" aria-label="新增角色会话" hidden={search.filter === 'group' ? true : undefined}>{search.threads.map(thread => <ChatThread key={search.revision + ':' + thread.id} thread={thread} miss={search.misses.has(thread.id)} />)}</div>
        <div className="chat-filter-empty" id="chatFilterEmpty" hidden={search.filter !== 'group'}>
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[23]}>
            <PixelIcon attributes={CHAT_LIST_ATTRIBUTES[24]}>
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[25]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[61]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[26]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[27]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[28]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[29]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[30]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[31]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[32]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[62]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[34]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[35]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[36]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[63]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[38]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[39]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[40]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[64]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[41]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[42]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[43]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[65]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[44]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[66]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[45]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[46]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[47]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[67]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[48]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[49]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[50]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[68]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[51]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[52]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[53]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[69]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[54]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[55]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[56]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[70]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[57]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[58]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[59]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[71]} />
            </PixelIcon>
          </OriginalElement>
          <OriginalElement tag="b" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"还没有群聊"}
          </OriginalElement>
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"点 Contacts 右上角的 ＋ 创建群组"}
          </OriginalElement>
        </div>
        {"\n            "}
        <div className="chat-filter-empty" id="chatSearchEmpty" hidden={search.emptyHidden}>
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[23]}>
            <PixelIcon attributes={CHAT_LIST_ATTRIBUTES[24]}>
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[72]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[73]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[74]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[28]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[75]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[76]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[77]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[78]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[32]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[79]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[80]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[81]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[82]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[83]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[84]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[36]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[85]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[86]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[87]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[88]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[89]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[90]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[40]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[91]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[92]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[41]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[93]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[94]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[95]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[96]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[97]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[98]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[99]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[100]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[101]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[102]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[103]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[47]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[104]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[105]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[106]} />
              <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[107]} />
            </PixelIcon>
          </OriginalElement>
          <OriginalElement tag="b" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"找不到符合的聊天"}
          </OriginalElement>
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"换个名字或关键词试试看"}
          </OriginalElement>
        </div>
        {"\n        "}
      </OriginalElement>
      {"\n        "}
      <script />
      {"\n\n        "}
      <OriginalElement tag="nav" attributes={CHAT_LIST_ATTRIBUTES[108]}>
        {"\n            "}
        <OriginalElement tag="button" attributes={CHAT_LIST_ATTRIBUTES[109]}>
          {"\n                "}
          <PixelIcon attributes={CHAT_LIST_ATTRIBUTES[24]}>
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[110]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[73]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[111]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[112]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[75]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[113]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[114]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[79]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[115]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[116]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[85]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[117]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[118]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[119]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[120]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[121]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[122]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[123]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[124]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[91]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[125]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[126]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[127]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[128]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[129]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[130]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[131]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[132]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[97]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[133]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[134]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[135]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[136]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[137]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[138]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[139]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[140]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[141]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[142]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[143]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[144]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[145]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[146]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[147]} />
          </PixelIcon>
          {"\n                "}
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"Chats"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="button" attributes={CHAT_LIST_ATTRIBUTES[148]}>
          {"\n                "}
          <PixelIcon attributes={CHAT_LIST_ATTRIBUTES[24]}>
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[25]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[61]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[26]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[27]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[28]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[29]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[30]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[31]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[32]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[62]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[34]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[35]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[36]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[63]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[38]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[39]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[40]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[64]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[41]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[42]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[43]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[65]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[44]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[66]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[45]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[46]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[47]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[67]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[48]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[49]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[50]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[68]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[51]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[52]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[53]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[69]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[54]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[55]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[56]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[70]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[57]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[58]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[59]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[71]} />
          </PixelIcon>
          {"\n                "}
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"Contacts"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="button" attributes={CHAT_LIST_ATTRIBUTES[149]}>
          {"\n                "}
          <PixelIcon attributes={CHAT_LIST_ATTRIBUTES[24]}>
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[150]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[151]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[152]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[26]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[29]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[30]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[62]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[34]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[153]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[154]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[63]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[85]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[155]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[156]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[157]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[158]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[159]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[124]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[91]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[160]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[161]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[162]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[132]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[97]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[163]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[164]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[165]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[134]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[135]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[166]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[167]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[168]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[137]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[138]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[169]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[170]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[171]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[140]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[172]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[173]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[174]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[175]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[176]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[177]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[178]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[179]} />
          </PixelIcon>
          {"\n                "}
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"Discover"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="button" attributes={CHAT_LIST_ATTRIBUTES[180]}>
          {"\n                "}
          <PixelIcon attributes={CHAT_LIST_ATTRIBUTES[24]}>
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[181]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[182]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[183]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[184]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[185]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[186]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[187]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[188]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[189]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[190]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[155]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[191]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[159]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[192]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[193]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[194]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[195]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[196]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[167]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[197]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[198]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[199]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[200]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[172]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[201]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[174]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[202]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[203]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[204]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[205]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[206]} />
            <OriginalElement tag="rect" attributes={CHAT_LIST_ATTRIBUTES[207]} />
          </PixelIcon>
          {"\n                "}
          <OriginalElement tag="span" attributes={CHAT_LIST_ATTRIBUTES[60]}>
            {"Me"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n        "}
      </OriginalElement>
      {"\n    "}
    </ChatNavigationSurface>
  );
}
