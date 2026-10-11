import { useCallback, useEffect, useRef, useState } from 'react';
export type NoticeTone = 'info' | 'warn';
interface Notice {
    id: number;
    text: string;
    tone: NoticeTone;
}
const LIFETIME = 3600, LIMIT = 3;
/** 小窝左下角的小通知，最多叠三条，几秒后自己淡掉。 */
export function useRoomNotices() {
    const [notices, setNotices] = useState<Notice[]>([]), timers = useRef(new Map<number, number>()), seq = useRef(0);
    const notify = useCallback((text: string, tone: NoticeTone = 'info') => {
        const clean = text.replace(/[。.]+$/u, '');
        if (!clean) return;
        const id = ++seq.current;
        setNotices(list => [...list, { id, text: clean, tone }].slice(-LIMIT));
        timers.current.set(id, window.setTimeout(() => { timers.current.delete(id); setNotices(list => list.filter(n => n.id !== id)); }, LIFETIME));
    }, []);
    useEffect(() => { const map = timers.current; return () => { map.forEach(timer => window.clearTimeout(timer)); map.clear(); }; }, []);
    return { notices, notify };
}
function NoticeIcon({ tone }: { tone: NoticeTone }) {
    const cells = tone === 'warn' ? ['0011100', '0110110', '0110110', '1110111', '1111111', '1110111', '0111110'] : ['0110110', '1111111', '1111111', '1111111', '0111110', '0011100', '0001000'];
    return <svg className="space-notice-icon" viewBox="0 0 7 7" aria-hidden="true" shapeRendering="crispEdges">{cells.flatMap((row, y) => [...row].map((cell, x) => cell === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null))}</svg>;
}
export function RoomNotices({ notices }: { notices: readonly Notice[] }) {
    return <ul className="space-notices" role="status" aria-live="polite">
   {notices.map(n => <li key={n.id} className="space-notice" data-tone={n.tone}><NoticeIcon tone={n.tone} /><span>{n.text}</span></li>)}
  </ul>;
}
