/// <reference types="vite/client" />

import type { SettingsPageEntries } from './utils/settingsPageBridge';

declare global {
  interface Window {
    smallphoneRefreshChatSide?: () => void;
    smallphoneGetMyPresence?: () => string;
    qtSettingsPageEntries?: SettingsPageEntries;
    smallphoneGetChatPresence?: (key?:string) => {online:string;status:string};
    smallphoneGetActiveChatKey?: () => string;
  }
}
