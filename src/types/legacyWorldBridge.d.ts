import type { WorldBook, WorldEntry } from './world';
declare global { interface Window { smallphoneWorldbooks?: {getBooks:()=>WorldBook[];forCharacter:(id:string)=>WorldBook[];getEntries:(id:string)=>(WorldEntry&{book:string})[]}; } }
