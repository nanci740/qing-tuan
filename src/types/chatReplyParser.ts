import type { MessageLocation } from './chatMessages';
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
  /** 每一条发的定位；没有就是 null。 */
  locations?: (MessageLocation | null)[];
}
export interface ChatReplyParserApi {
  extract(data: unknown): string;
  quoted(raw: unknown, quoteChoices?: unknown): ChatQuotedReply;
  segmented(raw: unknown, quoteChoices?: unknown): ChatSegmentedReply;
}
