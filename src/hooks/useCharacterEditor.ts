import { flushSync } from 'react-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CharacterDossier, CharacterEditorBridge, CharacterEditorSnapshot, CharacterRelationship } from '../types/characterDossier';
export const CHARACTER_PANELS = [['profile', '个人资料'], ['appearance', '外貌'], ['personality', '性格'], ['speech', '口吻'], ['styles', '线上线下'], ['network', '关系网'], ['favorites', '喜好'], ['memories', '回忆'], ['other', '其他'], ['secret', '私密']] as const;
export const CHARACTER_TAGS = ['温柔', '沉稳', '腹黑', '敏感', '阳光', '傲娇', '治愈系', '理想主义', '坚毅', '慵懒', '理性', '幽默', '深情', '神秘', '果决'];

/** 编辑状态及事件在 React 内管理，旧档案的持久化提交暂时经适配器同步。 */
export function useCharacterEditor() {
  const [bridge, setBridge] = useState<CharacterEditorBridge | null>(null);
  const [source, setSource] = useState<CharacterEditorSnapshot>({
    kind: 'fields',
    index: 0,
    record: {},
    records: []
  });
  const [rendered, setRendered] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [tagsVersion, setTagsVersion] = useState(0);
  const [relationsVersion, setRelationsVersion] = useState(0);
  const [relationInputs, setRelationInputs] = useState<CharacterRelationship[]>([]);
  const [tagInput, setTagInput] = useState('');
  const pane = useRef<HTMLDivElement>(null),
    tagAdd = useRef<HTMLButtonElement>(null);
  const panelScrollPending = useRef(false);
  useLayoutEffect(() => {
    const ready = (event: Event) => setBridge((event as CustomEvent<CharacterEditorBridge>).detail);
    const snapshot = (event: Event) => {
      const next = (event as CustomEvent<CharacterEditorSnapshot>).detail;
      setSource(next);
      if (next.kind === 'form') {
        setRendered(true);
        setFormVersion(n => n + 1);
        setTagsVersion(n => n + 1);
        setRelationsVersion(n => n + 1);
        setRelationInputs(next.record.relationships || []);
      }
    };
    const changePanel = (event: Event) => {
      panelScrollPending.current = true;
      flushSync(() => setPanel((event as CustomEvent<string>).detail));
    };
    window.addEventListener('qingtuan:character-editor-ready', ready);
    window.addEventListener('qingtuan:character-editor-snapshot', snapshot);
    window.addEventListener('qingtuan:character-editor-panel', changePanel);
    return () => {
      window.removeEventListener('qingtuan:character-editor-ready', ready);
      window.removeEventListener('qingtuan:character-editor-snapshot', snapshot);
      window.removeEventListener('qingtuan:character-editor-panel', changePanel);
    };
  }, []);
  useLayoutEffect(() => {
    if (panelScrollPending.current && pane.current) {
      pane.current.scrollTop = 0;
      panelScrollPending.current = false;
    }
  });
  function patch(fields: Partial<CharacterDossier>, rebuild?: 'tags' | 'relations') {
    bridge?.patch(fields);
    setSource(current => ({
      ...current,
      record: {
        ...current.record,
        ...fields
      }
    }));
    if (rebuild === 'tags') setTagsVersion(n => n + 1);
    if (rebuild === 'relations') {
      setRelationsVersion(n => n + 1);
      setRelationInputs(fields.relationships || []);
    }
  }
  const record = source.record;
  function toggleTag(tag: string) {
    const selected = record.selectedTags || [];
    patch({
      selectedTags: selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]
    }, 'tags');
  }
  function deleteTag(tag: string) {
    patch({
      customTags: (record.customTags || []).filter(t => t !== tag),
      selectedTags: (record.selectedTags || []).filter(t => t !== tag)
    }, 'tags');
  }
  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;
    const custom = record.customTags || [],
      selected = record.selectedTags || [];
    patch({
      customTags: custom.includes(tag) ? custom : [...custom, tag],
      selectedTags: selected.includes(tag) ? selected : [...selected, tag]
    }, 'tags');
    setTagInput('');
  }
  function addRelation(target?: CharacterDossier) {
    const relation: CharacterRelationship = target ? {
      id: Date.now().toString(),
      targetDossierId: target.id,
      targetName: target.name || target.nickname,
      relationType: '朋友',
      note: ''
    } : {
      id: Date.now().toString(),
      targetName: '',
      relationType: '',
      note: ''
    };
    patch({
      relationships: [...(record.relationships || []), relation]
    }, 'relations');
  }
  function changeRelation(id: string, field: 'targetName' | 'relationType' | 'note', value: string) {
    patch({
      relationships: (record.relationships || []).map(rel => rel.id === id ? {
        ...rel,
        [field]: value
      } : rel)
    });
  }
  function deleteRelation(id: string) {
    patch({
      relationships: (record.relationships || []).filter(rel => rel.id !== id)
    }, 'relations');
  }
  function selectPanel(key: string) {
    setPanel(key);
    panelScrollPending.current = true;
    if (pane.current) pane.current.scrollTop = 0;
  }
  return {
    bridge,
    record,
    records: source.records,
    index: source.index,
    rendered,
    panel,
    formVersion,
    tagsVersion,
    relationsVersion,
    relationInputs,
    tagInput,
    setTagInput,
    pane,
    tagAdd,
    patch,
    toggleTag,
    deleteTag,
    addTag,
    addRelation,
    changeRelation,
    deleteRelation,
    selectPanel
  };
}
