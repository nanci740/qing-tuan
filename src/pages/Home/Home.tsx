import { PressedButton } from '../../components/shared/PressedButton';
import { useWorld } from '../../providers/WorldProvider';
import { useAppearance } from '../../providers/AppearanceProvider';
import { useHomePlayer, formatPlayerTime } from '../../hooks/useHomePlayer';
import { useHomeAvatarUpload } from '../../hooks/useHomeAvatarUpload';
import { DeviceStatusBar } from './components/DeviceStatusBar';
import { HomeNotice } from './components/HomeNotice';
import { memo } from 'react';
import { HomeAvatar } from './components/HomeAvatar';
import { useBoot } from '../../providers/BootProvider';
import { useHomePagination } from '../../hooks/useHomePagination';
import { TamaPet } from './components/TamaPet';
import { OriginalComment } from "../../components/shared/OriginalComment";
import { World } from "../World/World";
import { Chat } from "../Chat/Chat";
import { DockBar } from "../../components/shared/DockBar";

/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
const StableWorld = memo(World);
const StableChat = memo(Chat);
const StableDock = memo(DockBar);
export function Home() {
 const world=useWorld();
  const appearance = useAppearance();
  const boot = useBoot();
  const player = useHomePlayer();
  const starAvatar = useHomeAvatarUpload('avatar_star_custom');
  const moonAvatar = useHomeAvatarUpload('avatar_moon_custom');
  const pagination = useHomePagination();
  return <div id="main-content" className={[boot.mainVisible ? 'visible' : '', pagination.page === 1 ? 'on-page-2' : ''].filter(Boolean).join(' ') || undefined} onTouchStart={pagination.onTouchStart} onTouchEnd={pagination.onTouchEnd} onPointerDown={pagination.onPointerDown} onPointerUp={pagination.onPointerUp} style={{
    ...(boot.mainOpaque ? {
      opacity: '1'
    } : {}),
    backgroundImage: appearance.wallpaperLayers
  }}>
      {"\n        "}
      <OriginalComment text={" 顶部状态栏 "} />
      {"\n        "}
      <DeviceStatusBar />
      {"\n"}
      <div className="widget-card">
        {"\n"}
        <svg className="earphone-wires" fill="none" viewBox="0 0 380 320">
          {"\n"}
          <path d="M 40 98 C 18 116, 24 179, 84 214 L 150 252" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.8" />
          {"\n"}
          <ellipse cx="40" cy="98" fill="#ffffff" rx="7" ry="5" transform="rotate(-30 40 98)" />
          {"\n"}
          <path d="M 340 98 C 362 116, 356 179, 296 214 L 230 252" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.8" />
          {"\n"}
          <ellipse cx="340" cy="98" fill="#ffffff" rx="7" ry="5" transform="rotate(30 340 98)" />
          {"\n"}
        </svg>
        {"\n"}
        <div className="avatars-container">
          {"\n"}
          <div className="avatar-box">
            {"\n"}
            <div className="speech-bubble-container">
              {"\n"}
              <svg className="bubble-svg" viewBox="0 0 118 65">
                {"\n"}
                <defs>
                  {"\n"}
                  <radialGradient id="starBubbleHighlight" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(2 2) scale(118 65)">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="25%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="80%" stopColor="#ffffff" stopOpacity="0" />
                  </radialGradient>
                  {"\n"}
                  <radialGradient id="starBubbleSoft" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(116 62) scale(118 65)">
                    <stop offset="0%" stopColor="var(--color-muted)" stopOpacity="0.28" />
                    <stop offset="25%" stopColor="var(--color-muted)" stopOpacity="0.16" />
                    <stop offset="80%" stopColor="var(--color-muted)" stopOpacity="0" />
                  </radialGradient>
                  {"\n"}
                </defs>
                {"\n"}
                <path d="M 18 2 H 100 A 16 16 0 0 1 116 18 V 38 A 16 16 0 0 1 100 54 H 70 C 65 54, 62.5 62, 59 62 C 55.5 62, 53 54, 48 54 H 18 A 16 16 0 0 1 2 38 V 18 A 16 16 0 0 1 18 2 Z" fill="rgba(255, 255, 255, 0.45)" stroke="none" />
                {"\n"}
                <path d="M 18 2 H 100 A 16 16 0 0 1 116 18 V 38 A 16 16 0 0 1 100 54 H 70 C 65 54, 62.5 62, 59 62 C 55.5 62, 53 54, 48 54 H 18 A 16 16 0 0 1 2 38 V 18 A 16 16 0 0 1 18 2 Z" fill="none" stroke="url(#starBubbleHighlight)" strokeWidth="1.4" />
                {"\n"}
                <path d="M 18 2 H 100 A 16 16 0 0 1 116 18 V 38 A 16 16 0 0 1 100 54 H 70 C 65 54, 62.5 62, 59 62 C 55.5 62, 53 54, 48 54 H 18 A 16 16 0 0 1 2 38 V 18 A 16 16 0 0 1 18 2 Z" fill="none" stroke="url(#starBubbleSoft)" strokeWidth="1.4" />
                {"\n"}
              </svg>
              {"\n"}
              <div className="bubble-text-layer">
                {"\n"}
                <span className="bubble-text" id="starBubbleText" spellCheck="false">{player.texts.starBubbleText}
                </span>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
            <div className="avatar-frame-container" id="starAvatarWrap" onClick={event => {
            event.stopPropagation();
            starAvatar.choose();
          }} aria-label="更换 Star 头像">
              {"\n"}
              <svg className="avatar-frame-svg" fill="none" viewBox="0 0 118 118">
                {"\n"}
                <circle cx="59" cy="59" r="54" stroke="var(--theme-color)" strokeWidth="1.5" />
                {" "}
              </svg>
              {"\n"}
              <div className="avatar-inner-circle">
                {"\n"}
                <HomeAvatar id="starAvatarImg" src={starAvatar.src || undefined} className="avatar-missing" alt="" referrerPolicy="no-referrer" />
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
          <svg className="heart-icon" fill="currentColor" viewBox="0 0 11 10" shapeRendering="crispEdges">
            <rect x="1" y="0" width="1" height="1" />
            <rect x="2" y="0" width="1" height="1" />
            <rect x="3" y="0" width="1" height="1" />
            <rect x="7" y="0" width="1" height="1" />
            <rect x="8" y="0" width="1" height="1" />
            <rect x="9" y="0" width="1" height="1" />
            <rect x="0" y="1" width="1" height="1" />
            <rect x="1" y="1" width="1" height="1" />
            <rect x="2" y="1" width="1" height="1" />
            <rect x="3" y="1" width="1" height="1" />
            <rect x="4" y="1" width="1" height="1" />
            <rect x="6" y="1" width="1" height="1" />
            <rect x="7" y="1" width="1" height="1" />
            <rect x="8" y="1" width="1" height="1" />
            <rect x="9" y="1" width="1" height="1" />
            <rect x="10" y="1" width="1" height="1" />
            <rect x="0" y="2" width="1" height="1" />
            <rect x="1" y="2" width="1" height="1" />
            <rect x="2" y="2" width="1" height="1" />
            <rect x="3" y="2" width="1" height="1" />
            <rect x="4" y="2" width="1" height="1" />
            <rect x="5" y="2" width="1" height="1" />
            <rect x="6" y="2" width="1" height="1" />
            <rect x="7" y="2" width="1" height="1" />
            <rect x="8" y="2" width="1" height="1" />
            <rect x="9" y="2" width="1" height="1" />
            <rect x="10" y="2" width="1" height="1" />
            <rect x="0" y="3" width="1" height="1" />
            <rect x="1" y="3" width="1" height="1" />
            <rect x="2" y="3" width="1" height="1" />
            <rect x="3" y="3" width="1" height="1" />
            <rect x="4" y="3" width="1" height="1" />
            <rect x="5" y="3" width="1" height="1" />
            <rect x="6" y="3" width="1" height="1" />
            <rect x="7" y="3" width="1" height="1" />
            <rect x="8" y="3" width="1" height="1" />
            <rect x="9" y="3" width="1" height="1" />
            <rect x="10" y="3" width="1" height="1" />
            <rect x="0" y="4" width="1" height="1" />
            <rect x="1" y="4" width="1" height="1" />
            <rect x="2" y="4" width="1" height="1" />
            <rect x="3" y="4" width="1" height="1" />
            <rect x="4" y="4" width="1" height="1" />
            <rect x="5" y="4" width="1" height="1" />
            <rect x="6" y="4" width="1" height="1" />
            <rect x="7" y="4" width="1" height="1" />
            <rect x="8" y="4" width="1" height="1" />
            <rect x="9" y="4" width="1" height="1" />
            <rect x="10" y="4" width="1" height="1" />
            <rect x="1" y="5" width="1" height="1" />
            <rect x="2" y="5" width="1" height="1" />
            <rect x="3" y="5" width="1" height="1" />
            <rect x="4" y="5" width="1" height="1" />
            <rect x="5" y="5" width="1" height="1" />
            <rect x="6" y="5" width="1" height="1" />
            <rect x="7" y="5" width="1" height="1" />
            <rect x="8" y="5" width="1" height="1" />
            <rect x="9" y="5" width="1" height="1" />
            <rect x="2" y="6" width="1" height="1" />
            <rect x="3" y="6" width="1" height="1" />
            <rect x="4" y="6" width="1" height="1" />
            <rect x="5" y="6" width="1" height="1" />
            <rect x="6" y="6" width="1" height="1" />
            <rect x="7" y="6" width="1" height="1" />
            <rect x="8" y="6" width="1" height="1" />
            <rect x="3" y="7" width="1" height="1" />
            <rect x="4" y="7" width="1" height="1" />
            <rect x="5" y="7" width="1" height="1" />
            <rect x="6" y="7" width="1" height="1" />
            <rect x="7" y="7" width="1" height="1" />
            <rect x="4" y="8" width="1" height="1" />
            <rect x="5" y="8" width="1" height="1" />
            <rect x="6" y="8" width="1" height="1" />
            <rect x="5" y="9" width="1" height="1" />
          </svg>
          {"\n"}
          <div className="avatar-box">
            {"\n"}
            <div className="speech-bubble-container">
              {"\n"}
              <svg className="bubble-svg" viewBox="0 0 118 65">
                {"\n"}
                <defs>
                  {"\n"}
                  <radialGradient id="moonBubbleHighlight" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(2 2) scale(118 65)">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="25%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="80%" stopColor="#ffffff" stopOpacity="0" />
                  </radialGradient>
                  {"\n"}
                  <radialGradient id="moonBubbleSoft" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(116 62) scale(118 65)">
                    <stop offset="0%" stopColor="var(--color-muted)" stopOpacity="0.28" />
                    <stop offset="25%" stopColor="var(--color-muted)" stopOpacity="0.16" />
                    <stop offset="80%" stopColor="var(--color-muted)" stopOpacity="0" />
                  </radialGradient>
                  {"\n"}
                </defs>
                {"\n"}
                <path d="M 18 2 H 100 A 16 16 0 0 1 116 18 V 38 A 16 16 0 0 1 100 54 H 70 C 65 54, 62.5 62, 59 62 C 55.5 62, 53 54, 48 54 H 18 A 16 16 0 0 1 2 38 V 18 A 16 16 0 0 1 18 2 Z" fill="rgba(255, 255, 255, 0.45)" stroke="none" />
                {"\n"}
                <path d="M 18 2 H 100 A 16 16 0 0 1 116 18 V 38 A 16 16 0 0 1 100 54 H 70 C 65 54, 62.5 62, 59 62 C 55.5 62, 53 54, 48 54 H 18 A 16 16 0 0 1 2 38 V 18 A 16 16 0 0 1 18 2 Z" fill="none" stroke="url(#moonBubbleHighlight)" strokeWidth="1.4" />
                {"\n"}
                <path d="M 18 2 H 100 A 16 16 0 0 1 116 18 V 38 A 16 16 0 0 1 100 54 H 70 C 65 54, 62.5 62, 59 62 C 55.5 62, 53 54, 48 54 H 18 A 16 16 0 0 1 2 38 V 18 A 16 16 0 0 1 18 2 Z" fill="none" stroke="url(#moonBubbleSoft)" strokeWidth="1.4" />
                {"\n"}
              </svg>
              {"\n"}
              <div className="bubble-text-layer">
                {"\n"}
                <span className="bubble-text" id="moonBubbleText" spellCheck="false">{player.texts.moonBubbleText}
                </span>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
            <div className="avatar-frame-container" id="moonAvatarWrap" onClick={event => {
            event.stopPropagation();
            moonAvatar.choose();
          }} aria-label="更换 Moon 头像">
              {"\n"}
              <svg className="avatar-frame-svg" fill="none" viewBox="0 0 118 118">
                {"\n"}
                <circle cx="59" cy="59" r="54" stroke="var(--theme-color)" strokeWidth="1.5" />
                {" "}
              </svg>
              {"\n"}
              <div className="avatar-inner-circle">
                {"\n"}
                <HomeAvatar id="moonAvatarImg" src={moonAvatar.src || undefined} className="avatar-missing" alt="" referrerPolicy="no-referrer" />
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
        <div className="subtitle" id="mainSubtitle" onClick={event => event.stopPropagation()} onInput={event => player.changeText('mainSubtitle', event.currentTarget.textContent || '')} onBlur={event => player.changeText('mainSubtitle', event.currentTarget.textContent || '', true)} spellCheck="false">{player.texts.mainSubtitle}
        </div>
        {"\n"}
        <div className="floating-notes-container" id="floatingNotes">{player.notes.map(note => <div key={note.id} className="floating-note" style={note.style}>{note.char}</div>)}</div>
        {"\n"}
        <audio id="musicAudio" ref={player.audio} onLoadedMetadata={player.onMetadata} onTimeUpdate={player.onTimeUpdate} onPlay={player.onPlay} onPause={player.onPause} preload="metadata" style={{
        "display": "none"
      }} onEnded={player.onEnded} />
        {"\n"}
        <div className={`player-box mp3-player ${player.playing ? 'playing' : 'paused'}`} id="playerBox">
          {"\n"}
          <div className="mp3-screen">
            {"\n"}
            <div className="mp3-status" aria-hidden="true">
              {"\n"}
              <span className="mp3-mode" />
              {"\n"}
              <div className="sound-wave" id="soundWave">
                {"\n"}
                <span style={{
                "height": "10px"
              }} />
                {"\n"}
                <span style={{
                "height": "16px"
              }} />
                {"\n"}
                <span style={{
                "height": "8px"
              }} />
                {"\n"}
                <span style={{
                "height": "14px"
              }} />
                {"\n"}
                <span style={{
                "height": "6px"
              }} />
                {"\n"}
              </div>
              {"\n"}
              <span className="mp3-battery" />
              {"\n"}
            </div>
            {"\n"}
            <div className="mp3-track">
              {"\n"}
              <div className="player-mini-cover" id="playerMiniCover">{player.miniCover ? <img src={player.miniCover} alt="音乐封面" /> : <span>♪</span>}</div>
              {"\n"}
              <div className="mp3-track-text">
                {"\n"}
                <div className="player-header">
                  {"\n"}
                  <div className="song-title" id="songTitle" onClick={event => event.stopPropagation()} onInput={event => player.changeText('songTitle', event.currentTarget.textContent || '')} onBlur={event => player.changeText('songTitle', event.currentTarget.textContent || '', true)} spellCheck="false">{player.texts.songTitle}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
                <div className="song-details" id="songDetails" onClick={event => event.stopPropagation()} onInput={event => player.changeText('songDetails', event.currentTarget.textContent || '')} onBlur={event => player.changeText('songDetails', event.currentTarget.textContent || '', true)} spellCheck="false">{player.texts.songDetails}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
            <div className="progress-container">
              {"\n"}
              <div className="progress-bar-bg" id="progressBarBg" ref={player.progressBar} onClick={player.onClickSeek} onMouseDown={player.onMouseDownSeek} onTouchStart={player.onTouchStartSeek}>
                {"\n"}
                <div className="progress-bar-fill" id="progressBarFill" style={{
                width: `${Math.min(100, Math.max(0, player.progress / player.duration * 100))}%`
              }} />
                {"\n"}
              </div>
              {"\n"}
              <div className="time-stamps">
                {"\n"}
                <span id="currTime">{formatPlayerTime(player.progress)}
                </span>
                {"\n"}
                <span id="totalTime">{formatPlayerTime(player.duration)}
                </span>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
          <div className="mp3-brand" id="mp3Brand" spellCheck="false">{player.texts.mp3Brand}
          </div>
          {"\n"}
          <div className="controls">
            {"\n"}
            <PressedButton className={`btn btn-star${player.starred ? ' starred' : ''}`} id="starBtn" onClick={player.toggleStar} aria-label="Star">
              {"\n"}
              <svg viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {"\n"}
            </PressedButton>
            {"\n"}
            <PressedButton className="btn btn-prev" id="prevBtn" onClick={() => player.moveTrack(-1)} aria-label="Previous track">
              {"\n"}
              <svg viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
              {"\n"}
            </PressedButton>
            {"\n"}
            <PressedButton className="btn btn-play" id="playBtn" onClick={player.togglePlay} aria-label="Play or Pause">
              {"\n"}
              <div className="pause-bars">
                {"\n"}
                <span />
                {"\n"}
                <span />
                {"\n"}
              </div>
              {"\n"}
              <svg className="icon-play" viewBox="0 0 16 16">
                <polygon points="2.5,0.5 15,8 2.5,15.5" />
              </svg>
              {"\n"}
            </PressedButton>
            {"\n"}
            <PressedButton className="btn btn-next" id="nextBtn" onClick={() => player.moveTrack(1)} aria-label="Next track">
              {"\n"}
              <svg viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
              {"\n"}
            </PressedButton>
            {"\n"}
            <PressedButton className={`btn btn-heart${player.liked ? ' liked' : ''}`} id="heartBtn" onClick={player.toggleLike} aria-label="Favorite">
              {"\n"}
              <svg viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {"\n"}
            </PressedButton>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
      </div>
      {"\n"}
      <OriginalComment text={" App 和 拍立得 区域 "} />
      {"\n"}
      <div className="app-section">
        {"\n"}
        <OriginalComment text={" 左侧 2x2 App 图标区 "} />
        {"\n"}
        <div className="app-grid-container">
          {"\n"}
          <div className="app-item" data-app-icon-key="ledger">
            {"\n"}
            <div className="app-card">
              {"\n"}
              <div className={"icon-box icon-piggy-bank" + (appearance.icons.app['ledger'] ? ' has-custom-icon' : '')}>
                {"\n"}
                <img className="app-custom-icon" alt="Ledger icon" src={appearance.icons.app['ledger'] || undefined} />
                {"\n"}
                <svg className="px-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
                  <rect className="px-x" x="5" y="0" width="5" height="1" />
                  <rect className="px-x" x="3" y="1" width="2" height="1" />
                  <rect className="px-o" x="5" y="1" width="5" height="1" />
                  <rect className="px-x" x="10" y="1" width="2" height="1" />
                  <rect className="px-x" x="2" y="2" width="1" height="1" />
                  <rect className="px-o" x="3" y="2" width="9" height="1" />
                  <rect className="px-x" x="12" y="2" width="1" height="1" />
                  <rect className="px-x" x="1" y="3" width="1" height="1" />
                  <rect className="px-o" x="2" y="3" width="11" height="1" />
                  <rect className="px-x" x="13" y="3" width="1" height="1" />
                  <rect className="px-x" x="1" y="4" width="1" height="1" />
                  <rect className="px-o" x="2" y="4" width="2" height="1" />
                  <rect className="px-x" x="4" y="4" width="2" height="1" />
                  <rect className="px-o" x="6" y="4" width="3" height="1" />
                  <rect className="px-x" x="9" y="4" width="2" height="1" />
                  <rect className="px-o" x="11" y="4" width="2" height="1" />
                  <rect className="px-x" x="13" y="4" width="1" height="1" />
                  <rect className="px-x" x="0" y="5" width="1" height="1" />
                  <rect className="px-o" x="1" y="5" width="4" height="1" />
                  <rect className="px-x" x="5" y="5" width="2" height="1" />
                  <rect className="px-o" x="7" y="5" width="1" height="1" />
                  <rect className="px-x" x="8" y="5" width="2" height="1" />
                  <rect className="px-o" x="10" y="5" width="4" height="1" />
                  <rect className="px-x" x="14" y="5" width="1" height="1" />
                  <rect className="px-x" x="0" y="6" width="1" height="1" />
                  <rect className="px-o" x="1" y="6" width="5" height="1" />
                  <rect className="px-x" x="6" y="6" width="3" height="1" />
                  <rect className="px-o" x="9" y="6" width="5" height="1" />
                  <rect className="px-x" x="14" y="6" width="1" height="1" />
                  <rect className="px-x" x="0" y="7" width="1" height="1" />
                  <rect className="px-o" x="1" y="7" width="3" height="1" />
                  <rect className="px-x" x="4" y="7" width="7" height="1" />
                  <rect className="px-o" x="11" y="7" width="3" height="1" />
                  <rect className="px-x" x="14" y="7" width="1" height="1" />
                  <rect className="px-x" x="0" y="8" width="1" height="1" />
                  <rect className="px-o" x="1" y="8" width="6" height="1" />
                  <rect className="px-x" x="7" y="8" width="1" height="1" />
                  <rect className="px-o" x="8" y="8" width="6" height="1" />
                  <rect className="px-x" x="14" y="8" width="1" height="1" />
                  <rect className="px-x" x="0" y="9" width="1" height="1" />
                  <rect className="px-o" x="1" y="9" width="3" height="1" />
                  <rect className="px-x" x="4" y="9" width="7" height="1" />
                  <rect className="px-o" x="11" y="9" width="3" height="1" />
                  <rect className="px-x" x="14" y="9" width="1" height="1" />
                  <rect className="px-x" x="1" y="10" width="1" height="1" />
                  <rect className="px-o" x="2" y="10" width="5" height="1" />
                  <rect className="px-x" x="7" y="10" width="1" height="1" />
                  <rect className="px-o" x="8" y="10" width="5" height="1" />
                  <rect className="px-x" x="13" y="10" width="1" height="1" />
                  <rect className="px-x" x="1" y="11" width="1" height="1" />
                  <rect className="px-o" x="2" y="11" width="5" height="1" />
                  <rect className="px-x" x="7" y="11" width="1" height="1" />
                  <rect className="px-o" x="8" y="11" width="5" height="1" />
                  <rect className="px-x" x="13" y="11" width="1" height="1" />
                  <rect className="px-x" x="2" y="12" width="1" height="1" />
                  <rect className="px-o" x="3" y="12" width="9" height="1" />
                  <rect className="px-x" x="12" y="12" width="1" height="1" />
                  <rect className="px-x" x="3" y="13" width="2" height="1" />
                  <rect className="px-o" x="5" y="13" width="5" height="1" />
                  <rect className="px-x" x="10" y="13" width="2" height="1" />
                  <rect className="px-x" x="5" y="14" width="5" height="1" />
                </svg>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
            <span className="app-label-cn">
              {"Ledger"}
            </span>
            {"\n"}
          </div>
          {"\n"}
          <div className="app-item" data-app-icon-key="memos">
            {"\n"}
            <div className="app-card">
              {"\n"}
              <div className={"icon-box icon-list-todo" + (appearance.icons.app['memos'] ? ' has-custom-icon' : '')}>
                {"\n"}
                <img className="app-custom-icon" alt="Memos icon" src={appearance.icons.app['memos'] || undefined} />
                {"\n"}
                <svg className="px-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
                  <rect className="px-x" x="1" y="1" width="14" height="1" />
                  <rect className="px-x" x="1" y="2" width="1" height="1" />
                  <rect className="px-o" x="2" y="2" width="12" height="1" />
                  <rect className="px-x" x="14" y="2" width="1" height="1" />
                  <rect className="px-x" x="1" y="3" width="1" height="1" />
                  <rect className="px-w" x="2" y="3" width="1" height="1" />
                  <rect className="px-x" x="3" y="3" width="3" height="1" />
                  <rect className="px-w" x="6" y="3" width="8" height="1" />
                  <rect className="px-x" x="14" y="3" width="1" height="1" />
                  <rect className="px-x" x="1" y="4" width="1" height="1" />
                  <rect className="px-w" x="2" y="4" width="1" height="1" />
                  <rect className="px-x" x="3" y="4" width="1" height="1" />
                  <rect className="px-o" x="4" y="4" width="1" height="1" />
                  <rect className="px-x" x="5" y="4" width="1" height="1" />
                  <rect className="px-w" x="6" y="4" width="1" height="1" />
                  <rect className="px-x" x="7" y="4" width="6" height="1" />
                  <rect className="px-w" x="13" y="4" width="1" height="1" />
                  <rect className="px-x" x="14" y="4" width="1" height="1" />
                  <rect className="px-x" x="1" y="5" width="1" height="1" />
                  <rect className="px-w" x="2" y="5" width="1" height="1" />
                  <rect className="px-x" x="3" y="5" width="3" height="1" />
                  <rect className="px-w" x="6" y="5" width="8" height="1" />
                  <rect className="px-x" x="14" y="5" width="1" height="1" />
                  <rect className="px-x" x="1" y="6" width="1" height="1" />
                  <rect className="px-w" x="2" y="6" width="12" height="1" />
                  <rect className="px-x" x="14" y="6" width="1" height="1" />
                  <rect className="px-x" x="1" y="7" width="1" height="1" />
                  <rect className="px-w" x="2" y="7" width="1" height="1" />
                  <rect className="px-x" x="3" y="7" width="3" height="1" />
                  <rect className="px-w" x="6" y="7" width="8" height="1" />
                  <rect className="px-x" x="14" y="7" width="1" height="1" />
                  <rect className="px-x" x="1" y="8" width="1" height="1" />
                  <rect className="px-w" x="2" y="8" width="1" height="1" />
                  <rect className="px-x" x="3" y="8" width="1" height="1" />
                  <rect className="px-o" x="4" y="8" width="1" height="1" />
                  <rect className="px-x" x="5" y="8" width="1" height="1" />
                  <rect className="px-w" x="6" y="8" width="1" height="1" />
                  <rect className="px-x" x="7" y="8" width="6" height="1" />
                  <rect className="px-w" x="13" y="8" width="1" height="1" />
                  <rect className="px-x" x="14" y="8" width="1" height="1" />
                  <rect className="px-x" x="1" y="9" width="1" height="1" />
                  <rect className="px-w" x="2" y="9" width="1" height="1" />
                  <rect className="px-x" x="3" y="9" width="3" height="1" />
                  <rect className="px-w" x="6" y="9" width="8" height="1" />
                  <rect className="px-x" x="14" y="9" width="1" height="1" />
                  <rect className="px-x" x="1" y="10" width="1" height="1" />
                  <rect className="px-w" x="2" y="10" width="12" height="1" />
                  <rect className="px-x" x="14" y="10" width="1" height="1" />
                  <rect className="px-x" x="1" y="11" width="1" height="1" />
                  <rect className="px-w" x="2" y="11" width="1" height="1" />
                  <rect className="px-x" x="3" y="11" width="3" height="1" />
                  <rect className="px-w" x="6" y="11" width="8" height="1" />
                  <rect className="px-x" x="14" y="11" width="1" height="1" />
                  <rect className="px-x" x="1" y="12" width="1" height="1" />
                  <rect className="px-w" x="2" y="12" width="1" height="1" />
                  <rect className="px-x" x="3" y="12" width="1" height="1" />
                  <rect className="px-o" x="4" y="12" width="1" height="1" />
                  <rect className="px-x" x="5" y="12" width="1" height="1" />
                  <rect className="px-w" x="6" y="12" width="1" height="1" />
                  <rect className="px-x" x="7" y="12" width="4" height="1" />
                  <rect className="px-w" x="11" y="12" width="3" height="1" />
                  <rect className="px-x" x="14" y="12" width="1" height="1" />
                  <rect className="px-x" x="1" y="13" width="1" height="1" />
                  <rect className="px-w" x="2" y="13" width="1" height="1" />
                  <rect className="px-x" x="3" y="13" width="3" height="1" />
                  <rect className="px-w" x="6" y="13" width="8" height="1" />
                  <rect className="px-x" x="14" y="13" width="1" height="1" />
                  <rect className="px-x" x="1" y="14" width="14" height="1" />
                </svg>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
            <span className="app-label-cn">
              {"Memos"}
            </span>
            {"\n"}
          </div>
          {"\n"}
          <div className="app-item" data-app-icon-key="world" onClick={event=>{event.preventDefault();event.stopPropagation();world.openWorld();}}>
            {"\n"}
            <div className="app-card">
              {"\n"}
              <div className={"icon-box icon-globe" + (appearance.icons.app['world'] ? ' has-custom-icon' : '')}>
                {"\n"}
                <img className="app-custom-icon" alt="World icon" src={appearance.icons.app['world'] || undefined} />
                {"\n"}
                <svg className="px-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
                  <rect className="px-x" x="5" y="0" width="5" height="1" />
                  <rect className="px-x" x="3" y="1" width="2" height="1" />
                  <rect className="px-o" x="5" y="1" width="1" height="1" />
                  <rect className="px-x" x="6" y="1" width="1" height="1" />
                  <rect className="px-o" x="7" y="1" width="1" height="1" />
                  <rect className="px-x" x="8" y="1" width="1" height="1" />
                  <rect className="px-o" x="9" y="1" width="1" height="1" />
                  <rect className="px-x" x="10" y="1" width="2" height="1" />
                  <rect className="px-x" x="2" y="2" width="1" height="1" />
                  <rect className="px-o" x="3" y="2" width="2" height="1" />
                  <rect className="px-x" x="5" y="2" width="1" height="1" />
                  <rect className="px-o" x="6" y="2" width="3" height="1" />
                  <rect className="px-x" x="9" y="2" width="1" height="1" />
                  <rect className="px-o" x="10" y="2" width="2" height="1" />
                  <rect className="px-x" x="12" y="2" width="1" height="1" />
                  <rect className="px-x" x="1" y="3" width="1" height="1" />
                  <rect className="px-o" x="2" y="3" width="2" height="1" />
                  <rect className="px-x" x="4" y="3" width="1" height="1" />
                  <rect className="px-o" x="5" y="3" width="5" height="1" />
                  <rect className="px-x" x="10" y="3" width="1" height="1" />
                  <rect className="px-o" x="11" y="3" width="2" height="1" />
                  <rect className="px-x" x="13" y="3" width="1" height="1" />
                  <rect className="px-x" x="1" y="4" width="1" height="1" />
                  <rect className="px-o" x="2" y="4" width="2" height="1" />
                  <rect className="px-x" x="4" y="4" width="1" height="1" />
                  <rect className="px-o" x="5" y="4" width="5" height="1" />
                  <rect className="px-x" x="10" y="4" width="1" height="1" />
                  <rect className="px-o" x="11" y="4" width="2" height="1" />
                  <rect className="px-x" x="13" y="4" width="1" height="1" />
                  <rect className="px-x" x="0" y="5" width="1" height="1" />
                  <rect className="px-o" x="1" y="5" width="3" height="1" />
                  <rect className="px-x" x="4" y="5" width="1" height="1" />
                  <rect className="px-o" x="5" y="5" width="5" height="1" />
                  <rect className="px-x" x="10" y="5" width="1" height="1" />
                  <rect className="px-o" x="11" y="5" width="3" height="1" />
                  <rect className="px-x" x="14" y="5" width="1" height="1" />
                  <rect className="px-x" x="0" y="6" width="1" height="1" />
                  <rect className="px-o" x="1" y="6" width="3" height="1" />
                  <rect className="px-x" x="4" y="6" width="1" height="1" />
                  <rect className="px-o" x="5" y="6" width="5" height="1" />
                  <rect className="px-x" x="10" y="6" width="1" height="1" />
                  <rect className="px-o" x="11" y="6" width="3" height="1" />
                  <rect className="px-x" x="14" y="6" width="1" height="1" />
                  <rect className="px-x" x="0" y="7" width="15" height="1" />
                  <rect className="px-x" x="0" y="8" width="1" height="1" />
                  <rect className="px-o" x="1" y="8" width="3" height="1" />
                  <rect className="px-x" x="4" y="8" width="1" height="1" />
                  <rect className="px-o" x="5" y="8" width="5" height="1" />
                  <rect className="px-x" x="10" y="8" width="1" height="1" />
                  <rect className="px-o" x="11" y="8" width="3" height="1" />
                  <rect className="px-x" x="14" y="8" width="1" height="1" />
                  <rect className="px-x" x="0" y="9" width="1" height="1" />
                  <rect className="px-o" x="1" y="9" width="3" height="1" />
                  <rect className="px-x" x="4" y="9" width="1" height="1" />
                  <rect className="px-o" x="5" y="9" width="5" height="1" />
                  <rect className="px-x" x="10" y="9" width="1" height="1" />
                  <rect className="px-o" x="11" y="9" width="3" height="1" />
                  <rect className="px-x" x="14" y="9" width="1" height="1" />
                  <rect className="px-x" x="1" y="10" width="1" height="1" />
                  <rect className="px-o" x="2" y="10" width="2" height="1" />
                  <rect className="px-x" x="4" y="10" width="1" height="1" />
                  <rect className="px-o" x="5" y="10" width="5" height="1" />
                  <rect className="px-x" x="10" y="10" width="1" height="1" />
                  <rect className="px-o" x="11" y="10" width="2" height="1" />
                  <rect className="px-x" x="13" y="10" width="1" height="1" />
                  <rect className="px-x" x="1" y="11" width="1" height="1" />
                  <rect className="px-o" x="2" y="11" width="2" height="1" />
                  <rect className="px-x" x="4" y="11" width="1" height="1" />
                  <rect className="px-o" x="5" y="11" width="5" height="1" />
                  <rect className="px-x" x="10" y="11" width="1" height="1" />
                  <rect className="px-o" x="11" y="11" width="2" height="1" />
                  <rect className="px-x" x="13" y="11" width="1" height="1" />
                  <rect className="px-x" x="2" y="12" width="1" height="1" />
                  <rect className="px-o" x="3" y="12" width="2" height="1" />
                  <rect className="px-x" x="5" y="12" width="1" height="1" />
                  <rect className="px-o" x="6" y="12" width="3" height="1" />
                  <rect className="px-x" x="9" y="12" width="1" height="1" />
                  <rect className="px-o" x="10" y="12" width="2" height="1" />
                  <rect className="px-x" x="12" y="12" width="1" height="1" />
                  <rect className="px-x" x="3" y="13" width="2" height="1" />
                  <rect className="px-o" x="5" y="13" width="1" height="1" />
                  <rect className="px-x" x="6" y="13" width="1" height="1" />
                  <rect className="px-o" x="7" y="13" width="1" height="1" />
                  <rect className="px-x" x="8" y="13" width="1" height="1" />
                  <rect className="px-o" x="9" y="13" width="1" height="1" />
                  <rect className="px-x" x="10" y="13" width="2" height="1" />
                  <rect className="px-x" x="5" y="14" width="5" height="1" />
                </svg>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
            <span className="app-label-cn">
              {"World"}
            </span>
            {"\n"}
          </div>
          {"\n"}
          <div className="app-item" data-app-icon-key="memories">
            {"\n"}
            <div className="app-card">
              {"\n"}
              <div className={"icon-box icon-folder-heart" + (appearance.icons.app['memories'] ? ' has-custom-icon' : '')}>
                {"\n"}
                <img className="app-custom-icon" alt="Memories icon" src={appearance.icons.app['memories'] || undefined} />
                {"\n"}
                <svg className="px-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
                  <rect className="px-l" x="9" y="1" width="6" height="1" />
                  <rect className="px-x" x="15" y="1" width="1" height="1" />
                  <rect className="px-l" x="2" y="2" width="11" height="1" />
                  <rect className="px-o" x="13" y="2" width="2" height="1" />
                  <rect className="px-x" x="15" y="2" width="1" height="1" />
                  <rect className="px-l" x="2" y="3" width="1" height="1" />
                  <rect className="px-w" x="3" y="3" width="9" height="1" />
                  <rect className="px-l" x="12" y="3" width="1" height="1" />
                  <rect className="px-o" x="13" y="3" width="2" height="1" />
                  <rect className="px-x" x="15" y="3" width="1" height="1" />
                  <rect className="px-l" x="1" y="4" width="12" height="1" />
                  <rect className="px-o" x="13" y="4" width="2" height="1" />
                  <rect className="px-x" x="15" y="4" width="1" height="1" />
                  <rect className="px-l" x="0" y="5" width="1" height="1" />
                  <rect className="px-o" x="1" y="5" width="12" height="1" />
                  <rect className="px-l" x="13" y="5" width="1" height="1" />
                  <rect className="px-o" x="14" y="5" width="1" height="1" />
                  <rect className="px-x" x="15" y="5" width="1" height="1" />
                  <rect className="px-l" x="0" y="6" width="1" height="1" />
                  <rect className="px-o" x="1" y="6" width="12" height="1" />
                  <rect className="px-l" x="13" y="6" width="1" height="1" />
                  <rect className="px-o" x="14" y="6" width="1" height="1" />
                  <rect className="px-x" x="15" y="6" width="1" height="1" />
                  <rect className="px-l" x="0" y="7" width="1" height="1" />
                  <rect className="px-o" x="1" y="7" width="12" height="1" />
                  <rect className="px-l" x="13" y="7" width="1" height="1" />
                  <rect className="px-o" x="14" y="7" width="1" height="1" />
                  <rect className="px-x" x="15" y="7" width="1" height="1" />
                  <rect className="px-l" x="1" y="8" width="1" height="1" />
                  <rect className="px-o" x="2" y="8" width="13" height="1" />
                  <rect className="px-x" x="15" y="8" width="1" height="1" />
                  <rect className="px-l" x="1" y="9" width="1" height="1" />
                  <rect className="px-o" x="2" y="9" width="12" height="1" />
                  <rect className="px-l" x="14" y="9" width="1" height="1" />
                  <rect className="px-x" x="15" y="9" width="1" height="1" />
                  <rect className="px-l" x="1" y="10" width="1" height="1" />
                  <rect className="px-o" x="2" y="10" width="12" height="1" />
                  <rect className="px-l" x="14" y="10" width="1" height="1" />
                  <rect className="px-x" x="15" y="10" width="1" height="1" />
                  <rect className="px-l" x="1" y="11" width="1" height="1" />
                  <rect className="px-o" x="2" y="11" width="12" height="1" />
                  <rect className="px-l" x="14" y="11" width="1" height="1" />
                  <rect className="px-x" x="15" y="11" width="1" height="1" />
                  <rect className="px-l" x="2" y="12" width="1" height="1" />
                  <rect className="px-o" x="3" y="12" width="12" height="1" />
                  <rect className="px-x" x="15" y="12" width="1" height="1" />
                  <rect className="px-x" x="2" y="13" width="14" height="1" />
                </svg>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
            <span className="app-label-cn">
              {"Memories"}
            </span>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
        <OriginalComment text={" 换 Star / Moon 头像用的隐藏上传框（原本放在拍立得里） "} />
        {"\n"}
        <input type="file" id="starAvatarInput" ref={starAvatar.input} onChange={event => starAvatar.upload(event.currentTarget.files?.[0])} accept="image/*" style={{
        "display": "none"
      }} />
        {"\n"}
        <input type="file" id="moonAvatarInput" ref={moonAvatar.input} onChange={event => moonAvatar.upload(event.currentTarget.files?.[0])} accept="image/*" style={{
        "display": "none"
      }} />
        {"\n"}
        <OriginalComment text={" 电子宠物：蛋形果冻机，放在 App 右边代替拍立得；液晶小窗里住着一颗像素青团，下面三颗按钮；像素图和互动都在底部 initTamaPet 里 "} />
        {"\n"}
        <TamaPet />
        {"\n"}
      </div>
      {"\n"}
      <OriginalComment text={" 主画面第二页（往左滑出现）和页数小圆点；换页逻辑在底部 initHomePages "} />
      {"\n"}
      <div className="home-page2" id="homePage2" aria-hidden={pagination.page !== 1}>
        {"\n"}
        <OriginalComment text={" 消息小窗（在第二页最上面）：显示角色最新传来的一句话，点一下打开那个聊天；内容由底部 initHomeNotice 填 "} />
        {"\n"}
        <HomeNotice />
        {"\n"}
      </div>
      {"\n"}
      <div className="home-dots" id="homeDots" role="tablist" aria-label="主画面页数">
        <PressedButton type="button" className={pagination.page === 0 ? 'home-dot active' : 'home-dot'} role="tab" aria-selected={pagination.page === 0} data-page="0" onClick={event => pagination.select(0, event)} aria-label="第 1 页" />
        <PressedButton type="button" className={pagination.page === 1 ? 'home-dot active' : 'home-dot'} role="tab" aria-selected={pagination.page === 1} data-page="1" onClick={event => pagination.select(1, event)} aria-label="第 2 页" />
      </div>
      {"\n"}
      <OriginalComment text={" World 世界书：用户调整版 "} />
      {"\n"}
      <StableWorld />
      {"\n\n"}
      <OriginalComment text={" Chat 应用 "} />
      {"\n"}
      <StableChat />
      {"\n\n"}
      <StableDock />
      {"\n"}
    </div>;
}
