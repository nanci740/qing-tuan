# 图片清理与按钮斜面收简

基于 main 549436a（此前箭头、字号与加号修复已合并）。

图片清理参考老式磁盘清理的列表与说明区结构：https://learn.microsoft.com/en-us/windows/win32/lwef/disk-cleanup 。重写原 DataManagement.css 和现有组件布局，移除单页签、双 fieldset、占用条、图例与底部状态栏的组合。保留标题、像素图片图标、可释放空间读数、一张占用列表、状态、说明及两颗共用按钮。暂时保护的图片单独显示数量与大小；错误、繁忙与无可清理状态保持真实。

按钮原有两层亮边、两层暗边简化为一亮一暗，再加已有外投影。统一变量 effect-raised / effect-sunken / effect-button-shadow；直接修改旧别名与最终规则，不追加覆盖皮肤。转盘去掉叠在凸起斜面上的额外左上模糊阴影；播放器及宠物屏幕保持单独凹陷。

宠物饱食度和心情像素图标填充使用 color-accent，空格仍以原来的透明度显示，随主题一起换色。

验证：npm run build；ui-controls-regression 116 项（三主题、按钮实际计算样式与状态图标）；color-system-regression 123 项；image-cleanup-regression 24 项（去重、保护、跨页、失败回滚、取消/确认、窄屏）。合计 263 项通过；人工检查 390px / 320px 截图。

将 src、scripts、docs 同名文件合并，构建后提交。无需改依赖或存储格式。dist 不在补丁内。
