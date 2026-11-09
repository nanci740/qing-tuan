import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { chatCssStore, scopeChatCss } from '../../utils/chatCss';
import { homeCssStore, scopeHomeCss } from '../../utils/homeCss';
import type { CssStore } from '../../utils/cssStore';

function useScoped(store: CssStore, scope: (css: string) => string) {
  const read = () => { try { return scope(store.read()); } catch { return ''; } };
  const [css, setCss] = useState(read);
  useEffect(() => {
    const update = () => setCss(read());
    window.addEventListener(store.event, update);
    return () => window.removeEventListener(store.event, update);
  }, []);
  return css;
}

/** 美化设置写的聊天美化、主画面美化 CSS，放进 <head>。 */
export function ChatGlobalCss() {
  const chat = useScoped(chatCssStore, scopeChatCss), home = useScoped(homeCssStore, scopeHomeCss);
  return createPortal(<><style id="chatGlobalCss">{chat}</style><style id="homeGlobalCss">{home}</style></>, document.head);
}
