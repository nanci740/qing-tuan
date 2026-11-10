import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { chatCssStore, scopeChatCss } from '../../utils/chatCss';
import { homeCssStore, scopeHomeCss } from '../../utils/homeCss';
import { CSS_ASSETS_EVENT, loadCssAssets, resolveAssets } from '../../utils/cssAssets';
import type { CssStore } from '../../utils/cssStore';

/** 加好范围、把 url(asset:名字) 换成素材图片；套用、素材有变动时重算。 */
function useScoped(store: CssStore, scope: (css: string) => string) {
  const read = () => { try { return resolveAssets(scope(store.read())); } catch { return ''; } };
  const [css, setCss] = useState(read);
  useEffect(() => {
    const update = () => setCss(read());
    window.addEventListener(store.event, update); window.addEventListener(CSS_ASSETS_EVENT, update);
    return () => { window.removeEventListener(store.event, update); window.removeEventListener(CSS_ASSETS_EVENT, update); };
  }, []);
  return css;
}

/** 美化设置写的聊天美化、主画面美化 CSS，放进 <head>。 */
export function ChatGlobalCss() {
  useEffect(() => { void loadCssAssets(); }, []);
  const chat = useScoped(chatCssStore, scopeChatCss), home = useScoped(homeCssStore, scopeHomeCss);
  return createPortal(<><style id="chatGlobalCss">{chat}</style><style id="homeGlobalCss">{home}</style></>, document.head);
}
