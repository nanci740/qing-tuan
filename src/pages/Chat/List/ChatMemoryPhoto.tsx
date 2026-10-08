import {useChatMemory} from '../../../providers/ChatMemoryProvider';
import {PhotoImage} from '../../../components/shared/PhotoImage';
import type {NativeAttribute} from '../../../types/dom';
export function ChatMemoryPhoto({attributes}:{attributes:NativeAttribute[]}){
  const memory=useChatMemory(),id=attributes.find(a=>a.name==='id')!.value;
  return <div className="chat-memory-photo-wrap" tabIndex={0} role="button" aria-label="添加或更换回忆照片"
    onClick={()=>memory.open(id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();memory.open(id);}}}>
    <PhotoImage className="chat-memory-photo" id={id} alt="回忆照片" src={memory.photos[id]}/>
  </div>;
}
export function ChatMemoryInput(){const memory=useChatMemory();return <input ref={memory.input} type="file" accept="image/*" hidden aria-label="选择回忆照片" onChange={memory.change}/>;}
