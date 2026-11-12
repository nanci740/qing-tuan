import { useCallback, useEffect, useRef, useState } from 'react';
import './HomeWidgets.css';
import type { CSSProperties } from 'react';
import { prepareImage, readImageSlot, saveImageSlots } from '../../../utils/imageAssets';
import { HOME_WIDGETS_EVENT, WIDGET_FIELDS, WIDGET_IMAGE, readWidgets, writeWidgets } from '../../../utils/homeWidgets';
import type { WidgetId, WidgetTexts } from '../../../utils/homeWidgets';
import { showToast } from '../../../utils/toast';
import { useChoice } from '../../../providers/ChoiceProvider';
import { PressedButton } from '../../../components/shared/PressedButton';
import { PixelText } from './PixelText';

/**
 * 主画面后来加的三个组件：一句话（上线提醒小窗）、登录框、日历（古早弹窗月历）。
 * 字和图都自己设：长按进编辑后点组件，或直接点组件上的图片。颜色全部跟着主画面主题色。
 */
const readImages = () => Object.fromEntries((Object.keys(WIDGET_IMAGE) as WidgetId[]).map(id => { try { return [id, readImageSlot(WIDGET_IMAGE[id])]; } catch { return [id, '']; } })) as Record<WidgetId, string>;

/** 三个组件共用的字和图（谁改了大家一起更新）。 */
export function useHomeWidgets() {
  const [texts, setTexts] = useState<WidgetTexts>(readWidgets), [images, setImages] = useState(readImages);
  useEffect(() => {
    const sync = () => { setTexts(readWidgets()); setImages(readImages()); };
    window.addEventListener(HOME_WIDGETS_EVENT, sync); return () => window.removeEventListener(HOME_WIDGETS_EVENT, sync);
  }, []);
  return { texts, images };
}

const openChat = () => window.dispatchEvent(new CustomEvent('qingtuan:open-notice-chat'));
const photo = (src: string): CSSProperties | undefined => src ? { backgroundImage: `url("${src.replace(/"/g, '%22')}")` } : undefined;

/** 带光泽的头像框；点一下设定这个组件（还没选图时写着「点一下选图」）。 */
function Frame({ className, src, onPick, label }: { className: string; src: string; onPick: () => void; label: string }) {
  return <button type="button" className={`${className}${src ? '' : ' is-empty'}`} aria-label={label} onClick={event => { event.stopPropagation(); onPick(); }}>
    <i style={photo(src)}>{!src && <em>点一下<br />选图</em>}</i>
  </button>;
}

export function HomeHello({ texts, src, configure }: { texts: Record<string, string>; src: string; configure: () => void }) {
  return <div className="home-hello">
    <div className="home-hello-head" aria-hidden="true">
      <svg className="home-hello-icon" viewBox="0 0 18 16" shapeRendering="crispEdges"><g className="hi-a"><rect x="2" y="1" width="4" height="4" /><rect x="0" y="6" width="8" height="6" /></g><g className="hi-b"><rect x="10" y="3" width="4" height="4" /><rect x="8" y="8" width="8" height="7" /></g></svg>
      <span className="home-hello-app">qingtuan messenger</span>
      <span className="home-hello-x">✕</span>
    </div>
    <div className="home-hello-body">
      <Frame className="home-hello-frame" src={src} onPick={configure} label="设定一句话的图片和字" />
      <span className="home-hello-copy"><b className="home-hello-name">{texts.name}</b><span className="home-hello-text">{texts.text}</span></span>
    </div>
    <button type="button" className="home-hello-link" onClick={event => { event.stopPropagation(); openChat(); }}>回复</button>
  </div>;
}

export function HomeLogin({ texts, src, configure }: { texts: Record<string, string>; src: string; configure: () => void }) {
  return <div className="home-login">
    <Frame className="home-login-frame" src={src} onPick={configure} label="设定登录框的图片和字" />
    <span className="home-login-field">{texts.name}</span>
    <span className="home-login-row">
      <span className="home-login-field is-second">{texts.second}</span>
      <button type="button" className="home-login-go" aria-label="打开聊天" onClick={event => { event.stopPropagation(); openChat(); }}>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6h7M6.5 2.8 9.7 6 6.5 9.2" /></svg>
      </button>
    </span>
  </div>;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const HEART = <svg className="home-cal-heart" viewBox="0 0 11 10" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true"><path d="M1 1h3v1h1v1h1V2h1V1h3v1h1v3h-1v1H9v1H8v1H7v1H4V8H3V7H2V6H1V5H0V2h1z" /></svg>;
/** 今天几号（过了半夜自己换）。 */
function useToday() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setToday(current => { const now = new Date(); return now.toDateString() === current.toDateString() ? current : now; }), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}

export function HomeCalendar({ texts, src, configure }: { texts: Record<string, string>; src: string; configure: () => void }) {
  const today = useToday(), year = today.getFullYear(), month = today.getMonth();
  const first = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate(), filled = Math.ceil((first + days) / 7) * 7;
  const cells = Array.from({ length: filled }, (_, index) => {
    const day = index - first + 1;
    if (day < 1 || day > days) return <span key={index} className="home-cal-blank">{HEART}</span>;
    return <span key={index} className={'home-cal-day' + (day === today.getDate() ? ' is-today' : '')}><PixelText text={String(day)} /></span>;
  });
  return <div className="home-cal">
    <div className="home-cal-title" aria-hidden="true"><PixelText className="home-cal-title-text" text={`Calendar  ${MONTHS[month]}`} /><span className="home-cal-btns"><i>_</i><i>□</i><i>×</i></span></div>
    <div className="home-cal-body">
      <button type="button" className={'home-cal-pic' + (src ? '' : ' is-empty')} style={photo(src)} aria-label="设定日历的图片和字" onClick={event => { event.stopPropagation(); configure(); }}>
        {!src && <em>点一下选图</em>}
        {texts.caption && <span className="home-cal-caption">{texts.caption}</span>}
      </button>
      <div className="home-cal-side">
        <div className="home-cal-month"><PixelText text={MONTHS[month]} bold /></div>
        <div className="home-cal-grid" role="grid" aria-label={`${year} 年 ${month + 1} 月`}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={'w' + index} className="home-cal-week"><PixelText text={day} bold /></span>)}
          {cells}
        </div>
      </div>
    </div>
    <div className="home-cal-status"><span className="home-cal-status-text">{texts.status}</span><span /><span /></div>
  </div>;
}

const NAMES: Record<WidgetId, string> = { hello: '一句话', login: '登录框', calendar: '日历' };
interface Draft { texts: Record<string, string>; image: string; busy: boolean }

/** 设定框里面：换图、改字（先放在草稿里，按「好了」才存）。 */
function WidgetForm({ id, draft }: { id: WidgetId; draft: Draft }) {
  const [texts, setTexts] = useState(draft.texts), [image, setImage] = useState(draft.image), [busy, setBusy] = useState(false), input = useRef<HTMLInputElement>(null);
  draft.texts = texts; draft.image = image; draft.busy = busy;
  async function pick(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    try { setImage(await prepareImage(file, id === 'calendar' ? 640 : 400, .88)); }
    catch (error) { showToast((error as Error).message || '图片读不了，换一张试试'); }
    finally { setBusy(false); }
  }
  return <>
    <div className="choice-field hw-photo">
      <i className={'hw-photo-thumb' + (image ? '' : ' is-empty')} style={photo(image)} />
      <PressedButton type="button" className="api-model-action" disabled={busy} onClick={() => { if (input.current) { input.current.value = ''; input.current.click(); } }}>{busy ? '读图中…' : image ? '换一张图' : '选图'}</PressedButton>
      {image && <PressedButton type="button" className="api-model-action" disabled={busy} onClick={() => setImage('')}>拿掉图</PressedButton>}
      <input ref={input} type="file" accept="image/*" hidden onChange={event => pick(event.currentTarget.files?.[0])} />
    </div>
    {WIDGET_FIELDS[id].map(field => <label key={field.key} className="choice-field hw-field">
      <span className="hw-field-label">{field.label}</span>
      <input className="choice-input" type="text" value={texts[field.key]} maxLength={field.max} placeholder={field.placeholder} onChange={event => { const value = event.currentTarget.value; setTexts(current => ({ ...current, [field.key]: value })); }} />
    </label>)}
  </>;
}

/** 打开某个组件的设定（跟设置里其他弹窗同一套样子）；按「好了」才把图和字存起来。 */
export function useWidgetEditor() {
  const choice = useChoice();
  return useCallback((id: WidgetId) => {
    let original = ''; try { original = readImageSlot(WIDGET_IMAGE[id]); } catch { /* 读不到就当没有 */ }
    const draft: Draft = { texts: { ...readWidgets()[id] }, image: original, busy: false };
    choice.openChoice({ style: 'settings', title: `设定「${NAMES[id]}」`, options: [], selected: '', confirmText: '好了', content: <WidgetForm key={Date.now()} id={id} draft={draft} />,
      confirm: async () => {
        if (draft.busy) { showToast('图片还在读，等一下'); return false; }
        try { if (draft.image !== original) await saveImageSlots({ [WIDGET_IMAGE[id]]: draft.image }); }
        catch (error) { showToast((error as Error).message || '图片没存成，请重试'); return false; }
        writeWidgets({ ...readWidgets(), [id]: draft.texts });
      } });
  }, [choice]);
}
