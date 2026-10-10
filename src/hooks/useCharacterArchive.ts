import {useImportPreview} from './useImportPreview';
import {importNameKey} from '../utils/importMatching';
import { preparePhotoRecords } from '../utils/imageAssets';
import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MouseEvent } from 'react';
import type { CharacterChatServices, CharacterDossier, CharacterEditorBridge, CharacterEditorSnapshot, ImportedDossier } from '../types/characterDossier';
import { blankCharacterRecord, nextCharacterId, readCharacterRecords, writeCharacterRecords } from '../utils/characterArchiveStorage';
import { catalogSaveError } from '../utils/catalogStorage';
import { todayStampDate } from '../utils/characterPng';
import { showToast } from '../utils/toast';

/** 资料沿用旧档案夹同一份，按保存才写进聊天角色清单；全部档案状态和计时器在 React 内。 */
export function useCharacterArchive() {
  const importPreview=useImportPreview(),importCommitBusy=useRef(false);
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
    if(importCommitBusy.current)return;
    const record = current();
    if (!record) return;
    Object.assign(record, fields);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist();
    }, 300);
    publish('fields');
  }
  function open(target?: unknown) {
    if(importCommitBusy.current)return;
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
  async function close() {
    if(importCommitBusy.current)return showToast('正在导入档案，请稍候');
    importPreview.choose('cancel');
    window.clearTimeout(saveTimer.current);
    // 完全空白的新草稿不留下来。
    data.current.records = data.current.records.filter(record => record.isStamped || record.name || record.nickname || record.photoUrl);
    updateOwner();
    if (!await persist()) return;
    flushSync(() => setVisible(false));
    // 从聊天设置打开的话，关掉后身份卡马上跟着更新（头像换图要一点时间，稍后再补一次）。
    chat.current?.syncIdentity();
    window.setTimeout(() => chat.current?.syncIdentity(), 250);
  }
  function newRecord() {
    if(importCommitBusy.current)return;
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
    if(importCommitBusy.current)return;
    data.current.index = index;
    publish('form');
  }
  async function saveRecord() {
    if(importCommitBusy.current)return;
    window.clearTimeout(saveTimer.current);
    const record = current();
    if (!record) return;
    const displayName = (record.name || record.nickname || '').trim();
    if (!displayName) {
      panel('profile');
      name.current?.focus();
      showToast('请先填写角色名字');
      return;
    }
    try { await preparePhotoRecords([record]); } catch { showToast('头像保存失败，请检查浏览器存储空间'); return; }
    Object.assign(record, {
      name: displayName,
      isStamped: true,
      archivedAt: new Date().toISOString(),
      stampDate: todayStampDate()
    });
    updateOwner();
    if (!await persist()) {
      return;
    }
    if (await chat.current!.saveToChat(record)) {
      showToast('资料已保存');
      await close();
    }
  }
  async function deleteRecord() {
    if(importCommitBusy.current)return;
    const record = current();
    if (!record) return;
    const label = (record.name || record.nickname || '').trim() || '这个角色';
    const ok = await chat.current!.confirm({
      title: '删除角色',
      message: `确定要删除「${label}」吗？聊天记录也会一起删除。`,
      confirmText: '删除',
      danger: true
    });
    if (!ok) return;
    window.clearTimeout(saveTimer.current);
    if (!await chat.current!.removeFromChat(record.id)) return;
    const next = data.current.records.filter(item => item.id !== record.id);
    if (!await writeCharacterRecords(next)) return;
    data.current.records = next;
    updateOwner();
    showToast('角色已删除');
    if (!data.current.records.length) {
      await close();
      return;
    }
    data.current.index = Math.max(0, data.current.index - 1);
    publish('form');
  }
  async function commitImport(imported: ImportedDossier) {
    if(!imported||typeof imported!=='object'||Array.isArray(imported))throw Error('不是有效的角色档案');
    for(const key of ['name','nickname','photoUrl','quote','appearanceText','memoriesText','otherSettingsText','speechHabitsText','secretMemo','onlineStyle','offlineStyle'])if(imported[key]!==undefined&&typeof imported[key]!=='string')throw Error('角色档案字段格式异常');
    const label=String(imported.name||imported.nickname||'').trim();if(!label)throw Error('角色档案缺少名字');
    for(const [key,value] of Object.entries(blankCharacterRecord(1)))if(typeof value==='string'&&imported[key]!==undefined&&typeof imported[key]!=='string')throw Error('角色档案字段格式异常');
    for(const key of ['selectedTags','customTags','relationships'])if(imported[key]!==undefined&&!Array.isArray(imported[key]))throw Error('角色档案列表格式异常');
    for(const key of ['selectedTags','customTags'])if(Array.isArray(imported[key])&&(imported[key] as unknown[]).some(value=>typeof value!=='string'))throw Error('角色档案标签格式异常');
    if(Array.isArray(imported.relationships)&&imported.relationships.some(value=>!value||typeof value!=='object'||Array.isArray(value)))throw Error('角色关系格式异常');
    const records=data.current.records,before=JSON.stringify(data.current.records);
    const matches=records.filter(record=>record.isStamped&&importNameKey(record.name||record.nickname)===importNameKey(label));
    const mode=await importPreview.open({title:'导入角色档案',kind:'dossier',message:'请核对角色资料，再选择导入方式。覆盖只替换档案资料，保留原来的聊天记录。',rows:[{name:label,detail:`${imported.photoUrl?'含角色图片':'无角色图片'} · ${['quote','appearanceText','speechHabitsText','onlineStyle','offlineStyle','memoriesText','otherSettingsText','secretMemo','favoriteThings','dislikes'].filter(key=>typeof imported[key]==='string'&&String(imported[key]).trim()).length} 项非空设定`,conflict:matches.length?`已有 ${matches.length} 份同名档案${matches.length>1?'，请新增或先调整名称':''}`:undefined}],choices:[{value:'append',label:'新增档案',primary:true},...(matches.length===1?[{value:'replace',label:'覆盖同名档案'}]:[]),{value:'cancel',label:'取消'}]});
    if(mode==='cancel')return null;
    if(data.current.records!==records||JSON.stringify(data.current.records)!==before)throw Error('档案已发生变化，请重新导入并核对');
    if(mode==='replace'&&!await chat.current!.confirm({title:'覆盖同名档案',message:`替换「${label}」的资料，聊天记录保留。`,confirmText:'覆盖资料',danger:true}))return null;
    if(data.current.records!==records||JSON.stringify(data.current.records)!==before)throw Error('档案已发生变化，请重新导入并核对');
    importCommitBusy.current=true;window.clearTimeout(saveTimer.current);
    try {
      const target=mode==='replace'?matches[0]:null;
      const kept=records.filter(record=>record.isStamped||record.name||record.nickname||record.photoUrl);
      const base=target||blankCharacterRecord(nextCharacterId(records));
      const restored={...blankCharacterRecord(Number(base.id)||1),...imported,id:base.id,fileNo:base.fileNo,tabLabel:base.tabLabel,sealNo:base.sealNo,isStamped:true,name:label,stampDate:imported.stampDate||todayStampDate()} as CharacterDossier;
      await preparePhotoRecords([restored]);
      if(data.current.records!==records||JSON.stringify(data.current.records)!==before)throw Error('档案已发生变化，请重新导入并核对');
      const next=target?kept.map(record=>record.id===target.id?restored:record):[...kept,restored];
      const storedBefore=readCharacterRecords();
      if(!await writeCharacterRecords(next))throw Error(catalogSaveError('characterRecords'));
      if(!await chat.current!.saveToChat(restored)){
        const cause=catalogSaveError('chatCharacters');
        if(!await writeCharacterRecords(storedBefore))throw Error(catalogSaveError('characterRecords'));
        throw Error(cause);
      }
      data.current={records:next,index:next.findIndex(record=>record.id===restored.id)};publish('form');panel('profile');return restored;
    } finally {importCommitBusy.current=false;}
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
    importPreview,
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
