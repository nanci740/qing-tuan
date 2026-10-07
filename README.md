# 青团机 React + TypeScript + Vite

原单文件 HTML 的运行逻辑已迁入 React 组件、Provider、Hook 和 TypeScript 工具。源码中没有 `*.runtime.js`、`ClassicScriptSlot`、动态经典脚本加载器或 `document.getElementById`。

聊天录音、播放、转文字、翻译、请求与分段回复、引用、撤回、多选转发、历史恢复和后台通知保留原流程。更多菜单、聊天搜索、快捷入口、世界书勾选、角色资料显示和回忆照片使用 React 状态、ref 和事件。角色档案、主页、设置、世界书等此前迁移的功能也包含在本包。

所有 17 份 CSS 与迁移基线逐字节一致。变量位于 `src/styles/tokens.css`；页面位于 `src/pages/`，各有 TSX / CSS；共用组件位于 `src/components/shared/`，其余逻辑在 `src/hooks/`、`src/utils/`、`src/types/` 和 `src/providers/`。

## 运行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm install
npm run dev
npm run typecheck
npm run build
npm run verify:migration
npm run preview
```

`dist/` 包含生产构建。`reference/original.html` 仅供测试对照，产品不会加载它。现有 localStorage / IndexedDB 的键名及聊天备份格式保留；HTML 历史仅在导入、导出和持久化边界解析或序列化，页面由 React 消息模型渲染。

## 验证

`docs/validation-summary.json` 的 `latest_group_suites` 列出本次构建实际复查的报告；其他报告保留此前阶段的验证记录。对照测试比较 DOM、计算样式、尺寸、表单实际值和原始存储，逐项记录截图结果。录音、API 和外部媒体使用确定性模拟，不代表已连接用户的真实外部服务。

测试忽略原版已被移除的 SCRIPT 节点，并合并相邻文本节点；React 受控表单反射的默认值属性与原版不同，其实际值单独严格比较。消息夹具在 React 版本通过消息 API 注入同样的数据。测试不忽略消息内容、样式、布局或持久化值。

浏览器专项可临时安装 `playwright` 与 `@sparticuz/chromium`，运行 `scripts/*-regression.mjs`；`CHROMIUM_EXECUTABLE` 可以指定浏览器。部分历史截图存在报告中记录的边缘像素差，截图一致情况以每项结果为准。
