import { ROOM_ASSETS } from './assets.generated.ts';
import { SCENE_WIDTH, SCENE_HEIGHT, project, fitScale } from './projection.ts';
import { orderRoomObjects } from './depth.ts';
import type { RoomConfiguration, RoomCamera, RoomViewport } from '../types/space.ts';
export async function loadRoomAssets(room: RoomConfiguration): Promise<Map<string, HTMLImageElement>> {
    const ids = [...new Set(room.objects.map(o => o.assetId))];
    const entries = await Promise.all(ids.map(async (id) => { const asset = ROOM_ASSETS[id]; if (!asset)
        throw Error('存档包含暂不支持的素材，原存档已保留'); const im = new Image(); im.src = import.meta.env.BASE_URL + asset.path; await im.decode().catch(() => { throw Error('房间素材加载失败，请重新打开小窝'); }); return [id, im] as const; }));
    return new Map(entries);
}
export function composeRoom(room: RoomConfiguration, images: Map<string, HTMLImageElement>): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = SCENE_WIDTH;
    canvas.height = SCENE_HEIGHT;
    const c = canvas.getContext('2d');
    if (!c)
        throw Error('当前浏览器无法显示房间');
    c.imageSmoothingEnabled = false;
    for (const o of orderRoomObjects(room.objects)) {
        const a = ROOM_ASSETS[o.assetId], im = images.get(o.assetId);
        if (!a || !im)
            throw Error('房间素材未加载完成');
        const point = project(o.position);
        c.drawImage(im, Math.round(point.x - a.anchor.x), Math.round(point.y - a.anchor.y));
    }
    return canvas;
}
/** Logical scene is SCENE_WIDTH×SCENE_HEIGHT. The visible bitmap follows the element's CSS
 * bounds × DPR; only drawImage applies the camera, using nearest-neighbour. */
export function paintRoom(canvas: HTMLCanvasElement, scene: HTMLCanvasElement, v: RoomViewport, camera: RoomCamera) {
    const w = Math.max(1, Math.round(v.width * v.dpr)), h = Math.max(1, Math.round(v.height * v.dpr));
    if (canvas.width !== w)
        canvas.width = w;
    if (canvas.height !== h)
        canvas.height = h;
    const c = canvas.getContext('2d');
    if (!c)
        return;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, w, h);
    const scale = fitScale(v) * camera.zoom;
    const dw = Math.max(1, Math.round(SCENE_WIDTH * scale * v.dpr)), dh = Math.max(1, Math.round(SCENE_HEIGHT * scale * v.dpr));
    c.drawImage(scene, Math.round((w - dw) / 2 + camera.x * v.dpr), Math.round((h - dh) / 2 + camera.y * v.dpr), dw, dh);
}
