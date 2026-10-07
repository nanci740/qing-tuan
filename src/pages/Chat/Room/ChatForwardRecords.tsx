import { useChatForwardRecords } from '../../../hooks/useChatForwardRecords';
/** 原生 React 记录存储；卡片消息节点仍待随消息主体迁移。 */
export function ChatForwardRecords() {
  useChatForwardRecords();
  return null;
}
