import {PressedButton} from '../../../components/shared/PressedButton';
import {ImportPreviewModal} from '../../../components/shared/ImportPreviewModal';
import {createPortal} from 'react-dom';
import {useWorld} from '../../../providers/WorldProvider';
export function WorldConfirmation(){
  const world=useWorld(),state=world.confirmation;
  return <><ImportPreviewModal state={world.importPreview.state} choose={world.importPreview.choose}/>{state&&createPortal(<div className={'world-confirm-overlay'+(state.danger?' world-overwrite-confirm':'')+(state.open?' open':'')} onClick={event=>{if(event.target===event.currentTarget)world.finishConfirm(false);}}>
    <div className="world-confirm-card" role="dialog" aria-modal="true" aria-label={state.title}>
      <div className="world-confirm-title">{state.title}</div><div className="world-confirm-message">{state.message}</div>
      <div className="world-confirm-actions"><PressedButton className="world-confirm-btn" type="button" data-world-confirm="cancel" onClick={()=>world.finishConfirm(false)}>取消</PressedButton><PressedButton className={'world-confirm-btn primary'+(state.danger?' is-danger':'')} type="button" data-world-confirm="ok" onClick={()=>world.finishConfirm(true)}>{/^删除/.test(state.title)?'删除':'确认'}</PressedButton></div>
    </div>
  </div>,document.body)}</>;
}
