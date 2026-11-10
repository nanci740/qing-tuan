/**
 * 主画面美化 CSS 的加范围（纯文字处理，可以单独测）。检查、补 !important 跟聊天美化共用 chatCssScope.ts。
 * - 只作用在主画面：状态栏、小组件、图标、第二页、页数小点、底下那排。
 * - 聊天、世界书这两个 App 也放在 #main-content 里面，加范围时把它们排除掉。
 * - 底下那排（设置在那里）和整个主画面不让藏起来，免得写错就回不来。
 */
import { scopeCss } from './chatCssScope.ts';

/** 八个 #main-content：主画面原本的样式最多到六层，要盖得过去。 */
export const HOME_CSS_SCOPE = '#main-content'.repeat(8);
/** 放在 #main-content 里面、不属于主画面的 App。 */
const APPS = '#chatAppPage, #worldPage';
const ROOT = /^(?::root|html|body|#main-content)(?![\w-])/i;
/** 结尾的伪元素（::before 这些）：排除条件要加在它前面。 */
const PSEUDO_END = /(::?(?:before|after|first-line|first-letter|placeholder|selection|marker|backdrop|-webkit-[\w-]+))$/i;

export function homeGuarded(selector: string) {
  if (/::?(before|after)\b/i.test(selector)) return false;
  if (/^(?::root|html|body|#main-content)$/i.test(selector.trim())) return true;
  return /\.dock-|#dockBar|#navSettingsBtn|data-dock-icon-key/i.test(selector);
}

/** 加好范围以后，把 App 排除掉（主画面本身不用排除）。 */
export function excludeApps(scoped: string, isRoot: boolean) {
  if (isRoot) return scoped;
  const end = scoped.match(PSEUDO_END)?.[1] || '';
  return `${scoped.slice(0, scoped.length - end.length)}:not(:is(${APPS}) *)${end}`;
}

export function scopeHomeCss(source: string, scope = HOME_CSS_SCOPE) {
  return scopeCss(source, { scope, root: ROOT, guarded: homeGuarded, finish: excludeApps });
}
