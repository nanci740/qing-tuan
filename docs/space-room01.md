# 像素小窝 Room 01

## 现况

- 正面视角的古早风房间，分成五层：地板、墙（含护墙板）、窗户、窗帘（绑起来的）、外框。外框在最上层，盖住房间四周。
- 每层都是 320 × 224 的透明底图片，叠起来就是完整的房间，放在 `public/space/room01/`。改了图之后跑一次 `generate-space-assets.mjs` 更新素材表。
- 家具是透明底的单张图片，素材表里记着锚点。目前只有床（64 × 64）。
- 窗户先放夏天白天、关窗的那张；四季、黄昏、夜晚、开窗和拉上的窗帘之后做互动时再放进来。
- 画到屏幕上时用双线性放大，看起来柔一点；房间本身在原尺寸拼好，不会混色。
- 功能架构不变：入口、页面与画布、铺满与拖动缩放、归位钮、对话框、左下角通知、QingTuanSpaceDB 存档。

## 坐标与投影

- 正面视角：x 往右、y 往前（画面往下），每格 16 像素；z 是像素高度。见 `src/space/projection.ts`。
- 场景 320 × 224，原点是后墙墙脚的左端，也就是地板左上角 (16, 80)。打开时铺满屏幕，左右可以拖动。
- 地板：x 0..18、y 0..8。床放在 (0, 0)，占 4 × 2.25 格。

## 摆放与前后顺序

- 每件东西是一张图，记着「脚底」在图上的哪一点。房间清单写它站在哪一格，见 `src/space/rooms/room01.ts`。
- 前后顺序见 `src/space/depth.ts`：越靠前（y 越大）越晚画；完全在后面、又在画面上左右重叠的先画；放在别的家具上的东西跟着它的底座走。

## 存档

- 资料库 `QingTuanSpaceDB`，存的是房间清单，不是截图。
- 默认布置换版时，`ROOM_01_VERSION` 加一。旧版存档会换成新布置，但保留看过的一次性提示。

## 检查

```bash
node --experimental-strip-types scripts/generate-space-assets.mjs
node --experimental-strip-types scripts/space-model-regression.mjs
FAKE_INDEXEDDB_ENTRY=/path/to/fake-indexeddb/index.js node --experimental-strip-types scripts/space-storage-regression.mjs
```
