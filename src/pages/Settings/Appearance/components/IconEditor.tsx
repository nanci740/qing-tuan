import { PressedButton } from '../../../../components/shared/PressedButton';
import { Fragment } from 'react';
import { iconConfigs, useAppearance } from '../../../../providers/AppearanceProvider';
import type { IconKind } from '../../../../providers/AppearanceProvider';
import { DefaultHomeIcon } from '../../../../components/shared/DefaultHomeIcon';
export function IconEditor({kind}:{kind:IconKind}) {
 const appearance=useAppearance();
 return <>{iconConfigs[kind].map(({key,label},index)=><Fragment key={key}>{index===0?'\n            ':'\n        \n            '}<div className="theme-icon-choice" data-icon-kind={kind} data-icon-key={key}>{'\n                '}<PressedButton className={'theme-icon-choice-btn'+(appearance.iconDrafts[kind][key]!==appearance.icons[kind][key]?' is-changed':'')} type="button" aria-label={`更换 ${label} 图标`} onClick={()=>appearance.chooseIcon(kind,key)}>{appearance.iconDrafts[kind][key]?<img src={appearance.iconDrafts[kind][key]} alt=""/>:<DefaultHomeIcon kind={kind} iconKey={key}/>}</PressedButton>{'\n                '}<div className="theme-icon-choice-name">{label}</div>{'\n            '}</div></Fragment>)}{'\n        '}</>;
}
