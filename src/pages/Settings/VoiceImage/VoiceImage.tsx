import { RetroSelect } from '../../../components/shared/RetroSelect';
import { PressedButton } from '../../../components/shared/PressedButton';
import type { CSSProperties } from 'react';
import { useVoiceImage } from '../../../providers/VoiceImageProvider';
import { labelFor, formatAudioTime } from '../../../utils/voiceImageServices';
import { BuilderTextarea } from './components/BuilderTextarea';
import { ImageCharacters } from './components/ImageCharacters';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function VoiceImage() {
  const vi = useVoiceImage();
  return <div id="voiceImageSettingsPage" style={{
    "zIndex": "2050"
  }} className={`settings-page${vi.pageOpen ? ' active' : ''}`} ref={vi.pageRef}>
      {"\n        "}
      <div className="settings-header">
        {"\n            "}
        <div style={{
        "display": "flex",
        "alignItems": "center",
        "gap": "8px"
      }}>
          {"\n                "}
          <PressedButton className="back-btn" id="voiceImageBackBtn" type="button" aria-label="返回设置" data-title="返回设置" onClick={event => {
          event.stopPropagation();
          vi.closePage();
        }}>
            {"\n                    "}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {"\n                "}
          </PressedButton>
          {"\n                "}
          <h2>
            {"语音与生图设置"}
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
          {"C:\\青团\\设置\\语音与生图\\"}
        </span>
        {"\n        "}
      </div>
      {"\n        "}
      <div className="retro-tabs" role="tablist" aria-label="语音与生图">
        {"\n            "}
        <PressedButton type="button" role="tab" data-tab="voice" className={'retro-tab' + (vi.tab === 'voice' ? ' active' : '')} aria-selected={vi.tab === 'voice'} onClick={() => vi.changeTab('voice')}>
          {"语音"}
        </PressedButton>
        {"\n            "}
        <PressedButton type="button" role="tab" data-tab="image" className={'retro-tab' + (vi.tab === 'image' ? ' active' : '')} aria-selected={vi.tab === 'image'} onClick={() => vi.changeTab('image')}>
          {"生图"}
        </PressedButton>
        {"\n        "}
      </div>
      {"\n\n        "}
      <div className="vi-settings-content" data-tab={vi.tab} ref={vi.contentRef}>
        {"\n            "}
        <section className="vi-group">
          {"\n                "}
          <div className="vi-label">
            {"语音服务"}
          </div>
          {"\n                "}
          <div className="vi-card">
            {"\n                    "}
            <div className="vi-toggle-row">
              {"\n                        "}
              <div className="vi-toggle-copy">
                {"\n                            "}
                <strong>
                  {"启用语音生成"}
                </strong>
                {"\n                            "}
                <span>
                  {"允许聊天功能调用文字转语音服务"}
                </span>
                {"\n                        "}
              </div>
              {"\n                        "}
              <input className="vi-switch" id="voiceEnabled" type="checkbox" checked={vi.voice.enabled} onChange={event => vi.toggleEnabled('voice', event.currentTarget.checked)} />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="vi-group">
          {"\n                "}
          <div className="vi-label">
            {"语音连接"}
          </div>
          {"\n                "}
          <div className="vi-card">
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"接口类型"}
              </span>
              {"\n                        "}
              <PressedButton className="vi-choice-btn" id="voiceProviderBtn" type="button" onClick={() => vi.openChoice('voice', 'provider', 'voiceProvider', '选择语音接口类型')}>{labelFor('voiceProvider', vi.voice.provider)}</PressedButton>
              {"\n                        "}
              <input id="voiceProvider" type="hidden" value={vi.voice.provider} onChange={event => vi.setVoiceField('provider', event.currentTarget.value)} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"API 地址"}
              </span>
              {"\n                        "}
              <input className="vi-input" id="voiceBaseUrl" type="url" inputMode="url" placeholder="https://api.openai.com/v1" value={vi.voice.baseUrl} onChange={event => vi.setVoiceField('baseUrl', event.currentTarget.value)} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"API Key"}
              </span>
              {"\n                        "}
              <div className="vi-secret-wrap">
                {"\n                            "}
                <input className="vi-input" id="voiceApiKey" autoComplete="off" placeholder="输入语音服务 Key" value={vi.voice.apiKey} onChange={event => vi.setVoiceField('apiKey', event.currentTarget.value)} type={vi.keysVisible.voice ? 'text' : 'password'} />
                {"\n                            "}
                <PressedButton className="vi-eye" id="voiceKeyToggle" type="button" aria-label="显示或隐藏 API Key" onClick={() => vi.toggleKey('voice')}>
                  {"\n                                "}
                  <svg viewBox="0 0 24 24">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {"\n                            "}
                </PressedButton>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"模型"}
              </span>
              {"\n                        "}
              <div className="vi-model-picker">
                {"\n                            "}
                <input className="vi-input" id="voiceModel" type="text" value={vi.voice.model} onChange={event => vi.setVoiceField('model', event.currentTarget.value)} placeholder={vi.voiceMeta.modelPlaceholder} />
                {"\n                            "}
                <PressedButton className="vi-fetch-arrow" id="voiceFetchModelsBtn" type="button" disabled={vi.fetching.voice || vi.voiceMeta.fetchDisabled} onClick={() => vi.fetchModels('voice')} data-title={vi.voiceMeta.fetchLabel} aria-label={vi.voiceMeta.fetchLabel} />
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              <span className="vi-row-label">转写类型</span>
              <RetroSelect id="voiceTranscriptionProvider" title="转写类型" className="vi-input" value={vi.voice.transcriptionProvider || ''} onChange={value => vi.setVoiceField('transcriptionProvider', value)}>
                <option value="">沿用语音连接</option>
                <option value="openai-compatible">OpenAI 兼容转写</option>
                <option value="gemini">Gemini 音频理解</option>
              </RetroSelect>
            </div>
            <div className="vi-row">
              <span className="vi-row-label">转写地址</span>
              <input className="vi-input" type="url" placeholder="可选：转写服务地址" value={vi.voice.transcriptionBaseUrl || ''} onChange={event => vi.setVoiceField('transcriptionBaseUrl', event.currentTarget.value)} />
            </div>
            <div className="vi-row">
              <span className="vi-row-label">转写 Key</span>
              <input className="vi-input" type="password" autoComplete="off" placeholder="可选：独立转写 Key" value={vi.voice.transcriptionApiKey || ''} onChange={event => vi.setVoiceField('transcriptionApiKey', event.currentTarget.value)} />
            </div>
            <div className="vi-row">
              <span className="vi-row-label">转写模型</span>
              <input className="vi-input" placeholder="服务支持的转写模型（非 TTS 模型）" value={vi.voice.transcriptionModel || ''} onChange={event => vi.setVoiceField('transcriptionModel', event.currentTarget.value)} />
            </div>
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"音色"}
              </span>
              {"\n                        "}
              <input className="vi-input" id="voiceName" type="text" value={vi.voice.voice} onChange={event => vi.setVoiceField('voice', event.currentTarget.value)} placeholder={vi.voiceMeta.voicePlaceholder} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"输出格式"}
              </span>
              {"\n                        "}
              <PressedButton className="vi-choice-btn" id="voiceFormatBtn" type="button" onClick={() => vi.openChoice('voice', 'format', 'format', '选择输出格式')}>{labelFor('format', vi.voice.format)}</PressedButton>
              {"\n                        "}
              <input id="voiceFormat" type="hidden" value={vi.voice.format} onChange={event => vi.setVoiceField('format', event.currentTarget.value)} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"语速"}
              </span>
              {"\n                        "}
              <div className="vi-range-wrap">
                {"\n                            "}
                <input className="vi-range" id="voiceSpeed" type="range" min="0.5" max="2" step="0.05" value={vi.voice.speed} onChange={event => vi.setVoiceField('speed', Number(event.currentTarget.value))} />
                {"\n                            "}
                <span className="vi-range-value" id="voiceSpeedValue">{Number(vi.voice.speed).toFixed(2) + '×'}</span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="vi-note">
            {"API Key 只保存在当前浏览器的本地储存中。若选择 MiniMax，音色一栏请填写 Voice ID。模型可手动输入，也可以点右侧箭头拉取。"}
          </div>
          {"\n                "}
          <div id="voicePreview" className={'vi-preview' + (vi.audioSrc ? ' show' : '')}>
            {"\n                    "}
            <audio id="voicePreviewAudio" preload="metadata" ref={vi.audioRef} src={vi.audioSrc || undefined} onLoadedMetadata={vi.syncAudio} onDurationChange={vi.syncAudio} onTimeUpdate={vi.syncAudio} onPlay={vi.syncAudio} onPause={vi.syncAudio} onEnded={vi.syncAudio} onVolumeChange={vi.syncAudio} />
            {"\n                    "}
            <div id="voiceCustomPlayer" className={'vi-audio-player' + (vi.audioState.playing ? ' is-playing' : '')}>
              {"\n                        "}
              <PressedButton className="vi-audio-play" id="voicePlayBtn" type="button" aria-label="播放或暂停" onClick={vi.toggleAudio}>
                {"\n                            "}
                <svg className="icon-play" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5.5 18 12 8 18.5Z" />
                </svg>
                {"\n                            "}
                <svg className="icon-pause" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 6v12M15 6v12" />
                </svg>
                {"\n                        "}
              </PressedButton>
              {"\n                        "}
              <span className="vi-audio-time" id="voiceTimeText">{`${formatAudioTime(vi.audioState.current)} / ${formatAudioTime(vi.audioState.duration)}`}</span>
              {"\n                        "}
              <input className="vi-audio-progress" id="voiceProgress" type="range" min="0" max="1000" step="1" aria-label="语音进度" value={vi.audioState.progress} style={{
              '--progress': `${vi.audioState.progress / 10}%`
            } as CSSProperties} onChange={event => vi.seekAudio(Number(event.currentTarget.value))} />
              {"\n                        "}
              <PressedButton id="voiceVolumeBtn" type="button" aria-label="静音或恢复声音" className={'vi-audio-volume' + (vi.audioState.muted ? ' is-muted' : '')} onClick={vi.toggleMute}>
                {"\n                            "}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 10v4h4l5 4V6l-5 4H5Z" />
                  <path d="M17 9.5a4 4 0 0 1 0 5" />
                  <path d="M19 7a7 7 0 0 1 0 10" />
                </svg>
                {"\n                        "}
              </PressedButton>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="vi-actions">
            {"\n                    "}
            <PressedButton className="vi-btn" id="voiceTestBtn" type="button" disabled={vi.testing.voice} onClick={() => vi.test('voice')}>{vi.testing.voice ? '生成中…' : '试听语音'}</PressedButton>
            {"\n                    "}
            <PressedButton className="vi-btn primary ui-cyan-btn" id="voiceSaveBtn" type="button" onClick={() => vi.save('voice')}>
              {"保存语音设置"}
            </PressedButton>
            {"\n                "}
          </div>
          {"\n                "}
          <div id="voiceStatus" className={'vi-status' + (vi.status.voice.type ? ' ' + vi.status.voice.type : '')}>{vi.status.voice.message}</div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="vi-group">
          {"\n                "}
          <div className="vi-label">
            {"生图服务"}
          </div>
          {"\n                "}
          <div className="vi-card">
            {"\n                    "}
            <div className="vi-toggle-row">
              {"\n                        "}
              <div className="vi-toggle-copy">
                {"\n                            "}
                <strong>
                  {"启用图片生成"}
                </strong>
                {"\n                            "}
                <span>
                  {"允许聊天功能调用图片生成服务"}
                </span>
                {"\n                        "}
              </div>
              {"\n                        "}
              <input className="vi-switch" id="imageEnabled" type="checkbox" checked={vi.image.enabled} onChange={event => vi.toggleEnabled('image', event.currentTarget.checked)} />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="vi-group">
          {"\n                "}
          <div className="vi-label">
            {"生图连接"}
          </div>
          {"\n                "}
          <div className="vi-card">
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"接口类型"}
              </span>
              {"\n                        "}
              <PressedButton className="vi-choice-btn" id="imageProviderBtn" type="button" onClick={() => vi.openChoice('image', 'provider', 'imageProvider', '选择生图接口类型')}>{labelFor('imageProvider', vi.image.provider)}</PressedButton>
              {"\n                        "}
              <input id="imageProvider" type="hidden" value={vi.image.provider} onChange={event => vi.setImageField('provider', event.currentTarget.value)} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"API 地址"}
              </span>
              {"\n                        "}
              <input className="vi-input" id="imageBaseUrl" type="url" inputMode="url" placeholder="https://api.openai.com/v1" value={vi.image.baseUrl} onChange={event => vi.setImageField('baseUrl', event.currentTarget.value)} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"API Key"}
              </span>
              {"\n                        "}
              <div className="vi-secret-wrap">
                {"\n                            "}
                <input className="vi-input" id="imageApiKey" autoComplete="off" placeholder="输入生图服务 Key" value={vi.image.apiKey} onChange={event => vi.setImageField('apiKey', event.currentTarget.value)} type={vi.keysVisible.image ? 'text' : 'password'} />
                {"\n                            "}
                <PressedButton className="vi-eye" id="imageKeyToggle" type="button" aria-label="显示或隐藏 API Key" onClick={() => vi.toggleKey('image')}>
                  {"\n                                "}
                  <svg viewBox="0 0 24 24">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {"\n                            "}
                </PressedButton>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"模型"}
              </span>
              {"\n                        "}
              <div className="vi-model-picker">
                {"\n                            "}
                <input className="vi-input" id="imageModel" type="text" value={vi.image.model} onChange={event => vi.setImageField('model', event.currentTarget.value)} placeholder={vi.imageMeta.modelPlaceholder} />
                {"\n                            "}
                <PressedButton className="vi-fetch-arrow" id="imageFetchModelsBtn" type="button" aria-label="获取可用图片模型" data-title="获取可用图片模型" disabled={vi.fetching.image} onClick={() => vi.fetchModels('image')} />
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"图片尺寸"}
              </span>
              {"\n                        "}
              <PressedButton className="vi-choice-btn" id="imageSizeBtn" type="button" onClick={() => vi.openChoice('image', 'size', 'size', '选择图片尺寸')}>{labelFor('size', vi.image.size)}</PressedButton>
              {"\n                        "}
              <input id="imageSize" type="hidden" value={vi.image.size} onChange={event => vi.setImageField('size', event.currentTarget.value)} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-row">
              {"\n                        "}
              <span className="vi-row-label">
                {"质量"}
              </span>
              {"\n                        "}
              <PressedButton className="vi-choice-btn" id="imageQualityBtn" type="button" onClick={() => vi.openChoice('image', 'quality', 'quality', '选择图片质量')}>{labelFor('quality', vi.image.quality)}</PressedButton>
              {"\n                        "}
              <input id="imageQuality" type="hidden" value={vi.image.quality} onChange={event => vi.setImageField('quality', event.currentTarget.value)} />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="vi-note">
            {"生图模型可手动输入，也可以点右侧箭头拉取。"}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="vi-group">
          {"\n                "}
          <div className="vi-label">
            {"生图提示设置"}
          </div>
          {"\n                "}
          <div className="vi-card vi-prompt-builder">
            {"\n                    "}
            <label className="vi-builder-field">
              {"\n                        "}
              <span className="vi-builder-field-label">
                {"画师串"}
              </span>
              {"\n                        "}
              <BuilderTextarea className="vi-builder-textarea" id="imageArtistTags" placeholder="输入画师串或整体风格标签" value={vi.image.artistTags} onChange={event => vi.setImageField('artistTags', event.currentTarget.value)} rows={1} />
              {"\n                    "}
            </label>
            {"\n                    "}
            <label className="vi-builder-field">
              {"\n                        "}
              <span className="vi-builder-field-label">
                {"负面词"}
              </span>
              {"\n                        "}
              <BuilderTextarea className="vi-builder-textarea" id="imageNegativePrompt" placeholder="输入全局负面提示词" value={vi.image.negativePrompt} onChange={event => vi.setImageField('negativePrompt', event.currentTarget.value)} rows={1} />
              {"\n                    "}
            </label>
            {"\n                    "}
            <div className="vi-character-section">
              {"\n                        "}
              <div className="vi-character-head">
                {"\n                            "}
                <div>
                  {"\n                                "}
                  <span className="vi-character-title">
                    {"角色提示"}
                  </span>
                  {"\n                                "}
                  <span className="vi-character-hint">
                    {"最多添加 3 个角色"}
                  </span>
                  {"\n                            "}
                </div>
                {"\n                            "}
                <PressedButton className="vi-character-add" id="imageAddCharacterBtn" type="button" aria-label="添加角色提示" data-title="添加角色提示" disabled={vi.image.characters.length >= 3} onClick={vi.addCharacter}>
                  {"＋"}
                </PressedButton>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div className="vi-character-list" id="imageCharacterList"><ImageCharacters /></div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <label className="vi-builder-field vi-scene-field">
              {"\n                        "}
              <span className="vi-builder-field-label">
                {"剧情与画面"}
              </span>
              {"\n                        "}
              <span className="vi-builder-field-hint">
                {"填写剧情互动、动作、服装穿搭等画面内容；服装也可以写在对应角色提示词中。"}
              </span>
              {"\n                        "}
              <BuilderTextarea className="vi-builder-textarea" id="imagePrompt" placeholder="输入想生成的剧情或画面内容" value={vi.image.prompt} onChange={event => vi.setImageField('prompt', event.currentTarget.value)} rows={1} />
              {"\n                    "}
            </label>
            {"\n                "}
          </div>
          {"\n                "}
          <div id="imagePreview" className={'vi-preview vi-image-preview' + (vi.imagePreview.shown ? ' show' : '')}>
            {"\n                    "}
            <div className="vi-image-frame">
              {"\n                        "}
              <img id="imagePreviewImg" alt="测试生成图片" src={vi.imagePreview.src || undefined} data-object-url={vi.imagePreview.objectUrl || undefined} />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="vi-image-meta">
              {"\n                        "}
              <div className="vi-image-meta-top">
                {"\n                            "}
                <div className="vi-image-model" id="imagePreviewModel">{vi.imagePreview.model}</div>
                {"\n                            "}
                <PressedButton className="vi-regenerate-btn" id="imageRegenerateBtn" type="button" disabled={vi.testing.image} onClick={() => vi.test('image')}>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                  {"重新生成"}
                </PressedButton>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div className="vi-image-desc" id="imagePreviewDesc" data-title={vi.imagePreview.shown ? vi.imagePreview.description : undefined}>{vi.imagePreview.description}</div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="vi-actions">
            {"\n                    "}
            <PressedButton className="vi-btn" id="imageTestBtn" type="button" disabled={vi.testing.image} onClick={() => vi.test('image')}>{vi.testing.image ? '生成中…' : '测试生图'}</PressedButton>
            {"\n                    "}
            <PressedButton className="vi-btn primary ui-cyan-btn" id="imageSaveBtn" type="button" onClick={() => vi.save('image')}>
              {"保存生图设置"}
            </PressedButton>
            {"\n                "}
          </div>
          {"\n                "}
          <div id="imageStatus" className={'vi-status' + (vi.status.image.type ? ' ' + vi.status.image.type : '')}>{vi.status.image.message}</div>
          {"\n            "}
        </section>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
