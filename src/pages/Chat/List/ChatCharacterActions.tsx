import { useChatCharacterActions } from '../../../hooks/useChatCharacterActions';
import { PressedButton } from '../../../components/shared/PressedButton';
/** 操作菜单的 JSX、显隐、缩放定位和按钮事件直接使用 React。 */
export function ChatCharacterActions() {
  const actions = useChatCharacterActions();
  return actions.services ? (<div ref={actions.overlay} className={'chat-character-action-overlay' + (actions.open ? ' open' : '')} aria-hidden={!actions.open} onClick={event => {
    if (event.target === event.currentTarget) actions.close();
  }}>
    {'\n        '}<div ref={actions.sheet} className="chat-character-action-sheet" role="dialog" aria-modal="true" aria-label="角色聊天操作" style={actions.position ? {
      left: actions.position.left,
      top: actions.position.top
    } : undefined}>
      {'\n            '}<div className="chat-character-action-title" id="chatCharacterActionTitle">{actions.selection.name}</div>
      {'\n            '}<PressedButton className="chat-character-action-btn" id="chatCharacterPinBtn" type="button" onClick={() => actions.toggle('pinned')}>{actions.selection.pinned ? '取消置顶' : '置顶聊天'}</PressedButton>
      {'\n            '}<PressedButton className="chat-character-action-btn" id="chatCharacterFavoriteBtn" type="button" onClick={() => actions.toggle('favorite')}>{actions.selection.favorite ? '取消特别关注' : '特别关注'}</PressedButton>
      {'\n            '}<PressedButton className="chat-character-action-btn danger" id="chatCharacterDeleteBtn" type="button" onClick={actions.remove}>删除角色</PressedButton>
      {'\n        '}</div>
  </div>) : null;
}
