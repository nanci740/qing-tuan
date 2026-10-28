import { RetroSelect } from '../../../components/shared/RetroSelect';
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { readPresetStore, subscribePresets } from '../../../utils/presetStorage';
import type { ReactNode } from 'react';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
import type { ChatPreferences } from '../../../types/chatPreferences';
import { PressedButton } from '../../../components/shared/PressedButton';
import { showToast } from '../../../utils/toast';
import { loadVoiceImageSettings } from '../../../utils/voiceImageServices';
import { applyVoiceProviderPreset } from '../../../utils/voiceImagePresets';

export function ChatReplySelect({ id, setting, children }: {
  id: string; setting: 'replyLength' | 'quotePolicy' | 'photoInteraction'; children: ReactNode;
}) {
  const { values, change } = useChatPreferences();
  return <RetroSelect title={setting === 'replyLength' ? '回复长度' : setting === 'photoInteraction' ? '互动画面' : '引用方式'} className="chat-setting-select" id={id} value={values[setting]}
    onChange={value => change(setting, value as ChatPreferences[typeof setting])}>{children}</RetroSelect>;
}
/** 这个聊天用哪份预设：第一个选项是跟着默认走。 */
export function ChatPresetSelect() {
  const { values, change } = useChatPreferences();
  const store = useSyncExternalStore(subscribePresets, readPresetStore);
  const fallback = store.presets.find(item => item.id === store.defaultId)?.name || '默认预设';
  const value = store.presets.some(item => item.id === values.presetId) ? values.presetId : '';
  return <RetroSelect title="预设" className="chat-setting-select" id="chatSettingPreset" value={value} onChange={next => change('presetId', next)}>
    <option value="">{`跟随默认（${fallback}）`}</option>
    {store.presets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
  </RetroSelect>;
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

/** 他发语音用的音色：每个聊天自己填，旁边可以试听一句。提示照「语音与生图设置」选的服务写。 */
export function ChatVoiceName() {
  const { values, syncVersion, change } = useChatPreferences();
  const input = useRef<HTMLInputElement | null>(null), [busy, setBusy] = useState(false);
  useLayoutEffect(() => { if (input.current) input.current.value = values.voiceName; }, [values.voiceName, syncVersion]);
  const provider = loadVoiceImageSettings().voice.provider, placeholder = applyVoiceProviderPreset(loadVoiceImageSettings().voice, provider).meta.voicePlaceholder || '音色';
  function commit() {
    const next = input.current?.value.trim().slice(0, 120) || '';
    if (next !== values.voiceName) change('voiceName', next);
    return next;
  }
  async function listen() {
    const name = commit();
    if (!name) { showToast('先填音色'); return; }
    if (!window.smallphoneVoiceReady?.()) { showToast('请先在「语音与生图设置」开启语音并填好服务'); return; }
    setBusy(true);
    try {
      const blob = await window.smallphoneSynthesizeSpeech?.('你好，这是我的声音。', name);
      if (!blob?.size) throw new Error('没有念出来');
      const url = URL.createObjectURL(blob), audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (error) { showToast(String((error as Error)?.message || error).slice(0, 60)); }
    finally { setBusy(false); }
  }
  return <span className="chat-setting-voice-name">
    <input className="chat-setting-input" id="chatSettingVoiceName" type="text" autoComplete="off" placeholder={placeholder} ref={input} onBlur={commit}
      onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) commit(); }} />
    <PressedButton type="button" className="chat-setting-action" disabled={busy} onClick={() => void listen()}>{busy ? '念…' : '试听'}</PressedButton>
  </span>;
}
