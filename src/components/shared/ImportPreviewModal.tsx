import {createPortal} from 'react-dom';
import {useLayoutEffect,useRef} from 'react';
import type {ImportPreviewState} from '../../hooks/useImportPreview';
import {PressedButton} from './PressedButton';
export function ImportPreviewModal({state,choose}:{state:ImportPreviewState|null;choose:(value:string)=>void}) {
  const card=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    if(!state)return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    card.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();choose('cancel');}
      if(event.key==='Tab'){
        const buttons=[...card.current!.querySelectorAll<HTMLButtonElement>('button')];
        const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
        event.preventDefault();buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
      }
    };
    document.addEventListener('keydown',key,true);
    return()=>{document.removeEventListener('keydown',key,true);if(previous?.isConnected)previous.focus();};
  },[state,choose]);
  if(!state)return null;
  return createPortal(<div className="world-confirm-overlay world-json-import-overlay import-preview-overlay open" onClick={e=>{if(e.target===e.currentTarget)choose('cancel');}}>
    <div className="world-confirm-card" ref={card} role="dialog" aria-modal="true" aria-label={state.title}>
      <div className="world-confirm-title">{state.title}</div>
      <div className="world-confirm-message">{state.message}</div>
      <ul className="import-preview-list" aria-label="待导入内容">{state.rows.map((row,index)=><li key={index}><strong>{row.name}</strong><span>{row.detail}</span>{row.conflict&&<span className="import-preview-conflict">{row.conflict}</span>}</li>)}</ul>
      <div className="world-import-choices">{state.choices.map(choice=><PressedButton key={choice.value} type="button" className={'world-confirm-btn'+(choice.primary||choice.danger?' primary':'')+(choice.danger?' is-danger':'')} {...(state.kind==='world'?{'data-world-import':choice.value}:{'data-dossier-import':choice.value})} onClick={()=>choose(choice.value)}>{choice.label}</PressedButton>)}</div>
    </div>
  </div>,document.body);
}
