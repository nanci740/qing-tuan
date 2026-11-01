import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CharmArt } from '../../../components/shared/CharmArt';
import { PressedButton } from '../../../components/shared/PressedButton';
import { charmName, readCharms, setCharmHung, subscribeCharms } from '../../../utils/charmStorage';
import { readChatCharacters } from '../../../utils/chatCharacterStorage';
import { useHomeNotice } from '../../../hooks/useHomeNotice';

/** 主画面右上角的手机挂链：扣子扣在电池右边，接珍珠、糖果星星、像素爱心、小翻盖机。平常微微地摆，点一下会晃，换页时轻轻摆一下。
    有没看的消息时小翻盖机亮起来；他送的挂件从珍珠那里分出一小段线挂在左边，点了看是谁送的，可以摘下。 */
const STARS = ['#ffe08a', '#ffc4dc', '#c4dcff', '#d9f5c4', '#dccbff'];
function starPoints(x: number, y: number, r: number) {
  return Array.from({ length: 10 }, (_, k) => {
    const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .48 : r;
    return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
}
// 挂在最右边，往右没什么空间：往左甩得开，往右只回一点点，免得被画面边缘切掉。
const swing = (big: boolean) => {
  const a = big ? 12 : 6;
  return [0, a, -a * .35, a * .45, -a * .2, a * .1, 0].map(deg => ({ transform: `rotate(${deg}deg)` }));
};
// 他送的挂件挂在哪：从珍珠分出来，往左下排
const SPOTS = [[17, 80], [15, 107], [18, 134]] as const;
const SCALE = .95;
const giver = (key: string) => readChatCharacters().find(item => item.archiveId === key)?.name || '他';
const day = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}月${d.getDate()}日`; };

export function PhoneCharm({ page }: { page: number }) {
  const ref = useRef<SVGSVGElement>(null), first = useRef(true);
  const gifts = useSyncExternalStore(subscribeCharms, readCharms).filter(item => item.hung).slice(0, SPOTS.length);
  const unread = useHomeNotice().unread, [open, setOpen] = useState('');
  const shown = gifts.find(item => item.id === open), spot = shown ? SPOTS[gifts.indexOf(shown)] : null;
  function sway(big: boolean) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    ref.current?.animate?.(swing(big), { duration: big ? 1600 : 1100, easing: 'ease-out' });
  }
  useEffect(() => { if (first.current) { first.current = false; return; } sway(false); setOpen(''); }, [page]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!(event.target instanceof Element && event.target.closest('.phone-charm-tag, .phone-charm-gift'))) setOpen(''); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <>
  <svg ref={ref} className="phone-charm" viewBox="0 0 60 224" aria-hidden="true">
    <path className="phone-charm-clasp" d="M28.5 46 L28.5 27 C28.5 18.5 30.5 15.5 35 15.5 C39.5 15.5 41.5 18.5 41.5 27 L41.5 46 Z" fill="none" stroke="#f7a8c8" strokeWidth="3.6" strokeLinejoin="round" />
    <path d="M29.6 40 L29.6 27 C29.6 20.5 31 17.6 34 17" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".8" />
    <circle className="phone-charm-clasp" cx="35" cy="51.5" r="2.4" fill="none" stroke="#f7a8c8" strokeWidth="1.4" />
    {gifts.map((gift, i) => <path key={gift.id} d={`M32 64 C${SPOTS[i][0] + 8} ${64 + (SPOTS[i][1] - 64) * .3} ${SPOTS[i][0]} ${SPOTS[i][1] - 12} ${SPOTS[i][0]} ${SPOTS[i][1]}`} stroke="#e1d8ef" strokeWidth="1.1" fill="none" />)}
    <circle cx="35" cy="61" r="6" fill="#fdfbff" stroke="#e6def2" />
    <circle cx="33" cy="59" r="2" fill="#fff" />
    {STARS.map((color, i) => <g key={color}>
      <polygon points={starPoints(35, 76 + i * 14, 7)} fill={color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="33" cy={74.5 + i * 14} r="1.2" fill="#fff" />
    </g>)}
    <g transform="translate(25 144)" shapeRendering="crispEdges">
      <path fill="#ff8fbd" d="M2 0h4v2h2V0h4v2h2v6h-2v2h-2v2h-2v2H8v2H6v-2H4v-2H2v-2H0V2h2z" />
      <path fill="#ffd0e3" d="M2 2h2v2H2z" />
    </g>
    <circle cx="35" cy="170" r="3.5" fill="#fff" stroke="#e1d8ef" />
    <g transform="translate(23 178)" className={unread ? 'phone-charm-phone is-lit' : 'phone-charm-phone'}>
      {unread > 0 && <rect className="phone-charm-glow" x="-3" y="-3" width="30" height="26" rx="7" />}
      <rect width="24" height="20" rx="4" fill="#d6e6ff" stroke="#fff" strokeWidth="1.4" />
      <rect x="4" y="3" width="16" height="11" rx="2" fill={unread ? '#ff9cc4' : '#7fb4e8'} />
      <text x="12" y="12" textAnchor="middle" fontSize={unread ? 9 : 7} fill="#fff">♡</text>
      <rect y="21" width="24" height="22" rx="4" fill="#c9dcff" stroke="#fff" strokeWidth="1.4" />
      {[0, 1, 2].flatMap(r => [0, 1, 2].map(c => <rect key={r * 3 + c} x={5 + c * 5.5} y={25 + r * 5.5} width="3.5" height="3.5" rx="1" fill="#fff" />))}
      {unread > 0 && <><circle cx="23" cy="1" r="4.6" fill="#ff5f84" stroke="#fff" /><text x="23" y="3.3" textAnchor="middle" fontSize={unread > 9 ? 4.6 : 6} fontWeight="700" fill="#fff">{unread > 9 ? '9+' : unread}</text></>}
    </g>
    <rect className="phone-charm-hit" x="20" y="12" width="30" height="212" onClick={event => { event.stopPropagation(); sway(true); }} />
    {gifts.map((gift, i) => <g key={gift.id} className="phone-charm-gift" transform={`translate(${SPOTS[i][0]} ${SPOTS[i][1]}) scale(${SCALE})`} onClick={event => { event.stopPropagation(); sway(true); setOpen(open === gift.id ? '' : gift.id); }}>
      <CharmArt kind={gift.kind} />
      <rect x="-13" y="-2" width="26" height="30" fill="transparent" />
    </g>)}
  </svg>
  {shown && spot && <div className="phone-charm-tag" role="dialog" aria-label={charmName(shown.kind)} style={{ top: `${6 + spot[1] * .714}px` }}>
    <b>{charmName(shown.kind)}</b>
    <span>{giver(shown.from)} 送的</span>
    <small>{day(shown.at)}</small>
    <PressedButton type="button" className="phone-charm-tag-btn" onClick={() => { setCharmHung(shown.id, false); setOpen(''); }}>摘下</PressedButton>
  </div>}
  </>;
}
