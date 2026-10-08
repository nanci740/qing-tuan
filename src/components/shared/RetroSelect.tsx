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
 const open=()=>choice.openChoice({style:className?.split(/\s+/).includes('vi-choice-btn')?'settings':undefined,title,options,selected:value,confirm:onChange});
 const label=<span className="retro-select-label">{selected?.label??value}</span>;
 const arrow=<svg viewBox="0 0 8 5" aria-hidden="true"><path d="M0 0h8L4 5z" /></svg>;
 // 聊天设置的凹陷框只显示值，独立方形按钮负责打开与按下反馈。
 if(className?.split(/\s+/).includes('chat-setting-select'))return <div id={id} className={`${className} retro-select-trigger`}>{label}<PressedButton id={id?`${id}Button`:undefined} className="retro-select-arrow" type="button" aria-label={title} aria-haspopup="dialog" onClick={open}>{arrow}</PressedButton></div>;
 return <PressedButton id={id} className={`${className??''} retro-select-trigger`} type="button" aria-label={title} aria-haspopup="dialog" onClick={open}>{label}<span aria-hidden="true" className="retro-select-arrow">{arrow}</span></PressedButton>;
}
