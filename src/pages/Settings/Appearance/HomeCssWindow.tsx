import { HOME_CLASS_GROUPS, HOME_EXAMPLES, homeCssStore, scopeHomeCss } from '../../../utils/homeCss';
import { CssWindow, pageStyles, previewDocument } from './CssWindow';
import type { CssWindowConfig } from './CssWindow';

/** 预览：把现在的主画面（第一页）复制一份放进小框里（iframe），里面的 App、音乐都拿掉，不会动到真的主画面。 */
function buildPreview(frame: HTMLIFrameElement) {
  const main = document.querySelector<HTMLElement>('#main-content');
  let html = '<div id="main-content" class="visible"></div>';
  if (main) {
    const copy = main.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('#chatAppPage, #worldPage, audio, .floating-note').forEach(node => node.remove());
    copy.classList.remove('on-page-2'); copy.classList.add('visible');
    copy.style.opacity = '1';
    copy.removeAttribute('inert');
    html = copy.outerHTML;
  }
  const doc = frame.contentDocument; if (!doc) return;
  doc.open();
  doc.write(previewDocument(pageStyles(['homeGlobalCss']), html));
  doc.close();
}

const CONFIG: CssWindowConfig = {
  id: 'homeCssGroup', label: '主画面美化 CSS', store: homeCssStore, scope: scopeHomeCss, examples: HOME_EXAMPLES, groups: HOME_CLASS_GROUPS,
  shortVar: /^#main-content \{ ((?:--[\w-]+|background)).*/, cheatTip: '点一行就加进编辑框。颜色那几行要写在同一个 #main-content { } 里。',
  phone: { width: 390, height: 844, maxScale: .62 }, buildPreview, previewTitle: '主画面预览',
  placeholder: '在这里写 CSS，例如：\n.dock-bar {\n  background: #fbeff2;\n}',
  note: '套用后只会改到主画面（状态栏、小组件、图标、第二页、底下那排），各个 App 里面不受影响。底下那排不让藏起来，免得写错就回不到设置。',
  words: { applied: '已套用到主画面', cleared: '已拿掉主画面美化 CSS', none: '现在没有套用任何主画面美化。', file: '青团主画面美化' }
};

/** 美化设置：「主画面美化 CSS」，写好按套用，主画面跟着换。 */
export function HomeCssWindow() { return <CssWindow config={CONFIG} />; }
