import { PressedButton } from '../../../components/shared/PressedButton';
import type { CSSProperties } from 'react';
import { useAppearance } from '../../../providers/AppearanceProvider';
import { hsvToHex } from '../../../utils/appearanceColors';
import { showToast } from '../../../utils/toast';
import { ImageStorageSettings } from './components/ImageStorageSettings';
import { IconEditor } from './components/IconEditor';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function Appearance() {
  const appearance = useAppearance();
  return <div id="themeSettingsPage" style={{
    "zIndex": "2050"
  }} className={`settings-page${appearance.pageOpen ? ' active' : ''}`} ref={appearance.pageRef}>
      {"\n        "}
      <div className="settings-header">
        {"\n            "}
        <div style={{
        "display": "flex",
        "alignItems": "center",
        "gap": "8px"
      }}>
          {"\n                "}
          <PressedButton className="back-btn" id="themeBackBtn" type="button" aria-label="返回设置" data-title="返回设置" onClick={event => {
          event.stopPropagation();
          appearance.closePage();
        }}>
            {"\n                    "}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {"\n                        "}
              <polyline points="15 18 9 12 15 6" />
              {"\n                    "}
            </svg>
            {"\n                "}
          </PressedButton>
          {"\n                "}
          <h2>
            {"美化设置"}
          </h2>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n        "}
      <div className="retro-address-bar" aria-hidden="true">
        {"\n            "}
        <span className="retro-address-label">
          {"地址"}
        </span>
        {"\n            "}
        <span className="retro-address-field">
          <span className="retro-address-icon" />
          {"C:\\青团\\设置\\美化设置\\"}
        </span>
        {"\n        "}
      </div>
      {"\n\n        "}
      <div className="theme-settings-content">
        {"\n            "}
        <section className="theme-setting-group">
          {"\n                "}
          <div className="theme-setting-label">
            {"界面配色"}
          </div>
          {"\n                "}
          <div className="theme-setting-card">
            {"\n                    "}
            <div className="theme-color-current">
              {"\n                        "}
              <div className="theme-color-copy">
                {"\n                            "}
                <strong>
                  {"主题颜色"}
                </strong>
                {"\n                            "}
                <span id="themeColorValue">{appearance.color}</span>
                {"\n                        "}
              </div>
              {"\n                        "}
              <PressedButton className="theme-color-picker-wrap" id="themeColorPickerWrap" type="button" data-title="打开自定义调色盘" aria-label="打开自定义调色盘" onClick={appearance.openModal} />
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="theme-palette-group">
              {"\n                        "}
              <div className="theme-palette-caption">
                {"柔和色系"}
              </div>
              {"\n                        "}
              <div className="theme-swatches" aria-label="柔和主题色">
                {"\n                            "}
                <PressedButton type="button" data-color="#B5D9DC" aria-label="柔青色" data-qt-token="inline-000" className={'theme-swatch' + (appearance.color === '#B5D9DC' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#B5D9DC')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#EBC0CA" aria-label="柔粉色" data-qt-token="inline-001" className={'theme-swatch' + (appearance.color === '#EBC0CA' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#EBC0CA')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#CAC1E1" aria-label="浅紫色" data-qt-token="inline-002" className={'theme-swatch' + (appearance.color === '#CAC1E1' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#CAC1E1')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#BED6C2" aria-label="鼠尾草绿" data-qt-token="inline-003" className={'theme-swatch' + (appearance.color === '#BED6C2' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#BED6C2')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#E5D1AF" aria-label="柔金色" data-qt-token="inline-004" className={'theme-swatch' + (appearance.color === '#E5D1AF' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#E5D1AF')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#86AEB9" aria-label="雾蓝色" data-qt-token="inline-005" className={'theme-swatch' + (appearance.color === '#86AEB9' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#86AEB9')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#D7A6C1" aria-label="灰莓粉" data-qt-token="inline-006" className={'theme-swatch' + (appearance.color === '#D7A6C1' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#D7A6C1')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#AEBBD1" aria-label="云灰蓝" data-qt-token="inline-007" className={'theme-swatch' + (appearance.color === '#AEBBD1' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#AEBBD1')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#AEC394" aria-label="抹茶灰绿" data-qt-token="inline-008" className={'theme-swatch' + (appearance.color === '#AEC394' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#AEC394')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#C89F68" aria-label="燕麦棕" data-qt-token="inline-009" className={'theme-swatch' + (appearance.color === '#C89F68' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#C89F68')) showToast('主题颜色已保存');
              }} />
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="theme-palette-group theme-palette-group-light">
              {"\n                        "}
              <div className="theme-palette-caption">
                {"浅色系"}
              </div>
              {"\n                        "}
              <div className="theme-swatches" aria-label="浅色主题色">
                {"\n                            "}
                <PressedButton type="button" data-color="#CDE7EC" aria-label="浅雾青" data-qt-token="inline-010" className={'theme-swatch' + (appearance.color === '#CDE7EC' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#CDE7EC')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#F2CBD5" aria-label="樱花浅粉" data-qt-token="inline-011" className={'theme-swatch' + (appearance.color === '#F2CBD5' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#F2CBD5')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#DED5F1" aria-label="奶油浅紫" data-qt-token="inline-012" className={'theme-swatch' + (appearance.color === '#DED5F1' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#DED5F1')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#D7E7D2" aria-label="浅芽绿" data-qt-token="inline-013" className={'theme-swatch' + (appearance.color === '#D7E7D2' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#D7E7D2')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#F0DFC3" aria-label="奶油浅杏" data-qt-token="inline-014" className={'theme-swatch' + (appearance.color === '#F0DFC3' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#F0DFC3')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#DDF2F4" aria-label="淡青色" data-qt-token="inline-015" className={'theme-swatch' + (appearance.color === '#DDF2F4' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#DDF2F4')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#F3DCE5" aria-label="浅玫瑰" data-qt-token="inline-016" className={'theme-swatch' + (appearance.color === '#F3DCE5' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#F3DCE5')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#E9E1F4" aria-label="浅薰衣草" data-qt-token="inline-017" className={'theme-swatch' + (appearance.color === '#E9E1F4' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#E9E1F4')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#DFEAD8" aria-label="浅鼠尾草" data-qt-token="inline-018" className={'theme-swatch' + (appearance.color === '#DFEAD8' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#DFEAD8')) showToast('主题颜色已保存');
              }} />
                {"\n                            "}
                <PressedButton type="button" data-color="#F2E8D8" aria-label="浅燕麦" data-qt-token="inline-019" className={'theme-swatch' + (appearance.color === '#F2E8D8' ? ' active' : '')} onClick={() => {
                if (appearance.applyColor('#F2E8D8')) showToast('主题颜色已保存');
              }} />
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="theme-custom-color-panel">
              {"\n                        "}
              <div className="theme-custom-color-title">
                {"自定义颜色"}
              </div>
              {"\n                        "}
              <div className="theme-custom-color-row">
                {"\n                            "}
                <PressedButton className="theme-custom-picker-btn" id="themeCustomPickerBtn" type="button" data-title="打开自定义调色盘" aria-label="打开自定义调色盘" onClick={appearance.openModal} />
                {"\n                            "}
                <input className="theme-custom-color-input" id="themeHexInput" type="text" inputMode="text" maxLength={7} placeholder="#C7DCE3" aria-label="输入自定义主题颜色" value={appearance.hex} onChange={event => appearance.setHex(event.currentTarget.value)} onBlur={() => {
                if (!appearance.hex.trim()) appearance.setHex(appearance.color);
              }} onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  appearance.applyHex();
                }
              }} />
                {"\n                            "}
                <PressedButton className="theme-custom-color-btn ui-cyan-btn" id="applyThemeHexBtn" type="button" onClick={appearance.applyHex}>
                  {"套用"}
                </PressedButton>
                {"\n                        "}
              </div>
              {"\n                        "}
              <span className="theme-custom-color-hint">
                {"可以输入 HEX，也可以点左边色块打开调色盘选择。"}
              </span>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <PressedButton className="theme-reset-btn" id="resetThemeColor" type="button" onClick={() => {
            if (appearance.applyColor('#DDF2F4')) showToast('已恢复默认青色');
          }}>
              {"恢复默认青色"}
            </PressedButton>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n\n\n            "}
        <section className="theme-setting-group">
          {"\n                "}
          <div className="theme-setting-label">
            {"界面质感"}
          </div>
          {"\n                "}
          <div className="theme-setting-card">
            {"\n                    "}
            <div className="theme-option-title">
              {"\n                        "}
              <span>
                {"玻璃感强度"}
              </span>
              {"\n                        "}
              <span className="theme-option-value" id="glassStrengthValue">{`${Math.round(appearance.glass)}%`}</span>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="theme-glass-row">
              {"\n                        "}
              <input className="theme-glass-range" id="glassStrengthRange" type="range" min="0" max="100" aria-label="玻璃感强度" value={appearance.glass} onChange={event => appearance.setGlass(Number(event.currentTarget.value))} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <span className="theme-setting-note">
              {"调整主画面电子宠物果冻壳的透明度、颜色深浅和模糊：往左越清透，往右越像磨砂彩色果冻。"}
            </span>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="theme-setting-group">
          {"\n                "}
          <div className="theme-setting-label">
            {"开屏设置"}
          </div>
          {"\n                "}
          <div className="theme-setting-card">
            {"\n                    "}
            <div className="theme-option-title">
              {"\n                        "}
              <span>
                {"开屏显示"}
              </span>
              {"\n                        "}
              <span className="theme-option-value" id="splashModeValue">{({
                always: '每次显示',
                daily: '每天一次',
                off: '不显示'
              } as Record<string, string>)[appearance.splash]}</span>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="theme-segmented" id="splashModeSegmented" aria-label="开屏显示方式">
              {"\n                        "}
              <PressedButton type="button" data-splash-mode="always" className={'theme-segment-btn' + (appearance.splash === 'always' ? ' active' : '')} onClick={() => appearance.setSplash('always')}>
                {"每次显示"}
              </PressedButton>
              {"\n                        "}
              <PressedButton type="button" data-splash-mode="daily" className={'theme-segment-btn' + (appearance.splash === 'daily' ? ' active' : '')} onClick={() => appearance.setSplash('daily')}>
                {"每天一次"}
              </PressedButton>
              {"\n                        "}
              <PressedButton type="button" data-splash-mode="off" className={'theme-segment-btn' + (appearance.splash === 'off' ? ' active' : '')} onClick={() => appearance.setSplash('off')}>
                {"不显示"}
              </PressedButton>
              {"\n                    "}
            </div>
            {"\n                    "}
            <span className="theme-setting-note">
              {"“每天一次”只会在当天第一次打开时播放开屏。"}
            </span>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="theme-setting-group">
          {"\n                "}
          <div className="theme-setting-label">
            {"字体样式"}
          </div>
          {"\n                "}
          <div className="theme-setting-card">
            {"\n                    "}
            <div className="theme-font-current">
              {"\n                        "}
              <div className="theme-font-current-copy">
                {"\n                            "}
                <strong id="customFontName">{appearance.font.name}</strong>
                {"\n                            "}
                <span id="customFontSource">{appearance.font.source}</span>
                {"\n                        "}
              </div>
              {"\n                        "}
              <span className="theme-font-badge" id="customFontBadge">{appearance.font.badge}</span>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="theme-font-actions">
              {"\n                        "}
              <PressedButton className="theme-font-btn ui-cyan-btn" id="chooseFontFileBtn" type="button" onClick={() => {
              if (appearance.fontInput.current) {
                appearance.fontInput.current.value = '';
                appearance.fontInput.current.click();
              }
            }}>
                {"导入字体文件"}
              </PressedButton>
              {"\n                        "}
              <PressedButton className="theme-font-btn secondary" id="resetCustomFontBtn" type="button" onClick={appearance.resetFont}>
                {"恢复默认字体"}
              </PressedButton>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="theme-font-url-row">
              {"\n                        "}
              <input className="theme-font-url-input" id="customFontUrlInput" type="url" inputMode="url" placeholder="粘贴字体直链，例如 Catbox 的 .ttf / .woff2 链接" aria-label="字体文件链接" value={appearance.fontUrl} onChange={event => appearance.setFontUrl(event.currentTarget.value)} onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void appearance.applyFontUrl();
              }
            }} />
              {"\n                        "}
              <PressedButton className="theme-font-url-btn ui-cyan-btn" id="applyCustomFontUrlBtn" type="button" onClick={appearance.applyFontUrl}>
                {"载入"}
              </PressedButton>
              {"\n                    "}
            </div>
            {"\n                    "}
            <span className="theme-font-hint">
              {"支持 TTF、OTF、WOFF、WOFF2。链接需要是字体文件直链；Catbox等生成的链接可粘贴载入。"}
            </span>
            {"\n                    "}
            <div id="fontImportStatus" aria-live="polite" />
            {"\n                    "}
            <input id="customFontFileInput" type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/font-woff,application/font-sfnt" hidden ref={appearance.fontInput} onChange={appearance.onFont} />
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="theme-setting-group">
          {"\n                "}
          <div className="theme-setting-label">
            {"主画面文字"}
          </div>
          {"\n                "}
          <div className="theme-setting-card">
            {"\n                    "}
            <div className="theme-text-list">
              {"\n                        "}
              <label className="theme-text-row">
                <span className="theme-text-name">
                  {"左侧气泡"}
                </span>
                <input className="theme-text-input" id="editStarBubble" type="text" spellCheck="false" value={appearance.texts.starBubbleText} onChange={event => { const value=event.currentTarget.value; appearance.setTexts(values => ({
                ...values,
                starBubbleText: value
              })); }} />
              </label>
              {"\n                        "}
              <label className="theme-text-row">
                <span className="theme-text-name">
                  {"右侧气泡"}
                </span>
                <input className="theme-text-input" id="editMoonBubble" type="text" spellCheck="false" value={appearance.texts.moonBubbleText} onChange={event => { const value=event.currentTarget.value; appearance.setTexts(values => ({
                ...values,
                moonBubbleText: value
              })); }} />
              </label>
              {"\n                        "}
              <label className="theme-text-row">
                <span className="theme-text-name">
                  {"主画面小标题"}
                </span>
                <input className="theme-text-input" id="editMainSubtitle" type="text" spellCheck="false" value={appearance.texts.mainSubtitle} onChange={event => { const value=event.currentTarget.value; appearance.setTexts(values => ({
                ...values,
                mainSubtitle: value
              })); }} />
              </label>
              {"\n                        "}
              <label className="theme-text-row">
                <span className="theme-text-name">
                  {"播放器标题"}
                </span>
                <input className="theme-text-input" id="editSongTitle" type="text" spellCheck="false" value={appearance.texts.songTitle} onChange={event => { const value=event.currentTarget.value; appearance.setTexts(values => ({
                ...values,
                songTitle: value
              })); }} />
              </label>
              {"\n                        "}
              <label className="theme-text-row">
                <span className="theme-text-name">
                  {"播放器装饰"}
                </span>
                <input className="theme-text-input" id="editSongDetails" type="text" spellCheck="false" value={appearance.texts.songDetails} onChange={event => { const value=event.currentTarget.value; appearance.setTexts(values => ({
                ...values,
                songDetails: value
              })); }} />
              </label>
              {"\n                        "}
              <label className="theme-text-row">
                <span className="theme-text-name">
                  {"MP3 机身刻字"}
                </span>
                <input className="theme-text-input" id="editMp3Brand" type="text" spellCheck="false" value={appearance.texts.mp3Brand} onChange={event => { const value=event.currentTarget.value; appearance.setTexts(values => ({
                ...values,
                mp3Brand: value
              })); }} />
              </label>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="theme-text-actions">
              {"\n                        "}
              <PressedButton className="theme-text-btn" id="resetMainTextsBtn" type="button" onClick={appearance.resetTexts}>
                {"恢复默认"}
              </PressedButton>
              {"\n                        "}
              <PressedButton className="theme-text-btn primary ui-cyan-btn" id="saveMainTextsBtn" type="button" onClick={() => appearance.saveTexts()}>
                {"保存文字"}
              </PressedButton>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="theme-setting-group">
          {"\n                "}
          <div className="theme-setting-label">
            {"主画面背景"}
          </div>
          {"\n                "}
          <div className="theme-setting-card">
            {"\n                    "}
            <div className="theme-wallpaper-preview" id="themeWallpaperPreview" style={{
            backgroundImage: appearance.wallpaperLayers
          }}>
              {"\n                        "}
              <span id="themeWallpaperPreviewText" style={{
              display: appearance.wallpaper ? 'none' : ''
            }}>
                {"默认灰白背景"}
              </span>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="theme-wallpaper-actions">
              {"\n                        "}
              <PressedButton className="theme-action-btn ui-cyan-btn" id="chooseWallpaperBtn" type="button" onClick={() => appearance.wallpaperInput.current?.click()}>
                {"选择图片"}
              </PressedButton>
              {"\n                        "}
              <PressedButton className="theme-action-btn secondary" id="removeWallpaperBtn" type="button" onClick={appearance.removeWallpaper}>
                {"恢复默认"}
              </PressedButton>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="theme-range-row">
              {"\n                        "}
              <label htmlFor="wallpaperOpacity">
                {"图片透明度"}
              </label>
              {"\n                        "}
              <input id="wallpaperOpacity" type="range" min="20" max="100" value={appearance.opacity} onChange={event => appearance.setOpacity(Number(event.currentTarget.value))} style={{
              '--wallpaper-fill': `${(appearance.opacity - 20) / 80 * 100}%`
            } as CSSProperties} />
              {"\n                        "}
              <span id="wallpaperOpacityValue">{`${appearance.opacity}%`}</span>
              {"\n                    "}
            </div>
            {"\n                    "}
            <span className="theme-setting-note">
              {"背景图片只应用在主画面，设置页与个人信息页保持灰白色。"}
            </span>
            {"\n\n                    "}
            <div id="themeColorModal" className={`theme-color-modal${appearance.modalOpen ? ' active' : ''}`} aria-hidden={!appearance.modalOpen} ref={appearance.modalRef}>
              {"\n                        "}
              <div className="theme-color-modal-backdrop" id="themeColorModalBackdrop" onClick={() => appearance.closeModal()} />
              {"\n                        "}
              <div className="theme-color-modal-card" role="dialog" aria-modal="true" aria-label="自定义颜色调色盘">
                {"\n                            "}
                <div className="theme-color-modal-header">
                  {"\n                                "}
                  <div className="theme-color-modal-title">
                    {"调色板.exe"}
                  </div>
                  {"\n                                "}
                  <PressedButton className="theme-color-modal-close" id="closeThemeColorModal" type="button" aria-label="关闭调色盘" onClick={() => appearance.closeModal()}>
                    {"×"}
                  </PressedButton>
                  {"\n                            "}
                </div>
                {"\n\n                            "}
                <div className="theme-color-modal-preview-wrap">
                  {"\n                                "}
                  <div className="theme-color-modal-swatch">
                    {"\n                                    "}
                    <div className="theme-color-modal-split">
                      {"\n                                        "}
                      <div className="theme-color-modal-old" id="themeColorModalOld" style={appearance.modalReady ? {
                      background: appearance.previous
                    } : undefined} />
                      {"\n                                        "}
                      <div className="theme-color-modal-preview" id="themeColorModalPreview" style={appearance.modalReady ? {
                      background: appearance.draftColor
                    } : undefined} />
                      {"\n                                    "}
                    </div>
                    {"\n                                    "}
                    <div className="theme-color-modal-split-caption">
                      <span>
                        {"原来"}
                      </span>
                      <span>
                        {"新的"}
                      </span>
                    </div>
                    {"\n                                "}
                  </div>
                  {"\n                                "}
                  <div className="theme-color-modal-copy">
                    {"\n                                    "}
                    <strong id="themeColorModalHex">{appearance.modalReady ? appearance.draftColor : '#DDF2F4'}</strong>
                    {"\n                                    "}
                    <span>
                      {"可以拖动色相、饱和度、亮度，也可以输入 HEX。"}
                    </span>
                    {"\n                                "}
                  </div>
                  {"\n                            "}
                </div>
                {"\n\n                            "}
                <div className="theme-color-slider-group">
                  {"\n                                "}
                  <div className="theme-color-slider-label">
                    <span>
                      {"色相"}
                    </span>
                    <span id="themeHueValue">{`${appearance.hsv[0]}°`}</span>
                  </div>
                  {"\n                                "}
                  <input className="theme-color-range" id="themeHueRange" type="range" min="0" max="360" value={appearance.hsv[0]} onChange={event => appearance.setRange(0, Number(event.currentTarget.value))} style={appearance.modalReady ? {
                  background: 'linear-gradient(to right, #FF6B6B 0%, #F7B267 16%, #F7E967 33%, #7BD88F 50%, #67B7F7 66%, #9D7BF7 83%, #FF6BCE 100%)'
                } : undefined} />
                  {"\n                            "}
                </div>
                {"\n\n                            "}
                <div className="theme-color-slider-group">
                  {"\n                                "}
                  <div className="theme-color-slider-label">
                    <span>
                      {"饱和度"}
                    </span>
                    <span id="themeSaturationValue">{`${appearance.hsv[1]}%`}</span>
                  </div>
                  {"\n                                "}
                  <input className="theme-color-range" id="themeSaturationRange" type="range" min="0" max="100" value={appearance.hsv[1]} onChange={event => appearance.setRange(1, Number(event.currentTarget.value))} style={appearance.modalReady ? {
                  background: `linear-gradient(to right, ${hsvToHex(appearance.hsv[0], 0, appearance.hsv[2])}, ${hsvToHex(appearance.hsv[0], 100, appearance.hsv[2])})`
                } : undefined} />
                  {"\n                            "}
                </div>
                {"\n\n                            "}
                <div className="theme-color-slider-group">
                  {"\n                                "}
                  <div className="theme-color-slider-label">
                    <span>
                      {"亮度"}
                    </span>
                    <span id="themeLightnessValue">{`${appearance.hsv[2]}%`}</span>
                  </div>
                  {"\n                                "}
                  <input className="theme-color-range" id="themeLightnessRange" type="range" min="0" max="100" value={appearance.hsv[2]} onChange={event => appearance.setRange(2, Number(event.currentTarget.value))} style={appearance.modalReady ? {
                  background: `linear-gradient(to right, #000000, ${hsvToHex(appearance.hsv[0], appearance.hsv[1], 100)})`
                } : undefined} />
                  {"\n                            "}
                </div>
                {"\n\n                            "}
                <div className="theme-color-modal-hex-row">
                  {"\n                                "}
                  <input className="theme-color-modal-hex-input" id="themeColorModalHexInput" type="text" inputMode="text" maxLength={7} placeholder="#C7DCE3" aria-label="输入 HEX 颜色" value={appearance.modalHex} onChange={event => appearance.setModalHex(event.currentTarget.value)} onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    appearance.modalApplyHex(true);
                  }
                }} />
                  {"\n                                "}
                  <PressedButton className="theme-color-modal-hex-apply ui-cyan-btn" id="applyThemeColorModalHexBtn" type="button" onClick={() => appearance.modalApplyHex()}>
                    {"仅预览"}
                  </PressedButton>
                  {"\n                            "}
                </div>
                {"\n\n                            "}
                <div className="theme-color-modal-actions">
                  {"\n                                "}
                  <PressedButton className="theme-color-modal-btn" id="cancelThemeColorModal" type="button" onClick={() => appearance.closeModal()}>
                    {"取消"}
                  </PressedButton>
                  {"\n                                "}
                  <PressedButton className="theme-color-modal-btn primary ui-cyan-btn" id="applyThemeColorModalBtn" type="button" onClick={appearance.confirmModal}>
                    {"套用颜色"}
                  </PressedButton>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <input id="wallpaperFileInput" type="file" accept="image/*" hidden ref={appearance.wallpaperInput} onChange={appearance.onWallpaper} />
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="theme-setting-group">
          {"\n                "}
          <div className="theme-setting-label">
            {"图标样式"}
          </div>
          {"\n                "}
          <div className="theme-setting-card">
            {"\n                    "}
            <div className="theme-icon-section-title">
              {"主画面 4 个图标"}
            </div>
            {"\n                    "}
            <div className="theme-icon-grid" id="appIconEditorList"><IconEditor kind="app" /></div>
            {"\n\n                    "}
            <div className="theme-icon-section-title">
              {"底部导航栏图标"}
            </div>
            {"\n                    "}
            <div className="theme-icon-grid" id="dockIconEditorList"><IconEditor kind="dock" /></div>
            {"\n\n                    "}
            <span className="theme-icon-draft-note">
              {"点图标选择图片后，只会先在这里预览；按“保存图标”才会应用到主画面。"}
            </span>
            {"\n\n                    "}
            <div className="theme-icon-bottom-actions">
              {"\n                        "}
              <PressedButton className="theme-icon-bottom-btn" id="resetAllCustomIconsBtn" type="button" onClick={appearance.resetIcons}>
                {"恢复默认"}
              </PressedButton>
              {"\n                        "}
              <PressedButton className="theme-icon-bottom-btn primary ui-cyan-btn" id="saveCustomIconsBtn" type="button" onClick={appearance.saveIcons}>
                {"保存图标"}
              </PressedButton>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <input id="customIconFileInput" type="file" accept="image/*" hidden ref={appearance.iconInput} onChange={appearance.onIcon} />
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        <ImageStorageSettings open={appearance.pageOpen} />
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
