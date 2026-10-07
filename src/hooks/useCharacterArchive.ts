import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MouseEvent } from 'react';
import type { CharacterChatServices, CharacterDossier, CharacterEditorBridge, CharacterEditorSnapshot, ImportedDossier } from '../types/characterDossier';
import { blankCharacterRecord, nextCharacterId, readCharacterRecords, writeCharacterRecords } from '../utils/characterArchiveStorage';
import { todayStampDate } from '../utils/characterPng';
import { showToast } from '../utils/toast';

/** 资料沿用旧档案夹同一份，按保存才写进聊天角色清单；全部档案状态和计时器在 React 内。 */
export function useCharacterArchive() {
  const [services, setServices] = useState<CharacterChatServices | null>(null);
  const chat = useRef<CharacterChatServices | null>(null);
  const [dataState, setDataState] = useState<{
    records: CharacterDossier[];
    index: number;
  }>({
    records: [],
    index: 0
  });
  const data = useRef(dataState);
  const [visible, setVisible] = useState(false);
  const overlay = useRef<HTMLDivElement>(null),
    titlebar = useRef<HTMLDivElement>(null),
    banner = useRef<HTMLDivElement>(null),
    body = useRef<HTMLDivElement>(null),
    footer = useRef<HTMLDivElement>(null),
    name = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<number | undefined>(undefined),
    mounted = useRef(false),
    queuedOpen = useRef<{
      target: unknown;
    } | null>(null);
  function current() {
    return data.current.records[data.current.index];
  }
  function updateOwner() {
    setDataState({
      records: [...data.current.records],
      index: data.current.index
    });
  }
  function persist() {
    return writeCharacterRecords(data.current.records);
  }
  function publish(kind: CharacterEditorSnapshot['kind']) {
    updateOwner();
    window.dispatchEvent(new CustomEvent<CharacterEditorSnapshot>('qingtuan:character-editor-snapshot', {
      detail: {
        kind,
        index: data.current.index,
        record: {
          ...(current() || {})
        },
        records: data.current.records.map(record => ({
          ...record
        }))
      }
    }));
  }
  function panel(key: string) {
    window.dispatchEvent(new CustomEvent('qingtuan:character-editor-panel', {
      detail: key
    }));
  }
  function closeMenu() {
    window.dispatchEvent(new Event('qingtuan:character-menu-close'));
  }
  function patch(fields: Partial<CharacterDossier>) {
    const record = current();
    if (!record) return;
    Object.assign(record, fields);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (!persist()) showToast('资料暂存失败：请检查浏览器存储空间');
    }, 300);
    publish('fields');
  }
  function open(target?: unknown) {
    if (!mounted.current) {
      queuedOpen.current = {
        target
      };
      return;
    }
    data.current.records = readCharacterRecords();
    const targetIndex = typeof target === 'string' && target ? data.current.records.findIndex(record => String(record.id) === target) : -1;
    if (targetIndex >= 0) data.current.index = targetIndex;else {
      let draft = data.current.records.findIndex(record => !record.isStamped);
      if (draft < 0) {
        data.current.records.push(blankCharacterRecord(nextCharacterId(data.current.records)));
        draft = data.current.records.length - 1;
      }
      data.current.index = draft;
    }
    publish('form');
    panel('profile');
    flushSync(() => setVisible(true));
  }
  function close() {
    window.clearTimeout(saveTimer.current);
    // 完全空白的新草稿不留下来。
    data.current.records = data.current.records.filter(record => record.isStamped || record.name || record.nickname || record.photoUrl);
    updateOwner();
    persist();
    flushSync(() => setVisible(false));
    // 从聊天设置打开的话，关掉后身份卡马上跟着更新（头像换图要一点时间，稍后再补一次）。
    chat.current?.syncIdentity();
    window.setTimeout(() => chat.current?.syncIdentity(), 250);
  }
  function newRecord() {
    let draft = data.current.records.findIndex(record => !record.isStamped && !record.name && !record.nickname && !record.photoUrl);
    if (draft < 0) {
      data.current.records.push(blankCharacterRecord(nextCharacterId(data.current.records)));
      draft = data.current.records.length - 1;
    }
    data.current.index = draft;
    publish('form');
    panel('profile');
  }
  function selectRecord(index: number) {
    data.current.index = index;
    publish('form');
  }
  async function saveRecord() {
    const record = current(),
      displayName = (record.name || record.nickname || '').trim();
    if (!displayName) {
      panel('profile');
      name.current?.focus();
      showToast('请先填写角色名字');
      return;
    }
    Object.assign(record, {
      name: displayName,
      isStamped: true,
      archivedAt: new Date().toISOString(),
      stampDate: todayStampDate()
    });
    updateOwner();
    if (!persist()) {
      showToast('保存失败：请清理浏览器存储空间后重试');
      return;
    }
    if (await chat.current!.saveToChat(record)) {
      showToast('资料已保存');
      close();
    }
  }
  async function deleteRecord() {
    const record = current(),
      label = (record.name || record.nickname || '').trim() || '这个角色';
    const ok = await chat.current!.confirm({
      title: '删除角色',
      message: `确定要删除「${label}」吗？聊天记录也会一起删除。`,
      confirmText: '删除',
      danger: true
    });
    if (!ok) return;
    chat.current!.removeFromChat(record.id);
    data.current.records.splice(data.current.index, 1);
    updateOwner();
    persist();
    showToast('角色已删除');
    if (!data.current.records.length) {
      close();
      return;
    }
    data.current.index = Math.max(0, data.current.index - 1);
    publish('form');
  }
  async function commitImport(imported: ImportedDossier) {
    // 正在填的空白草稿直接被导入的角色取代。
    const record = current();
    if (record && !record.isStamped && !record.name && !record.nickname && !record.photoUrl) data.current.records.splice(data.current.index, 1);
    const base = blankCharacterRecord(nextCharacterId(data.current.records));
    const restored = {
      ...base,
      ...imported,
      id: base.id,
      fileNo: base.fileNo,
      tabLabel: base.tabLabel,
      sealNo: base.sealNo,
      isStamped: true,
      stampDate: imported.stampDate || todayStampDate()
    } as CharacterDossier;
    data.current.records.push(restored);
    data.current.index = data.current.records.length - 1;
    updateOwner();
    persist();
    await chat.current!.saveToChat(restored);
    publish('form');
    panel('profile');
    return restored;
  }
  function captureClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof Element && (target.closest('[data-card-index]') || target.closest('.cc-switch'))) return;
    closeMenu();
    if (target === event.currentTarget) close();
  }
  useLayoutEffect(() => {
    const ready = (event: Event) => {
      chat.current = (event as CustomEvent<CharacterChatServices>).detail;
      setServices(chat.current);
    };
    const show = (event: Event) => open((event as CustomEvent<unknown>).detail);
    const hide = () => close();
    const field = (event: Event) => {
      name.current = (event as CustomEvent<HTMLInputElement | null>).detail;
    };
    window.addEventListener('qingtuan:character-chat-services', ready);
    window.addEventListener('qingtuan:character-dialog-open', show);
    window.addEventListener('qingtuan:character-dialog-close', hide);
    window.addEventListener('qingtuan:character-name-input', field);
    return () => {
      window.clearTimeout(saveTimer.current);
      window.removeEventListener('qingtuan:character-chat-services', ready);
      window.removeEventListener('qingtuan:character-dialog-open', show);
      window.removeEventListener('qingtuan:character-dialog-close', hide);
      window.removeEventListener('qingtuan:character-name-input', field);
    };
  }, []);
  useLayoutEffect(() => {
    if (!services || !overlay.current || !titlebar.current || !banner.current || !body.current || !footer.current || mounted.current) return;
    const bridge: CharacterEditorBridge = {
      overlay: overlay.current,
      titlebar: titlebar.current,
      banner: banner.current,
      container: body.current,
      footer: footer.current,
      switchContainer: null,
      prepareOpen: open,
      finishClose: close,
      newRecord,
      saveRecord,
      deleteRecord,
      selectRecord,
      patch,
      closeMenu
    };
    mounted.current = true;
    window.dispatchEvent(new CustomEvent('qingtuan:character-editor-ready', {
      detail: bridge
    }));
    window.dispatchEvent(new CustomEvent('qingtuan:character-png-editor', {
      detail: {
        container: null,
        readCurrent: current,
        commitImport
      }
    }));
    if (queuedOpen.current) {
      const target = queuedOpen.current.target;
      queuedOpen.current = null;
      open(target);
    }
  }, [services]);
  return {
    services,
    visible,
    overlay,
    titlebar,
    banner,
    body,
    footer,
    captureClick
  };
}
