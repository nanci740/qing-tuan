import type { RoomConfiguration } from '../../types/space.ts';
import { createRoom01, ROOM_01_ID } from './room01.ts';
/** Add future room presets here; persistence never needs to know their layout. */
const defaults: Readonly<Record<string, (now: number) => RoomConfiguration>> = { [ROOM_01_ID]: createRoom01 };
export function createDefaultRoom(roomId: string, now = Date.now()): RoomConfiguration {
    const create = defaults[roomId];
    if (!create)
        throw Error('房间预设不存在');
    return create(now);
}
/** 存档的布置版本比预设旧时换成新版布置，只保留一次性提示的纪录。
 * 目前还不能手动摆家具，所以旧存档里的家具都是旧预设；之后开放摆放时这里要改成合并。 */
export function upgradeRoom(room: RoomConfiguration): RoomConfiguration | null {
    const latest = createDefaultRoom(room.roomId, room.updatedAt);
    if (room.roomVersion >= latest.roomVersion) return null;
    return { ...latest, revision: room.revision, ...(room.seen ? { seen: room.seen } : {}) };
}
