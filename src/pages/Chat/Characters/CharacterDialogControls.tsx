import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { useCharacterDialog } from '../../../hooks/useCharacterDialog';
export function CharacterDialogControls() {
  const {bridge,record,close,bindSwitch}=useCharacterDialog();
  if(!bridge)return null;
  return <>{createPortal(<>
    {'\n                '}<span className="cc-title-icon" aria-hidden="true"/>
    {'\n                '}<span className="cc-title">查看资料</span>
    {'\n                '}<PressedButton className="cc-title-btn cc-min" type="button" aria-label="最小化" data-cc-close="" onClick={close}>_</PressedButton>
    {'\n                '}<PressedButton className="cc-title-btn cc-close" type="button" aria-label="关闭" data-cc-close="" onClick={close}>×</PressedButton>
    {'\n            '}
  </>,bridge.titlebar)}{createPortal(<>
    {'\n                '}<div className="cc-switch-wrap" ref={bindSwitch}/>
    {'\n                '}<PressedButton type="button" className="cc-btn cc-new" data-title="新建角色" onClick={()=>bridge.newRecord()}>新建</PressedButton>
    {'\n                '}<span className="cc-footer-gap"/>
    {'\n                '}<PressedButton type="button" className="cc-btn cc-delete" disabled={record? !record.isStamped&&!(record.name||record.nickname):undefined} onClick={()=>void bridge.deleteRecord()}>删除</PressedButton>
    {'\n                '}<PressedButton type="button" className="cc-btn cc-primary cc-save" onClick={()=>void bridge.saveRecord()}>保存</PressedButton>
    {'\n            '}
  </>,bridge.footer)}</>;
}
