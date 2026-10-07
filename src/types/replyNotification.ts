import type { ChatCharacter } from './chatCharacters';
export interface ReplyDetail {
  chatKey?: unknown;
  title?: unknown;
  body?: unknown;
  avatar?: unknown;
  viewed?: unknown;
  unreadCount?: unknown;
  [field: string]: unknown;
}
export interface ReplyNotificationServices {
  find: (key: unknown) => ChatCharacter | undefined;
  open: (key: unknown) => unknown;
  updateThread: (key: string) => void;
}
export interface ReplyNotificationBridge {
  unread: (key: string) => unknown;
  setUnread: (key: string, count: unknown) => void;
  complete: (detail?: ReplyDetail) => void;
}
