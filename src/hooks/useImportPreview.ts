import {useCallback, useEffect, useRef, useState} from 'react';
export interface ImportPreviewState {
  title: string;
  message: string;
  kind: 'world' | 'dossier';
  rows: {name: string; detail: string; conflict?: string}[];
  choices: {value: string; label: string; primary?: boolean; danger?: boolean}[];
}
export function useImportPreview() {
  const [state,setState]=useState<ImportPreviewState|null>(null);
  const pending=useRef<((value:string)=>void)|null>(null);
  const choose=useCallback((value:string)=>{const resolve=pending.current;pending.current=null;setState(null);resolve?.(value);},[]);
  const open=useCallback((next:ImportPreviewState)=>new Promise<string>(resolve=>{pending.current?.('cancel');pending.current=resolve;setState(next);}),[]);
  useEffect(()=>()=>{pending.current?.('cancel');pending.current=null;},[]);
  return {state,open,choose};
}
