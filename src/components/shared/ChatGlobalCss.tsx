import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CHAT_CSS_EVENT, readChatCss, scopeChatCss } from '../../utils/chatCss';

function scoped() { try { return scopeChatCss(readChatCss()); } catch { return ''; } }
/** 美化设置写的聊天美化 CSS，放进 <head>，全部聊天室都套。 */
export function ChatGlobalCss() {
  const [css, setCss] = useState(scoped);
  useEffect(() => {
    const update = () => setCss(scoped());
    window.addEventListener(CHAT_CSS_EVENT, update);
    return () => window.removeEventListener(CHAT_CSS_EVENT, update);
  }, []);
  return createPortal(<style id="chatGlobalCss">{css}</style>, document.head);
}
