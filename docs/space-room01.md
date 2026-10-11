# 像素小窝 Room 01

## 现况

- 程序画的家具已经拿掉，房间里只剩外壳：地板、两面墙、窗户与窗帘。
- 接下来外壳会换成一张单独绘制的空房间图片，家具再一件一件做成透明底的单张图片，放在同一个角度上。
- 功能架构不变：入口、页面与画布、铺满与拖动缩放、归位钮、对话框、左下角通知、QingTuanSpaceDB 存档。

## 坐标与投影

- 2:1 斜角：每格往右下 16×8 像素，往左下 -16×8 像素，z 是像素高度。见 `src/space/projection.ts`。
- 场景 632 × 444，房间几乎贴满画面边缘，打开时铺满屏幕，左右可以拖动。
- 房间：x 沿右墙 0..23，y 沿左墙 0..15；右边 x 19..23 是凸出去的衣柜区，y 8..11.5 是低一阶的玄关。

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
