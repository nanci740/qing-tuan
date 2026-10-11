import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
export interface DialogueLine {
    text: string;
    speaker?: string;
}
const TYPE_DELAY = 70;
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** 小窝底部的古早游戏对话框：逐字打出来，点一下补完整句，再点换下一句，最后一句点完就关。 */
export function RoomDialogue({ lines, onClose }: {
    lines: readonly DialogueLine[];
    onClose: () => void;
}) {
    const [index, setIndex] = useState(0), [count, setCount] = useState(() => reduceMotion() ? Infinity : 0);
    const line = lines[index], chars = Array.from(line?.text ?? ''), done = count >= chars.length;
    useEffect(() => { if (done) return; const timer = window.setTimeout(() => setCount(n => n + 1), TYPE_DELAY); return () => window.clearTimeout(timer); }, [count, done]);
    useEffect(() => { if (!line) onClose(); }, [line, onClose]);
    if (!line) return null;
    function advance() {
        if (!done) { setCount(Infinity); return; }
        if (index + 1 >= lines.length) { onClose(); return; }
        setIndex(index + 1);
        setCount(reduceMotion() ? Infinity : 0);
    }
    function key(event: KeyboardEvent) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        advance();
    }
    return <div className="space-dialogue" role="dialog" aria-label={line.speaker ? `${line.speaker}的对话` : '对话'} tabIndex={0} onClick={advance} onKeyDown={key}>
   {line.speaker && <span className="space-dialogue-name">{line.speaker}</span>}
   <div className="space-dialogue-frame">
    <p className="space-dialogue-text" aria-hidden="true">{chars.slice(0, count).join('')}</p>
    <p className="space-dialogue-sr" aria-live="polite">{done ? line.text : ''}</p>
    {done && <span className="space-dialogue-next" aria-hidden="true">▼</span>}
   </div>
  </div>;
}
