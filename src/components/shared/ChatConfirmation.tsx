import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import type { ChatConfirmationRequest } from '../../types/chatCharacterActions';
/** 共享聊天 / 档案确认窗口；多个独立请求保持原先各自打开、各自完成的行为。 */
export function ChatConfirmation() {
  const [requests, setRequests] = useState<(ChatConfirmationRequest & {
    id: number;
  })[]>([]);
  const nextId = useRef(0);
  useLayoutEffect(() => {
    const show = (event: Event) => {
      const request = (event as CustomEvent<ChatConfirmationRequest>).detail;
      const id = ++nextId.current;
      setRequests(current => [...current, {
        ...request,
        id
      }]);
    };
    window.addEventListener('qingtuan:chat-confirm', show);
    return () => window.removeEventListener('qingtuan:chat-confirm', show);
  }, []);
  function finish(request: ChatConfirmationRequest & {
    id: number;
  }, value: boolean) {
    setRequests(current => current.filter(item => item.id !== request.id));
    request.resolve(value);
  }
  return <>{requests.map(request => {
      const {
        title = '确认操作',
        message = '',
        confirmText = '确定',
        cancelText = '取消',
        danger = false
      } = request.options;
      return createPortal(<div className="sp-confirm-overlay" key={request.id} onClick={event => {
        if (event.target === event.currentTarget) finish(request, false);
      }}>
      {'\n                '}<div className="sp-confirm" role="alertdialog" aria-modal="true">
        {'\n                    '}<div className="sp-confirm-bar"><span className="sp-confirm-title">{title}</span></div>
        {'\n                    '}<div className="sp-confirm-body"><div className="sp-confirm-msg">{message}</div></div>
        {'\n                    '}<div className="sp-confirm-actions"><PressedButton type="button" className="sp-confirm-btn" onClick={() => finish(request, false)}>{cancelText}</PressedButton><PressedButton type="button" className={'sp-confirm-btn is-primary' + (danger ? ' is-danger' : '')} onClick={() => finish(request, true)}>{confirmText}</PressedButton></div>
        {'\n                '}</div>
    </div>, document.body, String(request.id));
    })}</>;
}
