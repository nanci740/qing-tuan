import { useEffect, useRef } from 'react';

/** 主画面右上角的手机挂链：糖果星星、像素爱心、小翻盖机。平常微微地摆，点一下会晃，换页时轻轻摆一下。 */
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
  return <svg ref={ref} className="phone-charm" viewBox="0 0 70 232" aria-hidden="true">
    <path d="M52 0 C50 22 38 30 35 70" stroke="#ddd3ee" strokeWidth="2" fill="none" />
    <circle cx="35" cy="70" r="3.5" fill="none" stroke="#d8d0e8" strokeWidth="2" />
    {STARS.map((color, i) => <g key={color}>
      <polygon points={starPoints(35, 82 + i * 14, 7)} fill={color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="33" cy={80.5 + i * 14} r="1.2" fill="#fff" />
    </g>)}
    <g transform="translate(25 150)" shapeRendering="crispEdges">
      <path fill="#ff8fbd" d="M2 0h4v2h2V0h4v2h2v6h-2v2h-2v2h-2v2H8v2H6v-2H4v-2H2v-2H0V2h2z" />
      <path fill="#ffd0e3" d="M2 2h2v2H2z" />
    </g>
    <circle cx="35" cy="176" r="3.5" fill="#fff" stroke="#e1d8ef" />
    <g transform="translate(23 184)">
      <rect width="24" height="20" rx="4" fill="#d6e6ff" stroke="#fff" strokeWidth="1.4" />
      <rect x="4" y="3" width="16" height="11" rx="2" fill="#7fb4e8" />
      <text x="12" y="12" textAnchor="middle" fontSize="7" fill="#fff">♡</text>
      <rect y="21" width="24" height="22" rx="4" fill="#c9dcff" stroke="#fff" strokeWidth="1.4" />
      {[0, 1, 2].flatMap(r => [0, 1, 2].map(c => <rect key={r * 3 + c} x={5 + c * 5.5} y={25 + r * 5.5} width="3.5" height="3.5" rx="1" fill="#fff" />))}
    </g>
    <rect className="phone-charm-hit" x="20" y="64" width="30" height="168" onClick={event => { event.stopPropagation(); sway(true); }} />
  </svg>;
}
