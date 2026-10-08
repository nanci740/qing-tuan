import { DEFAULT_BIRD_AVATAR } from '../../utils/defaultAvatar';
import { PressedDiv } from '../../components/shared/PressedDiv';
import { PressedButton } from '../../components/shared/PressedButton';
import { OriginalComment } from '../../components/shared/OriginalComment';
import { PixelArt } from '../../components/shared/PixelArt';
import { SettingsSection } from './SettingsSection';
import { SettingsDecorations } from './SettingsDecorations';
import { settingsIcons } from './settingsIcons';
import { useSettingsHome } from '../../hooks/useSettingsHome';
import { useSettingsNavigation } from '../../hooks/useSettingsNavigation';
/** React 管理本页事件与状态；原 DOM 层级、选择器和样式保持不变。 */
export function Settings() {
  const navigation = useSettingsNavigation();
  const home = useSettingsHome();
  return <div className={navigation.settingsOpen ? "settings-page active" : "settings-page"} id="settingsPage">
      {"\n        "}
      <div className="settings-header">
        {"\n            "}
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
          {"\n                "}
          <PressedDiv className="back-btn" id="settingsBackBtn" onClick={event => {
          event.stopPropagation();
          navigation.closeSettings();
        }} data-title="返回">
            {"\n                    "}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {"\n                        "}
              <polyline points="15 18 9 12 15 6" />
              {"\n                    "}
            </svg>
            {"\n                "}
          </PressedDiv>
          {"\n                "}
          <h2>
            {"设置"}
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
          {"C:\\青团\\设置\\"}
        </span>
        {"\n        "}
      </div><SettingsDecorations kind="marquee" />
      {"\n        "}
      <div className="settings-content">
        {"\n            "}
        <OriginalComment text={" 个人信息独立卡片 "} />
        {"\n            "}
        <div className="settings-section settings-section-personal">
          {"\n                "}
          <div className="settings-profile-card settings-item-profile" id="settingPersonal" onClick={event => {
          event.stopPropagation();
          void navigation.openDestination('settingPersonal');
        }}>
            {"\n                    "}
            <div className="settings-item-info">
              {"\n                        "}
              <PressedButton className="settings-profile-avatar" id="settingsProfileAvatarBtn" onClick={home.chooseAvatar} type="button" aria-label="更换个人头像" data-title="点击更换头像">
                {"\n                            "}
                <img id="settingsProfileAvatarImg" src={home.avatarMissing ? DEFAULT_BIRD_AVATAR : home.avatar || DEFAULT_BIRD_AVATAR} onLoad={home.avatarLoaded} onError={home.avatarFailed} alt="" />
                {"\n                        "}
              </PressedButton>
              {"\n                        "}
              <input id="settingsProfileAvatarInput" ref={home.avatarInput} onClick={event => event.stopPropagation()} onChange={home.changeAvatar} type="file" accept="image/*" hidden />
              {"\n                        "}
              <div className="settings-item-text">
                {"\n                            "}
                <span className="settings-item-title">
                  {"个人信息"}
                </span>
                {"\n                            "}
                <span className="settings-item-desc">
                  {"个性档案、喜好与日常记录"}
                </span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="settings-item-action">
              {"\n                        "}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n\n            "}
        <OriginalComment text={" 个性化内容 "} />
        {"\n            "}
        <SettingsSection number="1">
          {"\n                "}
          <div className="settings-section-title">
            {"个性化内容"}
          </div>
          {"\n                "}
          <div className="settings-item settings-item-group-start" id="settingTheme" onClick={event => {
          event.stopPropagation();
          void navigation.openDestination('settingTheme');
        }}>
            {"\n                    "}
            <div className="settings-item-info">
              {"\n                        "}
              <div className="settings-item-icon"><PixelArt rows={settingsIcons.settingTheme} classes={{
                X: "px-ink",
                o: "px-fill"
              }} className="retro-pixel-icon" /></div>
              {"\n                        "}
              <div className="settings-item-text">
                {"\n                            "}
                <span className="settings-item-title">
                  {"美化设置"}
                </span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="settings-item-action">
              {"\n                        "}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="settings-item" id="settingMusic" onClick={event => {
          event.stopPropagation();
          void navigation.openDestination('settingMusic');
        }}>
            {"\n                    "}
            <div className="settings-item-info">
              {"\n                        "}
              <div className="settings-item-icon"><PixelArt rows={settingsIcons.settingMusic} classes={{
                X: "px-ink",
                o: "px-fill"
              }} className="retro-pixel-icon" /></div>
              {"\n                        "}
              <div className="settings-item-text">
                {"\n                            "}
                <span className="settings-item-title">
                  {"音乐设置"}
                </span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="settings-item-action">
              {"\n                        "}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </SettingsSection>
        {"\n\n            "}
        <OriginalComment text={" 智能连接与服务 "} />
        {"\n            "}
        <SettingsSection number="2">
          {"\n                "}
          <div className="settings-section-title">
            {"智能连接与服务"}
          </div>
          {"\n                "}
          <div className="settings-item" id="settingApi" onClick={event => {
          event.stopPropagation();
          void navigation.openDestination('settingApi');
        }}>
            {"\n                    "}
            <div className="settings-item-info">
              {"\n                        "}
              <div className="settings-item-icon"><PixelArt rows={settingsIcons.settingApi} classes={{
                X: "px-ink",
                o: "px-fill"
              }} className="retro-pixel-icon" /></div>
              {"\n                        "}
              <div className="settings-item-text">
                {"\n                            "}
                <span className="settings-item-title">
                  {"API设置"}
                </span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="settings-item-action">
              {"\n                        "}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="settings-item" id="settingMcp" onClick={event => {
          event.stopPropagation();
          void navigation.openDestination('settingMcp');
        }}>
            {"\n                    "}
            <div className="settings-item-info">
              {"\n                        "}
              <div className="settings-item-icon"><PixelArt rows={settingsIcons.settingMcp} classes={{
                X: "px-ink",
                o: "px-fill"
              }} className="retro-pixel-icon" /></div>
              {"\n                        "}
              <div className="settings-item-text">
                {"\n                            "}
                <span className="settings-item-title">
                  {"MCP设置"}
                </span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="settings-item-action">
              {"\n                        "}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="settings-item" id="settingVoiceAi" onClick={event => {
          event.stopPropagation();
          void navigation.openDestination('settingVoiceAi');
        }}>
            {"\n                    "}
            <div className="settings-item-info">
              {"\n                        "}
              <div className="settings-item-icon"><PixelArt rows={settingsIcons.settingVoiceAi} classes={{
                X: "px-ink",
                o: "px-fill"
              }} className="retro-pixel-icon" /></div>
              {"\n                        "}
              <div className="settings-item-text">
                {"\n                            "}
                <span className="settings-item-title">
                  {"语音与生图设置"}
                </span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="settings-item-action">
              {"\n                        "}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </SettingsSection>
        {"\n\n            "}
        <OriginalComment text={" 系统与存储 "} />
        {"\n            "}
        <SettingsSection number="3">
          {"\n                "}
          <div className="settings-section-title">
            {"系统与存储"}
          </div>
          {"\n                "}
          <div className="settings-item" id="settingBackground" onClick={event => {
          event.stopPropagation();
          void navigation.openDestination('settingBackground');
        }}>
            {"\n                    "}
            <div className="settings-item-info">
              {"\n                        "}
              <div className="settings-item-icon"><PixelArt rows={settingsIcons.settingBackground} classes={{
                X: "px-ink",
                o: "px-fill"
              }} className="retro-pixel-icon" /></div>
              {"\n                        "}
              <div className="settings-item-text">
                {"\n                            "}
                <span className="settings-item-title">
                  {"后台活动设置"}
                </span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="settings-item-action">
              {"\n                        "}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="settings-item" id="settingBackup" onClick={event => {
          event.stopPropagation();
          void navigation.openDestination('settingBackup');
        }}>
            {"\n                    "}
            <div className="settings-item-info">
              {"\n                        "}
              <div className="settings-item-icon"><PixelArt rows={settingsIcons.settingBackup} classes={{
                X: "px-ink",
                o: "px-fill"
              }} className="retro-pixel-icon" /></div>
              {"\n                        "}
              <div className="settings-item-text">
                {"\n                            "}
                <span className="settings-item-title">
                  {"数据管理"}
                </span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="settings-item-action">
              {"\n                        "}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </SettingsSection>
        {"\n            \n            "}
        <OriginalComment text={" 关于 "} />
        {"\n            "}
        <SettingsSection number="4">
          {"\n                "}
          <div className="settings-section-title">
            {"关于"}
          </div>
          {"\n                "}
          <div className="settings-item" id="settingAbout" onClick={event => {
          event.stopPropagation();
          navigation.openAbout(event.currentTarget);
        }}>
            {"\n                    "}
            <div className="settings-item-info">
              {"\n                        "}
              <div className="settings-item-icon"><PixelArt rows={settingsIcons.settingAbout} classes={{
                X: "px-ink",
                o: "px-fill"
              }} className="retro-pixel-icon" /></div>
              {"\n                        "}
              <div className="settings-item-text">
                {"\n                            "}
                <span className="settings-item-title">
                  {"应用信息"}
                </span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="settings-item-action">
              {"\n                        "}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </SettingsSection>
        {"\n            "}
        <div className="retro-status-bar" aria-hidden="true">
          {"\n                "}
          <span>
            {"青团机 v0.1.0"}
          </span>
          {"\n                "}
          <span className="retro-visitor">
            {"you are visitor No."}
            <span className="retro-counter" id="settingsVisitorCounter">
              {home.visitorCount}
            </span>
          </span>
          {"\n            "}
        </div><SettingsDecorations kind="badges" />
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
