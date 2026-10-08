export const PRESS_TARGET='button, [role="button"], .btn, .back-btn, .vi-btn';
// 不是一般按钮的不套：下拉框、开关、展开列、资料卡分类等。
export const PRESS_SKIP='.mp3-player .btn, .tama-btn, .dock-item, .app-item, .cc-nav-btn, .cc-switch, .api-model-select-btn, .vi-choice-btn, .mcp-select-btn, .world-select-btn, .music-switch, .mcp-switch, .vi-switch, .api-advanced-toggle, .retro-sec-toggle, .world-entry-filter, .cc-tag, .world-shelf-open, .world-cover-thumb, .chat-voice-control, .chat-settings-entry-button, '
 // 颜色色块、自定义色块、页码小点、照片框 / 头像、设置页分区标题列、恢复默认青色文字链。
 +'.theme-swatch, .theme-color-picker-wrap, .theme-custom-picker-btn, .home-dot, .chat-memory-photo-wrap, .pp2-polaroid-photo, .settings-profile-avatar, .cc-avatar, .settings-section-title, .theme-reset-btn, input, select';
// 轻量操作沿用工具栏的淡化反馈，保留原来的边框与投影。
const PRESS_BARE='.cr-my-caret, .cc-chip, .world-entry-copy';
export function buttonPressKind(element:HTMLElement){if(element.matches(PRESS_BARE))return 'sp-press-bare';const style=getComputedStyle(element);return parseFloat(style.borderTopWidth)>0&&style.borderTopStyle!=='none'&&!/rgba\(0, 0, 0, 0\)|transparent/.test(style.borderTopColor)?'sp-press':'sp-press-bare';}
