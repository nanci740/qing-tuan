import { PressedButton } from './PressedButton';
import { useEffect } from 'react';
import { useSettingsNavigation } from '../../hooks/useSettingsNavigation';
import { QingtuanLogo } from './QingtuanLogo';
/** React 管理本页事件与状态；原 DOM 层级、选择器和样式保持不变。 */
export function AboutAppModal() {
  const { aboutOpen, closeAbout } = useSettingsNavigation();
  useEffect(() => {
    if (!aboutOpen) return;
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeAbout(); };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [aboutOpen, closeAbout]);
  return <div className={aboutOpen ? "theme-color-modal active" : "theme-color-modal"} id="aboutAppModal" aria-hidden={!aboutOpen}>
      {"\n        "}
      <div className="theme-color-modal-backdrop" id="aboutAppModalBackdrop" onClick={closeAbout} />
      {"\n        "}
      <div className="theme-color-modal-card about-modal-card" role="dialog" aria-modal="true" aria-label="青团机应用信息">
        {"\n            "}
        <div className="about-win-header">
          {"\n                "}
          <span>
            {"about.exe"}
          </span>
          {"\n                "}
          <PressedButton className="about-win-close" id="aboutAppModalClose" onClick={closeAbout} type="button" aria-label="关闭应用信息">
            <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
            </svg>
          </PressedButton>
          {"\n            "}
        </div>
        {"\n            "}
        <div className="about-app-content">
          {"\n                "}
          <div className="about-app-top">
            {"\n                    "}
            <div className="about-app-logo" id="aboutAppLogo"><QingtuanLogo /></div>
            {"\n                    "}
            <div className="about-app-meta">
              {"\n                        "}
              <div className="about-app-name">
                {"青团机"}
              </div>
              {"\n                        "}
              <div className="about-app-version">
                {"版本 v0.1.0"}
              </div>
              {"\n                        "}
              <div className="about-app-description">
                {"把想念，装进小小的屏幕里。"}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <span className="about-sticker" aria-hidden="true">
              <svg viewBox="0 0 60 60">
                <polygon className="about-sticker-edge" points="30.00,0.00 36.21,6.82 45.00,4.02 46.97,13.03 55.98,15.00 53.18,23.79 60.00,30.00 53.18,36.21 55.98,45.00 46.97,46.97 45.00,55.98 36.21,53.18 30.00,60.00 23.79,53.18 15.00,55.98 13.03,46.97 4.02,45.00 6.82,36.21 0.00,30.00 6.82,23.79 4.02,15.00 13.03,13.03 15.00,4.02 23.79,6.82" />
                <polygon className="about-sticker-face" points="30.00,3.50 35.38,9.91 43.25,7.05 44.71,15.29 52.95,16.75 50.09,24.62 56.50,30.00 50.09,35.38 52.95,43.25 44.71,44.71 43.25,52.95 35.38,50.09 30.00,56.50 24.62,50.09 16.75,52.95 15.29,44.71 7.05,43.25 9.91,35.38 3.50,30.00 9.91,24.62 7.05,16.75 15.29,15.29 16.75,7.05 24.62,9.91" />
                <text x="30" y="35" textAnchor="middle">{"Hi~"}</text>
                <path className="about-sticker-spark is-back" d="M51 5.8 C51.63 9.37 51.63 9.37 55.2 10 C51.63 10.63 51.63 10.63 51 14.2 C50.37 10.63 50.37 10.63 46.8 10 C50.37 9.37 50.37 9.37 51 5.8Z" />
                <path className="about-sticker-spark" d="M51 7 C51.45 9.55 51.45 9.55 54 10 C51.45 10.45 51.45 10.45 51 13 C50.55 10.45 50.55 10.45 48 10 C50.55 9.55 50.55 9.55 51 7Z" />
              </svg>
            </span>
            {"\n                "}
          </div>
          {"\n                "}
          <fieldset className="about-disclaimer">
            {"\n                    "}
            <legend className="about-disclaimer-title">
              {"免责声明"}
            </legend>
            {"\n                    "}
            <div className="about-disclaimer-body">
              {"\n                        "}
              <p>
                {"青团机仅供个人、非商业用途使用。未经允许，不得用于商业经营、收费分发、二次出售或冒充原创。"}
              </p>
              {"\n                        "}
              <p>
                {"应用内的文字、语音及图片内容由所接入的第三方模型生成，不代表本人立场。使用者应遵守相关服务条款，并自行确认输入及生成内容不存在侵权问题。"}
              </p>
              {"\n                        "}
              <p>
                {"请妥善保管个人 API Key，不要向他人泄露。因第三方服务变动、接口异常或不当使用产生的问题，本人不承担相关责任。"}
              </p>
              {"\n                    "}
            </div>
            {"\n                "}
          </fieldset>
          {"\n                "}
          <div className="about-app-footer">
            {"\n                    "}
            <div className="about-copyright">
              {"© 青团机 · 禁止商用及未经许可的转载分发"}
            </div>
            {"\n                    "}
            <PressedButton className="about-ok-btn" id="aboutAppModalOk" onClick={closeAbout} type="button">
              <span>
                {"确定"}
              </span>
            </PressedButton>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
