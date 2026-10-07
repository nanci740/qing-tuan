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
              <span>
                {"Hi~"}
              </span>
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
