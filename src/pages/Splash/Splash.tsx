import { useEffect, useRef, useState } from 'react';
import { useBoot } from '../../providers/BootProvider';
import { BootScreen } from './BootScreen';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function Splash() {
  const boot = useBoot();
  const butterfly = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [halo, setHalo] = useState<{
    left: string;
    top: string;
  } | undefined>();
  useEffect(() => {
    if (!boot.ready || boot.fading) return;
    const resize = () => {
      if (!butterfly.current || !layer.current) return;
      const b = butterfly.current.getBoundingClientRect(),
        l = layer.current.getBoundingClientRect();
      setHalo({
        left: b.left - l.left + b.width / 2 + 'px',
        top: b.top - l.top + b.height / 2 + 'px'
      });
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [boot.ready, boot.fading]);
  return <div id="splash-screen" className={[boot.run ? 'boot-run' : '', boot.ready ? 'boot-ready' : '', boot.fading ? 'fade-out' : ''].filter(Boolean).join(' ') || undefined} style={boot.hidden ? {
    display: 'none'
  } : undefined} onClick={boot.reveal}>
      {"\n        "}
      <div className="content-wrapper splash-layout" id="splashContent">
        {"\n            "}
        <div className="splash-butterfly-layer" ref={layer} aria-hidden="true">
          {"\n                "}
          <div className="butterfly-landing-effects" id="butterflyLandingEffects" style={{
          "display": "none"
        }}>
            {"\n                    "}
            <div className="landing-halo-wave wave-1" style={halo} />
            {"\n                    "}
            <div className="landing-halo-wave wave-2" style={halo} />
            {"\n                "}
          </div>
          {"\n\n                "}
          <span className="splash-butterfly" id="splashButterfly" ref={butterfly} style={{
          "display": "none"
        }}>
            {"\n                    "}
            <svg viewBox="0 0 24 24" fill="none">
              {"\n                        "}
              <defs>
                {"\n                            "}
                <linearGradient id="butterflyGrad" x1="0" y1="0" x2="1" y2="1">
                  {"\n                                "}
                  <stop offset="0%" stopColor="var(--theme-color)" stopOpacity="1" />
                  {"\n                                "}
                  <stop offset="45%" stopColor="var(--theme-dark)" stopOpacity="0.95" />
                  {"\n                                "}
                  <stop offset="100%" stopColor="var(--theme-color)" stopOpacity="0.9" />
                  {"\n                            "}
                </linearGradient>
                {"\n                            "}
                <radialGradient id="wingShine" cx="45%" cy="30%" r="65%">
                  {"\n                                "}
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  {"\n                                "}
                  <stop offset="40%" stopColor="var(--theme-light-40)" stopOpacity="0.8" />
                  {"\n                                "}
                  <stop offset="100%" stopColor="var(--theme-color)" stopOpacity="0.35" />
                  {"\n                            "}
                </radialGradient>
                {"\n                        "}
              </defs>
              {"\n                        "}
              <g className="butterfly-wing-left">
                {"\n                            "}
                <path d="M12 12 C 8 7.5, 4.5 5.5, 2.5 7.8 C 1.2 9.2, 1.8 12.2, 4.8 13.2 C 7 13.9, 9.5 13.1, 12 12Z" fill="url(#wingShine)" stroke="url(#butterflyGrad)" strokeWidth="1.3" strokeLinejoin="round" />
                {"\n                            "}
                <path d="M12 12 C 7.8 14.5, 5.2 17, 5.8 19.5 C 6.4 21.8, 9.2 21.8, 11.2 20 C 12.3 18.9, 12.6 16.4, 12 12Z" fill="url(#wingShine)" stroke="url(#butterflyGrad)" strokeWidth="1.2" strokeLinejoin="round" />
                {"\n                        "}
              </g>
              {"\n                        "}
              <g className="butterfly-wing-right">
                {"\n                            "}
                <path d="M12 12 C 16 7.5, 19.5 5.5, 21.5 7.8 C 22.8 9.2, 22.2 12.2, 19.2 13.2 C 17 13.9, 14.5 13.1, 12 12Z" fill="url(#wingShine)" stroke="url(#butterflyGrad)" strokeWidth="1.3" strokeLinejoin="round" />
                {"\n                            "}
                <path d="M12 12 C 16.2 14.5, 18.8 17, 18.2 19.5 C 17.6 21.8, 14.8 21.8, 12.8 20 C 11.7 18.9, 11.4 16.4, 12 12Z" fill="url(#wingShine)" stroke="url(#butterflyGrad)" strokeWidth="1.2" strokeLinejoin="round" />
                {"\n                        "}
              </g>
              {"\n                        "}
              <path d="M12 10 C 12 12.5, 12 15, 12 16.5" stroke="var(--theme-dark)" strokeWidth="1.4" strokeLinecap="round" />
              {"\n                        "}
              <circle cx="12" cy="9.5" r="1.1" fill="var(--theme-dark)" />
              {"\n                        "}
              <path d="M11.6 8.8 C 10.3 7.3, 9.4 6.5, 7.8 5.4" stroke="var(--theme-dark)" strokeWidth="0.9" strokeLinecap="round" />
              {"\n                        "}
              <path d="M12.4 8.8 C 13.7 7.3, 14.6 6.5, 16.2 5.4" stroke="var(--theme-dark)" strokeWidth="0.9" strokeLinecap="round" />
              {"\n                    "}
            </svg>
            {"\n                "}
          </span>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="splash-icon-stage" aria-hidden="true">
          {"\n                "}
          <div className="splash-app-icon">
            {"\n                    "}
            <img className="splash-icon-image" src="data:image/webp;base64,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" alt="青团开屏插画" />
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="splash-text-block">
          {"\n                "}
          <h1 className="splash-title">
            <span className="char-qing">
              {"青"}
            </span>
            <span className="char-tuan">
              {"团"}
            </span>
            <span className="splash-brush" aria-hidden="true">
              <svg viewBox="0 0 120 18" preserveAspectRatio="none">
                <path d="M3 11.5 C 18 7.5, 38 6.2, 60 6.8 S 101 8.6, 117 7.2 C 118.6 8.8, 117.4 12.2, 114.5 12.8 C 96 14.4, 74 13.2, 52 13.9 S 16 15.6, 5 15.2 C 2.2 14.6, 1.8 12.6, 3 11.5 Z" style={{
                "fill": "var(--theme-color)",
                "opacity": "0.55"
              }} />
                <path d="M10 12.6 C 34 10.4, 70 10.2, 108 9.8" style={{
                "fill": "none",
                "stroke": "var(--splash-teal)",
                "strokeWidth": "0.8",
                "strokeLinecap": "round",
                "opacity": "0.35"
              }} />
              </svg>
            </span>
          </h1>
          {"\n                "}
          <div className="splash-subtitle">
            {"Amor fati"}
          </div>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n\n        "}
      <div className="splash-entry-tip">
        <span className="tip-line" />
        <span>
          {"Tap to begin"}
        </span>
        <span className="tip-line" />
      </div>
      {"\n    "}
    <BootScreen /></div>;
}
