import { useEffect, useRef, useState } from 'react';
import { PressedButton } from '../../components/shared/PressedButton';
import { localLedgerDate } from '../../utils/ledgerMath.ts';
import { LedgerToolIcon } from './LedgerIcon';

/** 记账自己的日期、月份小窗，跟确认弹窗同一种窗口，不用系统的选择器。 */
export function LedgerPicker({ mode, value, onPick, onClose }: { mode: 'date' | 'month'; value: string; onPick: (value: string) => void; onClose: () => void }) {
  const [year, setYear] = useState(() => Number(value.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(value.slice(5, 7)));
  const panel = useRef<HTMLDivElement>(null);
  const today = localLedgerDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  useEffect(() => {
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>('.ledger-picker-cell[aria-pressed="true"], .ledger-picker-cell')?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  function shift(delta: number) {
    if (mode === 'month') { setYear(y => Math.min(9999, Math.max(1900, y + delta))); return; }
    const next = new Date(year, month - 1 + delta, 1);
    if (next.getFullYear() < 1900 || next.getFullYear() > 9999) return;
    setYear(next.getFullYear()); setMonth(next.getMonth() + 1);
  }
  const lead = new Date(year, month - 1, 1).getDay(), count = new Date(year, month, 0).getDate();

  return <div className="ledger-picker-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="ledger-picker" ref={panel} role="dialog" aria-modal="true" aria-labelledby="ledgerPickerTitle">
      <div className="ledger-picker-bar">
        <span id="ledgerPickerTitle">{mode === 'date' ? '选择日期' : '选择月份'}</span>
        <PressedButton className="ledger-picker-close" type="button" aria-label="关闭" onClick={onClose}><LedgerToolIcon name="close" /></PressedButton>
      </div>
      <div className="ledger-picker-nav">
        <PressedButton className="ledger-small-button" type="button" aria-label={mode === 'date' ? '上个月' : '上一年'} onClick={() => shift(-1)}><LedgerToolIcon name="previous" /></PressedButton>
        <strong aria-live="polite">{mode === 'date' ? `${year}年${month}月` : `${year}年`}</strong>
        <PressedButton className="ledger-small-button" type="button" aria-label={mode === 'date' ? '下个月' : '下一年'} onClick={() => shift(1)}><LedgerToolIcon name="next" /></PressedButton>
      </div>
      {mode === 'date' ? <>
        <div className="ledger-picker-week" aria-hidden="true">{['日', '一', '二', '三', '四', '五', '六'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="ledger-picker-grid ledger-picker-days">
          {Array.from({ length: lead }, (_, i) => <span key={`blank-${i}`} />)}
          {Array.from({ length: count }, (_, i) => {
            const date = `${year}-${pad(month)}-${pad(i + 1)}`;
            return <PressedButton key={date} className="ledger-picker-cell" type="button" aria-pressed={date === value} aria-current={date === today ? 'date' : undefined} aria-label={`${year}年${month}月${i + 1}日`} onClick={() => onPick(date)}>{i + 1}</PressedButton>;
          })}
        </div>
      </> : <div className="ledger-picker-grid ledger-picker-months">
        {Array.from({ length: 12 }, (_, i) => {
          const monthValue = `${year}-${pad(i + 1)}`;
          return <PressedButton key={monthValue} className="ledger-picker-cell" type="button" aria-pressed={monthValue === value} aria-current={monthValue === today.slice(0, 7) ? 'date' : undefined} onClick={() => onPick(monthValue)}>{i + 1}月</PressedButton>;
        })}
      </div>}
      <div className="ledger-picker-actions">
        <PressedButton className="ledger-button" type="button" onClick={() => onPick(mode === 'date' ? today : today.slice(0, 7))}>{mode === 'date' ? '今天' : '本月'}</PressedButton>
      </div>
    </div>
  </div>;
}
