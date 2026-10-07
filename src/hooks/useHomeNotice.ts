import { useEffect, useRef, useState } from 'react';
interface Notice { chatKey: string; title: string; body: string; avatar: string; time: number }
interface Character { archiveId: string; name?: string; photoUrl?: string }
const KEY = 'qt_home_notice_v1', CHAR_KEY = 'smallphone_chat_characters_v1', UNREAD_KEY = 'smallphone_chat_unread_counts_v1';
function loadLast(): Notice | null { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
function loadCharacter(last: Notice | null): Character | null {
  if (!last?.chatKey) return null;
  try { const list: Character[] = JSON.parse(localStorage.getItem(CHAR_KEY) || '[]'); return Array.isArray(list) ? list.find(c => c && c.archiveId === last.chatKey) || null : null; } catch { return null; }
}
function unreadTotal() {
  try { const map: Record<string, unknown> = JSON.parse(localStorage.getItem(UNREAD_KEY) || '{}'); return Object.values(map || {}).reduce<number>((sum, n) => sum + (Number(n) || 0), 0); } catch { return 0; }
}
function ago(time: number) {
  const s = Math.max(0, (Date.now() - Number(time || 0)) / 1000);
  return s < 60 ? '刚刚' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd';
}
export function useHomeNotice() {
  const [last, setLast] = useState(loadLast);
  const lastRef = useRef(last);
  // 角色资料里有头像大图，只在换了一条消息时才读。
  const [character, setCharacter] = useState(() => loadCharacter(last));
  const [unread, setUnread] = useState(unreadTotal);
  const [time, setTime] = useState(() => last ? ago(last.time) : '');
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    function refreshText() { setUnread(unreadTotal()); setTime(lastRef.current ? ago(lastRef.current.time) : ''); }
    function reply(event: Event) {
      const d = (event as CustomEvent<Partial<Notice>>).detail || {};
      const next: Notice = { chatKey: String(d.chatKey || ''), title: String(d.title || ''), body: String(d.body || '').replace(/\s+/g, ' ').trim(), avatar: typeof d.avatar === 'string' && d.avatar.length < 2048 ? d.avatar : '', time: Date.now() };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 原存储回退。 */ }
      lastRef.current = next; setLast(next); setCharacter(loadCharacter(next)); setImageFailed(false); refreshText();
    }
    const visible = () => { if (!document.hidden) refreshText(); };
    window.addEventListener('smallphone:reply', reply);
    document.addEventListener('visibilitychange', visible);
    // 未读数和“几小时前”会变，隔几秒刷新文字，不重读头像。
    const timer = setInterval(visible, 5000);
    return () => { window.removeEventListener('smallphone:reply', reply); document.removeEventListener('visibilitychange', visible); clearInterval(timer); };
  }, []);
  const filled = Boolean(last && character);
  return { filled, unread, title: filled ? last?.title || String(character?.name || '') || '新消息' : '', body: filled ? last?.body || '收到一条新回复' : '暂时没有新消息 ♪', time: filled ? time : '', src: filled && !imageFailed ? last?.avatar || character?.photoUrl : '', failImage: () => setImageFailed(true), open: () => window.dispatchEvent(new CustomEvent('qingtuan:open-notice-chat', { detail: last?.chatKey })) };
}
