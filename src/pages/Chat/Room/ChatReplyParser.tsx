import { useLayoutEffect } from 'react';
import type { ChatReplyParserApi } from '../../../types/chatReplyParser';
import { extractChatAiReply, parseChatAiQuotedReply, parseChatAiSegmentedReply } from '../../../utils/chatReplyParser';

/** 共享纯 TypeScript 解析器供聊天室及旧历史记录兼容服务调用。 */
export function ChatReplyParser() {
  useLayoutEffect(() => {
    const connect = (event: Event) => {
      const { accept } = (event as CustomEvent<{ accept(api: ChatReplyParserApi): void }>).detail;
      accept({ extract: extractChatAiReply, quoted: parseChatAiQuotedReply, segmented: parseChatAiSegmentedReply });
    };
    window.addEventListener('qingtuan:chat-reply-parser-connect', connect);
    return () => window.removeEventListener('qingtuan:chat-reply-parser-connect', connect);
  }, []);
  return null;
}
