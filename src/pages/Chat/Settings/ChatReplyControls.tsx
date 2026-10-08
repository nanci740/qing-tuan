import { RetroSelect } from '../../../components/shared/RetroSelect';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
import type { ChatPreferences } from '../../../types/chatPreferences';

export function ChatReplySelect({ id, setting, children }: {
  id: string; setting: 'replyLength' | 'quotePolicy'; children: ReactNode;
}) {
  const { values, change } = useChatPreferences();
  return <RetroSelect title={setting === 'replyLength' ? '回复长度' : '引用方式'} className="chat-setting-select" id={id} value={values[setting]}
    onChange={value => change(setting, value as ChatPreferences[typeof setting])}>{children}</RetroSelect>;
}
export function ChatReplyRangeRow({ delayed = false, children }: { delayed?: boolean; children: ReactNode }) {
  const { values } = useChatPreferences();
  return <div className={'chat-setting-range-row' + (delayed && !values.segmented ? ' is-disabled' : '')}>{children}</div>;
}
export function ChatReplyRangeValue({ setting }: { setting: 'segmentDelay' | 'contextMessages' }) {
  const { values } = useChatPreferences();
  return <span className="chat-setting-range-value" id={setting === 'segmentDelay' ? 'chatSettingDelayValue' : 'chatSettingContextValue'}>
    {setting === 'segmentDelay' ? `${(values.segmentDelay / 1000).toFixed(1)} 秒` : `${values.contextMessages} 条`}
  </span>;
}
export function ChatReplyRange({ setting }: { setting: 'segmentDelay' | 'contextMessages' }) {
  const { values, syncVersion, change } = useChatPreferences();
  const input = useRef<HTMLInputElement | null>(null);
  const delayed = setting === 'segmentDelay';
  useLayoutEffect(() => {
    if (input.current) input.current.value = String(values[setting]);
  }, [values[setting], syncVersion]);
  return <input className="chat-setting-range" id={delayed ? 'chatSettingDelay' : 'chatSettingContext'} type="range"
    min={delayed ? 200 : 10} max={delayed ? 2000 : 200} step={delayed ? 100 : 10}
    aria-label={delayed ? '分段发送间隔' : '上下文条数'} defaultValue={delayed ? 600 : 30}
    disabled={delayed && !values.segmented} ref={input}
    onInput={event => change(setting, Number(event.currentTarget.value) || (delayed ? 600 : 30))} />;
}
/** 文字模型保留原 change 提交时机：输入只改草稿，失焦或 Enter 时保存并修剪空白。 */
export function ChatReplyModel() {
  const { values, syncVersion, change } = useChatPreferences();
  const [draft, setDraft] = useState(values.customModel);
  const input = useRef<HTMLInputElement | null>(null), committed = useRef(values.customModel);
  useLayoutEffect(() => {
    committed.current = values.customModel;
    setDraft(values.customModel);
    if (input.current) input.current.value = values.customModel;
  }, [syncVersion]);
  function commit() {
    const value = input.current?.value ?? draft;
    if (value !== committed.current) change('customModel', value.trim());
  }
  return <input className="chat-setting-input" id="chatSettingCustomModel" type="text" autoComplete="off" placeholder="默认模型"
    ref={input} onInput={event => setDraft(event.currentTarget.value)}
    onBlur={commit} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) commit(); }} />;
}
