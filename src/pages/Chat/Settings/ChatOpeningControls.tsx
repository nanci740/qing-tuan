import { useLayoutEffect, useRef, useState } from 'react';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
import { PressedButton } from '../../../components/shared/PressedButton';
export function ChatOpeningInput() {
  const { values, syncVersion, change } = useChatPreferences();
  const [draft, setDraft] = useState(values.openingText);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    setDraft(values.openingText);
    if (textarea.current) textarea.current.value = values.openingText;
  }, [syncVersion]);
  function edit() {
    const value = textarea.current?.value ?? draft;
    setDraft(value);
    change('openingText', value.slice(0, 800));
  }
  return <textarea className="chat-setting-textarea" id="chatSettingOpening" maxLength={800} placeholder="写下角色的第一句开场白…" ref={textarea} onInput={edit} />;
}
export function ChatRestartButton() {
  const { restartOpening } = useChatPreferences();
  return <PressedButton className="chat-setting-action primary" id="chatSettingRestart" type="button" onClick={() => { void restartOpening(); }}>重新开场</PressedButton>;
}
