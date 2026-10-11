import type { RoomConfiguration, RoomObject } from '../types/space.ts';
import { ROOM_01_ID } from '../space/rooms/room01.ts';
import { createDefaultRoom } from '../space/rooms/index.ts';
import { validateRoom } from '../space/validation.ts';
export const SPACE_DATABASE_NAME = 'QingTuanSpaceDB';
export const SPACE_DATABASE_VERSION = 1;
export class SpaceConflictError extends Error {
    constructor() { super('其他页面已修改房间，请重新打开小窝后再保存'); }
}
export function openSpaceDatabase(factory: IDBFactory = globalThis.indexedDB): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!factory) {
            reject(Error('当前浏览器无法使用本机存档'));
            return;
        }
        let finished = false;
        const request = factory.open(SPACE_DATABASE_NAME, SPACE_DATABASE_VERSION);
        const fail = (error: unknown) => { if (finished)
            return; finished = true; clearTimeout(timer); reject(error); };
        const timer = setTimeout(() => fail(Error('本机存档打开超时')), 5000);
        request.onupgradeneeded = () => { if (finished) {
            request.transaction?.abort();
            return;
        } const db = request.result; if (!db.objectStoreNames.contains('rooms'))
            db.createObjectStore('rooms', { keyPath: 'roomId' }); };
        request.onblocked = () => fail(Error('本机存档升级被其他页面阻挡，请关闭其他青团机页面后重试'));
        request.onerror = () => fail(request.error ?? Error('本机存档打开失败'));
        request.onsuccess = () => { const db = request.result; if (finished) {
            db.close();
            return;
        } finished = true; clearTimeout(timer); db.onversionchange = () => db.close(); resolve(db); };
    });
}
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, result: (value: T) => void, fail: (error: unknown) => void) => void, factory?: IDBFactory): Promise<T> {
    const db = await openSpaceDatabase(factory);
    try {
        return await new Promise<T>((resolve, reject) => {
            const tx = db.transaction('rooms', mode);
            let output: T, cause: unknown, done = false;
            const fail = (error: unknown) => { cause = error; try {
                tx.abort();
            }
            catch {
                finish(error);
            } };
            const finish = (error?: unknown) => { if (done)
                return; done = true; clearTimeout(timer); if (error)
                reject(error);
            else
                resolve(output); };
            const timer = setTimeout(() => fail(Error('本机存档操作超时')), 5000);
            tx.oncomplete = () => finish();
            tx.onabort = () => finish(cause ?? tx.error ?? Error('本机存档操作取消'));
            tx.onerror = () => { cause ??= tx.error; };
            try {
                run(tx.objectStore('rooms'), value => { output = value; }, fail);
            }
            catch (error) {
                fail(error);
            }
        });
    }
    finally {
        db.close();
    }
}
export async function readRoom(roomId: string, factory?: IDBFactory): Promise<RoomConfiguration | null> {
    return transaction('readonly', (store, result, fail) => {
        const req = store.get(roomId);
        req.onsuccess = () => { try {
            result(req.result === undefined ? null : validateRoom(req.result, roomId));
        }
        catch (e) {
            fail(e);
        } };
    }, factory);
}
export async function loadOrInitializeRoom(roomId = ROOM_01_ID, factory?: IDBFactory): Promise<RoomConfiguration> {
    const saved = await readRoom(roomId, factory);
    if (saved)
        return saved;
    // Recheck within the write transaction: another tab may have initialized first.
    return transaction('readwrite', (store, result, fail) => {
        const req = store.get(roomId);
        req.onsuccess = () => {
            try {
                if (req.result !== undefined) {
                    result(validateRoom(req.result, roomId));
                    return;
                }
                const room = createDefaultRoom(roomId);
                store.add(room);
                result(room);
            }
            catch (e) {
                fail(e);
            }
        };
    }, factory);
}
/** Saves only after a successful transaction; revision prevents stale tabs from
 * overwriting newer configurations. No deletion or reset API is provided. */
export async function saveRoom(room: RoomConfiguration, expectedRevision: number, factory?: IDBFactory): Promise<RoomConfiguration> {
    const checked = validateRoom(room);
    return updateRoom(room.roomId, () => checked, expectedRevision, factory);
}
export async function updateRoom(roomId: string, change: (room: RoomConfiguration) => RoomConfiguration, expectedRevision: number, factory?: IDBFactory): Promise<RoomConfiguration> {
    return transaction('readwrite', (store, result, fail) => {
        const req = store.get(roomId);
        req.onsuccess = () => {
            try {
                if (req.result === undefined)
                    throw Error('房间尚未初始化');
                const current = validateRoom(req.result, roomId);
                if (current.revision !== expectedRevision)
                    throw new SpaceConflictError();
                const next = validateRoom(change(structuredClone(current)), roomId);
                next.revision = current.revision + 1;
                next.updatedAt = Math.max(Date.now(), current.updatedAt + 1);
                store.put(next);
                result(next);
            }
            catch (e) {
                fail(e);
            }
        };
    }, factory);
}
/** 记下一次性提示已经出现过，跟房间存在同一份存档里。 */
export async function markRoomSeen(roomId: string, key: string, expectedRevision: number, factory?: IDBFactory): Promise<RoomConfiguration> {
    return updateRoom(roomId, room => ({ ...room, seen: [...new Set([...(room.seen ?? []), key])] }), expectedRevision, factory);
}
export type RoomObjectPatch = Partial<Omit<RoomObject, 'id' | 'position'>> & {
    position?: Partial<RoomObject['position']>;
};
export async function updateRoomObject(roomId: string, id: string, patch: RoomObjectPatch, expectedRevision: number, factory?: IDBFactory): Promise<RoomConfiguration> {
    return updateRoom(roomId, room => {
        const original = room.objects.find(o => o.id === id);
        if (!original)
            throw Error('家具不存在');
        const position = { ...original.position, ...patch.position }, dx = position.x - original.position.x, dy = position.y - original.position.y, dz = position.z - original.position.z;
        const descendants = new Set([id]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const o of room.objects)
                if (o.parentId && descendants.has(o.parentId) && !descendants.has(o.id)) {
                    descendants.add(o.id);
                    changed = true;
                }
        }
        room.objects = room.objects.map(o => o.id === id ? { ...o, ...patch, id, position, state: { ...o.state, ...patch.state } } : descendants.has(o.id) ? { ...o, position: { x: o.position.x + dx, y: o.position.y + dy, z: o.position.z + dz } } : o);
        return room;
    }, expectedRevision, factory);
}
