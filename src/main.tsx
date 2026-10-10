import { PressedButton } from './components/shared/PressedButton';
import { initializeUiFont } from './utils/appearanceStorage';
import { CHAT_RECORDS_BLOCKED_MESSAGE, initializeChatRecords } from './utils/chatRecords';
import { initializeImageAssets } from './utils/imageAssets';
import { showToast } from './utils/toast';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { App } from './App';
import { installOriginalStyles } from './utils/styleRegistry';
import { tokensCss, orderedStyleSources, preFontStyleFragmentCount } from './styles/sources';

installOriginalStyles(tokensCss, orderedStyleSources, preFontStyleFragmentCount);
window.qtSettingsPageEntries = {};
// 原页面直接挂在 body，避免增加包装节点改变既有选择器。
const root = createRoot(document.body);
void Promise.all([initializeImageAssets(), initializeChatRecords(), initializeUiFont()]).then(warnings => {
  const warning = warnings.filter(Boolean).join('；');
  flushSync(() => root.render(<App />));
  if (warning) showToast(warning);
}).catch(error => {
  const message = error instanceof Error && error.message === CHAT_RECORDS_BLOCKED_MESSAGE
    ? CHAT_RECORDS_BLOCKED_MESSAGE : '已保存的数据暂时无法读取，请重试。';
  flushSync(() => root.render(<main style={{padding:24,color:'var(--color-text)'}}><p>{message}</p><PressedButton type="button" className="sp-press-bare" onClick={() => window.location.reload()}>重新打开</PressedButton></main>));
});

// 开发时完整重载，保持浏览器状态与持久化初始化一致。
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
