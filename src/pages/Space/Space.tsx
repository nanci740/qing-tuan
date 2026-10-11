import { useEffect, useRef, useState } from 'react';
import { PressedButton } from '../../components/shared/PressedButton';
import { useSpaceRoom } from '../../hooks/useSpaceRoom';
import { RoomCanvas } from './RoomCanvas';
import { showToast } from '../../utils/toast';
import './Space.css';
export function Space({ onClose }: {
    onClose: () => void;
}) {
    const { room, status, warning } = useSpaceRoom(), back = useRef<HTMLButtonElement>(null), [dockGap, setDockGap] = useState(104);
    useEffect(() => {
        const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        back.current?.focus();
        const dock = document.querySelector<HTMLElement>('#dockBar');
        const measure = () => { if (dock)
            setDockGap(Math.max(0, window.innerHeight - dock.getBoundingClientRect().top + 10)); };
        const observer = new ResizeObserver(measure);
        if (dock)
            observer.observe(dock);
        window.addEventListener('resize', measure);
        window.visualViewport?.addEventListener('resize', measure);
        measure();
        return () => { observer.disconnect(); window.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('resize', measure); if (focused?.isConnected)
            focused.focus(); };
    }, []);
    // 存档相关的提示一律用小弹窗，不留在页面上。
    useEffect(() => { if (warning) showToast(warning); }, [warning]);
    return <section id="spacePage" className="space-page" style={{ paddingBottom: dockGap }} aria-labelledby="spaceTitle" onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
    } }}>
  <header className="space-titlebar">
   <PressedButton ref={back} type="button" className="space-back" aria-label="返回主页" onClick={onClose}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></PressedButton>
   <h1 id="spaceTitle">Space<small>.room</small></h1>
  </header>
  <main className="space-content">{status === 'loading' ? <p className="space-initializing" role="status">正在读取房间…</p> : <RoomCanvas room={room}/>}</main>
 </section>;
}
