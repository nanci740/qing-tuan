import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import { useReplyNotification } from '../../hooks/useReplyNotification';
/** 回复通知使用 React 内容/显隐状态、通知元素 ref 与原生点击事件。 */
export function ReplyNotification() {
  const notification = useReplyNotification();
  return notification.services ? createPortal(<PressedButton ref={notification.element} type="button" className={'smallphone-reply-notification' + (notification.shown ? ' show' : '')} aria-live="polite" style={notification.reset || notification.content.avatar ? {
    transition: notification.reset ? 'none' : undefined
  } : undefined} onClick={notification.click}><img className="smallphone-reply-notification-avatar" alt="" src={notification.content.avatar} /><span className="smallphone-reply-notification-copy"><strong className="smallphone-reply-notification-name">{notification.content.name}</strong><span className="smallphone-reply-notification-text">{notification.content.body}</span></span><span className="smallphone-reply-notification-time">现在</span></PressedButton>, document.body) : null;
}
