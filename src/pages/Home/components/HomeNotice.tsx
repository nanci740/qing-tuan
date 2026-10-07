import { PressedButton } from '../../../components/shared/PressedButton';
import { useHomeNotice } from '../../../hooks/useHomeNotice';
export function HomeNotice() {
 const notice = useHomeNotice();
 return (
        <PressedButton className={`home-notice${notice.unread <= 0 ? ' is-read' : ''}${notice.filled ? '' : ' is-empty'}`} onClick={event => { event.stopPropagation(); notice.open(); }} id="homeNotice" type="button" aria-label="最新消息">
          {"\n"}
          <span className="home-notice-bar" aria-hidden="true">
            <span className="home-notice-title">
              {"✉ message"}
              <em>
                {".exe"}
              </em>
            </span>
            <span className="home-notice-badge" id="homeNoticeBadge" hidden={notice.unread <= 0}>
              {notice.unread > 99 ? '99+' : String(notice.unread)}
            </span>
            <span className="home-notice-btns">
              <i />
              <i />
              <i />
            </span>
          </span>
          {"\n"}
          <span className="home-notice-body">
            {"\n"}
            <span className="home-notice-avatar" id="homeNoticeAvatar">{notice.src ? <img alt="" src={notice.src} onError={notice.failImage} /> : <svg viewBox="0 0 40 40" aria-hidden="true"><rect className="na-bg" width="40" height="40"/><circle className="na-fg" cx="20" cy="15" r="7.5"/><ellipse className="na-fg" cx="20" cy="41" rx="15" ry="15"/></svg>}</span>
            {"\n"}
            <span className="home-notice-copy">
              {"\n"}
              <span className="home-notice-head">
                <span className="home-notice-name" id="homeNoticeName">{notice.title}</span>
                <span className="home-notice-time" id="homeNoticeTime">{notice.time}</span>
              </span>
              {"\n"}
              <span className="home-notice-text" id="homeNoticeText">
                {notice.body}
              </span>
              {"\n"}
            </span>
            {"\n"}
          </span>
          {"\n"}
        </PressedButton>
 );
}
