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
}
export interface ChatReplyParserApi {
  extract(data: unknown): string;
  quoted(raw: unknown, quoteChoices?: unknown): ChatQuotedReply;
  segmented(raw: unknown, quoteChoices?: unknown): ChatSegmentedReply;
}
