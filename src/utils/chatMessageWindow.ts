import type { MessageNode, MessageElement } from '../types/chatMessages';
import { hasClass } from './chatMessageNodes';

export const CHAT_INITIAL_MESSAGES = 50;
export const CHAT_MORE_MESSAGES = 30;
export function isHistoryRow(node: MessageNode): node is MessageElement {
  return node.kind === 'element' && (hasClass(node, 'chat-message-row') || hasClass(node, 'chat-recall-notice'));
}
/** 只裁剪显示范围，完整树仍供保存、搜索和 AI 使用。 */
export function messageWindow(nodes: MessageNode[], count: number) {
  const indices = nodes.flatMap((node, index) => isHistoryRow(node) ? [index] : []);
  const hidden = Math.max(0, indices.length - Math.max(1, count));
  if (!hidden) return { nodes, hidden, total: indices.length };
  // 包含第一条可见消息前的日期 / 未读分隔线及原有空白。
  const start = indices[hidden - 1] + 1;
  return { nodes: nodes.slice(start), hidden, total: indices.length };
}
/** 复用没有变化的树节点，让 memo 消息组件可以跳过更新。 */
export function shareMessageNodes(previous: MessageNode[], next: MessageNode[]): MessageNode[] {
  const byKey = new Map(previous.map(node => [node.key, node]));
  const shared = next.map(node => {
    const old = byKey.get(node.key);
    if (old === node) return node;
    return old && JSON.stringify(old) === JSON.stringify(node) ? old : node;
  });
  return previous.length === shared.length && shared.every((node, index) => node === previous[index]) ? previous : shared;
}
