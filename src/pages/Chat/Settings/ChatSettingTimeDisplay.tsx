import { RetroSelect } from '../../../components/shared/RetroSelect';
import type { ReactNode } from 'react';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
export function ChatSettingTimeDisplay({ children }: { children: ReactNode }) {
  const { values, change } = useChatPreferences();
  return <RetroSelect title="时间显示" className="chat-setting-select" id="chatSettingTimeDisplay" value={values.timeDisplay}
    onChange={value => change('timeDisplay', value as typeof values.timeDisplay)}>{children}</RetroSelect>;
}
