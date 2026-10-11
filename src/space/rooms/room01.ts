import type { RoomConfiguration, RoomObject, RoomLayer } from '../../types/space.ts';
const object = (id: string, assetId: string, x: number, y: number, z = 0, width = 0, depth = 0, layer: RoomLayer = 'objects', parentId?: string, depthBias = 0): RoomObject => ({
    id, type: assetId, assetId, position: { x, y, z }, direction: 'fixed', layer, depthBias,
    ...(parentId ? { parentId } : {}), ...(width && depth ? { footprint: { width, depth }, collision: { solid: layer === 'objects' } } : {}), state: {}
});
export const ROOM_01_ID = 'room-01';
/** 默认布置换版时加一；旧版存档在没被手动改过家具时会换成新版布置。
 * 3：拿掉程序画的家具，只留房间外壳，家具之后改用单独绘制的图片。
 * 4：外壳换成手绘的新房间（墙、地板、窗、门各一张图），角度改成右墙 1/3、左墙 1/2。 */
export const ROOM_01_VERSION = 4;
export function createRoom01(now = Date.now()): RoomConfiguration {
    return {
        schemaVersion: 1, roomId: ROOM_01_ID, roomVersion: ROOM_01_VERSION, revision: 0, updatedAt: now,
        objects: [
            object('floor', 'floor', 0, 0, 0, 0, 0, 'architecture'),
            object('wall-left', 'wallLeft', 0, 0, 0, 0, 0, 'architecture'),
            object('wall-right', 'wallRight', 0, 0, 0, 0, 0, 'architecture'),
            object('window', 'window', 0, 0, 0, 0, 0, 'architecture'),
            object('door', 'door', 0, 0, 0, 0, 0, 'architecture'),
        ]
    };
}
