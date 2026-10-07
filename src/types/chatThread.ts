export interface ChatThreadSnapshot {
  id: string;
  name: string;
  photoUrl: string;
  favorite: boolean;
  pinned: boolean;
  preview: string;
  draft: boolean;
  time: string;
  unread: number;
  activate: () => void;
  openActions: (x: number, y: number) => void;
}
export interface ChatThreadsEvent {
  kind: 'rebuild' | 'update';
  threads: ChatThreadSnapshot[];
}
export type ChatFilter = 'all' | 'chats' | 'group';
export interface ChatListServices {
  openCharacterCard: () => void;
}
