import { useEffect, useState } from 'react';
import { useAppearance } from '../../../providers/AppearanceProvider';

/**
 * 美化 CSS 的「快速调色」（主画面、聊天各一组颜色）：不用写 CSS，点颜色就改编辑框最上面那一段（两行注解中间）。
 * 那一段也可以自己改，这里每次照编辑框重新读。
 */
const START = '/* ↓ 快速调色（上面的选项会自动改这一段） */', END = '/* ↑ 快速调色 */';
const DEFAULT_DEPTH = 35;

export interface QuickRow {
  key: string; label: string; note: string;
  /** 从这个变量读回颜色 */
  read: string;
  /** 选了颜色以后写哪几行 */
  lines: (hex: string) => string[];
}
export interface QuickSet {
  /** 写在哪个选择器里（#main-content、#chatRoomView） */
  selector: string;
  rows: QuickRow[];
  /** 有投影颜色和投影深浅（--effect-drop-color） */
  shadow?: boolean;
}
type Quick = Record<string, string | undefined> & { depth?: string };

const hexRgb = (hex: string) => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16)).join(', ');
const rgbHex = (rgb: string) => '#' + rgb.split(',').map(part => Math.max(0, Math.min(255, Math.round(Number(part.trim()) || 0))).toString(16).padStart(2, '0')).join('');
/** 一行写成「--变量: 值;  /* 名字 *\/」。 */
export const line = (name: string, value: string, note = '') => `  ${name}: ${value};${note ? `  /* ${note} */` : ''}`;

/** 从编辑框读出快速调色那一段。 */
function parse(css: string, set: QuickSet): Quick {
  const at = css.indexOf(START), end = css.indexOf(END, at);
  if (at < 0 || end < 0) return {};
  const block = css.slice(at, end), out: Quick = {};
  const read = (name: string) => block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1].trim();
  for (const row of set.rows) { const value = read(row.read); if (value && /^#[0-9a-f]{6}$/i.test(value)) out[row.key] = value.toLowerCase(); }
  if (set.shadow) {
    const drop = read('--effect-drop-color')?.match(/^rgba\(\s*(.+?)\s*,\s*([\d.]+)\s*\)$/);
    if (drop) { out.depth = String(Math.round(Number(drop[2]) * 100)); if (!/var/.test(drop[1])) out.shadow = rgbHex(drop[1]); }
  }
  return out;
}
/** 把快速调色写回编辑框：有设的才写；全都没设就把那一段拿掉。 */
function write(css: string, quick: Quick, set: QuickSet) {
  const lines = set.rows.flatMap(row => quick[row.key] ? row.lines(quick[row.key]!) : []);
  if (set.shadow && (quick.shadow || quick.depth !== undefined)) {
    const alpha = (Number(quick.depth ?? DEFAULT_DEPTH) / 100).toFixed(2);
    lines.push(line('--effect-drop-color', `rgba(${quick.shadow ? hexRgb(quick.shadow) : 'var(--theme-rgb)'}, ${alpha})`, '投影'));
  }
  const block = lines.length ? `${START}\n${set.selector} {\n${lines.join('\n')}\n}\n${END}` : '';
  const at = css.indexOf(START), end = css.indexOf(END, at);
  if (at >= 0 && end >= 0) {
    const before = css.slice(0, at), after = css.slice(end + END.length).replace(/^\n/, '');
    return block ? `${before}${block}\n${after}` : `${before}${after}`.replace(/^\n+/, '');
  }
  return block ? `${block}\n${css.replace(/^\n+/, '')}` : css;
}

/** 现在实际用的颜色（还没设的那几格，色块显示这个）。读不到就给白色。 */
function currentColors(set: QuickSet): Record<string, string> {
  const host = document.querySelector<HTMLElement>(set.selector), out: Record<string, string> = {};
  for (const row of set.rows) out[row.key] = '#ffffff';
  if (set.shadow) out.shadow = '#999999';
  if (!host) return out;
  const probe = document.createElement('span'), canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
  probe.style.display = 'none'; host.append(probe);
  try {
    const colors: [string, string][] = set.rows.map(row => [row.key, `var(${row.read})`]);
    if (set.shadow) colors.push(['shadow', 'rgb(var(--theme-rgb))']);
    for (const [key, value] of colors) {
      probe.style.color = value;
      const color = getComputedStyle(probe).color;
      if (!context || !color) continue;
      canvas.width = canvas.height = 1; context.clearRect(0, 0, 1, 1); context.fillStyle = '#ffffff'; context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      out[key] = rgbHex(`${r}, ${g}, ${b}`);
    }
  } finally { probe.remove(); }
  return out;
}

export function QuickColors({ draft, setDraft, set }: { draft: string; setDraft: (next: string) => void; set: QuickSet }) {
  const appearance = useAppearance(), quick = parse(draft, set), [now, setNow] = useState(() => currentColors(set));
  // 打开美化设置、换过主题色时重新读一次（一开机时画面可能还没画出来）
  useEffect(() => { if (appearance.pageOpen) setNow(currentColors(set)); }, [appearance.pageOpen, appearance.color, appearance.tone]);
  const change = (next: Quick) => setDraft(write(draft, next, set));
  const rows: [string, string, string][] = set.rows.map(row => [row.key, row.label, row.note]);
  if (set.shadow) rows.push(['shadow', '投影颜色', '框下面那道影子']);
  const depth = Number(quick.depth ?? DEFAULT_DEPTH);
  return <div className="quick-colors">
    <p className="quick-colors-tip">快速调色 · 不用写 CSS，点颜色就会改下面编辑框里的那一段</p>
    {rows.map(([key, label, note]) => <div className="quick-color-row" key={key}>
      <label className={'quick-color-swatch' + (quick[key] ? ' is-set' : '')} style={{ background: quick[key] || now[key] }}>
        <input type="color" aria-label={label} value={quick[key] || now[key]} onChange={event => change({ ...quick, [key]: event.currentTarget.value })} />
      </label>
      <span className="quick-color-text"><b>{label}</b><small>{quick[key] ? `${note} · ${quick[key]}` : `${note} · 原本的`}</small></span>
      <button type="button" className="quick-color-reset" disabled={!quick[key]} onClick={() => change({ ...quick, [key]: undefined })}>恢复</button>
    </div>)}
    {set.shadow && <div className="quick-depth">
      <span>投影深浅</span>
      <input type="range" min={0} max={100} step={5} value={depth} aria-label="投影深浅" onChange={event => change({ ...quick, depth: event.currentTarget.value })} />
      <small>{depth}%</small>
      <button type="button" className="quick-color-reset" disabled={quick.depth === undefined} onClick={() => change({ ...quick, depth: undefined })}>恢复</button>
    </div>}
  </div>;
}

/** 主画面那一组 */
export const HOME_QUICK: QuickSet = { selector: '#main-content', shadow: true, rows: [
  { key: 'accent', label: '主题色', note: '框线、图标、按钮、播放器屏幕一起换', read: '--theme-accent', lines: hex => [line('--theme-accent', hex, '主题色')] },
  { key: 'ink', label: '文字', note: '图标名字、时间、播放器上的字', read: '--home-ink', lines: hex => [line('--home-ink', hex, '文字'), line('--color-text', hex)] },
  { key: 'muted', label: '框线和图案', note: '各个框的线、图标的图案', read: '--color-muted', lines: hex => [line('--color-muted', hex, '框线和图案')] },
  { key: 'surface', label: '面板底色', note: '卡片、播放器、底下那排的底', read: '--color-surface', lines: hex => [line('--color-surface', hex, '面板底色'), line('--color-surface-rgb', hexRgb(hex))] }
] };
/** 聊天那一组 */
export const CHAT_QUICK: QuickSet = { selector: '#chatRoomView', rows: [
  { key: 'theme', label: '主题色', note: '顶栏、按钮、发送键、在线圆点（泡泡示例也跟着）', read: '--theme-color', lines: hex => [line('--theme-color', hex, '主题色')] },
  { key: 'bg', label: '聊天底色', note: '整个聊天室和放消息那一块的底', read: '--cr-bg', lines: hex => [line('--cr-bg', hex, '聊天底色')] },
  { key: 'title', label: '文字', note: '消息、顶栏、右边那栏的字', read: '--cr-title', lines: hex => [line('--cr-title', hex, '文字')] },
  { key: 'line', label: '框线', note: '各个框和按钮的线', read: '--cr-line', lines: hex => [line('--cr-line', hex, '框线')] },
  { key: 'peer', label: '他的名字', note: '他的名字、小图示、已读的勾勾', read: '--cr-peer', lines: hex => [line('--cr-peer', hex, '他的名字')] },
  { key: 'self', label: '我的名字', note: '我的名字', read: '--cr-self', lines: hex => [line('--cr-self', hex, '我的名字')] }
] };
