import type { ReactNode } from 'react';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
export function ChatSettingTimeDisplay({ children }: { children: ReactNode }) {
  const { values, change } = useChatPreferences();
  return <select className="chat-setting-select" id="chatSettingTimeDisplay" value={values.timeDisplay}
    onChange={event => change('timeDisplay', event.currentTarget.value as typeof values.timeDisplay)}>{children}</select>;
}
