import type { LedgerIcon as CategoryIcon } from '../../types/ledger';

/** 分类以 24 格绘制；页面工具使用细线图标。 */
const pixels: Record<CategoryIcon, string> = {
  food: 'M3 2h2v6h2V2h2v6h2V2h2v8h-4v12H7V10H3z M17 2h4v20h-2v-8h-4V6h2z M17 6v6h2V4h-2z',
  transport: 'M6 2h12v2h2v16h-2v2h-2v-2H8v2H6v-2H4V4h2z M6 4v8h12V4z M6 14v4h12v-4z M8 6h8v2H8z M7 15h2v2H7z M15 15h2v2h-2z',
  shopping: 'M8 2h8v2h2v4h4v14H2V8h4V4h2z M8 4v4h8V4z M4 10v10h16V10z M6 12h2v2H6z M16 12h2v2h-2z',
  fun: 'M4 6h16v2h2v10h-2v2h-6v-2h-4v2H4v-2H2V8h2z M4 8v10h4v-2h8v2h4V8z M6 10h2v2h2v2H8v2H6v-2H4v-2h2z M14 10h2v2h-2z M17 13h2v2h-2z',
  daily: 'M10 2h8v2h-4v2h4v4h2v12H4V10h2V6h4z M8 8v2h8V8z M6 12v8h12v-8z M8 14h8v2H8z',
  other: 'M4 4h16v16H4z M6 6v12h12V6z M8 10h2v4H8z M14 10h2v4h-2z',
};
type ToolIcon = 'back' | 'plus' | 'close' | 'trash' | 'previous' | 'next' | 'backspace';
const lines: Record<ToolIcon, string> = {
  back: 'M15 18 9 12l6-6', previous: 'M15 18 9 12l6-6', next: 'm9 6 6 6-6 6',
  plus: 'M12 5v14 M5 12h14', close: 'm6 6 12 12 M18 6 6 18',
  trash: 'M3 6h18 M8 6V4h8v2 M5 6v14h14V6 M10 10v7 M14 10v7',
  backspace: 'M9 5h12v14H9L3 12z M12 9l6 6 M18 9l-6 6',
};
export function LedgerCategoryIcon({ name }: { name: CategoryIcon }) {
  return <svg className="ledger-pixel" viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges"><path d={pixels[name]} fill="currentColor" fillRule="evenodd" /></svg>;
}
export function LedgerToolIcon({ name }: { name: ToolIcon }) {
  return <svg className="ledger-tool-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={lines[name]} /></svg>;
}
