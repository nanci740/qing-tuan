# 四类界面效果

基于 main 6eda5a1（七类配色已合并）。此次只整理材质效果，不改功能、布局、主题保存或用户自定义 CSS。

| 用途 | 统一变量 | 规则 |
| --- | --- | --- |
| 正面高光 | `--effect-highlight`、`--effect-highlight-soft`、`--effect-face-white` | 白色亮边与次级亮边；白色按钮统一亮面分界 |
| 内侧暗边 | `--effect-inner-shade`、`--effect-inner-soft` | 从主题灰派生；细暗边与柔和内阴影 |
| 外侧投影 | `--effect-drop`、`--effect-drop-color`、`--effect-drop-soft` | 标准窗口为右下 2px 硬投影；既有圆形软投影保留尺寸，使用统一柔色 |
| 玻璃反光 | `--effect-reflection-edge/shade/bright/soft` | 亮边、暗边继续读取美化页玻璃强度；播放器、转盘、导航的反光统一色源 |

变量定义在 `src/styles/tokens.css` 的 `:root, body`，按 body 柔化主题色重新计算。旧 bevel、win、cc、cr、wb、home 变量作为兼容入口；原声明直接修改，不追加全页覆盖层。

保留叠纸、像素轮廓、遮罩、零投影、警示环、按下位移和反光形状。主画面、设置、聊天、世界书继续使用各自材质和布局。玻璃强度参数仍由 AppearanceProvider 管理。

验证：`npm run build`；`scripts/color-system-regression.mjs` 覆盖三主题、13 个视图、320px 图片清理和 UI 换色持久化，支持 `QT_COLOR_BASELINE` 比较布局；`scripts/image-cleanup-regression.mjs` 检查清理逻辑及两个设置页共用框架/按钮。
