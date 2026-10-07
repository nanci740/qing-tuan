/// <reference types="vite/client" />

import type { SettingsPageEntries } from './utils/settingsPageBridge';

declare global {
  interface Window {
    qtSettingsPageEntries?: SettingsPageEntries;
    smallphoneRefreshChatSide?: () => void;
    smallphoneGetMyPresence?: () => string;
    smallphoneGetChatPresence?: (key?:string) => {online:string;status:string};
    smallphoneGetActiveChatKey?: () => string;
  }
}
