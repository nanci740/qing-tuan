import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PressedButton } from '../../components/shared/PressedButton';
import { useRoomViewport } from '../../hooks/useRoomViewport';
import { composeRoom, loadRoomAssets, paintRoom } from '../../space/renderer.ts';
import { SCENE_HEIGHT, SCENE_WIDTH } from '../../space/projection.ts';
import type { RoomConfiguration, RoomViewport } from '../../types/space.ts';
export function RoomCanvas({ room, children }: {
    room: RoomConfiguration;
    /** 浮在房间上的提示（对话框、角落通知），不在画面拖动的范围里。 */
    children?: ReactNode;
}) {
    const stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), scene = useRef<HTMLCanvasElement | null>(null);
    const [viewport, setViewport] = useState<RoomViewport>({ width: 1, height: 1, dpr: 1 }), [ready, setReady] = useState(false), [error, setError] = useState('');
    const { camera, reset, zoomBy, handlers } = useRoomViewport(viewport);
    useEffect(() => { const node = stage.current; if (!node)
        return; const wheel = (e: WheelEvent) => { e.preventDefault(); e.stopPropagation(); const r = (canvas.current ?? node).getBoundingClientRect(), delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1); zoomBy(Math.exp(-delta * .002), { x: e.clientX - r.left, y: e.clientY - r.top }); }; node.addEventListener('wheel', wheel, { passive: false }); return () => node.removeEventListener('wheel', wheel); }, [zoomBy]);
    useEffect(() => {
        const node = stage.current;
        if (!node)
            return;
        const measure = () => { const r = (canvas.current ?? node).getBoundingClientRect(); if (r.width < 1 || r.height < 1)
            return; const dpr = Math.min(window.devicePixelRatio || 1, 4, Math.sqrt(6000000 / (r.width * r.height))); setViewport({ width: r.width, height: r.height, dpr }); };
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        window.addEventListener('resize', measure);
        window.visualViewport?.addEventListener('resize', measure);
        measure();
        return () => { observer.disconnect(); window.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('resize', measure); };
    }, []);
    useEffect(() => { let alive = true; setReady(false); setError(''); void loadRoomAssets(room).then(images => { const rendered = composeRoom(room, images); if (alive) {
        scene.current = rendered;
        setReady(true);
    } }).catch(cause => { if (alive)
        setError(cause instanceof Error ? cause.message : '房间素材加载失败'); }); return () => { alive = false; }; }, [room]);
    useEffect(() => { if (!ready || !scene.current || !canvas.current)
        return; const frame = requestAnimationFrame(() => { if (scene.current && canvas.current)
        paintRoom(canvas.current, scene.current, viewport, camera); }); return () => cancelAnimationFrame(frame); }, [ready, viewport, camera]);
    return <div className="space-room">
  <div ref={stage} className="space-stage" {...handlers} data-zoom={camera.zoom.toFixed(4)} data-offset-x={camera.x.toFixed(2)} data-offset-y={camera.y.toFixed(2)} onContextMenu={e => e.preventDefault()}>
   <canvas ref={canvas} className="space-canvas" role="img" aria-label="青白格纹床、青色沙发、木茶几、CRT电脑、电视和收纳柜组成的像素小窝" data-logical-width={SCENE_WIDTH} data-logical-height={SCENE_HEIGHT}/>
   {!ready && !error && <p className="space-loading" role="status">正在布置小窝…</p>}
   {error && <p className="space-loading" role="alert">{error}</p>}
  </div>
  <PressedButton type="button" className="space-reset" aria-label="归位，回到一开始的视角" onClick={reset}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5 M5.5 9.5V20h13V9.5 M10 20v-5h4v5" /></svg><span>归位</span></PressedButton>
  {children}
 </div>;
}
