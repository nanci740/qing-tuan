import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useWorld } from '../providers/WorldProvider';

/** 条目卡片长按 0.5 秒进入多选（并选上这一张）。以前长按是拖拽排序，跟多选抢同一个手势，已经拿掉。 */
export function useWorldEntryPress() {
  const world = useWorld(), hold = useRef<ReturnType<typeof setTimeout> | null>(null), press = useRef({ x: 0, y: 0, pointer: 0 });
  function clear() { if (hold.current !== null) { clearTimeout(hold.current); hold.current = null; } }
  function down(id: string, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || world.picked || (event.target as Element).closest('.world-entry-copy,.world-entry-controls,input')) return;
    clear();
    press.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
    hold.current = setTimeout(() => { hold.current = null; world.suppressEntryClickUntil.current = Date.now() + 1000; world.pickEntry(id); }, 500);
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerId === press.current.pointer && Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 9) clear();
  }
  // 放开时如果已经进了多选，这一下的点击不要再把刚选上的取消掉；之后的点击照常勾选。
  function up() { clear(); if (world.suppressEntryClickUntil.current > Date.now()) world.suppressEntryClickUntil.current = Date.now() + 300; }
  useEffect(() => clear, []);
  useEffect(clear, [world.bookId, world.revision]);
  return (id: string) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => down(id, event),
    onPointerMove: move, onPointerUp: up, onPointerCancel: clear, onPointerLeave: clear,
    onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => { if (hold.current !== null || world.picked) event.preventDefault(); },
  });
}
