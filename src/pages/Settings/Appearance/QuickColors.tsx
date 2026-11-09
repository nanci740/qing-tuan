import { useEffect, useState } from 'react';
import { useAppearance } from '../../../providers/AppearanceProvider';

/**
 * 主画面美化的「快速调色」：不用写 CSS，点颜色就改编辑框最上面那一段（两行注解中间）。
 * 那一段也可以自己改，这里每次照编辑框重新读。
 */
const START = '/* ↓ 快速调色（上面的选项会自动改这一段） */', END = '/* ↑ 快速调色 */';
type Key = 'accent' | 'ink' | 'muted' | 'surface' | 'shadow';
const ROWS: [Key, string, string, string][] = [
  ['accent', '主题色', '框线、图标、按钮、播放器屏幕一起换', '--theme-accent'],
  ['ink', '文字', '图标名字、时间、播放器上的字', '--home-ink'],
  ['muted', '框线和图案', '各个框的线、图标的图案', '--color-muted'],
  ['surface', '面板底色', '卡片、播放器、底下那排的底', '--color-surface'],
  ['shadow', '投影颜色', '框下面那道影子', '--effect-drop-color']
];
const DEFAULT_DEPTH = 35;
interface Quick { accent?: string; ink?: string; muted?: string; surface?: string; shadow?: string; depth?: number }

const hexRgb = (hex: string) => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16)).join(', ');
const rgbHex = (rgb: string) => '#' + rgb.split(',').map(part => Math.max(0, Math.min(255, Math.round(Number(part.trim()) || 0))).toString(16).padStart(2, '0')).join('');

/** 从编辑框读出快速调色那一段。 */
function parse(css: string): Quick {
  const at = css.indexOf(START), end = css.indexOf(END, at);
  if (at < 0 || end < 0) return {};
  const block = css.slice(at, end), out: Quick = {};
  const read = (name: string) => block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1].trim();
  const hex = (value?: string) => value && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : undefined;
  out.accent = hex(read('--theme-accent')); out.ink = hex(read('--home-ink')); out.muted = hex(read('--color-muted')); out.surface = hex(read('--color-surface'));
  const drop = read('--effect-drop-color')?.match(/^rgba\(\s*([\d\s,]+?)\s*,\s*([\d.]+)\s*\)$/);
  if (drop) { out.depth = Math.round(Number(drop[2]) * 100); if (!/var/.test(drop[1])) out.shadow = rgbHex(drop[1]); }
  else if (/^rgba\(var\(--theme-rgb\),\s*([\d.]+)\)$/.test(read('--effect-drop-color') || '')) out.depth = Math.round(Number(read('--effect-drop-color')!.match(/([\d.]+)\)$/)![1]) * 100);
  return out;
}
/** 把快速调色写回编辑框：有设的才写；全都没设就把那一段拿掉。 */
function write(css: string, quick: Quick) {
  const lines: string[] = [];
  if (quick.accent) lines.push(`  --theme-accent: ${quick.accent};  /* 主题色 */`);
  if (quick.ink) lines.push(`  --home-ink: ${quick.ink};  /* 文字 */`, `  --color-text: ${quick.ink};`);
  if (quick.muted) lines.push(`  --color-muted: ${quick.muted};  /* 框线和图案 */`);
  if (quick.surface) lines.push(`  --color-surface: ${quick.surface};  /* 面板底色 */`, `  --color-surface-rgb: ${hexRgb(quick.surface)};`);
  if (quick.shadow || quick.depth !== undefined) {
    const alpha = ((quick.depth ?? DEFAULT_DEPTH) / 100).toFixed(2);
    lines.push(`  --effect-drop-color: rgba(${quick.shadow ? hexRgb(quick.shadow) : 'var(--theme-rgb)'}, ${alpha});  /* 投影 */`);
  }
  const block = lines.length ? `${START}\n#main-content {\n${lines.join('\n')}\n}\n${END}` : '';
  const at = css.indexOf(START), end = css.indexOf(END, at);
  if (at >= 0 && end >= 0) {
    const before = css.slice(0, at), after = css.slice(end + END.length).replace(/^\n/, '');
    return block ? `${before}${block}\n${after}` : `${before}${after}`.replace(/^\n+/, '');
  }
  return block ? `${block}\n${css.replace(/^\n+/, '')}` : css;
}

/** 现在主画面实际用的颜色（还没设的那几格，色块显示这个）。读不到就给白色。 */
function currentColors(): Record<Key, string> {
  const main = document.querySelector<HTMLElement>('#main-content');
  const fallback = { accent: '#ffffff', ink: '#666666', muted: '#999999', surface: '#ffffff', shadow: '#999999' };
  if (!main) return fallback;
  const probe = document.createElement('span'), canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
  probe.style.display = 'none'; main.append(probe);
  const out = { ...fallback };
  try {
    for (const [key, , , name] of ROWS) {
      probe.style.color = key === 'shadow' ? 'rgb(var(--theme-rgb))' : `var(${name})`;
      const color = getComputedStyle(probe).color;
      if (!context || !color) continue;
      canvas.width = canvas.height = 1; context.clearRect(0, 0, 1, 1); context.fillStyle = '#ffffff'; context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      out[key] = rgbHex(`${r}, ${g}, ${b}`);
    }
  } finally { probe.remove(); }
  return out;
}

export function QuickColors({ draft, setDraft }: { draft: string; setDraft: (next: string) => void }) {
  const appearance = useAppearance(), quick = parse(draft), [now, setNow] = useState(currentColors);
  // 打开美化设置、换过主题色时重新读一次（一开机时主画面可能还没画出来）
  useEffect(() => { if (appearance.pageOpen) setNow(currentColors()); }, [appearance.pageOpen, appearance.color, appearance.tone]);
  const change = (next: Quick) => setDraft(write(draft, next));
  const depth = quick.depth ?? DEFAULT_DEPTH;
  return <div className="quick-colors">
    <p className="quick-colors-tip">快速调色 · 不用写 CSS，点颜色就会改下面编辑框里的那一段</p>
    {ROWS.map(([key, label, note]) => <div className="quick-color-row" key={key}>
      <label className={'quick-color-swatch' + (quick[key] ? ' is-set' : '')} style={{ background: quick[key] || now[key] }}>
        <input type="color" aria-label={label} value={quick[key] || now[key]} onChange={event => change({ ...quick, [key]: event.currentTarget.value })} />
      </label>
      <span className="quick-color-text"><b>{label}</b><small>{quick[key] ? `${note} · ${quick[key]}` : `${note} · 原本的`}</small></span>
      <button type="button" className="quick-color-reset" disabled={!quick[key]} onClick={() => change({ ...quick, [key]: undefined })}>恢复</button>
    </div>)}
    <div className="quick-depth">
      <span>投影深浅</span>
      <input type="range" min={0} max={100} step={5} value={depth} aria-label="投影深浅" onChange={event => change({ ...quick, depth: Number(event.currentTarget.value) })} />
      <small>{depth}%</small>
      <button type="button" className="quick-color-reset" disabled={quick.depth === undefined} onClick={() => change({ ...quick, depth: undefined })}>恢复</button>
    </div>
  </div>;
}
