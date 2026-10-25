import type { MessageLocation, MessagePay } from './chatMessages';
export interface ChatQuoteChoice { id: string; text: string; targetId?: string }
export interface ChatQuotedReply { reply: string; quote: string; quoteTargetId?: string }
export interface ChatReplyQuote { quote: string; quoteTargetId: string }
export interface ChatSegmentedReply {
  segments: string[];
  quotes: (ChatReplyQuote | null)[];
  quote: string;
  quoteTargetId: string;
  presence?: object | null;
  recalls?: boolean[];
  voices?: boolean[];
  /** 每一条要发的照片：给生图模型的英文画面描述，没有就是空字符串。 */
  photos?: string[];
  /** 每一张照片的中文画面描述（文字照片点开看的那段），没有就是空字符串。 */
  scenes?: string[];
  /** 每一条发的表情包标签（从家机能用的表情里挑），没有就是空字符串。 */
  stickers?: string[];
  /** 每一条发的转账、红包（还没有编号）；没有就是 null。 */
  pays?: (Omit<MessagePay, 'id'> | null)[];
  /** 他对你还没收的转账、红包表态：accept 收下（拆开）、return 退回；没表态是空字符串。 */
  receive?: '' | 'accept' | 'return';
  /** 每一条发的定位；没有就是 null。 */
  locations?: (MessageLocation | null)[];
  /** 群聊：每一条是哪个成员说的（名字），没写是空字符串。 */
  speakers?: string[];
}
export interface ChatReplyParserApi {
  extract(data: unknown): string;
  quoted(raw: unknown, quoteChoices?: unknown): ChatQuotedReply;
  segmented(raw: unknown, quoteChoices?: unknown): ChatSegmentedReply;
}
