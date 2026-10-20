import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { PressedButton } from '../../components/shared/PressedButton';
import { useChoice } from '../../providers/ChoiceProvider';
import { confirmChat } from '../../utils/chatConfirm';
import { showToast } from '../../utils/toast';
import type { Preset, PresetAnchor, PresetEntry, PresetParams, PresetPlacement, PresetRole } from '../../types/preset';
import { PRESET_BUILTINS, builtinInfo, createPreset, exportPresetsJson, newPresetEntry, parsePresetImport, readPresetStore, subscribePresets, writePresetStore } from '../../utils/presetStorage';
import './Preset.css';

type View = { name: 'list' } | { name: 'preset'; id: string } | { name: 'entry'; id: string; entryId: string };
const PLACEMENTS: [PresetPlacement, string][] = [['system', '系统提示词里'], ['front', '聊天记录前面'], ['tail', '聊天记录最后'], ['depth', '聊天记录中（按插入深度）']];
const ROLES: [PresetRole, string][] = [['system', 'system'], ['user', 'user'], ['assistant', 'assistant']];
const ANCHORS: [PresetAnchor, string][] = [['start', '最前面'], ...PRESET_BUILTINS.map(item => [item.id, `「${item.name}」后面`] as [PresetAnchor, string]), ['end', '最后面']];
const anchorLabel = (anchor: PresetAnchor | undefined) => ANCHORS.find(item => item[0] === (anchor || 'end'))?.[1] || '最后面';
const placementLabel = (entry: PresetEntry) => entry.placement === 'system' ? '系统提示词 · ' + anchorLabel(entry.anchor) : entry.placement === 'front' ? '记录前面' : entry.placement === 'tail' ? '记录最后' : `倒数第 ${entry.depth} 条前`;
const PARAMS: { key: keyof PresetParams; label: string; hint: string; min: number; max: number; step: string }[] = [
  { key: 'temperature', label: '温度', hint: '0–2，越高越随性', min: 0, max: 2, step: '0.05' },
  { key: 'topP', label: 'Top P', hint: '0–1', min: 0, max: 1, step: '0.05' },
  { key: 'maxTokens', label: '单次回复上限', hint: '0 表示不限', min: 0, max: 32768, step: '1' },
];
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' })), link = document.createElement('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** 预设 App：列出预设、编辑一份预设的条目和参数、编辑自己写的条目。资料存在 presetStorage，改了马上存。 */
export function PresetApp({ onClose }: { onClose: () => void }) {
  const store = useSyncExternalStore(subscribePresets, readPresetStore);
  const [view, setViewState] = useState<View>({ name: 'list' });
  const [draft, setDraft] = useState<PresetEntry | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  // 每一层页面滑到哪里：换页前记下，回来时停回原处（条目编辑页每次都从最上面开始）。
  const pageRef = useRef<HTMLElement>(null), scrollMemory = useRef<Record<string, number>>({});
  const viewKey = (value: View) => value.name === 'preset' ? 'preset:' + value.id : value.name;
  function go(next: View) {
    if (pageRef.current) scrollMemory.current[viewKey(view)] = pageRef.current.scrollTop;
    setViewState(next);
  }
  useLayoutEffect(() => { if (pageRef.current) pageRef.current.scrollTop = view.name === 'entry' ? 0 : scrollMemory.current[viewKey(view)] ?? 0; }, [viewKey(view)]);
  const choice = useChoice();
  const preset = view.name === 'list' ? undefined : store.presets.find(item => item.id === view.id);
  const save = (next: Preset) => writePresetStore({ ...store, presets: store.presets.map(item => item.id === next.id ? { ...next, updatedAt: Date.now() } : item) });
  const pick = (title: string, options: [string, string][], selected: string, confirm: (value: string) => void) =>
    choice.openChoice({ style: 'settings', title, options: options.map(([value, label]) => ({ value, label })), selected, confirm });

  function back() {
    if (view.name === 'entry') { setDraft(null); go({ name: 'preset', id: view.id }); }
    else if (view.name === 'preset') go({ name: 'list' });
    else onClose();
  }
  function addPreset() {
    const next = createPreset(`新预设 ${store.presets.length + 1}`);
    if (!writePresetStore({ ...store, presets: [...store.presets, next] })) return;
    go({ name: 'preset', id: next.id });
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget, file = input.files?.[0]; input.value = '';
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('JSON 文件不可超过 5 MB');
      let parsed: unknown; try { parsed = JSON.parse(await file.text()); } catch { throw Error('JSON 文件无法读取'); }
      const imported = parsePresetImport(parsed, file.name), latest = readPresetStore();
      if (!writePresetStore({ ...latest, presets: [...latest.presets, ...imported] })) return;
      const warned = imported.reduce((count, item) => count + item.entries.filter(entry => entry.warn).length, 0);
      showToast(`已导入 ${imported.length} 份预设` + (warned ? `；${warned} 条可能跟回复格式冲突，已先关掉` : ''));
    } catch (error) { showToast((error as Error).message || '预设导入失败'); }
  }
  async function removePreset(target: Preset) {
    if (store.presets.length <= 1) { showToast('至少要留一份预设'); return; }
    if (!await confirmChat({ title: '删除预设？', message: `「${target.name}」和里面自己写的条目都会一起删掉。用这份预设的聊天会改回默认预设。`, confirmText: '删除', danger: true })) return;
    if (!writePresetStore({ ...store, presets: store.presets.filter(item => item.id !== target.id) })) return;
    go({ name: 'list' });
    showToast('预设已删除');
  }
  function copyPreset(target: Preset) {
    const copy = { ...structuredClone(target), id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7), name: target.name + '（副本）' };
    copy.entries = copy.entries.map(entry => entry.builtin ? entry : { ...entry, id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7) });
    if (!writePresetStore({ ...store, presets: [...store.presets, copy] })) return;
    go({ name: 'preset', id: copy.id });
    showToast('已复制预设');
  }
  function move(target: Preset, index: number, step: number) {
    const entries = [...target.entries], to = index + step;
    // 只在同一组里移：自带的在自带里排，自己写的在自己写的里排。
    if (to < 0 || to >= entries.length || !!entries[index].builtin !== !!entries[to].builtin) return;
    [entries[index], entries[to]] = [entries[to], entries[index]];
    save({ ...target, entries });
  }
  function toggleEntry(target: Preset, id: string, enabled: boolean) {
    save({ ...target, entries: target.entries.map(entry => entry.id === id ? { ...entry, enabled, ...(enabled ? { warn: undefined } : {}) } : entry) });
  }
  function openEntry(target: Preset, entry: PresetEntry) { setDraft({ ...entry }); go({ name: 'entry', id: target.id, entryId: entry.id }); }
  function saveEntry(target: Preset) {
    if (!draft) return;
    if (!draft.name.trim() || !draft.content.trim()) { showToast('先填写名称和内容'); return; }
    const entry: PresetEntry = { ...draft, name: draft.name.trim(), role: draft.placement === 'system' ? 'system' : draft.role, depth: Math.max(0, Math.floor(Number(draft.depth) || 0)) };
    const exists = target.entries.some(item => item.id === entry.id);
    if (!save({ ...target, entries: exists ? target.entries.map(item => item.id === entry.id ? entry : item) : [...target.entries, entry] })) return;
    setDraft(null); go({ name: 'preset', id: target.id }); showToast('条目已保存');
  }
  async function deleteEntry(target: Preset, id: string) {
    if (!await confirmChat({ title: '删除条目？', message: '删除后，这条不会再送给模型。', confirmText: '删除', danger: true })) return;
    if (!save({ ...target, entries: target.entries.filter(item => item.id !== id) })) return;
    setDraft(null); go({ name: 'preset', id: target.id }); showToast('条目已删除');
  }
  function setParam(target: Preset, key: keyof PresetParams, patch: Partial<Preset['params'][typeof key]>) {
    save({ ...target, params: { ...target.params, [key]: { ...target.params[key], ...patch } } });
  }

  const title = view.name === 'list' ? 'Preset' : view.name === 'preset' ? '预设' : (draft && preset?.entries.some(item => item.id === draft.id) ? '编辑条目' : '新建条目');
  let body: ReactNode = null;
  if (view.name === 'list') {
    body = <>
      <div className="world-intro"><div className="world-small">PRESET ARCHIVE · 青团</div><h2>预设</h2><p>决定角色怎么读懂这场对话</p></div>
      <div className="world-section-head"><b>预设档案</b><small>{store.presets.length} PRESETS</small></div>
      {store.presets.map((item, index) => {
        const custom = item.entries.filter(entry => !entry.builtin), params = PARAMS.filter(param => item.params[param.key].enabled).map(param => param.label);
        return <div className="world-paper world-entry-card" key={item.id}><div className="world-row">
          <PressedButton className="world-book-open" type="button" data-open-preset={item.id} onClick={() => go({ name: 'preset', id: item.id })}>
            <div className="world-entry-title"><span className="world-entry-no">No.{String(index + 1).padStart(2, '0')}</span>{item.name}</div>
            <div className="world-entry-preview">{`自己写的条目 ${custom.length} 条` + (params.length ? `；参数：${params.join('、')}` : '；参数跟着 API 设置')}</div>
            <div className="preset-chips">{item.id === store.defaultId ? <span className="world-chip">默认</span> : null}<span className="world-chip">{custom.filter(entry => entry.enabled).length} 条启用</span></div>
          </PressedButton>
        </div></div>;
      })}
      <div className="world-action-bar">
        <PressedButton className="world-action" type="button" id="presetAdd" onClick={addPreset}>新建预设</PressedButton>
        <PressedButton className="world-action secondary" type="button" id="presetImport" onClick={() => importInput.current?.click()}>导入</PressedButton>
        <PressedButton className="world-action secondary" type="button" id="presetExportAll" onClick={() => download('qingtuan-presets-' + new Date().toISOString().slice(0, 10) + '.json', exportPresetsJson(store.presets))}>导出全部</PressedButton>
      </div>
    </>;
  } else if (view.name === 'preset' && preset) {
    const isDefault = preset.id === store.defaultId;
    body = <>
      <div className="world-intro"><div className="world-small">PRESET RECORD{isDefault ? ' · DEFAULT' : ''}</div><h2>{preset.name}</h2><p>{isDefault ? '所有聊天默认用这份' : '聊天设置里选了这份的聊天才会用'}</p></div>
      <div className="world-paper preset-form">
        <label className="world-field"><span className="world-label">预设名称</span>
          <input className="world-input" id="presetName" defaultValue={preset.name} key={preset.id} maxLength={60} onBlur={event => { const name = event.currentTarget.value.trim(); if (name && name !== preset.name) save({ ...preset, name }); }} />
        </label>
        {isDefault ? <span className="world-hint">这份是默认预设。</span> : <PressedButton className="world-action secondary" type="button" id="presetSetDefault" onClick={() => { if (writePresetStore({ ...store, defaultId: preset.id })) showToast('已设为默认预设'); }}>设为默认预设</PressedButton>}
      </div>
      <div className="world-section-head"><b>参数</b><small>打开的会盖过 API 设置</small></div>
      <div className="world-paper preset-form">
        {PARAMS.map(param => <div className="preset-param-row" key={param.key}>
          <label className="world-row"><span><span className="world-label">{param.label}</span><br /><span className="world-hint">{param.hint}</span></span>
            <input className="world-toggle" type="checkbox" id={'presetParam-' + param.key} checked={preset.params[param.key].enabled} onChange={event => setParam(preset, param.key, { enabled: event.currentTarget.checked })} /></label>
          {preset.params[param.key].enabled ? <input className="world-input" type="number" id={'presetParamValue-' + param.key} key={preset.id + param.key} min={param.min} max={param.max} step={param.step} defaultValue={preset.params[param.key].value}
            onBlur={event => { const value = Math.min(param.max, Math.max(param.min, Number(event.currentTarget.value) || 0)); event.currentTarget.value = String(value); setParam(preset, param.key, { value }); }} /> : null}
        </div>)}
      </div>
      {[true, false].map(builtinGroup => {
        const group = preset.entries.map((entry, index) => ({ entry, index })).filter(item => !!item.entry.builtin === builtinGroup);
        return <div key={builtinGroup ? 'builtin' : 'custom'}>
          <div className="world-section-head"><b>{builtinGroup ? '自带规矩' : '自己写的条目'}</b><small>{group.length} ENTRIES</small></div>
          <p className="world-hint preset-note">{builtinGroup ? '程序自己的规矩，固定排在最上面，只能用 ↑ ↓ 排顺序、开关；「回复格式」锁住不能关。' : '用 ↑ ↓ 排顺序。放进系统提示词的，会接在你选的那段自带规矩后面。'}</p>
          {!builtinGroup && !group.length ? <div className="world-empty-note">还没有自己写的条目，点下面的「新增条目」写一条吧。</div> : null}
          {group.map(({ entry, index }, position) => {
            const info = entry.builtin ? builtinInfo(entry.builtin) : null;
            return <div className="world-paper world-entry-card preset-entry" key={entry.id} data-preset-entry={entry.id}><div className="world-row">
              <PressedButton className="world-book-open" type="button" disabled={!!info} onClick={() => { if (!info) openEntry(preset, entry); }}>
                <div className="world-entry-title"><span className="world-entry-no">No.{String(position + 1).padStart(2, '0')}</span>{entry.name || '未命名条目'}</div>
                <div className="world-entry-preview">{info ? info.note : entry.content}</div>
                <div className="preset-chips">{info ? <span className="world-chip">自带</span> : null}{info?.locked ? <span className="world-chip">锁定</span> : null}{info ? null : <span className="world-chip">{placementLabel(entry)}{entry.placement === 'system' ? '' : ' · ' + entry.role}</span>}{entry.warn ? <span className="world-chip preset-warn">需检查</span> : null}</div>
              </PressedButton>
              <div className="preset-entry-controls">
                <PressedButton className="preset-move" type="button" aria-label="往上移" disabled={position === 0} onClick={() => move(preset, index, -1)}>↑</PressedButton>
                <PressedButton className="preset-move" type="button" aria-label="往下移" disabled={position === group.length - 1} onClick={() => move(preset, index, 1)}>↓</PressedButton>
                <input className="world-toggle" type="checkbox" aria-label="启用条目" checked={entry.enabled || !!info?.locked} disabled={!!info?.locked} onChange={event => toggleEntry(preset, entry.id, event.currentTarget.checked)} />
              </div>
            </div></div>;
          })}
        </div>;
      })}
      <div className="world-action-bar">
        <PressedButton className="world-action" type="button" id="presetAddEntry" onClick={() => openEntry(preset, newPresetEntry())}>新增条目</PressedButton>
        <PressedButton className="world-action secondary" type="button" onClick={() => copyPreset(preset)}>复制</PressedButton>
        <PressedButton className="world-action secondary" type="button" onClick={() => download(preset.name.replace(/[\\/:*?"<>|]/g, '-') + '.json', exportPresetsJson([preset]))}>导出</PressedButton>
        <PressedButton className="world-action danger" type="button" id="presetDelete" onClick={() => removePreset(preset)}>删除</PressedButton>
      </div>
    </>;
  } else if (view.name === 'entry' && preset && draft) {
    const exists = preset.entries.some(item => item.id === draft.id);
    body = <>
      <div className="world-intro"><div className="world-small">ENTRY RECORD</div><h2>{exists ? '编辑条目' : '新建条目'}</h2><p>写给模型看的一段规矩</p></div>
      <div className="world-paper preset-form">
        <label className="world-field"><span className="world-label">名称</span><input className="world-input" id="presetEntryName" value={draft.name} maxLength={80} placeholder="例如：说话风格" onChange={event => setDraft({ ...draft, name: event.currentTarget.value })} /></label>
        <label className="world-field"><span className="world-label">内容</span><textarea className="world-textarea long" id="presetEntryContent" value={draft.content} placeholder="在这里写给模型的说明…" onChange={event => setDraft({ ...draft, content: event.currentTarget.value })} />
          <span className="world-hint">可以用 {'{{char}}'} 代表角色名字、{'{{user}}'} 代表你的名字。</span></label>
        <label className="world-field"><span className="world-label">放在哪里</span>
          <PressedButton className="world-select-btn api-model-select-btn" type="button" id="presetEntryPlacement" onClick={() => pick('放在哪里', PLACEMENTS, draft.placement, value => setDraft(current => current && { ...current, placement: value as PresetPlacement }))}>{PLACEMENTS.find(item => item[0] === draft.placement)?.[1]}</PressedButton></label>
        {draft.placement === 'system' ? <label className="world-field"><span className="world-label">接在哪一段后面</span>
          <PressedButton className="world-select-btn api-model-select-btn" type="button" id="presetEntryAnchor" onClick={() => pick('接在哪一段后面', ANCHORS, draft.anchor || 'end', value => setDraft(current => current && { ...current, anchor: value as PresetAnchor }))}>{anchorLabel(draft.anchor)}</PressedButton>
          <span className="world-hint">世界书的「人设前」「人设后」夹着「角色人设」；接在「角色人设」后面的条目会排在世界书「人设后」之后。</span></label> : null}
        {draft.placement !== 'system' ? <label className="world-field"><span className="world-label">用什么身份送</span>
          <PressedButton className="world-select-btn api-model-select-btn" type="button" id="presetEntryRole" onClick={() => pick('用什么身份送', ROLES, draft.role, value => setDraft(current => current && { ...current, role: value as PresetRole }))}>{draft.role}</PressedButton></label> : null}
        {draft.placement === 'depth' ? <label className="world-field"><span className="world-label">插入深度（插在倒数第几条消息之前，0 = 最后）</span><input className="world-input" type="number" id="presetEntryDepth" min={0} value={draft.depth} onChange={event => setDraft({ ...draft, depth: Number(event.currentTarget.value) })} /></label> : null}
        <label className="world-row" style={{ padding: '8px 0' }}><span className="world-label">启用</span><input className="world-toggle" type="checkbox" checked={draft.enabled} onChange={event => setDraft({ ...draft, enabled: event.currentTarget.checked, warn: undefined })} /></label>
        {draft.warn ? <span className="world-hint">导入时看起来跟回复格式有关，先关掉了。确认不会叫模型改用别的格式回复，再打开。</span> : null}
      </div>
      <div className="world-action-bar">
        <PressedButton className="world-action secondary" type="button" onClick={back}>返回</PressedButton>
        <PressedButton className="world-action" type="button" id="presetEntrySave" onClick={() => saveEntry(preset)}>保存条目</PressedButton>
        {exists ? <PressedButton className="world-action danger" type="button" onClick={() => deleteEntry(preset, draft.id)}>删除</PressedButton> : null}
      </div>
    </>;
  }

  return <section id="presetPage" className="world-page open preset-page" aria-label="预设" ref={pageRef}>
    <div className="world-shell">
      <div className="world-top">
        <PressedButton className="world-icon-btn" id="presetBack" type="button" aria-label="返回" onClick={back}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg></PressedButton>
        <div className="world-main-title">{title}</div>
        <span />
      </div>
      {body}
      <input id="presetImportFile" type="file" accept=".json,application/json" hidden ref={importInput} onChange={importFile} />
    </div>
  </section>;
}
