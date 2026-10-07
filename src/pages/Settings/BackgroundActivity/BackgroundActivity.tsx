import { PressedButton } from '../../../components/shared/PressedButton';
import { createPortal } from 'react-dom';
import { useBackgroundActivity } from '../../../hooks/useBackgroundActivity';
export function BackgroundActivity() {
  const background = useBackgroundActivity();
  const { settings } = background;
  return <><div className={`settings-page${background.open ? ' active' : ''}`} id="backgroundActivityPage" style={{
    "zIndex": "2050"
  }}>
      {"\n        "}
      <div className="settings-header">
        {"\n            "}
        <div style={{
        "display": "flex",
        "alignItems": "center",
        "gap": "8px"
      }}>
          {"\n                "}
          <PressedButton className="back-btn" id="backgroundActivityBackBtn" onClick={event => { event.stopPropagation(); background.close(); }} type="button" aria-label="返回设置" data-title="返回设置">
            {"\n                    "}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {"\n                "}
          </PressedButton>
          {"\n                "}
          <h2>
            {"后台活动设置"}
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
          {"C:\\青团\\设置\\后台活动\\"}
        </span>
        {"\n        "}
      </div>
      {"\n\n        "}
      <div className="background-activity-content">
        {"\n            "}
        <section className="background-activity-group">
          {"\n                "}
          <div className="background-activity-label">
            {"后台运行"}
          </div>
          {"\n                "}
          <div className="background-activity-card">
            {"\n                    "}
            <label className="background-activity-row">
              {"\n                        "}
              <span className="background-activity-copy">
                {"\n                            "}
                <strong>
                  {"允许后台活动"}
                </strong>
                {"\n                            "}
                <span>
                  {"切换应用或锁屏后，尽量继续文字回复、语音与生图任务"}
                </span>
                {"\n                        "}
              </span>
              {"\n                        "}
              <input className="vi-switch" id="backgroundActivityEnabled" checked={!!settings.enabled} onChange={event => { void background.change('enabled', event.currentTarget.checked); }} type="checkbox" />
              {"\n                    "}
            </label>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="background-activity-note">
            {"网页后台运行会受到手机系统与省电策略影响；开启后会使用轻量保活方式，尽量减少生成任务被暂停。"}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="background-activity-group">
          {"\n                "}
          <div className="background-activity-label">
            {"回复通知"}
          </div>
          {"\n                "}
          <div className="background-activity-card">
            {"\n                    "}
            <label className="background-activity-row" id="backgroundReplyNotificationRow">
              {"\n                        "}
              <span className="background-activity-copy">
                {"\n                            "}
                <strong>
                  {"回复通知"}
                </strong>
                {"\n                            "}
                <span>
                  {"回复、语音或图片生成完成后显示系统通知"}
                </span>
                {"\n                        "}
              </span>
              {"\n                        "}
              <input className="vi-switch" id="backgroundReplyNotification" checked={!!settings.replyNotification} onChange={event => { void background.change('replyNotification', event.currentTarget.checked); }} type="checkbox" />
              {"\n                    "}
            </label>
            {"\n                    "}
            <label className={`background-activity-row${settings.replyNotification ? '' : ' is-disabled'}`} id="backgroundNotificationSoundRow">
              {"\n                        "}
              <span className="background-activity-copy">
                {"\n                            "}
                <strong>
                  {"回复通知提示音"}
                </strong>
                {"\n                            "}
                <span>
                  {"收到回复通知时播放提示音"}
                </span>
                {"\n                        "}
              </span>
              {"\n                        "}
              <input className="vi-switch" id="backgroundNotificationSound" checked={!!settings.notificationSound} onChange={event => { void background.change('notificationSound', event.currentTarget.checked); }} disabled={!settings.replyNotification} type="checkbox" />
              {"\n                    "}
            </label>
            {"\n                    "}
            <label className={`background-activity-row${settings.replyNotification ? '' : ' is-disabled'}`} id="backgroundNotificationVibrationRow">
              {"\n                        "}
              <span className="background-activity-copy">
                {"\n                            "}
                <strong>
                  {"回复通知震动"}
                </strong>
                {"\n                            "}
                <span>
                  {"设备支持时，在收到回复通知时震动"}
                </span>
                {"\n                        "}
              </span>
              {"\n                        "}
              <input className="vi-switch" id="backgroundNotificationVibration" checked={!!settings.notificationVibration} onChange={event => { void background.change('notificationVibration', event.currentTarget.checked); }} disabled={!settings.replyNotification} type="checkbox" />
              {"\n                    "}
            </label>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="background-activity-group">
          {"\n                "}
          <div className="background-activity-label">
            {"显示"}
          </div>
          {"\n                "}
          <div className="background-activity-card">
            {"\n                    "}
            <label className="background-activity-row">
              {"\n                        "}
              <span className="background-activity-copy">
                {"\n                            "}
                <strong>
                  {"屏幕常亮"}
                </strong>
                {"\n                            "}
                <span>
                  {"小手机在前台显示时阻止屏幕自动熄灭"}
                </span>
                {"\n                        "}
              </span>
              {"\n                        "}
              <input className="vi-switch" id="backgroundScreenAwake" checked={!!settings.screenAwake} onChange={event => { void background.change('screenAwake', event.currentTarget.checked); }} type="checkbox" />
              {"\n                    "}
            </label>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="background-activity-note">
            {"屏幕常亮仅在页面处于前台时生效，切换应用或锁屏后会由系统自动释放。"}
          </div>
          {"\n            "}
        </section>
        {"\n        "}
      </div>
      {"\n    "}
    </div>{background.audioUrl && createPortal(<audio ref={background.audioRef} id="smallphoneBackgroundKeepAliveAudio" loop preload="auto" aria-hidden="true" style={{ display: 'none' }} src={background.audioUrl} />, document.body)}</>;
}
