import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoom01, ROOM_01_ID } from '../space/rooms/room01.ts';
import { ROOM_ASSETS } from '../space/assets.generated.ts';
import { loadOrInitializeRoom, updateRoomObject } from '../utils/spaceDatabase.ts';
import type { RoomObjectPatch } from '../utils/spaceDatabase.ts';
function storageMessage(error: unknown): string {
    if (error instanceof Error && /[\u3400-\u9fff]/.test(error.message)) return error.message;
    if (error instanceof Error && error.name === 'QuotaExceededError') return '本机存储空间不足';
    if (error instanceof Error && error.name === 'SecurityError') return '浏览器限制了本机存档';
    if (error instanceof Error && error.name === 'VersionError') return '本机存档版本较新，请使用新版本青团机';
    return '浏览器暂时无法读取或保存房间，请稍后重试';
}
export function useSpaceRoom() {
    const [room, setRoom] = useState(() => createRoom01()), [status, setStatus] = useState<'loading' | 'saved' | 'temporary'>('loading'), [warning, setWarning] = useState('');
    const latest = useRef(room), alive = useRef(false), queue = useRef(Promise.resolve());
    latest.current = room;
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
    }, []);
    const updateObject = useCallback((id: string, patch: RoomObjectPatch): Promise<boolean> => {
        const next = queue.current.then(async () => { try {
            const saved = await updateRoomObject(ROOM_01_ID, id, patch, latest.current.revision);
            if (alive.current) {
                latest.current = saved;
                setRoom(saved);
                setStatus('saved');
                setWarning('');
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
    }, []);
    return { room, status, warning, updateObject };
}
