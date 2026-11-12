import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { CELL_H, CELL_W, COLS, GRID_W, HOME_ITEMS, MAX_PAGES, PAD_TOP, ROWS, addItem, hideItem, itemInfo, moveItem } from '../../../utils/homeLayout';
import type { HomeItemId, HomeLayout } from '../../../utils/homeLayout';
import { showToast } from '../../../utils/toast';

/** 长按多久进编辑；手指动超过多少就不算长按（也不算拖）。 */
const HOLD_MS = 550, SLOP = 8, EDGE = 22, EDGE_MS = 650;
/** 长按不进编辑的地方：要打字的、播放器进度条。 */
const NO_HOLD = 'input, textarea, [contenteditable="true"], #progressBarBg';

interface Drag { id: HomeItemId; left: number; top: number; offX: number; offY: number; col: number; row: number; ok: boolean }

/** 一格在轨道上的位置：每页宽 100% + 40px，格子置中。 */
const slotLeft = (page: number, col: number) => `calc(${page} * (100% + 40px) + 50% - ${GRID_W / 2}px + ${col * CELL_W}px)`;

/**
 * 主画面的格子（全部页放在同一条轨道上，换页只是整条移动，换页不会让组件重新开）。
 * 长按进编辑：拖着换位置（拖到画面边边翻页）、组件左上角「－」收起来、「＋ 加组件」加回来、「完成」离开。
 * 编辑中点一下能设定的组件（configurable）会叫 onConfigure（Esc 先关弹窗，不会顺便离开编辑）。
 */
export function HomeGrid({ layout, setLayout, page, go, blocks, editing, setEditing, inert, configurable = [], onConfigure }: {
  layout: HomeLayout; setLayout: (next: HomeLayout) => void; page: number; go: (page: number) => void;
  blocks: Record<HomeItemId, ReactNode>; editing: boolean; setEditing: (editing: boolean) => void; inert?: boolean;
  configurable?: HomeItemId[]; onConfigure?: (id: HomeItemId | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null), ruler = useRef<HTMLSpanElement>(null);
  const hold = useRef({ timer: 0, x: 0, y: 0, id: null as HomeItemId | null, rect: null as DOMRect | null, active: false, swallow: false });
  const edge = useRef({ timer: 0, side: 0 });
  const live = useRef({ layout, page, go, setLayout }); live.current = { layout, page, go, setLayout };
  const [drag, setDrag] = useState<Drag | null>(null), dragRef = useRef<Drag | null>(null); dragRef.current = drag;
  const [sheet, setSheet] = useState(false);

  useEffect(() => { if (!editing) { setSheet(false); setDrag(null); } }, [editing]);
  useEffect(() => {
    if (!editing) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('#viChoiceModal.open')) setEditing(false); };
    window.addEventListener('keydown', key, true); return () => window.removeEventListener('keydown', key, true);
  }, [editing]);

  /** 量一下：轨道在画面上的位置、缩放（小屏幕整块缩到 90%）。 */
  function metrics() {
    const t = track.current!.getBoundingClientRect(), scale = (ruler.current?.getBoundingClientRect().width || GRID_W) / GRID_W;
    return { t, scale, width: t.width / scale };
  }
  /** 拖着的东西左上角对准哪一格（只看现在这一页）。 */
  function target(left: number, top: number, id: HomeItemId, width: number) {
    const info = itemInfo(id), current = live.current.page;
    const x0 = current * (width + 40) + width / 2 - GRID_W / 2;
    const col = Math.max(0, Math.min(COLS - info.w, Math.round((left - x0) / CELL_W)));
    const row = Math.max(0, Math.min(ROWS - info.h, Math.round((top - PAD_TOP) / CELL_H)));
    return { col, row, ok: !!moveItem(live.current.layout, id, current, col, row) };
  }

  function clearHold() { window.clearTimeout(hold.current.timer); hold.current.active = false; }
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const element = event.target as Element;
    if (element.closest('.home-slot-remove')) return;
    const slot = element.closest<HTMLElement>('.home-slot');
    hold.current.swallow = false;
    hold.current = { ...hold.current, x: event.clientX, y: event.clientY, id: (slot?.dataset.item as HomeItemId) || null, rect: slot?.getBoundingClientRect() || null, active: true };
    if (editing) return; // 编辑中：动了才开始拖（在下面的 pointermove）
    if (element.closest(NO_HOLD)) { hold.current.active = false; return; }
    window.clearTimeout(hold.current.timer);
    hold.current.timer = window.setTimeout(() => {
      if (!hold.current.active) return;
      hold.current.active = false; hold.current.swallow = true;
      try { navigator.vibrate?.(12); } catch { /* 不支持就算了 */ }
      setEditing(true);
    }, HOLD_MS);
  }

  useEffect(() => {
    function move(event: PointerEvent) {
      const state = hold.current, moved = Math.hypot(event.clientX - state.x, event.clientY - state.y);
      const current = dragRef.current;
      if (!current) {
        if (!state.active) return;
        if (!editing) { if (moved > SLOP) clearHold(); return; }
        if (moved <= SLOP || !state.id || !state.rect) return;
        // 开始拖
        const { t, scale } = metrics();
        const offX = (state.x - state.rect.left) / scale, offY = (state.y - state.rect.top) / scale;
        state.active = false;
        const next: Drag = { id: state.id, offX, offY, left: (event.clientX - t.left) / scale - offX, top: (event.clientY - t.top) / scale - offY, col: 0, row: 0, ok: false };
        setDrag({ ...next, ...target(next.left, next.top, next.id, metrics().width) });
        return;
      }
      event.preventDefault();
      const { t, scale, width } = metrics();
      const left = (event.clientX - t.left) / scale - current.offX, top = (event.clientY - t.top) / scale - current.offY;
      setDrag({ ...current, left, top, ...target(left, top, current.id, width) });
      // 拖到画面边边：停一下就翻页（最后一页再往右开新页，最多 3 页）
      const frame = box.current!.getBoundingClientRect();
      const side = event.clientX < frame.left + EDGE ? -1 : event.clientX > frame.right - EDGE ? 1 : 0;
      if (side !== edge.current.side) {
        window.clearTimeout(edge.current.timer); edge.current.side = side;
        if (side) {
          const flip = () => {
            const { layout: now, page: at } = live.current, next = at + side;
            if (next < 0 || next >= MAX_PAGES) return;
            if (next >= now.pages) live.current.setLayout({ ...now, pages: next + 1 });
            live.current.go(next);
            edge.current.timer = window.setTimeout(flip, EDGE_MS + 300);
          };
          edge.current.timer = window.setTimeout(flip, EDGE_MS);
        }
      }
    }
    function up() {
      clearHold();
      window.clearTimeout(edge.current.timer); edge.current.side = 0;
      const current = dragRef.current; if (!current) return;
      hold.current.swallow = true;
      setDrag(null);
      const next = moveItem(live.current.layout, current.id, live.current.page, current.col, current.row);
      if (next) live.current.setLayout(next); else showToast('那里放不下');
    }
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [editing]);

  function slotStyle(id: HomeItemId, itemPage: number, col: number, row: number): CSSProperties {
    const info = itemInfo(id), width = info.w * CELL_W, height = info.h * CELL_H;
    if (drag?.id === id) return { left: drag.left, top: drag.top, width, height };
    return { left: slotLeft(itemPage, col), top: PAD_TOP + row * CELL_H, width, height };
  }
  const widgets = HOME_ITEMS.filter(item => item.widget);

  return <>
    <div ref={box} className={'home-pages' + (editing ? ' is-editing' : '') + (drag ? ' is-dragging' : '')} inert={inert || undefined}
      onPointerDown={onPointerDown}
      onClickCapture={event => {
        const remove = (event.target as Element).closest<HTMLElement>('.home-slot-remove');
        if (remove) { event.stopPropagation(); setLayout(hideItem(layout, remove.dataset.item as HomeItemId)); return; }
        if (editing || hold.current.swallow) {
          // 编辑中点一下（不是拖完放手）能设定的组件：打开它的设定
          const id = (event.target as Element).closest<HTMLElement>('.home-slot')?.dataset.item as HomeItemId | undefined;
          if (editing && !hold.current.swallow && id && configurable.includes(id)) { setSheet(false); onConfigure?.(id); }
          event.preventDefault(); event.stopPropagation(); hold.current.swallow = false;
        }
      }}
      onContextMenu={event => { if (editing || hold.current.active) event.preventDefault(); }}>
      <span ref={ruler} className="home-ruler" aria-hidden="true" />
      <div ref={track} className="home-track" style={{ transform: `translateX(calc(${-page} * (100% + 40px)))` }}>
        {drag && <div className={'home-drop' + (drag.ok ? '' : ' is-bad')} style={{ left: slotLeft(page, drag.col), top: PAD_TOP + drag.row * CELL_H, width: itemInfo(drag.id).w * CELL_W, height: itemInfo(drag.id).h * CELL_H }} />}
        {layout.items.map(item => {
          const info = itemInfo(item.id);
          return <div key={item.id} data-item={item.id} className={`home-slot ${info.widget ? 'is-widget' : 'is-app'}${drag?.id === item.id ? ' is-held' : ''}`}
            style={slotStyle(item.id, item.page, item.col, item.row)} inert={(!editing && item.page !== page) || undefined} aria-hidden={item.page !== page || undefined}>
            {blocks[item.id]}
            {editing && info.widget && <button type="button" className="home-slot-remove" data-item={item.id} aria-label={`收起${info.name}`}>−</button>}
          </div>;
        })}
      </div>
    </div>
    {/* 编辑用的东西放在一直都在的这一层里：主画面旁边有旧代码动过的节点，直接插在旁边会对不上 */}
    <div className="home-edit-layer">{editing && <>
      <div className="home-edit-bar">
        <button type="button" className="home-edit-btn" onClick={() => setSheet(true)}>＋ 加组件</button>
        <button type="button" className="home-edit-btn is-done" onClick={() => setEditing(false)}>完成</button>
      </div>
      {!sheet && <p className="home-edit-tip">按住拖动换位置，拖到画面边边可以换页 · 点组件可以设定</p>}
    </>}
    {editing && sheet && <div className="home-edit-sheet" role="dialog" aria-label="加组件">
      <div className="home-edit-sheet-head"><span>加组件</span><button type="button" aria-label="关掉" onClick={() => setSheet(false)}>×</button></div>
      <div className="home-edit-sheet-grid">
        {widgets.map(info => {
          const placed = layout.items.find(item => item.id === info.id);
          return <button type="button" key={info.id} className={'home-edit-card' + (placed ? ' is-placed' : '')} disabled={!!placed}
            onClick={() => { const next = addItem(layout, info.id, page); if (!next) { showToast('放不下了，先挪出一点空位'); return; } setLayout(next); setSheet(false); const at = next.items.find(item => item.id === info.id)!.page; if (at !== page) go(at); }}>
            <i className={`home-edit-thumb is-${info.id}`} aria-hidden="true" />
            <b>{info.name}</b>
            <small>{info.w}×{info.h} · {placed ? `在第 ${placed.page + 1} 页` : '点一下加进来'}</small>
          </button>;
        })}
      </div>
    </div>}</div>
  </>;
}
