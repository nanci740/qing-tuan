# 青团机 · 像素小窝 Room 01 交付说明

本次依据 main 的 `549692e9118d2e27fd10561d22173ec918b605b6` 制作。所有修改仅在本地交付包中，未向 GitHub 推送或部署。

## 已实现

- 既有底部 SPACE 入口，原文字、像素猫图标、自定义图标、位置及其他按钮保留。
- Canvas 2D 房间，由 40 个独立透明 PNG 和 55 个配置对象组成。具体数量及文件清单见 `space/file-manifest.json`。
- 米白双墙、木地板、青白窗帘与窗外景色、双人床、沙发、地毯、茶几、书桌、CRT、键盘、主机、电视和独立电视柜、书柜、衣柜、床头柜、椅子，以及适量生活摆件。
- 完整房间适配、双指中心缩放、2.5 倍上限、放大后单指和鼠标拖动、范围限制、双点／双击及“完整视角”重置。桌面可在房间区域滚轮缩放。
- 独立 IndexedDB 房间数据库及初始化、读取、保存、对象更新接口；失败提示和默认房间临时预览。
- 页面文字采用简体中文；顶栏复用记账原规则，尺寸、返回箭头、字体、颜色和边线保持同一套设计。

## 三种尺寸

| 尺寸 | 含义 | 规则 |
| --- | --- | --- |
| 场景逻辑尺寸 | 房间与素材的像素坐标 | 固定 **480 × 320**；本次没有改为 640 × 480 |
| Canvas 实际位图尺寸 | 显示画布的 backing store | 画布内容区 CSS 宽高乘有效 DPR，按设备像素取整；DPR 最多 4，并受约 600 万像素预算限制 |
| 手机显示尺寸 | 页面布局中的 CSS 宽高 | 由可用视窗、顶栏、说明和既有 dock 的实际位置决定；Canvas CSS 始终填满其内容区 |

素材为 1:1 逻辑像素，不因手机 DPR 重画家具。运行时先将独立物件合成为透明的 480 × 320 缓存画布，再将缓存画布最近邻绘制到显示画布；缓存是运行时优化，不是整张背景图素材，也不参与存档。

所有绘制 context 设置 `imageSmoothingEnabled=false`，显示 Canvas 使用 `image-rendering:pixelated`。目标房间矩形采用整数设备像素，宽高保持严格 3:2。手机完整适配通常不是整数倍率，相邻逻辑像素在屏幕上可能有 1 个设备像素的宽度差，这是最近邻采样的量化，不是模糊或家具比例改变。

`ResizeObserver` 测量 Canvas 内容区，避免将场景边框计入渲染尺寸。场景只在配置、镜头或视窗改变时通过 `requestAnimationFrame` 重画，不常驻动画循环。

## 投影、素材与遮挡

地面采用浅斜轴测，单格投影 24 × 8；水平斜线按 3:1 像素阶梯推进。世界坐标投影为：

```text
screenX = 240 + 12 × (x - y)
screenY = 132 + 4 × (x + y) - z
```

`z` 为逻辑像素高度；`x/y` 是地面格坐标。`unproject` 为未来人物行走保留地面逆变换。

素材由 `scripts/space-art/pixels.mjs` 的整数扫描线、像素描边、离散椭圆与 `furniture.mjs` 中每件家具的独立绘制方法原创制作。PNG 为 RGBA 透明素材。统一投影、比例、固定调色盘及左上亮／侧面暗的光影，不使用概念图切块、AI 图片、CSS 家具或现成图标。

像素细节包括青白床单格纹、双枕头、床下抽屉、沙发坐垫与靠垫、木地板拼缝与桌面木纹、CRT 屏幕和按键、书脊、柜门及抽屉、窗帘格纹等。`docs/space/room01-preview.png` 是美术检查预览；产品不加载这张图。

背景建筑、地面物件、家具组与前景按层级排序。独立家具依据占地前缘的深度排序；同深度使用稳定 ID，而不是数组创建顺序。`parentId` 将桌上物品等关联到支撑家具；低处收纳先画、主体随后、桌面摆件再画、独立茶几前缘最后画。`tableFront.png` 是真实独立遮挡部件，避免一律将装饰放到最上层。

## 场景数据与存档

`src/space/rooms/room01.ts` 管理默认配置，`rooms/index.ts` 是未来房间预设登记处。元件和渲染函数不包含家具布局。

房间保存 `schemaVersion / roomId / roomVersion / revision / updatedAt / objects`。对象保存 `id / type / assetId / position{x,y,z} / direction / layer / depthBias / parentId / footprint / collision / state`。素材表单独保存 PNG 路径、像素尺寸及锚点。`direction` 第一版固定为 `fixed`，旋转留待后续扩展。

数据库为 `QingTuanSpaceDB`，版本 1，`rooms` 表以 `roomId` 为主键，不修改原有 `QingTuanDB`、聊天或图片数据库。

```ts
loadOrInitializeRoom(roomId) // 先读取；仅不存在时在写事务内再检查并初始化
readRoom(roomId)
saveRoom(configuration, expectedRevision)
updateRoom(roomId, synchronousUpdater, expectedRevision)
updateRoomObject(roomId, objectId, patch, expectedRevision)
```

移动一个家具时，`updateRoomObject` 也平移它的支撑子物件。修改 `state` 时保留未修改的未来字段。成功以事务 `complete` 为准，revision 检查防止旧分页面覆盖新配置。镜头操作不写入数据库；未来编辑功能可调用更新接口，高频编辑应在编辑层合并／防抖后保存。

首次进入等待房间读取，再展示已存配置或正式默认配置，避免先闪现默认布局。新版预设不会覆盖原存档；异常或未来版本保留原行并提示。数据库无法读取时可以浏览默认房间，界面明确说明临时模式，不伪装成已保存。

本机存档不代表云同步。更换设备或网站来源、清除网站数据、无痕模式及浏览器清理，可能导致数据无法保留。

## 对现有项目的保护

仅修改四个现有文件：

- `DockBar.tsx`：给原 SPACE 加点击处理和原 active 样式。
- `SettingsNavigationProvider.tsx`：在原状态切换方式中补全小窝开关。
- `Home.tsx`：挂载 SPACE；小窝打开时让被覆盖的首页交互区 inert，保留 dock 可操作。
- `Ledger.css`：直接扩展四条原顶栏规则的选择器，声明内容和原记账选择器的优先级不变。没有追加一组覆盖规则。

SPACE 的新规则全部限定于 `.space-page`。未改全域 CSS、主题变量、依赖、构建配置或原存储工具。已核对 401 个无关原始文件与 GitHub blob hash 一致。新页位于 Home 内，避免 Home 的动画层叠上下文挡住原 dock；页面自身阻止触控事件冒泡到首页滑页处理。

## 运行与验证

普通项目运行仍使用原指令：

```sh
npm ci
npm run dev
npm run build
npm run verify:migration
```

生产资源保留 `/qing-tuan/` base，`dist/` 已包含本次生产构建。

以下素材和专项脚本使用 Node.js 24（或支持直接运行 TypeScript 的 Node 22.18+）；不要求升级原项目的普通建置流程：

```sh
node scripts/generate-space-assets.mjs
node scripts/space-model-regression.mjs
```

储存测试使用独立、测试专用的 fake-indexeddb ESM 工厂，未加入产品依赖。本次临时取得上游 `dumbmatter/fakeIndexedDB` 的 `b92592fecd760b5e3dcc0d78528b0cf8f8e7ccce` 源码并用 TypeScript 转译，临时工厂不包含在 ZIP 中。也可在单独测试工作区安装该测试包，然后指定其 ESM 入口：

```sh
FAKE_INDEXEDDB_ENTRY=/path/to/fake-indexeddb/build/esm/index.js node scripts/space-storage-regression.mjs
```

浏览器专项需测试环境中的 Playwright 与 Chromium，先建置再执行：

```sh
QT_TEST_RUNTIME=/path/to/test-workspace CHROMIUM_EXECUTABLE=/path/to/chromium node scripts/space-regression.mjs
```

`QT_TEST_RUNTIME` 指包含 `node_modules/playwright` 的测试工作区。脚本覆盖入口、初始化、API 修改坐标后刷新恢复、双指缩放、拖动、重置、最近邻像素颜色、320/390/430px 与横向布局、底栏及聊天／设置导航、存储失败提示、桌面滚轮／鼠标，以及持久浏览器 profile 重开恢复。测试 API 仅由测试服务器提供，不加入产品全域对象。

## 实际结果与待确认

- **通过**：`npm run build`（含 TypeScript 严格检查和 Vite 生产建置）。
- **通过**：`npm run verify:migration`。
- **通过**：场景／坐标／遮挡／镜头模型 9 项。
- **通过**：储存接口及失败保护 12 项，使用内存 IndexedDB 测试工厂。
- **通过**：40 张素材和场景 bounds；主要家具实际占地无穿插；401 个无关原始文件 hash 保持一致。
- **未执行**：原生浏览器专项。沙盒阻挡本地监听和 Chromium IPC；额外执行请求被中止，不能把静态预览、模型测试或内存数据库当成浏览器验收。
- **需人工确认**：真机完整视角的家具辨识度、iOS/Android 双指手感、高 DPR 放大边缘、底栏触控、真实刷新和关闭浏览器后的恢复，以及其他页面的实际操作回归。

另外，既有 `main.tsx` 在聊天／图片等其他数据库初始化失败时可能先显示全站错误页。SPACE 专属数据库失效有局部备援；浏览器全面停用 IndexedDB 时仍可能被既有启动流程阻挡。本次没有擅自改写全站启动或其他页面存档。

尚未加入人物、行走、家具编辑、旋转、商店、多房间 UI、宠物、天气、云端或存档管理功能。
