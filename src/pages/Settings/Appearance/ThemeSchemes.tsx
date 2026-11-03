import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { useAppearance } from '../../../providers/AppearanceProvider';
import { useSettingsNavigation } from '../../../providers/SettingsNavigationProvider';
import { confirmChat } from '../../../utils/chatConfirm';
import { showToast } from '../../../utils/toast';
import { AFTER_THEME_FLAG, SCHEME_LIMIT, applyScheme, currentPrints, deleteScheme, exportCurrent, exportScheme, importScheme, listSchemes, matches, overwrite, renameScheme, resetLook, saveCurrent, settleChatStyles } from '../../../utils/themeSchemes';
import type { SchemePart, ThemeScheme } from '../../../utils/themeSchemes';

const PARTS: [SchemePart, string, string][] = [['home', '主画面', '配色、质感、字体、主画面文字、背景、图标'], ['chat', '聊天样式', '全部聊天共用的壁纸、字号、字体、气泡'], ['splash', '开屏设置', '每次显示、每天一次或不显示']];
const day = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`; };
type Prints = ThemeScheme['prints'];
interface Ask { title: string; message: string; actions: { label: string; primary?: boolean; danger?: boolean; run(): void | Promise<void> }[] }

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
  const [busy, setBusy] = useState(''), [ask, setAsk] = useState<Ask | null>(null), [menu, setMenu] = useState<ThemeScheme | null>(null);
  const [naming, setNaming] = useState<{ scheme?: ThemeScheme; name: string; parts: SchemePart[]; then?: () => void } | null>(null);
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
  async function choose(scheme: ThemeScheme) {
    if (pressed.current) { pressed.current = false; return; }
    if (current?.id === scheme.id) { showToast('现在用的就是这个'); return; }
    const own = scheme.chat ? await settleChatStyles().catch(() => 0) : 0;
    const lines = [current || !prints ? '' : '现在的样子还没存成方案，换过去就回不来了。', own ? `自己设过样式的聊天（${own} 个）会保留它们自己的。` : '', '换好会重新开启一次。'].filter(Boolean);
    const go = () => { setAsk(null); void work('正在换…', () => applyScheme(scheme)); };
    setAsk({ title: `换成「${scheme.name}」？`, message: lines.join('\n'), actions: [
      { label: '取消', run: () => setAsk(null) },
      ...(current || !prints ? [] : [{ label: '先存现在的', run: () => { setAsk(null); setNaming({ name: '', parts: ['home', 'chat'], then: go }); } }]),
      { label: '换过去', primary: true, run: go }
    ] });
  }
  async function submitName() {
    if (!naming) return;
    const { scheme, name, parts, then } = naming;
    if (!name.trim()) { showToast('先取个名字'); return; }
    if (!scheme && !parts.length) { showToast('至少勾一项'); return; }
    await work('正在存…', async () => {
      if (scheme) { await renameScheme(scheme, name); showToast('改好了'); }
      else { const saved = await saveCurrent(name, parts); showToast(`已存成「${saved.name}」`); }
      setNaming(null); await load(); then?.();
    });
  }
  function startPress(scheme: ThemeScheme) {
    window.clearTimeout(press.current); pressed.current = false;
    press.current = window.setTimeout(() => { pressed.current = true; setMenu(scheme); navigator.vibrate?.(15); }, 480);
  }
  const endPress = () => window.clearTimeout(press.current);
  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (picked) await work('正在导入…', async () => { const scheme = await importScheme(picked); showToast(`已导入「${scheme.name}」，点它就能换`); await load(); });
  }
  const menuAction = (run: (scheme: ThemeScheme) => void | Promise<void>) => () => { const scheme = menu; setMenu(null); if (scheme) void run(scheme); };

  return <section className="theme-setting-group theme-scheme-group" id="themeSchemeGroup">
    <div className="theme-setting-label">主题方案</div>
    <div className="theme-setting-card">
      <div className="theme-scheme-now"><strong>{'目前：' + (current ? current.name : prints ? '还没存成方案' : '…')}</strong><span>{`${schemes.length} / ${SCHEME_LIMIT} 个方案`}</span></div>
      <div className="theme-scheme-grid">
        {schemes.map(scheme => <button type="button" key={scheme.id} className={'theme-scheme-card' + (current?.id === scheme.id ? ' is-current' : '')}
          onClick={() => void choose(scheme)} onPointerDown={() => startPress(scheme)} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress}
          onContextMenu={event => { event.preventDefault(); endPress(); pressed.current = false; setMenu(scheme); }}>
          {current?.id === scheme.id ? <span className="theme-scheme-flag">使用中</span> : null}
          <Shot scheme={scheme} />
          <span className="theme-scheme-name">{scheme.name}</span>
          <span className="theme-scheme-date">{scheme.imported && scheme.createdAt === scheme.updatedAt ? '导入' : day(scheme.updatedAt)}</span>
        </button>)}
        {schemes.length < SCHEME_LIMIT ? <button type="button" className="theme-scheme-card theme-scheme-add" onClick={() => setNaming({ name: '', parts: ['home', 'chat'] })}><b>＋</b>存成方案</button> : null}
      </div>
      <div className="theme-font-actions">
        <PressedButton type="button" className="theme-font-btn ui-cyan-btn" disabled={!!busy} onClick={() => file.current?.click()}>导入方案</PressedButton>
        <PressedButton type="button" className="theme-font-btn secondary" disabled={!!busy} onClick={() => void work('正在导出…', async () => { const result = await exportCurrent(); download(result.blob, result.fileName); showToast('已导出现在的样子'); })}>导出目前的</PressedButton>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={event => void onFile(event)} />
      <p className="theme-scheme-note">{busy || '点一下缩图就整套换（主画面＋聊天样式）。长按缩图可以改名、用现在的样子覆盖、导出、删除。'}</p>
      <PressedButton className="theme-reset-btn" type="button" disabled={!!busy} onClick={async () => {
        if (await confirmChat({ title: '恢复默认样子', message: '主画面的配色、质感、字体、文字、背景、图标，和全部聊天的样式，都回到原本的样子。\n存过的方案不会删，自己设过样式的聊天也会保留。', confirmText: '恢复', cancelText: '取消', danger: true }))
          void work('正在恢复…', async () => { await settleChatStyles(); await resetLook(); });
      }}>恢复默认样子</PressedButton>
    </div>

    {menu ? createPortal(<div className="sp-confirm-overlay" onClick={event => { if (event.target === event.currentTarget) setMenu(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={menu.name}>
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{menu.name}</span></div>
        <div className="sp-confirm-body theme-scheme-menu">
          <button type="button" onClick={menuAction(scheme => setNaming({ scheme, name: scheme.name, parts: [] }))}>改名</button>
          <button type="button" onClick={menuAction(async scheme => { if (await confirmChat({ title: '用现在的样子覆盖', message: `「${scheme.name}」会改成现在手机上的样子。`, confirmText: '覆盖', cancelText: '取消' })) void work('正在存…', async () => { await overwrite(scheme); showToast('覆盖好了'); await load(); }); })}>用现在的样子覆盖</button>
          <button type="button" onClick={menuAction(scheme => work('正在导出…', async () => { const result = await exportScheme(scheme); download(result.blob, result.fileName); showToast('已导出'); }))}>导出这个方案</button>
          <button type="button" className="is-danger" onClick={menuAction(async scheme => { if (await confirmChat({ title: '删除方案', message: `删掉「${scheme.name}」？现在的样子不会变。`, confirmText: '删除', cancelText: '取消', danger: true })) void work('正在删…', async () => { await deleteScheme(scheme.id); await load(); }); })}>删除</button>
        </div>
      </div>
    </div>, document.body) : null}

    {naming ? createPortal(<div className="sp-confirm-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) setNaming(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={naming.scheme ? '改名' : '存成方案'}>
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{naming.scheme ? '改名' : '存成方案'}</span></div>
        <div className="sp-confirm-body"><div className="sp-confirm-msg">
          <input className="theme-scheme-input" value={naming.name} maxLength={16} placeholder="方案名字，例如：春天" autoFocus onChange={event => setNaming({ ...naming, name: event.currentTarget.value })} onKeyDown={event => { if (event.key === 'Enter') void submitName(); }} />
          {naming.scheme ? null : <div className="backup-list theme-scheme-parts">{PARTS.map(([part, title, note]) => { const on = naming.parts.includes(part); return <button type="button" role="checkbox" aria-checked={on} key={part} className="backup-row" onClick={() => setNaming({ ...naming, parts: on ? naming.parts.filter(item => item !== part) : [...naming.parts, part] })}>
            <i className={'backup-check' + (on ? ' is-on' : '')} aria-hidden="true" /><span>{title}<small>{note}</small></span></button>; })}</div>}
        </div></div>
        <div className="sp-confirm-actions">
          <PressedButton type="button" className="sp-confirm-btn" disabled={!!busy} onClick={() => setNaming(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={!!busy} onClick={() => void submitName()}>{busy || (naming.scheme ? '改好了' : '存起来')}</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}

    {ask ? createPortal(<div className="sp-confirm-overlay" onClick={event => { if (event.target === event.currentTarget) setAsk(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={ask.title}>
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{ask.title}</span></div>
        <div className="sp-confirm-body"><div className="sp-confirm-msg">{ask.message}</div></div>
        <div className="sp-confirm-actions">{ask.actions.map(action => <PressedButton type="button" key={action.label} className={'sp-confirm-btn' + (action.primary ? ' is-primary' : '') + (action.danger ? ' is-danger' : '')} onClick={() => void action.run()}>{action.label}</PressedButton>)}</div>
      </div>
    </div>, document.body) : null}
  </section>;
}
