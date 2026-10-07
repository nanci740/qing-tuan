import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { characterRecordLabel, useCharacterRecordMenu } from '../../../hooks/useCharacterRecordMenu';

/** 档案菜单的显示、定位和选择事件由 React 管理，档案数据提交暂时接旧存储接口。 */
export function CharacterRecordMenu() {
  const { bridge, source, revision, open, position, button, menu, toggle, select } = useCharacterRecordMenu();
  return bridge?.switchContainer ? createPortal(<>
    {'\n                    '}<PressedButton type="button" className={`cc-switch${open ? ' open' : ''}`} aria-haspopup="listbox" aria-label="切换角色" ref={button} onClick={toggle}><span className="cc-switch-label">{source ? characterRecordLabel(source.record) : ''}</span><i aria-hidden="true" /></PressedButton>
    {'\n                    '}<div className="cc-menu" role="listbox" hidden={!open} style={position} ref={menu}>{source?.records.map((record, index) => <PressedButton key={`${revision}:${index}`} type="button" className={`cc-menu-item${index === source.index ? ' active' : ''}`} role="option" data-card-index={index} onClick={() => select(index)}>{characterRecordLabel(record)}</PressedButton>)}</div>
    {'\n                '}
  </>, bridge.switchContainer) : null;
}
