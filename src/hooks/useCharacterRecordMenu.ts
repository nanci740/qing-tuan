import { flushSync } from 'react-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CharacterDossier, CharacterEditorBridge, CharacterEditorSnapshot } from '../types/characterDossier';

export function characterRecordLabel(record: CharacterDossier) {
  return ((record.name || record.nickname || '').trim() || '新角色') + (record.isStamped ? '' : '（未保存）');
}
export function useCharacterRecordMenu() {
  const [bridge, setBridge] = useState<CharacterEditorBridge | null>(null);
  const [source, setSource] = useState<CharacterEditorSnapshot | null>(null);
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>();
  const button = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const placement = useRef<{ phase: number; above: number; room: number }>({ phase: 0, above: 0, room: 0 });
  useLayoutEffect(() => {
    const ready = (event: Event) => setBridge((event as CustomEvent<CharacterEditorBridge>).detail);
    const snapshot = (event: Event) => { const next = (event as CustomEvent<CharacterEditorSnapshot>).detail; flushSync(() => { setSource(next); setRevision(n => n + 1); }); };
    const close = () => { placement.current.phase = 0; flushSync(() => setOpen(false)); };
    const container = (event: Event) => { const node = (event as CustomEvent<HTMLElement | null>).detail; setBridge(current => current && current.switchContainer !== node ? { ...current, switchContainer: node } : current); };
    window.addEventListener('qingtuan:character-switch-container', container);
    window.addEventListener('qingtuan:character-editor-ready', ready);
    window.addEventListener('qingtuan:character-editor-snapshot', snapshot);
    window.addEventListener('qingtuan:character-menu-close', close);
    // 画面尺寸变了（转向、键盘弹出）选单位置会跑掉，先收起来
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('qingtuan:character-switch-container', container); window.removeEventListener('qingtuan:character-editor-ready', ready); window.removeEventListener('qingtuan:character-editor-snapshot', snapshot); window.removeEventListener('qingtuan:character-menu-close', close); window.removeEventListener('resize', close); };
  }, []);
  useLayoutEffect(() => {
    if (!open || !bridge || !button.current || !menu.current) return;
    const pending = placement.current;
    if (pending.phase === 1) {
      // 箭头朝下就往下弹。窗口本身会裁切，所以选单以整个遮罩为基准定位，贴在按钮正下方；底下不够高才改往上
      // 小手机画面可能整体缩放（zoom），量到的坐标要先除回缩放比例
      const overlay = bridge.overlay, box = overlay.getBoundingClientRect(), rect = button.current.getBoundingClientRect();
      const k = box.width / (overlay.offsetWidth || box.width) || 1;
      const below = (rect.bottom - box.top) / k;
      pending.above = (rect.top - box.top) / k;
      pending.room = overlay.offsetHeight - below - 8;
      pending.phase = 2;
      setPosition({ left: (rect.left - box.left) / k + 'px', minWidth: rect.width / k + 'px', top: below + 3 + 'px' });
    } else if (pending.phase === 2) {
      pending.phase = 0;
      if (menu.current.offsetHeight > pending.room && pending.above > pending.room) {
        const top = pending.above - menu.current.offsetHeight - 3 + 'px';
        setPosition(current => ({ ...current, top }));
      }
    }
  }, [open, position, bridge]);
  function toggle() { if (open) { placement.current.phase = 0; setOpen(false); } else { placement.current.phase = 1; setOpen(true); } }
  function select(index: number) { placement.current.phase = 0; setOpen(false); bridge?.selectRecord(Number(index) || 0); }
  return { bridge, source, revision, open, position, button, menu, toggle, select };
}
