import { useChatCharacters } from '../../../hooks/useChatCharacters';
/** 角色清单控制器独立挂载，更新数据不会重写尚未迁移的聊天导航 DOM。 */
export function ChatCharacterStore() {
  useChatCharacters();
  return null;
}
