import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { RoomCamera, RoomViewport } from '../types/space.ts';
import { clampCamera, coverZoom, zoomAt } from '../space/projection.ts';
const initial: RoomCamera = { zoom: 1, x: 0, y: 0 };
/** 一打开房间就铺满画面，左右可以拖着看。 */
const home = (v: RoomViewport): RoomCamera => ({ zoom: coverZoom(v), x: 0, y: 0 });
export function useRoomViewport(viewport: RoomViewport) {
    const [camera, setCamera] = useState<RoomCamera>(initial), current = useRef(camera), v = useRef(viewport);
    current.current = camera;
    v.current = viewport;
    const pointers = useRef(new Map<number, {
        x: number;
        y: number;
    }>()), lastTap = useRef<{
        at: number;
        x: number;
        y: number;
    } | null>(null);
    const gesture = useRef<{
        camera: RoomCamera;
        points: {
            x: number;
            y: number;
        }[];
        moved: boolean;
        multi: boolean;
    }>({ camera: initial, points: [], moved: false, multi: false });
    const apply = (next: RoomCamera) => { current.current = next; setCamera(next); };
    const reset = () => { pointers.current.clear(); lastTap.current = null; apply(clampCamera(home(v.current), v.current)); };
    const placed = useRef(false);
    const zoomBy = useCallback((factor: number, point: {
        x: number;
        y: number;
    }) => { if (pointers.current.size)
        return; const next = zoomAt(current.current, v.current, current.current.zoom * factor, point); current.current = next; setCamera(next); }, []);
    useEffect(() => {
        if (viewport.width < 2 || viewport.height < 2) return;
        // 第一次量到画面大小时摆到铺满的位置，之后只校正范围。
        if (!placed.current) { placed.current = true; apply(clampCamera(home(viewport), viewport)); }
        else apply(clampCamera(current.current, viewport));
    }, [viewport.width, viewport.height]);
    function point(e: ReactPointerEvent<HTMLElement>) { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left - (r.width - v.current.width) / 2, y: e.clientY - r.top - (r.height - v.current.height) / 2 }; }
    function rebase() { gesture.current = { camera: { ...current.current }, points: [...pointers.current.values()].slice(0, 2), moved: gesture.current.moved, multi: gesture.current.multi || pointers.current.size > 1 }; }
    function down(e: ReactPointerEvent<HTMLElement>) { if (e.pointerType === 'mouse' && e.button !== 0)
        return; e.preventDefault(); e.stopPropagation(); if (!pointers.current.size)
        gesture.current = { camera: current.current, points: [], moved: false, multi: false }; pointers.current.set(e.pointerId, point(e)); if (pointers.current.size > 1)
        lastTap.current = null; e.currentTarget.setPointerCapture(e.pointerId); rebase(); }
    function move(e: ReactPointerEvent<HTMLElement>) {
        if (!pointers.current.has(e.pointerId))
            return;
        e.preventDefault();
        e.stopPropagation();
        pointers.current.set(e.pointerId, point(e));
        const now = [...pointers.current.values()].slice(0, 2), start = gesture.current.points, base = gesture.current.camera;
        if (!start.length)
            return;
        if (now.length > 1 && start.length > 1) {
            const center = { x: (now[0].x + now[1].x) / 2, y: (now[0].y + now[1].y) / 2 }, origin = { x: (start[0].x + start[1].x) / 2, y: (start[0].y + start[1].y) / 2 };
            const distance = (a: {
                x: number;
                y: number;
            }, b: {
                x: number;
                y: number;
            }) => Math.hypot(a.x - b.x, a.y - b.y);
            const zoom = base.zoom * distance(now[0], now[1]) / Math.max(1, distance(start[0], start[1]));
            const scaled = zoomAt(base, v.current, zoom, origin);
            apply(clampCamera({ ...scaled, x: scaled.x + center.x - origin.x, y: scaled.y + center.y - origin.y }, v.current));
            gesture.current.moved = true;
        }
        else if (now.length === 1) {
            const dx = now[0].x - start[0].x, dy = now[0].y - start[0].y;
            if (Math.hypot(dx, dy) > 5)
                gesture.current.moved = true;
            if (base.zoom > 1)
                apply(clampCamera({ ...base, x: base.x + dx, y: base.y + dy }, v.current));
        }
    }
    function end(e: ReactPointerEvent<HTMLElement>) {
        if (!pointers.current.has(e.pointerId))
            return;
        e.stopPropagation();
        const p = point(e);
        pointers.current.delete(e.pointerId);
        if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        if (!pointers.current.size) {
            if (!gesture.current.moved && !gesture.current.multi) {
                const tap = lastTap.current, at = performance.now();
                if (tap && at - tap.at < 320 && Math.hypot(p.x - tap.x, p.y - tap.y) < 24)
                    reset();
                else
                    lastTap.current = { at, ...p };
            }
        }
        else
            rebase();
    }
    function cancel() { pointers.current.clear(); lastTap.current = null; gesture.current.moved = true; }
    useEffect(() => { window.addEventListener('blur', cancel); return () => window.removeEventListener('blur', cancel); }, []);
    return { camera, reset, zoomBy, handlers: { onPointerDown: down, onPointerMove: move, onPointerUp: end, onPointerCancel: cancel, onLostPointerCapture: (e: ReactPointerEvent<HTMLElement>) => { if (pointers.current.has(e.pointerId))
                cancel(); } } };
}
