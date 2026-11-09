import { kv } from './kvStorage';

/** 美化 CSS 的存法（聊天美化、主画面美化各一份）：已套用的、还没套用的草稿、自己存的模板。 */
export interface CssTemplate { id: string; name: string; css: string; at: number }
export const TEMPLATE_LIMIT = 30;

export interface CssStore {
  /** 套用、清掉时发的事件（套到画面上的那个 <style> 听这个） */
  event: string;
  read(): string;
  /** 写之前先检查，写错会丢出「第几行：哪里错」 */
  write(css: string): void;
  readDraft(): string | null;
  writeDraft(draft: string, applied: string): void;
  readTemplates(): CssTemplate[];
  saveTemplate(name: string, css: string): CssTemplate;
  renameTemplate(id: string, name: string): void;
  deleteTemplate(id: string): void;
  /** 已套用的、草稿、模板一起改写（素材改名时用） */
  rewriteAll(change: (css: string) => string): void;
}

export function createCssStore(keys: { applied: string; draft: string; templates: string; event: string }, check: (css: string) => unknown): CssStore {
  const readTemplates = (): CssTemplate[] => {
    try { const list = JSON.parse(kv.getItem(keys.templates) || '[]'); return Array.isArray(list) ? list.filter(item => item && typeof item.css === 'string' && item.name) : []; } catch { return []; }
  };
  const writeTemplates = (list: CssTemplate[]) => kv.setItem(keys.templates, JSON.stringify(list));
  return {
    event: keys.event,
    read() { try { return kv.getItem(keys.applied) || ''; } catch { return ''; } },
    write(css) {
      const value = String(css || '').trim();
      if (value) { check(value); kv.setItem(keys.applied, value); } else kv.removeItem(keys.applied);
      try { kv.removeItem(keys.draft); } catch { /* 草稿清不掉没关系 */ }
      window.dispatchEvent(new CustomEvent(keys.event));
    },
    /** 还没套用的草稿：离开美化设置、重新开启都还在。跟已套用的一样就不存。 */
    readDraft() { try { return kv.getItem(keys.draft); } catch { return null; } },
    writeDraft(draft, applied) {
      try { if (draft.trim() === applied.trim()) kv.removeItem(keys.draft); else kv.setItem(keys.draft, draft.slice(0, 40000)); } catch { /* 存不了就算了 */ }
    },
    readTemplates,
    saveTemplate(name, css) {
      const list = readTemplates();
      if (list.length >= TEMPLATE_LIMIT) throw Error(`最多存 ${TEMPLATE_LIMIT} 个模板，先删掉不用的`);
      let next = String(name || '').trim().slice(0, 12) || '我的模板', index = 2;
      const base = next, names = new Set(list.map(item => item.name));
      while (names.has(next)) next = `${base.slice(0, 9)}(${index++})`;
      const item = { id: `css_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: next, css: String(css || ''), at: Date.now() };
      writeTemplates([...list, item]);
      return item;
    },
    renameTemplate(id, name) { writeTemplates(readTemplates().map(item => item.id === id ? { ...item, name: String(name || '').trim().slice(0, 12) || item.name } : item)); },
    deleteTemplate(id) { writeTemplates(readTemplates().filter(item => item.id !== id)); },
    rewriteAll(change) {
      try {
        const applied = kv.getItem(keys.applied) || '', draft = kv.getItem(keys.draft);
        if (applied && change(applied) !== applied) kv.setItem(keys.applied, change(applied));
        if (draft && change(draft) !== draft) kv.setItem(keys.draft, change(draft));
        writeTemplates(readTemplates().map(item => ({ ...item, css: change(item.css) })));
      } catch { /* 改不了就算了，CSS 里那张图会变透明 */ }
      window.dispatchEvent(new CustomEvent(keys.event));
    }
  };
}
