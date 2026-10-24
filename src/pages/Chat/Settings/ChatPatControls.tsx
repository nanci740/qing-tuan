import { useLayoutEffect, useRef } from 'react';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
/** 拍一拍后缀：打完（离开输入框或按 Enter）才存。 */
export function ChatPatSuffix({ id, setting, placeholder }: { id: string; setting: 'patSuffix' | 'myPatSuffix'; placeholder: string }) {
  const { values, syncVersion, change } = useChatPreferences();
  const input = useRef<HTMLInputElement | null>(null);
  useLayoutEffect(() => { if (input.current) input.current.value = values[setting]; }, [values[setting], syncVersion]);
  function commit() {
    const next = (input.current?.value || '').trim().slice(0, 20);
    if (input.current) input.current.value = next;
    if (next !== values[setting]) change(setting, next);
  }
  return <input className="chat-setting-input" id={id} type="text" maxLength={20} autoComplete="off" placeholder={placeholder} ref={input} onBlur={commit}
    onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) commit(); }} />;
}
