import type { RoomConfiguration } from '../types/space.ts';
import { orderRoomObjects } from './depth.ts';
export const SPACE_SCHEMA_VERSION = 1;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
/** Reject incompatible saves without deleting or replacing the original row. */
export function validateRoom(value: unknown, roomId?: string): RoomConfiguration {
    if (!record(value) || value.schemaVersion !== SPACE_SCHEMA_VERSION)
        throw Error('房间存档版本暂不支持，原存档已保留');
    if (typeof value.roomId !== 'string' || (roomId && value.roomId !== roomId) || !Number.isInteger(value.roomVersion) || Number(value.roomVersion) < 1 || !Number.isInteger(value.revision) || Number(value.revision) < 0 || !finite(value.updatedAt) || !Array.isArray(value.objects) || value.objects.length > 500)
        throw Error('房间存档格式异常，原存档已保留');
    if (value.seen !== undefined && (!Array.isArray(value.seen) || value.seen.length > 100 || value.seen.some(key => typeof key !== 'string')))
        throw Error('房间存档格式异常，原存档已保留');
    const ids = new Set<string>();
    for (const o of value.objects) {
        const position = record(o) && record(o.position) ? o.position : null;
        if (!record(o) || typeof o.id !== 'string' || !o.id || ids.has(o.id) || typeof o.assetId !== 'string' || typeof o.type !== 'string' || !position || !['x', 'y', 'z'].every(k => finite(position[k])) || o.direction !== 'fixed' || !['architecture', 'ground', 'objects', 'foreground'].includes(String(o.layer)) || !finite(o.depthBias) || !record(o.state) || (o.parentId !== undefined && typeof o.parentId !== 'string'))
            throw Error('家具存档格式异常，原存档已保留');
        if (o.footprint !== undefined && (!record(o.footprint) || !finite(o.footprint.width) || !finite(o.footprint.depth) || Number(o.footprint.width) <= 0 || Number(o.footprint.depth) <= 0))
            throw Error('家具占地数据异常');
        ids.add(o.id);
    }
    const result = structuredClone(value) as unknown as RoomConfiguration;
    orderRoomObjects(result.objects);
    return result;
}
