import { useRef } from 'react';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
import type { BooleanChatSetting } from '../../../types/chatPreferences';
export function ChatSettingCheckbox({ id, setting, initiallyChecked = false }: {
  id: string; setting: BooleanChatSetting; initiallyChecked?: boolean;
}) {
  const { values, change } = useChatPreferences();
  const input = useRef<HTMLInputElement | null>(null);
  return <input className="api-toggle-input" id={id} type="checkbox" ref={node => {
    input.current = node;
    // 原静态 checked 属性与当前 checked 值分开保留，避免改变导出 DOM。
    if (!node) return;
    if (initiallyChecked) node.setAttribute('checked', '');
    else node.removeAttribute('checked');
  }} checked={values[setting]} onChange={event => change(setting, event.currentTarget.checked)} />;
}
