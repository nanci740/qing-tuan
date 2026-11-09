import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import { PressedButton } from '../../../components/shared/PressedButton';
import { useAppearance } from '../../../providers/AppearanceProvider';
import { useSettingsNavigation } from '../../../providers/SettingsNavigationProvider';
import { useChoice } from '../../../providers/ChoiceProvider';
import { CHAT_CSS_EVENT } from '../../../utils/chatCss';
import { HOME_CSS_EVENT } from '../../../utils/homeCss';
import { showToast } from '../../../utils/toast';
import { AFTER_THEME_FLAG, SCHEME_LIMIT, applyScheme, currentPrints, deleteScheme, exportCurrent, exportScheme, importScheme, listSchemes, matches, overwrite, renameScheme, resetLook, saveCurrent } from '../../../utils/themeSchemes';
import type { SchemePart, ThemeScheme } from '../../../utils/themeSchemes';

const PARTS: [SchemePart, string, string][] = [['home', '主画面', '配色、质感、字体、主画面文字、背景、图标、主画面美化 CSS'], ['css', '聊天美化', '下面「聊天美化 CSS」写的样式'], ['splash', '开屏设置', '每次显示、每天一次或不显示']];
const day = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`; };
type Prints = ThemeScheme['prints'];

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** 存成方案／改名：名字，加上要存哪几块（改名时不用勾）。 */
function SchemeForm({ store, withParts }: { store: { name: string; parts: SchemePart[] }; withParts: boolean }) {
  const [name, setName] = useState(store.name), [parts, setParts] = useState(store.parts), choice = useChoice();
  store.name = name; store.parts = parts;
  return <>
    <div className="choice-field"><input className="choice-input" value={name} maxLength={16} placeholder="方案名字，例如：春天" autoFocus onChange={event => setName(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter') void choice.confirm(); }} /></div>
    {withParts ? PARTS.map(([part, title, note]) => { const on = parts.includes(part); return <button type="button" role="checkbox" aria-checked={on} key={part} className={'api-model-item choice-box' + (on ? ' selected' : '')} onClick={() => setParts(on ? parts.filter(item => item !== part) : [...parts, part])}>
      <span className="api-model-check" /><span className="api-model-name">{title}<small>{note}</small></span></button>; }) : null}
  </>;
}

/** 方案缩图：一支迷你手机，看得出壁纸、主题色、图标、聊天气泡。 */
function Shot({ scheme }: { scheme: ThemeScheme }) {
  const { preview } = scheme;
  return <span className="theme-scheme-shot" style={{ '--shot-tc': preview.color } as CSSProperties} aria-hidden="true">
    {preview.wallpaper ? <img className="shot-wp" src={preview.wallpaper} alt="" /> : null}
    <i className="shot-bar" /><i className="shot-widget" />
    <span className="shot-icons">{[0, 1, 2, 3].map(index => preview.icons[index] ? <img key={index} src={preview.icons[index]} alt="" /> : <i key={index} />)}</span>
    <span className="shot-chat" style={preview.chatWallpaper ? { backgroundImage: `url("${preview.chatWallpaper}")` } : undefined}><i /><i /></span>
  </span>;
}

/** 美化设置最上面的「主题方案」：存成方案、点一下整套换、导入导出、恢复默认。 */
export function ThemeSchemes() {
  const appearance = useAppearance(), navigation = useSettingsNavigation();
  const [schemes, setSchemes] = useState<ThemeScheme[]>([]), [prints, setPrints] = useState<Prints | null>(null);
  const [busy, setBusy] = useState(''), choice = useChoice();
  const file = useRef<HTMLInputElement>(null), press = useRef(0), pressed = useRef(false);

  async function load() {
    try { setSchemes(await listSchemes()); } catch (error) { showToast((error as Error).message); }
    try { setPrints(await currentPrints()); } catch { setPrints(null); }
  }
  useEffect(() => { if (appearance.pageOpen) void load(); }, [appearance.pageOpen]);
  // 在美化设置里改了配色、背景、字体这些，「目前」跟着重新认
  useEffect(() => {
    if (!appearance.pageOpen) return;
    const timer = window.setTimeout(() => { void currentPrints().then(setPrints, () => setPrints(null)); }, 600);
    return () => window.clearTimeout(timer);
  }, [appearance.color, appearance.tone, appearance.glass, appearance.wallpaper, appearance.opacity, appearance.splash, appearance.icons, appearance.texts, appearance.font]);
  // 聊天美化、主画面美化 CSS 套用以后，「目前」也重新认
  useEffect(() => {
    const update = () => { void currentPrints().then(setPrints, () => setPrints(null)); };
    window.addEventListener(CHAT_CSS_EVENT, update); window.addEventListener(HOME_CSS_EVENT, update);
    return () => { window.removeEventListener(CHAT_CSS_EVENT, update); window.removeEventListener(HOME_CSS_EVENT, update); };
  }, []);
  // 换完方案重新开启后回到美化设置
  useEffect(() => {
    let flag = '';
    try { flag = sessionStorage.getItem(AFTER_THEME_FLAG) || ''; sessionStorage.removeItem(AFTER_THEME_FLAG); } catch { /* 没有就算了 */ }
    if (!flag) return;
    const timer = window.setTimeout(() => { navigation.setActiveDock('settings'); void navigation.openSettings().then(() => navigation.openDestination('settingTheme')).then(() => showToast('已经换好了')); }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  const current = prints ? schemes.find(scheme => matches(scheme, prints)) : undefined;
  async function work(label: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    try { await action(); } catch (error) { showToast((error as Error).message || '没成功，请重试'); } finally { setBusy(''); }
  }
  /** 设置子页面同一种弹窗（跟 API 设置的选接口类型一样）。 */
  function dialog(title: string, message: string, confirmText: string, confirm: () => void | boolean | Promise<void | boolean>, options: { value: string; label: string }[] = [], selected = '', run?: (value: string) => void) {
    choice.openChoice({ style: 'settings', title, options, selected, confirmText, content: message ? <p className="choice-message">{message}</p> : undefined, confirm: value => run ? run(value) : confirm() });
  }
  /** 关掉一个弹窗以后再开下一个（不然会一起被关掉）。 */
  const next = (action: () => void) => window.setTimeout(action, 280);
  function naming(scheme?: ThemeScheme, then?: () => void) {
    const store = { name: scheme?.name || '', parts: ['home', 'css'] as SchemePart[] };
    choice.openChoice({ style: 'settings', title: scheme ? '改名' : '存成方案', options: [], selected: '', confirmText: scheme ? '改好了' : '存起来',
      content: <SchemeForm key={Date.now()} store={store} withParts={!scheme} />,
      confirm: async () => {
        if (!store.name.trim()) { showToast('先取个名字'); return false; }
        if (!scheme && !store.parts.length) { showToast('至少勾一项'); return false; }
        try {
          if (scheme) { await renameScheme(scheme, store.name); showToast('改好了'); }
          else { const saved = await saveCurrent(store.name, store.parts); showToast(`已存成「${saved.name}」`); }
        } catch (error) { showToast((error as Error).message || '没存成，请重试'); return false; }
        await load(); if (then) next(then);
      } });
  }
  async function choose(scheme: ThemeScheme) {
    if (pressed.current) { pressed.current = false; return; }
    if (current?.id === scheme.id) { showToast('现在用的就是这个'); return; }
    const unsaved = !current && !!prints;
    const message = [unsaved ? '现在的样子还没存成方案，换过去就回不来了。' : '', '换好会重新开启一次。'].filter(Boolean).join('\n');
    const go = () => void work('正在换…', () => applyScheme(scheme));
    if (!unsaved) { dialog(`换成「${scheme.name}」？`, message, '换过去', go); return; }
    dialog(`换成「${scheme.name}」？`, message, '确定', go, [{ value: 'go', label: '直接换过去' }, { value: 'save', label: '先把现在的存起来，再换' }], 'go',
      value => { if (value === 'save') next(() => naming(undefined, go)); else go(); });
  }
  function startPress(scheme: ThemeScheme) {
    window.clearTimeout(press.current); pressed.current = false;
    press.current = window.setTimeout(() => { pressed.current = true; openMenu(scheme); navigator.vibrate?.(15); }, 480);
  }
  const endPress = () => window.clearTimeout(press.current);
  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (picked) await work('正在导入…', async () => { const scheme = await importScheme(picked); showToast(`已导入「${scheme.name}」，点它就能换`); await load(); });
  }
  /** 长按方案：改名、覆盖、导出、删除。 */
  function openMenu(scheme: ThemeScheme) {
    dialog(scheme.name, '', '确定', () => {}, [{ value: 'rename', label: '改名' }, { value: 'overwrite', label: '用现在的样子覆盖' }, { value: 'export', label: '导出这个方案' }, { value: 'delete', label: '删除' }], '', value => next(() => {
      if (value === 'rename') naming(scheme);
      if (value === 'overwrite') dialog('用现在的样子覆盖', `「${scheme.name}」会改成现在手机上的样子。`, '覆盖', () => void work('正在存…', async () => { await overwrite(scheme); showToast('覆盖好了'); await load(); }));
      if (value === 'export') void work('正在导出…', async () => { const result = await exportScheme(scheme); download(result.blob, result.fileName); showToast('已导出'); });
      if (value === 'delete') dialog('删除方案', `删掉「${scheme.name}」？现在的样子不会变。`, '删除', () => void work('正在删…', async () => { await deleteScheme(scheme.id); await load(); }));
    }));
  }

  return <section className="theme-setting-group theme-scheme-group" id="themeSchemeGroup">
    <div className="theme-setting-label">主题方案</div>
    <div className="theme-setting-card">
      <div className="theme-scheme-now"><strong>{'目前：' + (current ? current.name : prints ? '还没存成方案' : '…')}</strong><span>{`${schemes.length} / ${SCHEME_LIMIT} 个方案`}</span></div>
      <div className="theme-scheme-grid">
        {schemes.map(scheme => <button type="button" key={scheme.id} className={'theme-scheme-card' + (current?.id === scheme.id ? ' is-current' : '')}
          onClick={() => void choose(scheme)} onPointerDown={() => startPress(scheme)} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress}
          onContextMenu={event => { event.preventDefault(); endPress(); pressed.current = false; openMenu(scheme); }}>
          {current?.id === scheme.id ? <span className="theme-scheme-flag">使用中</span> : null}
          <Shot scheme={scheme} />
          <span className="theme-scheme-name">{scheme.name}</span>
          <span className="theme-scheme-date">{scheme.imported && scheme.createdAt === scheme.updatedAt ? '导入' : day(scheme.updatedAt)}</span>
        </button>)}
        {schemes.length < SCHEME_LIMIT ? <button type="button" className="theme-scheme-card theme-scheme-add" onClick={() => naming()}><b>＋</b>存成方案</button> : null}
      </div>
      <div className="theme-font-actions">
        <PressedButton type="button" className="theme-font-btn ui-cyan-btn" disabled={!!busy} onClick={() => file.current?.click()}>导入方案</PressedButton>
        <PressedButton type="button" className="theme-font-btn secondary" disabled={!!busy} onClick={() => void work('正在导出…', async () => { const result = await exportCurrent(); download(result.blob, result.fileName); showToast('已导出现在的样子'); })}>导出目前的</PressedButton>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={event => void onFile(event)} />
      <p className="theme-scheme-note">{busy || '点一下缩图就整套换。长按缩图可以改名、用现在的样子覆盖、导出、删除。'}</p>
      <PressedButton className="theme-reset-btn" type="button" disabled={!!busy} onClick={() => dialog('恢复默认样子', '主画面的配色、质感、字体、文字、背景、图标，都回到原本的样子。\n存过的方案不会删。', '恢复', () => void work('正在恢复…', resetLook))}>恢复默认样子</PressedButton>
    </div>

  </section>;
}
