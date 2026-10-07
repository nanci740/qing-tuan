import type { ChatPreferences } from './chatPreferences';
export interface ChatBackup {
  format: 'qingtuan-chat'; version: 1; exportedAt: string; chatKey: string;
  chatName: string; html: string; preferences: ChatPreferences;
  wallpaperDataUrl: string; fontDataUrl: string;
}
export interface ImportedChatBackup {
  format?: unknown; html?: unknown; preferences?: unknown;
  wallpaperDataUrl?: unknown; fontDataUrl?: unknown;
}
