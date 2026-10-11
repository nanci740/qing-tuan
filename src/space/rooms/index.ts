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
