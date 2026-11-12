import { createCssStore } from './cssStore';
import { scopeHomeCss } from './homeCssScope';

/** 美化设置的「主画面美化 CSS」：只改主画面，各个 App 里面不受影响。 */
export const homeCssStore = createCssStore({ applied: 'qingtuan_home_css_v1', draft: 'qingtuan_home_css_draft_v1', templates: 'qingtuan_home_css_templates_v1', event: 'qingtuan:home-css' }, scopeHomeCss);
export const HOME_CSS_EVENT = homeCssStore.event;
export const readHomeCss = () => homeCssStore.read();
export const writeHomeCss = (css: string) => homeCssStore.write(css);
export { scopeHomeCss } from './homeCssScope';

/* ---------- 类名小抄 ---------- */
export const HOME_CLASS_GROUPS: { label: string; items: [string, string][] }[] = [
  { label: '颜色（只想换颜色，改这几个就好）', items: [
    ['#main-content { --theme-accent: ; }', '主画面的主题色（框线、图标、按钮、播放器一起换）'],
    ['#main-content { --home-ink: ; }', '主画面的字'],
    ['#main-content { background: ; }', '整个主画面的底（会盖过壁纸）']] },
  { label: '最上面', items: [
    ['.ios-status-bar', '状态栏（时间、电量那一条）'], ['.status-time', '状态栏的时间']] },
  { label: '上面的小组件', items: [
    ['.widget-card', '整块小组件'], ['.avatar-frame-container', '头像框'], ['.avatar-inner-circle', '头像框里面'],
    ['.speech-bubble-container', '头像上面的对话框'], ['.bubble-text', '对话框里的字'], ['.subtitle', '中间那行小字'],
    ['.heart-icon', '两个头像中间的爱心'], ['.earphone-wires', '耳机线']] },
  { label: '音乐播放器', items: [
    ['.mp3-player', '整台播放器'], ['.mp3-screen', '播放器的屏幕'], ['.song-details', '屏幕上歌名那行'],
    ['.mp3-player .controls', '右边的圆形按钮盘'], ['.mp3-player .btn', '播放器的按钮'], ['.mp3-brand', '下面那行小字']] },
  { label: '图标', items: [
    ['.app-item', '一个图标（连名字）'], ['.app-card', '图标的底'], ['.icon-box', '图标的图案'], ['.app-label-cn', '图标的名字'],
    ['.tama-widget', '电子宠物整台'], ['.tama-screen', '电子宠物的屏幕'], ['.tama-btn', '电子宠物的按钮']] },
  { label: '第二页和小点', items: [
    ['.home-notice', '消息卡'], ['.home-notice-bar', '消息卡的标题栏'], ['.home-notice-text', '消息卡的字'],
    ['.home-dot', '页数小点'], ['.home-dot.active', '现在这页的小点']] },
  { label: '加进来的组件', items: [
    ['.home-hello', '一句话整块'], ['.home-hello-name', '一句话的名字'], ['.home-hello-text', '一句话那行字'], ['.home-hello-link', '「回复」'],
    ['.home-login-frame', '登录框的大头像框'], ['.home-login-field', '登录框的两栏'], ['.home-login-go', '登录框的箭头钮'],
    ['.home-cal', '日历整块'], ['.home-cal-title', '日历的标题栏'], ['.home-cal-pic', '日历左边的图'], ['.home-cal-month', '日历的月份'],
    ['.home-cal-day', '日历的日期'], ['.home-cal-day.is-today', '今天那一格'], ['.home-cal-status', '日历最底下那栏']] },
  { label: '底下那排', items: [
    ['.dock-bar', '整排（不能藏起来）'], ['.dock-item', '每一颗'], ['.dock-item.active', '现在这一页的那颗'], ['.dock-item span', '每一颗下面的字']] }
];

/* ---------- 示例 ---------- */
export const HOME_EXAMPLES: { name: string; css: string }[] = [
  { name: '原本的', css: '' },
  { name: '只换颜色', css: `/* 只想换颜色：改这几行，删掉不想改的 */
#main-content {
  --theme-accent: #e3c6b0;  /* 主画面的主题色：框线、图标、按钮、播放器一起换 */
}` }
];
