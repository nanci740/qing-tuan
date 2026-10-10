import type { LedgerIcon as CategoryIcon } from '../../types/ledger';

/** 分类以 24 格绘制；页面工具使用细线图标。 */
const pixels: Record<CategoryIcon, string> = {
  food: 'M4 2h2v5h1V2h2v5h1V2h2v7h-1v1H9v12H7V10H5V9H4z M15 2h3v1h1v1h1v9h-2v9h-2v-9h-1z',
  transport: 'M6 2h12v2h2v16h-2v2h-2v-2H8v2H6v-2H4V4h2z M6 4v8h12V4z M6 14v4h12v-4z M8 6h8v2H8z M7 15h2v2H7z M15 15h2v2h-2z',
  shopping: 'M8 2h8v2h2v4h4v14H2V8h4V4h2z M8 4v4h8V4z M4 10v10h16V10z M6 12h2v2H6z M16 12h2v2h-2z',
  fun: 'M4 6h16v2h2v10h-2v2h-6v-2h-4v2H4v-2H2V8h2z M4 8v10h4v-2h8v2h4V8z M6 10h2v2h2v2H8v2H6v-2H4v-2h2z M14 10h2v2h-2z M17 13h2v2h-2z',
  daily: 'M10 2h8v2h-4v2h4v4h2v12H4V10h2V6h4z M8 8v2h8V8z M6 12v8h12v-8z M8 14h8v2H8z',
  home: 'M11 2h2v2h2v2h2v2h2v2h2v2h-2v10H5V12H3v-2h2V8h2V6h2V4h2z M11 6v2H9v2H7v10h3v-6h4v6h3V10h-2V8h-2V6z',
  medical: 'M8 3h8v3h5v15H3V6h5z M10 5v1h4V5z M5 8v11h14V8z M11 10h2v3h3v2h-3v3h-2v-3H8v-2h3z',
  study: 'M2 4h8v2H2z M14 4h8v2h-8z M10 6h4v2h-4z M2 6h2v12H2z M20 6h2v12h-2z M11 8h2v12h-2z M2 18h9v2H2z M13 18h9v2h-9z M6 9h3v2H6z M15 9h3v2h-3z M6 13h3v2H6z M15 13h3v2h-3z',
  phone: 'M6 2h12v20H6z M8 4v13h8V4z M11 18v2h2v-2z',
  clothes: 'M6 3h4v2H6z M14 3h4v2h-4z M10 5h4v2h-4z M4 5h2v2H4z M18 5h2v2h-2z M2 7h2v6H2z M20 7h2v6h-2z M4 11h4v2H4z M16 11h4v2h-4z M6 13h2v8H6z M16 13h2v8h-2z M8 19h8v2H8z',
  merch: 'M8 3h8v2H8z M6 5h2v2H6z M16 5h2v2h-2z M4 7h2v10H4z M18 7h2v10h-2z M6 17h2v2H6z M16 17h2v2h-2z M8 19h8v2H8z M11 8h2v2h-2z M8 10h8v2H8z M10 12h4v2h-4z M9 14h2v2H9z M13 14h2v2h-2z',
  pet: 'M3 5h3v2H3z M1 7h2v4H1z M3 11h2v2H3z M1 13h2v4H1z M3 17h3v2H3z M6 7h2v2H6z M6 15h2v2H6z M8 9h8v2H8z M8 13h8v2H8z M16 7h2v2h-2z M16 15h2v2h-2z M18 5h3v2h-3z M21 7h2v4h-2z M19 11h2v2h-2z M21 13h2v4h-2z M18 17h3v2h-3z',
  salary: 'M2 5h20v14H2z M4 7v10h16V7z M10 9h4v1h1v4h-1v1h-4v-1H9v-4h1z M11 11v2h2v-2z M5 8h2v2H5z M17 14h2v2h-2z',
  other: 'M4 4h16v16H4z M6 6v12h12V6z M8 10h2v4H8z M14 10h2v4h-2z',
};
type ToolIcon = 'close' | 'trash' | 'previous' | 'next' | 'backspace' | 'calendar';
const lines: Record<ToolIcon, string> = {
  previous: 'M15 18 9 12l6-6', next: 'm9 6 6 6-6 6',
  close: 'm6 6 12 12 M18 6 6 18',
  trash: 'M3 6h18 M8 6V4h8v2 M5 6v14h14V6 M10 10v7 M14 10v7',
  backspace: 'M9 5h12v14H9L3 12z M12 9l6 6 M18 9l-6 6',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5',
};
/** 分类有自己的表情就显示表情，否则用像素图标。 */
export function LedgerCategoryIcon({ name, emoji = '' }: { name: CategoryIcon; emoji?: string }) {
  if (emoji) return <span className="ledger-pixel ledger-emoji" aria-hidden="true">{emoji}</span>;
  return <svg className="ledger-pixel" viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges"><path d={pixels[name]} fill="currentColor" fillRule="evenodd" /></svg>;
}
/** 顶栏右上角的小猪头，只是装饰。 */
export function LedgerPig() {
  return <svg className="ledger-pig" viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges"><path d="M4 4h4v2H4z M16 4h4v2h-4z M2 6h2v2H2z M6 6h12v2H6z M20 6h2v2h-2z M2 8h4v2H2z M18 8h4v2h-4z M0 10h2v8H0z M22 10h2v8h-2z M6 12h2v4H6z M16 12h2v4h-2z M10 14h4v2h-4z M2 18h20v2H2z" fill="currentColor" fillRule="evenodd" /></svg>;
}
export function LedgerToolIcon({ name }: { name: ToolIcon }) {
  return <svg className="ledger-tool-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={lines[name]} /></svg>;
}
