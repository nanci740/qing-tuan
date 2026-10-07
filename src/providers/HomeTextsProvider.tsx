import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
export const defaultHomeTexts = { starBubbleText: 'ੈ✩˚ Star ✩ ˖˚', moonBubbleText: '˚⋆ ꒰ঌ Moon˚☽ ⊹.˚', mainSubtitle: '꒰ა₊ Meeting you is my destiny ₊໒꒱', songTitle: 'Fortune arrives', songDetails: '𝜗𝜚·˖ 🎧 ıllıllı·♩.•˚ 🕊️ ⊹꙳🤍', mp3Brand: 'QINGTUAN · 520MB' };
export type HomeTextId = keyof typeof defaultHomeTexts;
export type HomeTextValues = Record<HomeTextId, string>;
export const homeTextStorageKeys: Record<HomeTextId,string> = { starBubbleText: 'bubble_star_custom', moonBubbleText: 'bubble_moon_custom', mainSubtitle: 'main_subtitle_custom', songTitle: 'player_song_title', songDetails: 'player_song_details', mp3Brand: 'player_mp3_brand' };
function savedTexts(): HomeTextValues { return Object.fromEntries(Object.entries(defaultHomeTexts).map(([id,value])=>{try{return [id,localStorage.getItem(homeTextStorageKeys[id as HomeTextId]) || value];}catch{return [id,value];}})) as HomeTextValues; }
function useTextState() {
  const [texts,setTexts] = useState(savedTexts), current = useRef(texts);
  const setText = useCallback((id: HomeTextId, value: string, persist=false) => { const next={...current.current,[id]:value};current.current=next;setTexts(next);if(persist)try{localStorage.setItem(homeTextStorageKeys[id],value);}catch{} },[]);
  return {texts,setText,getTexts:()=>({...current.current})};
}
const Context=createContext<ReturnType<typeof useTextState>|null>(null);
export function HomeTextsProvider({children}:{children:ReactNode}){const value=useTextState();return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useHomeTexts(){const value=useContext(Context);if(!value)throw new Error('HomeTextsProvider is required');return value;}
