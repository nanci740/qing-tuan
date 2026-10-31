import { useEffect, useRef } from 'react';

/** 主画面右上角的手机挂链：扣子扣在电池右边，接珍珠、糖果星星、像素爱心、小翻盖机。平常微微地摆，点一下会晃，换页时轻轻摆一下。 */
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

export function PhoneCharm({ page }: { page: number }) {
  const ref = useRef<SVGSVGElement>(null), first = useRef(true);
  function sway(big: boolean) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    ref.current?.animate?.(swing(big), { duration: big ? 1600 : 1100, easing: 'ease-out' });
  }
  useEffect(() => { if (first.current) { first.current = false; return; } sway(false); }, [page]);
  return <svg ref={ref} className="phone-charm" viewBox="10 0 50 224" aria-hidden="true">
    <path className="phone-charm-clasp" d="M28.5 46 L28.5 27 C28.5 18.5 30.5 15.5 35 15.5 C39.5 15.5 41.5 18.5 41.5 27 L41.5 46 Z" fill="none" stroke="#f7a8c8" strokeWidth="3.6" strokeLinejoin="round" />
    <path d="M29.6 40 L29.6 27 C29.6 20.5 31 17.6 34 17" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".8" />
    <circle className="phone-charm-clasp" cx="35" cy="51.5" r="2.4" fill="none" stroke="#f7a8c8" strokeWidth="1.4" />
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
    <g transform="translate(23 178)">
      <rect width="24" height="20" rx="4" fill="#d6e6ff" stroke="#fff" strokeWidth="1.4" />
      <rect x="4" y="3" width="16" height="11" rx="2" fill="#7fb4e8" />
      <text x="12" y="12" textAnchor="middle" fontSize="7" fill="#fff">♡</text>
      <rect y="21" width="24" height="22" rx="4" fill="#c9dcff" stroke="#fff" strokeWidth="1.4" />
      {[0, 1, 2].flatMap(r => [0, 1, 2].map(c => <rect key={r * 3 + c} x={5 + c * 5.5} y={25 + r * 5.5} width="3.5" height="3.5" rx="1" fill="#fff" />))}
    </g>
    <rect className="phone-charm-hit" x="20" y="12" width="30" height="212" onClick={event => { event.stopPropagation(); sway(true); }} />
  </svg>;
}
