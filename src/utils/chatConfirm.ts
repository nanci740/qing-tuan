import type { ChatConfirmationOptions, ChatConfirmationRequest } from '../types/chatCharacterActions';
/** 使用现有 React 确认窗口；每个请求独立完成。 */
export function confirmChat(options: ChatConfirmationOptions): Promise<boolean> {
  return new Promise(resolve => window.dispatchEvent(new CustomEvent<ChatConfirmationRequest>('qingtuan:chat-confirm', { detail: { options, resolve } })));
}
