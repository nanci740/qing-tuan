import {createContext,useCallback,useContext,useRef} from 'react';
import type {ReactNode} from 'react';
export interface NativeRefs {register(key:string,element:Element|null):void;get<T extends Element=HTMLElement>(key:string):T|null;}
const Context=createContext<NativeRefs|null>(null);
/** 原生组件通过 ref 注册兼容节点；控制器不从 document 按 ID 查找。 */
export function NativeRefsProvider({children}:{children:ReactNode}){const elements=useRef(new Map<string,Element>());const api=useRef<NativeRefs|null>(null);const register=useCallback((key:string,node:Element|null)=>{if(node)elements.current.set(key,node);else elements.current.delete(key);},[]);if(!api.current)api.current={register,get:<T extends Element>(key:string)=>elements.current.get(key) as T|null??null};return <Context.Provider value={api.current}>{children}</Context.Provider>;}
export function useNativeRefs(){return useContext(Context);}
