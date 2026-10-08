import {PhotoImage} from '../../../components/shared/PhotoImage';
import { PressedButton } from '../../../components/shared/PressedButton';
import { useMusic } from '../../../providers/MusicProvider';
import { MusicPlaylist } from './components/MusicPlaylist';
/** React 管理音乐列表、播放模式和封面编辑。 */
export function Music() {
  const music = useMusic();
  return <div id="musicSettingsPage" style={{
    "zIndex": "2050"
  }} className={`settings-page${music.pageOpen ? ' active' : ''}`} ref={music.pageRef}>
      {"\n        "}
      <div className="settings-header">
        {"\n            "}
        <div style={{
        "display": "flex",
        "alignItems": "center",
        "gap": "8px"
      }}>
          {"\n                "}
          <PressedButton className="back-btn" id="musicBackBtn" type="button" aria-label="返回设置" data-title="返回设置" onClick={event => {
          event.stopPropagation();
          music.closePage();
        }}>
            {"\n                    "}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {"\n                "}
          </PressedButton>
          {"\n                "}
          <h2>
            {"音乐设置"}
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
          {"C:\\青团\\设置\\音乐设置\\"}
        </span>
        {"\n        "}
      </div>
      {"\n        "}
      <div className="music-settings-content">
        {"\n            "}
        <section className="music-setting-group">
          {"\n                "}
          <div className="music-setting-label">
            {"音乐来源"}
          </div>
          {"\n                "}
          <div className="music-setting-card">
            {"\n                    "}
            <div className="music-source-actions">
              {"\n                        "}
              <PressedButton className="music-action-btn ui-cyan-btn" id="musicChooseFileBtn" type="button" onClick={() => music.chooseFiles()}>
                {"导入本地音乐"}
              </PressedButton>
              {"\n                        "}
              <PressedButton className="music-action-btn secondary ui-cyan-btn" id="musicToggleUrlBtn" type="button" onClick={music.toggleUrl}>
                {"添加音乐链接"}
              </PressedButton>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div id="musicUrlBox" ref={music.urlBoxRef} className={`music-url-box${music.urlOpen ? ' show' : ''}`}>
              {"\n                        "}
              <input className="music-url-input" id="musicUrlInput" type="url" placeholder="粘贴 mp3 / m4a / ogg 音乐直链" value={music.url} onChange={event => music.setUrl(event.currentTarget.value)} onKeyDown={event => {
              if (event.key === 'Enter') void music.addUrl();
            }} />
              {"\n                        "}
              <PressedButton className="music-action-btn music-url-save ui-cyan-btn" id="musicAddUrlBtn" type="button" onClick={music.addUrl}>
                {"添加"}
              </PressedButton>
              {"\n                    "}
            </div>
            {"\n                    "}
            <input id="musicFileInput" type="file" accept="audio/*" multiple hidden ref={music.fileInput} onChange={music.onFiles} />
            {"\n                    "}
            <div className="music-playlist" id="musicPlaylist"><MusicPlaylist /></div>
            {"\n                    "}
            <span className="music-note">
              {"最多保存 3 首音乐。点右侧文件夹图标可以选择新的音乐文件替换音乐；音乐可拖动调整顺序。"}
            </span>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="music-setting-group">
          {"\n                "}
          <div className="music-setting-label">
            {"播放设置"}
          </div>
          {"\n                "}
          <div className="music-setting-card">
            {"\n                    "}
            <div className="music-row" style={{
            "display": "block",
            "padding": "4px 0 10px"
          }}>
              {"\n                        "}
              <div className="music-row-title" style={{
              "marginBottom": "8px"
            }}>
                {"播放模式"}
              </div>
              {"\n                        "}
              <div className="music-mode-segment" id="musicModeSegment">
                {"\n                            "}
                <PressedButton type="button" data-mode="list" className={`music-mode-btn${music.displayMode === 'list' ? ' active' : ''}`} onClick={() => music.setMode('list')}>
                  {"列表循环"}
                </PressedButton>
                {"\n                            "}
                <PressedButton type="button" data-mode="single" className={`music-mode-btn${music.displayMode === 'single' ? ' active' : ''}`} onClick={() => music.setMode('single')}>
                  {"单曲循环"}
                </PressedButton>
                {"\n                            "}
                <PressedButton type="button" data-mode="random" className={`music-mode-btn${music.displayMode === 'random' ? ' active' : ''}`} onClick={() => music.setMode('random')}>
                  {"随机播放"}
                </PressedButton>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="music-row">
              {"\n                        "}
              <div className="music-row-copy">
                <div className="music-row-title">
                  {"自动播放"}
                </div>
                <div className="music-row-desc">
                  {"进入主画面后自动播放音乐"}
                </div>
              </div>
              {"\n                        "}
              <PressedButton id="musicAutoPlaySwitch" type="button" aria-label="自动播放" className={`music-switch${music.autoPlay ? ' on' : ''}`} onClick={music.toggleAuto} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="music-row">
              {"\n                        "}
              <div className="music-row-copy">
                <div className="music-row-title">
                  {"音符动画"}
                </div>
                <div className="music-row-desc">
                  {"播放时在播放器上方飘出音符"}
                </div>
              </div>
              {"\n                        "}
              <PressedButton id="musicShowNotesSwitch" type="button" className={`music-switch${music.showNotes ? ' on' : ''}`} onClick={music.toggleNotes} />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="music-setting-group">
          {"\n                "}
          <div className="music-setting-label">
            {"音乐信息"}
          </div>
          {"\n                "}
          <div className="music-setting-card">
            {"\n                    "}
            <div className="music-meta-grid">
              {"\n                        "}
              <div className="music-meta-field">
                <label htmlFor="musicTitleInput">
                  {"音乐名称"}
                </label>
                <input className="music-meta-input" id="musicTitleInput" type="text" placeholder="Fortune arrives" value={music.title} onChange={event => music.setTitle(event.currentTarget.value)} />
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="music-editor-target" id="musicEditorTarget">{"当前编辑："}<strong>{music.editorTitle}</strong></div>
            {"\n                    "}
            <div className="music-cover-row">
              {"\n                        "}
              <div className="music-cover-preview" id="musicCoverPreview"><PhotoImage src={music.coverPreview} alt="音乐封面" /></div>
              {"\n                        "}
              <div className="music-cover-actions">
                {"\n                            "}
                <PressedButton className="music-action-btn ui-cyan-btn" id="musicChooseCoverBtn" type="button" onClick={music.chooseCover}>
                  {"选择封面"}
                </PressedButton>
                {"\n                            "}
                <PressedButton className="music-action-btn secondary ui-cyan-btn" id="musicRemoveCoverBtn" type="button" onClick={music.removeCover}>
                  {"移除封面"}
                </PressedButton>
                {"\n                        "}
              </div>
              {"\n                        "}
              <input id="musicCoverInput" type="file" accept="image/*" hidden ref={music.coverInput} onChange={music.onCover} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <PressedButton className="music-action-btn music-save-meta ui-cyan-btn" id="musicSaveMetaBtn" type="button" onClick={music.saveMeta}>
              {"保存音乐信息"}
            </PressedButton>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
