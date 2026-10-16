import type { RoomPosition, RoomCamera, RoomViewport } from '../types/space.ts';
/** 正面视角，跟房间图一样：x 往右、y 往前（画面往下），每格 16 像素；z 是像素高度。
 * 原点是后墙墙脚的左端（地板左上角）。 */
export const SCENE_WIDTH = 320, SCENE_HEIGHT = 224;
export const SCENE_ORIGIN = { x: 16, y: 80 };
export const TILE = 16;
export const MAX_ZOOM = 2.5;
/** 刚好铺满画面（横竖都不留白）时的倍率；小窝一打开和“归位”都用这个。 */
export function coverZoom(v: RoomViewport) { return Math.max(1, Math.max(v.width / SCENE_WIDTH, v.height / SCENE_HEIGHT) / fitScale(v)); }
/** 最多可以放大到铺满后的 2.5 倍。 */
export function maxZoom(v: RoomViewport) { return Math.max(MAX_ZOOM, coverZoom(v) * MAX_ZOOM); }
export function project(p: RoomPosition) { return { x: SCENE_ORIGIN.x + TILE * p.x, y: SCENE_ORIGIN.y + TILE * p.y - p.z }; }
export function unproject(x: number, y: number, z = 0): RoomPosition { return { x: (x - SCENE_ORIGIN.x) / TILE, y: (y - SCENE_ORIGIN.y + z) / TILE, z }; }
export function fitScale(v: RoomViewport) { return Math.max(.01, Math.min(Math.max(1, v.width) / SCENE_WIDTH, Math.max(1, v.height) / SCENE_HEIGHT)); }
export function clampCamera(camera: RoomCamera, v: RoomViewport): RoomCamera {
    const zoom = Math.min(maxZoom(v), Math.max(1, camera.zoom)), scale = fitScale(v) * zoom;
    const limit = (size: number, available: number) => zoom === 1 ? 0 : Math.max(0, size > available ? (size - available) / 2 : (available - size) / 2);
    const limitX = limit(SCENE_WIDTH * scale, v.width), limitY = limit(SCENE_HEIGHT * scale, v.height);
    return { zoom, x: limitX ? Math.min(limitX, Math.max(-limitX, camera.x)) : 0, y: limitY ? Math.min(limitY, Math.max(-limitY, camera.y)) : 0 };
}
export function zoomAt(camera: RoomCamera, v: RoomViewport, zoom: number, point: {
    x: number;
    y: number;
}): RoomCamera {
    const next = Math.max(1, Math.min(maxZoom(v), zoom)), ratio = next / camera.zoom;
    return clampCamera({ zoom: next, x: point.x - v.width / 2 - (point.x - v.width / 2 - camera.x) * ratio, y: point.y - v.height / 2 - (point.y - v.height / 2 - camera.y) * ratio }, v);
}
