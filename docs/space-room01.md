# 像素小窝 Room 01

## 现况

- 房间外壳是手绘的像素图，分成八层：地板（含窗外照进来的光斑）、左墙、右墙、窗户、左窗帘、右窗帘、窗帘杆、门。
- 窗帘挡住的那段窗框也画完整了，以后单独拿掉或换窗帘不会露出空洞。
- 每层都是 831 × 573 的透明底图片，叠起来就是完整的房间，放在 `public/space/room01/`。改了图之后跑一次 `generate-space-assets.mjs` 更新素材表。
- 家具之后一件一件做成透明底的单张图片，放在同一个角度上。
- 功能架构不变：入口、页面与画布、铺满与拖动缩放、归位钮、对话框、左下角通知、QingTuanSpaceDB 存档。

## 坐标与投影

- 跟图一样的斜角：x 沿右墙，每格往右下 12×4 像素（斜度 1/3）；y 沿左墙，每格往左下 -12×6 像素（斜度 1/2）；z 是像素高度。见 `src/space/projection.ts`。
- 场景 831 × 573，原点是墙角的地面 (372, 205)。打开时铺满屏幕，左右可以拖动。
- 房间：x 沿右墙 0..34.25，y 沿左墙 0..26；玄关在右前方，x 34.25..37.9、y 3.7..15.5，跟地板同高，门站在玄关上。
- 斜线每一阶的像素数固定：右墙方向每阶 3 格，左墙方向每阶 2 格。画新东西时照这个走，才不会忽二忽三。

## 摆放与前后顺序

- 每件东西是一张图，记着「脚底」在图上的哪一点。房间清单写它站在哪一格，见 `src/space/rooms/room01.ts`。
- 前后顺序见 `src/space/depth.ts`：完全在后面、又在画面上重叠的先画；放在别的家具上的东西跟着它的底座走。

## 存档

- 资料库 `QingTuanSpaceDB`，存的是房间清单，不是截图。
- 默认布置换版时，`ROOM_01_VERSION` 加一。旧版存档会换成新布置，但保留看过的一次性提示。

## 检查

```bash
node --experimental-strip-types scripts/generate-space-assets.mjs
node --experimental-strip-types scripts/space-model-regression.mjs
FAKE_INDEXEDDB_ENTRY=/path/to/fake-indexeddb/index.js node --experimental-strip-types scripts/space-storage-regression.mjs
```
