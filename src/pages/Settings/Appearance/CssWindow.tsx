import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { PressedButton } from '../../../components/shared/PressedButton';
import { useAppearance } from '../../../providers/AppearanceProvider';
import { useChoice } from '../../../providers/ChoiceProvider';
import { showToast } from '../../../utils/toast';
import type { CssStore, CssTemplate } from '../../../utils/cssStore';
import { ASSET_RENAMED_EVENT, renameAssetEverywhere } from '../../../utils/cssAssetRename';
import { CSS_ASSETS_EVENT, addCssAsset, assetRef, cssFromFile, cssWithAssets, deleteCssAsset, listCssAssets, loadCssAssets, renameInCss, resolveAssets } from '../../../utils/cssAssets';
import type { CssAssetInfo } from '../../../utils/cssAssets';

export const escapeHtml = (text: string) => text.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]!));
/** 预览里放草稿的那个 <style>：buildPreview 写的 iframe 里要有它。 */
export const DRAFT_STYLE_ID = 'cssDraft';

/** 现在页面上的样式（排除掉套用中的美化 CSS），预览 iframe 用。 */
export function pageStyles(skip: string[]) {
  return [...document.querySelectorAll<HTMLElement>('link[rel="stylesheet"], style')].filter(node => !skip.includes(node.id)).map(node => node.outerHTML).join('');
}
/** 预览 iframe 的外壳：html、body 跟真的一样（主题色、字体都在上面），里面放 inner。 */
export function previewDocument(styles: string, inner: string) {
  const root = document.documentElement, body = document.body;
  return `<!doctype html><html class="${escapeHtml(root.className)}" style="${escapeHtml(root.getAttribute('style') || '')}"><head><meta charset="utf-8">${styles}<style>html,body{margin:0;overflow:hidden}*{transition:none!important}</style><style id="${DRAFT_STYLE_ID}"></style></head><body class="${escapeHtml(body.className)}" style="${escapeHtml(body.getAttribute('style') || '')}">${inner}</body></html>`;
}

export interface CssWindowConfig {
  id: string;
  label: string;
  store: CssStore;
  scope: (css: string) => string;
  examples: { name: string; css: string }[];
  groups: { label: string; items: [string, string][] }[];
  /** 小抄里颜色那几行只显示变量名 */
  shortVar: RegExp;
  cheatTip: string;
  phone: { width: number; height: number; maxScale: number };
  buildPreview: (frame: HTMLIFrameElement) => void;
  previewTitle: string;
  placeholder: string;
  note: string;
  words: { applied: string; cleared: string; none: string; file: string };
  /** 示例下面多放的东西（主画面：快速调色），可以读、改编辑框 */
  extra?: (draft: string, setDraft: (next: string) => void) => ReactNode;
}

/** 美化设置里写 CSS 的那一格（聊天美化、主画面美化共用）：上面预览、示例和模板、编辑框，按套用才换。 */
export function CssWindow({ config }: { config: CssWindowConfig }) {
  const { store } = config;
  const appearance = useAppearance(), choice = useChoice();
  const [applied, setApplied] = useState(store.read), [draft, setDraft] = useState(() => store.readDraft() ?? store.read()), [error, setError] = useState('');
  const [templates, setTemplates] = useState<CssTemplate[]>(store.readTemplates);
  const frame = useRef<HTMLIFrameElement>(null), box = useRef<HTMLDivElement>(null), code = useRef<HTMLTextAreaElement>(null), file = useRef<HTMLInputElement>(null);
  const caret = useRef(-1), press = useRef(0), pressed = useRef(false), [fit, setFit] = useState({ scale: .8, left: 0 });
  const { width: PHONE_W, height: PHONE_H, maxScale } = config.phone;
  const latest = useRef(draft); latest.current = draft;

  // 打开美化设置时重做预览（主题色、字体可能换过）
  useEffect(() => {
    if (!appearance.pageOpen || !frame.current) return;
    setApplied(store.read()); setTemplates(store.readTemplates());
    config.buildPreview(frame.current); paint(draft);
  }, [appearance.pageOpen, appearance.color, appearance.tone]);
  useEffect(() => { const sync = () => setApplied(store.read()); window.addEventListener(store.event, sync); return () => window.removeEventListener(store.event, sync); }, []);
  // 素材有变动：预览重画；素材改名：编辑框和模板里的写法也跟着换
  useEffect(() => {
    void loadCssAssets();
    const repaint = () => paint(latest.current);
    const renamed = (event: Event) => { const { from, to } = (event as CustomEvent<{ from: string; to: string }>).detail; setDraft(text => renameInCss(text, from, to)); setTemplates(store.readTemplates()); };
    window.addEventListener(CSS_ASSETS_EVENT, repaint); window.addEventListener(ASSET_RENAMED_EVENT, renamed);
    return () => { window.removeEventListener(CSS_ASSETS_EVENT, repaint); window.removeEventListener(ASSET_RENAMED_EVENT, renamed); };
  }, []);
  useLayoutEffect(() => {
    const node = box.current; if (!node) return;
    const resize = () => { const scale = Math.min(maxScale, node.clientWidth / PHONE_W); setFit({ scale, left: Math.max(0, (node.clientWidth - PHONE_W * scale) / 2) }); };
    resize(); const observer = new ResizeObserver(resize); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  /** 把草稿套到预览里；写错了就保留上一次的样子，下面提示哪里错。 */
  function paint(css: string) {
    const target = frame.current?.contentDocument?.querySelector(`#${DRAFT_STYLE_ID}`);
    try { const scoped = config.scope(css); if (target) target.textContent = resolveAssets(scoped); setError(''); }
    catch (problem) { setError((problem as Error).message); }
  }
  useEffect(() => { const timer = window.setTimeout(() => { paint(draft); store.writeDraft(draft, store.read()); }, 250); return () => window.clearTimeout(timer); }, [draft]);

  function apply() {
    try { store.write(draft); setApplied(draft.trim()); store.writeDraft(draft, draft); showToast(draft.trim() ? config.words.applied : config.words.cleared); }
    catch (problem) { showToast((problem as Error).message); }
  }
  function insert(text: string) {
    const area = code.current, at = caret.current >= 0 ? caret.current : draft.length;
    const before = draft.slice(0, at), after = draft.slice(at);
    const piece = (before && !before.endsWith('\n') ? '\n' : '') + text + '\n';
    setDraft(before + piece + after);
    const next = (before + piece).length - (text.endsWith('}') ? 3 : 1);
    requestAnimationFrame(() => { if (area) { area.focus(); area.setSelectionRange(next, next); caret.current = next; } });
  }
  function cheatSheet() {
    choice.openChoice({ style: 'settings', title: '类名小抄', options: [], selected: '', confirmText: '好了', confirm: () => {},
      content: <div className="chat-css-cheat">{config.groups.map(group => <div key={group.label}>
        <p className="chat-css-cheat-title">{group.label}</p>
        {group.items.map(([selector, note]) => <button type="button" key={selector} className="chat-css-cheat-row" onClick={() => { choice.close(); insert(selector.includes('{') ? selector.replace('{ ', '{\n  ').replace('; }', ';\n}') : `${selector} {\n  \n}`); }}>
          <code>{selector.replace(config.shortVar, '$1')}</code><span>{note}</span></button>)}
      </div>)}<p className="chat-css-cheat-tip">{config.cheatTip}</p></div> });
  }
  /** 美化素材：点一张把 url(asset:名字) 加进编辑框；长按改名、删除；最后一格上传。 */
  function assets() {
    choice.openChoice({ style: 'settings', title: '美化素材', options: [], selected: '', confirmText: '好了', confirm: () => {},
      content: <AssetPicker pick={item => { choice.close(); insert(assetRef(item.name)); }} menu={item => { choice.close(); window.setTimeout(() => assetMenu(item), 280); }} /> });
  }
  function assetMenu(item: CssAssetInfo) {
    choice.openChoice({ style: 'settings', title: item.name, options: [{ value: 'rename', label: '改名（写过的地方会跟着换）' }, { value: 'delete', label: '删除' }], selected: '',
      confirm: value => { window.setTimeout(() => {
        if (value === 'rename') nameDialog('素材改名', item.name, name => { void renameAssetEverywhere(item.name, name).then(next => showToast(`改成「${next}」了`), problem => showToast((problem as Error).message)); }, '名字，例如：云朵底', 16);
        if (value === 'delete') choice.openChoice({ style: 'settings', title: `删除「${item.name}」？`, options: [], selected: '', confirmText: '删除',
          content: <p className="choice-message">CSS 里用到它的地方会变透明。</p>,
          confirm: () => { void deleteCssAsset(item.name).then(() => showToast('删掉了')); } });
      }, 280); } });
  }
  function startPress(item: CssTemplate) {
    window.clearTimeout(press.current); pressed.current = false;
    press.current = window.setTimeout(() => { pressed.current = true; templateMenu(item); }, 480);
  }
  const endPress = () => window.clearTimeout(press.current);
  function templateMenu(item: CssTemplate) {
    choice.openChoice({ style: 'settings', title: item.name, options: [{ value: 'rename', label: '改名' }, { value: 'save', label: '用编辑框现在的内容覆盖' }, { value: 'export', label: '导出 .css' }, { value: 'delete', label: '删除' }], selected: '',
      confirm: value => { window.setTimeout(() => {
        if (value === 'rename') nameDialog('改名', item.name, name => { store.renameTemplate(item.id, name); setTemplates(store.readTemplates()); });
        if (value === 'save') { store.deleteTemplate(item.id); store.saveTemplate(item.name, draft); setTemplates(store.readTemplates()); showToast('覆盖好了'); }
        if (value === 'export') void download(item.css, item.name);
        if (value === 'delete') { store.deleteTemplate(item.id); setTemplates(store.readTemplates()); showToast('删掉了'); }
      }, 280); } });
  }
  function nameDialog(title: string, initial: string, done: (name: string) => void, placeholder?: string, max?: number) {
    const holder = { name: initial };
    choice.openChoice({ style: 'settings', title, options: [], selected: '', confirmText: '好了',
      content: <NameField store={holder} placeholder={placeholder} max={max} />, confirm: () => { if (!holder.name.trim()) { showToast('先取个名字'); return false; } done(holder.name); } });
  }
  /** 导出：用到的素材图片一起打包在文件最后。 */
  async function download(css: string, name: string) {
    const text = await cssWithAssets(css).catch(() => css);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/css' })), link = document.createElement('a');
    link.href = url; link.download = `${config.words.file}-${name.replace(/[\\/:*?"<>|]/g, '') || '未命名'}.css`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (!picked) return;
    if (picked.size > 200 * 1024) { showToast('文件太大了'); return; }
    try { setDraft(await cssFromFile(await picked.text())); showToast('已放进编辑框，按「套用」才会换'); }
    catch (problem) { showToast((problem as Error).message); }
  }

  const status = error ? `写错了，${error}` : draft.trim() === applied.trim() ? (applied.trim() ? '这就是现在套用的样子。' : config.words.none) : '上面是预览，还没套用。';
  return <section className="theme-setting-group chat-css-group" id={config.id}>
    <div className="theme-setting-label">{config.label}</div>
    <div className="theme-setting-card">
      <div className="chat-css-phone" ref={box} style={{ height: PHONE_H * fit.scale }}>
        <iframe ref={frame} title={config.previewTitle} tabIndex={-1} aria-hidden="true" style={{ width: PHONE_W, height: PHONE_H, left: fit.left, transform: `scale(${fit.scale})` }} />
      </div>
      <p className={'chat-css-status' + (error ? ' is-error' : '')}>{status}</p>
      <div className="chat-css-chips">
        {config.examples.map(item => <button type="button" key={item.name} className={'chat-css-chip' + (draft.trim() === item.css.trim() ? ' active' : '')} onClick={() => setDraft(item.css)}>{item.name}</button>)}
        {templates.map(item => <button type="button" key={item.id} className={'chat-css-chip is-mine' + (draft.trim() === item.css.trim() ? ' active' : '')}
          onClick={() => { if (pressed.current) { pressed.current = false; return; } setDraft(item.css); }}
          onPointerDown={() => startPress(item)} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress}
          onContextMenu={event => { event.preventDefault(); endPress(); templateMenu(item); }}>{item.name}</button>)}
        <button type="button" className="chat-css-chip is-add" onClick={() => { if (!draft.trim()) { showToast('编辑框是空的'); return; } nameDialog('存成模板', '', name => { try { store.saveTemplate(name, draft); setTemplates(store.readTemplates()); showToast('存好了，长按可以改名、导出、删除'); } catch (problem) { showToast((problem as Error).message); } }); }}>＋ 存成模板</button>
      </div>
      {config.extra?.(draft, setDraft)}
      <textarea ref={code} className="chat-css-code" value={draft} spellCheck={false} autoCapitalize="off" autoCorrect="off" placeholder={config.placeholder}
        onChange={event => { setDraft(event.currentTarget.value); caret.current = event.currentTarget.selectionStart; }}
        onBlur={event => { caret.current = event.currentTarget.selectionStart; }} onSelect={event => { caret.current = event.currentTarget.selectionStart; }} />
      <div className="theme-font-actions chat-css-actions">
        <PressedButton type="button" className="theme-font-btn secondary" onClick={cheatSheet}>类名小抄</PressedButton>
        <PressedButton type="button" className="theme-font-btn secondary" onClick={assets}>素材</PressedButton>
        <PressedButton type="button" className="theme-font-btn secondary" onClick={() => setDraft('')}>清除</PressedButton>
        <PressedButton type="button" className="theme-font-btn ui-cyan-btn" disabled={!!error} onClick={apply}>套用</PressedButton>
      </div>
      <div className="chat-css-links">
        <PressedButton type="button" className="chat-css-link" onClick={() => file.current?.click()}>导入 .css</PressedButton>
        <span aria-hidden="true">·</span>
        <PressedButton type="button" className="chat-css-link" onClick={() => draft.trim() ? void download(draft, '目前的') : showToast('编辑框是空的')}>导出 .css</PressedButton>
      </div>
      <input ref={file} type="file" accept=".css,text/css,text/plain" hidden onChange={event => void onFile(event)} />
      <p className="theme-scheme-note">{config.note}</p>
    </div>
  </section>;
}

function NameField({ store, placeholder = '模板名字，例如：粉色便利贴', max = 12 }: { store: { name: string }; placeholder?: string; max?: number }) {
  const [name, setName] = useState(store.name), choice = useChoice();
  store.name = name;
  return <div className="choice-field"><input className="choice-input" value={name} maxLength={max} placeholder={placeholder} autoFocus onChange={event => setName(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter') void choice.confirm(); }} /></div>;
}

/** 素材小窗的内容：缩图格子，最后一格上传（可以一次选好几张）。 */
function AssetPicker({ pick, menu }: { pick: (item: CssAssetInfo) => void; menu: (item: CssAssetInfo) => void }) {
  const [items, setItems] = useState(listCssAssets), [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null), press = useRef(0), pressed = useRef(false);
  useEffect(() => { const sync = () => setItems(listCssAssets()); void loadCssAssets().then(sync); window.addEventListener(CSS_ASSETS_EVENT, sync); return () => window.removeEventListener(CSS_ASSETS_EVENT, sync); }, []);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files || [])]; event.currentTarget.value = '';
    if (!files.length) return;
    setBusy(true);
    try { for (const picked of files) await addCssAsset(picked); showToast(files.length > 1 ? `放进 ${files.length} 张了` : '放进去了'); }
    catch (problem) { showToast((problem as Error).message); }
    finally { setBusy(false); }
  }
  const start = (item: CssAssetInfo) => { window.clearTimeout(press.current); pressed.current = false; press.current = window.setTimeout(() => { pressed.current = true; menu(item); }, 480); };
  const end = () => window.clearTimeout(press.current);
  const kb = (size: number) => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(size / 1024))}KB`;
  return <div className="css-asset-picker">
    <div className="css-asset-grid">
      {items.map(item => <button type="button" key={item.name} className="css-asset-item"
        onClick={() => { if (pressed.current) { pressed.current = false; return; } pick(item); }}
        onPointerDown={() => start(item)} onPointerUp={end} onPointerLeave={end} onPointerCancel={end}
        onContextMenu={event => { event.preventDefault(); end(); menu(item); }}>
        <span className="css-asset-thumb" style={{ backgroundImage: `url("${item.url}")` }} />
        <span className="css-asset-name">{item.name}</span>
        <span className="css-asset-size">{item.width}×{item.height} · {kb(item.size)}</span>
      </button>)}
      <button type="button" className="css-asset-item is-add" disabled={busy} onClick={() => input.current?.click()}>
        <span className="css-asset-thumb">{busy ? '…' : '＋'}</span>
        <span className="css-asset-name">{busy ? '放进去中' : '上传图片'}</span>
      </button>
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif" multiple hidden onChange={event => void upload(event)} />
    <p className="chat-css-cheat-tip">点一张就把 url(asset:名字) 加进编辑框；长按可以改名、删除。聊天美化和主画面美化共用这些素材，图片存在手机里，导出 .css 时会一起打包。</p>
  </div>;
}
