import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { App } from './App';
import { installOriginalStyles } from './utils/styleRegistry';
import { tokensCss, orderedStyleSources, preFontStyleFragmentCount } from './styles/sources';

installOriginalStyles(tokensCss, orderedStyleSources, preFontStyleFragmentCount);
window.qtSettingsPageEntries = {};
// 原页面直接挂在 body，避免增加包装节点改变既有选择器。
const root = createRoot(document.body);
flushSync(() => root.render(<App />));

// 开发时完整重载，保持浏览器状态与持久化初始化一致。
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
