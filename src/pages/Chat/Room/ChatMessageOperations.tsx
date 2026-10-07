import {useMessageOperations} from '../../../providers/ChatMessageOperationsProvider';
import {PressedButton} from '../../../components/shared/PressedButton';
import {createPortal} from 'react-dom';
export function ChatMessageMenu(){const {view,panel,action,closeMenu}=useMessageOperations();return (<div className="chat-message-menu" id="chatMessageMenu" hidden={view.menuHidden} onClick={event=>{if(event.target===event.currentTarget)closeMenu();}}>
        {"\n        "}
        <div className="chat-message-menu-panel" id="chatMessageMenuPanel" role="menu" aria-label="消息操作" ref={panel} style={{left:view.left,top:view.top}}>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="transcribe" onClick={()=>void action("transcribe")} hidden={view.menuInfo!==null&&!view.menuInfo.voice}>
            {"转文字"}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="translate" onClick={()=>void action("translate")}>
            {"翻译"}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="quote" onClick={()=>void action("quote")}>
            {"引用"}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="copy" onClick={()=>void action("copy")} hidden={view.menuInfo?.voice}>
            {"复制"}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="favorite" onClick={()=>void action("favorite")}>
            {view.menuInfo?.favorite?'取消收藏':'收藏'}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="forward" onClick={()=>void action("forward")} hidden={view.menuInfo?.voice}>
            {"转发"}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="multi" onClick={()=>void action("multi")}>
            {"多选"}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="pin" onClick={()=>void action("pin")} hidden={view.menuInfo?.voice}>
            {view.menuInfo?.pinned?'取消置顶':'置顶'}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="edit" onClick={()=>void action("edit")} hidden={view.menuInfo!==null&&(!view.menuInfo.user||view.menuInfo.voice)}>
            {"编辑"}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="recall" onClick={()=>void action("recall")} hidden={view.menuInfo!==null&&!view.menuRecallable}>
            {"撤回"}
          </PressedButton>
          {"\n            "}
          <PressedButton type="button" role="menuitem" data-message-action="delete" onClick={()=>void action("delete")}>
            {"删除"}
          </PressedButton>
          {"\n        "}
        </div>
        {"\n    "}
      </div>);}
export function ChatDeleteModal(){const {view,closeDelete,remove}=useMessageOperations();return (<div className="chat-edit-overlay" id="chatDeleteOverlay" hidden={view.deleteHidden} onClick={event=>{if(event.target===event.currentTarget)closeDelete();}}>
        {"\n        "}
        <div className="chat-edit-card" role="dialog" aria-modal="true" aria-labelledby="chatDeleteTitle">
          {"\n            "}
          <div className="chat-edit-title" id="chatDeleteTitle">
            {"删除消息"}
          </div>
          {"\n            "}
          <div className="chat-recall-description" id="chatDeleteDescription">
            {view.deleteDescription}
          </div>
          {"\n            "}
          <div className="chat-edit-actions">
            {"\n                "}
            <PressedButton className="chat-edit-btn" id="chatDeleteCancel" type="button" onClick={closeDelete}>
              {"取消"}
            </PressedButton>
            {"\n                "}
            <PressedButton className="chat-edit-btn primary" id="chatDeleteConfirm" type="button" onClick={remove}>
              {"删除"}
            </PressedButton>
            {"\n            "}
          </div>
          {"\n        "}
        </div>
        {"\n    "}
      </div>);}
export function ChatRecallModal(){const {view,closeRecall,recall}=useMessageOperations();return (<div className="chat-edit-overlay" id="chatRecallOverlay" hidden={view.recallHidden} onClick={event=>{if(event.target===event.currentTarget)closeRecall();}}>
        {"\n        "}
        <div className="chat-edit-card" role="dialog" aria-modal="true" aria-labelledby="chatRecallTitle">
          {"\n            "}
          <div className="chat-edit-title" id="chatRecallTitle">
            {"撤回消息"}
          </div>
          {"\n            "}
          <div className="chat-recall-description">
            {"确定撤回这条消息吗？"}
          </div>
          {"\n            "}
          <div className="chat-edit-actions">
            {"\n                "}
            <PressedButton className="chat-edit-btn" id="chatRecallCancel" type="button" onClick={closeRecall}>
              {"取消"}
            </PressedButton>
            {"\n                "}
            <PressedButton className="chat-edit-btn primary" id="chatRecallConfirm" type="button" onClick={recall}>
              {"撤回"}
            </PressedButton>
            {"\n            "}
          </div>
          {"\n        "}
        </div>
        {"\n    "}
      </div>);}
export function ChatEditModal(){const {view,editInput,closeEdit,saveEdit,edit}=useMessageOperations();return (<div className="chat-edit-overlay" id="chatEditOverlay" hidden={view.editHidden} onClick={event=>{if(event.target===event.currentTarget)closeEdit();}}>
        {"\n        "}
        <div className="chat-edit-card" role="dialog" aria-modal="true" aria-labelledby="chatEditTitle">
          {"\n            "}
          <div className="chat-edit-title" id="chatEditTitle">
            {"編輯訊息"}
          </div>
          {"\n            "}
          <textarea className="chat-edit-input" id="chatEditInput" maxLength={2000} aria-label="編輯訊息內容" ref={editInput} onInput={event=>edit(event.currentTarget.value)} />
          {"\n            "}
          <div className="chat-edit-actions">
            {"\n                "}
            <PressedButton className="chat-edit-btn" id="chatEditCancel" type="button" onClick={closeEdit}>
              {"取消"}
            </PressedButton>
            {"\n                "}
            <PressedButton className="chat-edit-btn primary" id="chatEditSave" type="button" onClick={saveEdit}>
              {"保存"}
            </PressedButton>
            {"\n            "}
          </div>
          {"\n        "}
        </div>
        {"\n    "}
      </div>);}
export function ChatQuotePreview(){const {view,clearQuote}=useMessageOperations();return (<div className="chat-compose-quote" id="chatComposeQuote" hidden={!view.quoteText}>
        {"\n            "}
        <div className="chat-compose-quote-copy">
          {"\n                "}
          <span className="chat-compose-quote-label">
            {"引用"}
          </span>
          {"\n                "}
          <span className="chat-compose-quote-text" id="chatComposeQuoteText">{view.quoteText}</span>
          {"\n            "}
        </div>
        {"\n            "}
        <PressedButton className="chat-compose-quote-close" id="chatComposeQuoteClose" type="button" aria-label="取消引用" onClick={clearQuote}>
          {"×"}
        </PressedButton>
        {"\n        "}
      </div>);}
export function ChatClipboardFallback(){const {view,clipboardInput}=useMessageOperations();return view.clipboard!==null?createPortal(<textarea ref={clipboardInput} defaultValue={view.clipboard} style={{position:'fixed',opacity:0}}/>,document.body):null;}
