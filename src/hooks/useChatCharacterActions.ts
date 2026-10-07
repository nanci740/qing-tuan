import { useLayoutEffect, useRef, useState } from 'react';
import { showToast } from '../utils/toast';
import type { ChatCharacterActionSelection, ChatCharacterActionsServices } from '../types/chatCharacterActions';
export function useChatCharacterActions() {
  const [services, setServices] = useState<ChatCharacterActionsServices | null>(null);
  const api = useRef<ChatCharacterActionsServices | null>(null);
  const overlay = useRef<HTMLDivElement>(null),
    sheet = useRef<HTMLDivElement>(null);
  const
    selectedId = useRef('');
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<ChatCharacterActionSelection>({
    id: '',
    name: '角色聊天',
    pinned: false,
    favorite: false
  });
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  function close() {
    selectedId.current = '';
    setOpen(false);
  }
  function toggle(field: 'pinned' | 'favorite') {
    const record = api.current?.read(selectedId.current);
    if (!record) {
      close();
      return;
    }
    const value = !record[field];
    api.current!.patch(selectedId.current, {
      [field]: value
    });
    close();
    showToast(field === 'pinned' ? value ? '已置顶聊天' : '已取消置顶' : value ? '已设为特别关注' : '已取消特别关注');
  }
  function remove() {
    const id = selectedId.current;
    close();
    void api.current?.remove(id);
  }
  useLayoutEffect(() => {
    const ready = (event: Event) => {
      api.current = (event as CustomEvent<ChatCharacterActionsServices>).detail;
      setServices(api.current);
    };
    const show = (event: Event) => {
      const record = (event as CustomEvent<ChatCharacterActionSelection>).detail;
      selectedId.current = record.id;
      setSelection(record);
      setRevision(current => current + 1);
      setOpen(true);
    };
    window.addEventListener('qingtuan:chat-character-actions-services', ready);
    window.addEventListener('qingtuan:chat-character-actions-open', show);
    return () => {
      window.removeEventListener('qingtuan:chat-character-actions-services', ready);
      window.removeEventListener('qingtuan:chat-character-actions-open', show);
    };
  }, []);
  useLayoutEffect(() => {
    if (!open || !overlay.current || !sheet.current) return;
    // 像微信那样：选单出现在手指按的位置；下面不够就往上开、靠右就往左开（小手机画面可能整体缩放，先换算回来）。
    const box = overlay.current.getBoundingClientRect();
    const k = box.width / (overlay.current.offsetWidth || box.width) || 1;
    const W = overlay.current.offsetWidth,
      H = overlay.current.offsetHeight;
    const px = Number.isFinite(selection.x) ? (selection.x! - box.left) / k : W / 2;
    const py = Number.isFinite(selection.y) ? (selection.y! - box.top) / k : H / 2;
    const w = sheet.current.offsetWidth,
      h = sheet.current.offsetHeight,
      gap = 8;
    const left = px + w + gap > W ? px - w : px;
    const top = py + h + gap > H ? py - h : py;
    setPosition({
      left: Math.max(gap, Math.min(left, W - w - gap)),
      top: Math.max(gap, Math.min(top, H - h - gap))
    });
  }, [open, revision, selection]);
  return {
    services,
    overlay,
    sheet,
    open,
    selection,
    position,
    close,
    toggle,
    remove
  };
}
