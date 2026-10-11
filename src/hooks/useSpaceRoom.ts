import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoom01, ROOM_01_ID } from '../space/rooms/room01.ts';
import { ROOM_ASSETS } from '../space/assets.generated.ts';
import { loadOrInitializeRoom, markRoomSeen, updateRoomObject } from '../utils/spaceDatabase.ts';
import type { RoomObjectPatch } from '../utils/spaceDatabase.ts';
function storageMessage(error: unknown): string {
    if (error instanceof Error && /[\u3400-\u9fff]/.test(error.message)) return error.message;
    if (error instanceof Error && error.name === 'QuotaExceededError') return '本机存储空间不足';
    if (error instanceof Error && error.name === 'SecurityError') return '浏览器限制了本机存档';
    if (error instanceof Error && error.name === 'VersionError') return '本机存档版本较新，请使用新版本青团机';
    return '浏览器暂时无法读取或保存房间，请稍后重试';
}
export function useSpaceRoom() {
    const [room, setRoom] = useState(() => createRoom01()), [status, setStatus] = useState<'loading' | 'saved' | 'temporary'>('loading'), [warning, setWarningState] = useState<{ id: number; text: string } | null>(null);
    const latest = useRef(room), alive = useRef(false), queue = useRef(Promise.resolve()), statusRef = useRef(status), warningSeq = useRef(0);
    latest.current = room;
    statusRef.current = status;
    // 每次出错都是一条新提示，同样的字也要再提醒一次。
    const setWarning = useCallback((text: string) => { setWarningState({ id: ++warningSeq.current, text }); }, []);
    useEffect(() => {
        alive.current = true;
        void loadOrInitializeRoom().then(saved => {
            if (saved.objects.some(o => !ROOM_ASSETS[o.assetId]))
                throw Error('存档包含暂不支持的素材，原存档已保留');
            if (alive.current) {
                latest.current = saved;
                setRoom(saved);
                setStatus('saved');
            }
        }).catch(error => { if (alive.current) {
            setStatus('temporary');
            setWarning(`暂用默认房间，本机存档不可用，${storageMessage(error)}`);
        } });
        return () => { alive.current = false; };
    }, [setWarning]);
    const updateObject = useCallback((id: string, patch: RoomObjectPatch): Promise<boolean> => {
        const next = queue.current.then(async () => { try {
            const saved = await updateRoomObject(ROOM_01_ID, id, patch, latest.current.revision);
            if (alive.current) {
                latest.current = saved;
                setRoom(saved);
                setStatus('saved');
            }
            return true;
        }
        catch (error) {
            if (alive.current) {
                setWarning(`房间修改未保存，${storageMessage(error)}`);
            }
            return false;
        } });
        queue.current = next.then(() => undefined);
        return next;
    }, [setWarning]);
    /** 存档用不了时只记在这次打开里，下次进来还会再出现。 */
    const markSeen = useCallback((key: string) => {
        if (latest.current.seen?.includes(key)) return;
        if (statusRef.current !== 'saved') {
            const local = { ...latest.current, seen: [...(latest.current.seen ?? []), key] };
            latest.current = local;
            setRoom(local);
            return;
        }
        queue.current = queue.current.then(async () => { try {
            const saved = await markRoomSeen(ROOM_01_ID, key, latest.current.revision);
            if (alive.current) {
                latest.current = saved;
                setRoom(saved);
            }
        }
        catch (error) {
            if (alive.current) setWarning(`提示记录未保存，${storageMessage(error)}`);
        } });
    }, [setWarning]);
    return { room, status, warning, updateObject, markSeen };
}
