import splashIcon from '../../assets/qingtuan-splash.webp';
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
            <img className="splash-icon-image" src={splashIcon} alt="青团开屏插画" />
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
