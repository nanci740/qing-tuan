import type { RoomConfiguration, RoomObject, RoomLayer } from '../../types/space.ts';
const object = (id: string, assetId: string, x: number, y: number, z = 0, width = 0, depth = 0, layer: RoomLayer = 'objects', parentId?: string, depthBias = 0): RoomObject => ({
    id, type: assetId, assetId, position: { x, y, z }, direction: 'fixed', layer, depthBias,
    ...(parentId ? { parentId } : {}), ...(width && depth ? { footprint: { width, depth }, collision: { solid: layer === 'objects' } } : {}), state: {}
});
export const ROOM_01_ID = 'room-01';
/** 默认布置换版时加一；旧版存档在没被手动改过家具时会换成新版布置。
 * 3：拿掉程序画的家具，只留房间外壳，家具之后改用单独绘制的图片。
 * 4：外壳换成手绘的新房间（墙、地板、窗、门各一张图），角度改成右墙 1/3、左墙 1/2。
 * 5：窗帘从窗户拆出来，左右窗帘和窗帘杆各一张图。
 * 6：换成正面视角的古早风房间（墙、地板、窗、窗帘、外框各一张图），加上床。
 * 7：床拆成前后两半，床头柜靠墙放在床右边，被子盖过床头柜。
 * 8：床、窗、床头柜换成深胡桃木色，墙和地板换色，床头柜收窄，上面放台灯。 */
export const ROOM_01_VERSION = 8;
export function createRoom01(now = Date.now()): RoomConfiguration {
    return {
        schemaVersion: 1, roomId: ROOM_01_ID, roomVersion: ROOM_01_VERSION, revision: 0, updatedAt: now,
        objects: [
            object('floor', 'floor', 0, 0, 0, 0, 0, 'architecture'),
            object('wall', 'wall', 0, 0, 0, 0, 0, 'architecture'),
            object('window', 'window', 0, 0, 0, 0, 0, 'architecture'),
            object('curtains', 'curtains', 0, 0, 0, 0, 0, 'architecture'),
            // 床脚踩到的范围到床头右柱（x 3.375）为止，被子往外垂的部分不算占地。
            object('bed-back', 'bedBack', 0, 0, 0, 3.375, 0.25),
            object('bed-front', 'bedFront', 0, 0.25, 0, 3.375, 2),
            object('nightstand', 'nightstand', 3.4375, 0, 0, 1.25, 0.6875),
            // 台灯放在床头柜的桌面上，z 是桌面高度（像素）。
            object('bedside-lamp', 'lamp', 3.4375, 0, 10, 0, 0, 'objects', 'nightstand'),
            object('frame', 'frame', 0, 0, 0, 0, 0, 'foreground'),
        ]
    };
}
