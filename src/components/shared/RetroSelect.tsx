import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { useChoice } from '../../providers/ChoiceProvider';
import { PressedButton } from './PressedButton';
import type { ChoiceOption } from '../../providers/ChoiceProvider';
/** 复用已有古早选项弹窗，保留受控值与原来的保存回调。 */
export function RetroSelect({id,className,title,value,children,onChange}: {id?:string;className?:string;title:string;value:string;children:ReactNode;onChange:(value:string)=>void}) {
 const choice=useChoice();
 const options:ChoiceOption[]=Children.toArray(children).flatMap(child=>{
  if(!isValidElement<{value?:string;children?:ReactNode;attributes?:{name:string;value:string}[]}>(child))return [];
  const props=child.props,label=Children.toArray(props.children).filter(x=>typeof x==='string'||typeof x==='number').join('');
  return [{value:props.value??props.attributes?.find(a=>a.name==='value')?.value??label,label}];
 });
 const selected=options.find(o=>o.value===value);
 return <PressedButton id={id} className={`${className??''} retro-select-trigger`} type="button" aria-label={title} aria-haspopup="dialog" onClick={()=>choice.openChoice({title,options,selected:value,confirm:onChange})}>{selected?.label??value}<span aria-hidden="true" className="retro-select-arrow">▾</span></PressedButton>;
}
