import { useCallback, useEffect, useRef, useState } from 'react';
import { PressedButton } from '../../components/shared/PressedButton';
import { useSpaceRoom } from '../../hooks/useSpaceRoom';
import { RoomCanvas } from './RoomCanvas';
import { RoomDialogue } from './RoomDialogue';
import type { DialogueLine } from './RoomDialogue';
import { RoomNotices, useRoomNotices } from './RoomNotices';
import './Space.css';
const WELCOME: readonly DialogueLine[] = [{ text: '欢迎回到小窝' }];
export function Space({ onClose }: {
    onClose: () => void;
}) {
    const { room, status, warning, markSeen } = useSpaceRoom(), back = useRef<HTMLButtonElement>(null);
    const { notices, notify } = useRoomNotices(), [dialogue, setDialogue] = useState<readonly DialogueLine[] | null>(null), greeted = useRef(false);
    useEffect(() => {
        const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        back.current?.focus();
        return () => { if (focused?.isConnected) focused.focus(); };
    }, []);
    // 小窝里的存档提示改用左下角的小通知，不用全站的小弹窗。
    useEffect(() => { if (warning) notify(warning.text, 'warn'); }, [warning, notify]);
    // 第一次进小窝说一句欢迎词，看过就记进房间存档。
    useEffect(() => {
        if (status === 'loading' || greeted.current) return;
        greeted.current = true;
        if (room.seen?.includes('welcome')) return;
        setDialogue(WELCOME);
        markSeen('welcome');
    }, [status, room, markSeen]);
    const closeDialogue = useCallback(() => setDialogue(null), []);
    return <section id="spacePage" className="space-page" aria-labelledby="spaceTitle" onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
    } }}>
  <header className="space-titlebar">
   <PressedButton ref={back} type="button" className="space-back" aria-label="返回主页" onClick={onClose}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></PressedButton>
   <h1 id="spaceTitle">Space<small>.room</small></h1>
  </header>
  <main className="space-content">{status === 'loading' ? <p className="space-initializing" role="status">正在读取房间…</p> : <RoomCanvas room={room}>
   <div className="space-hud">
    <RoomNotices notices={notices}/>
    {dialogue && <RoomDialogue lines={dialogue} onClose={closeDialogue}/>}
   </div>
  </RoomCanvas>}</main>
 </section>;
}
