import { PressedButton } from '../components/shared/PressedButton';
import { createContext, createElement, Fragment, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { MessageElement, MessageNode, MessageNodesApi, MessagesConnection, PeerMessageDetail } from '../types/chatMessages';
import type { NativeAttribute } from '../types/dom';
import * as model from '../utils/chatMessageNodes';
import { measureChatBubbleShape } from '../utils/chatBubbleGeometry';
import { DEFAULT_AVATAR, DEFAULT_BIRD_AVATAR } from '../utils/defaultAvatar';
import { CHAT_INITIAL_MESSAGES, CHAT_MORE_MESSAGES, isHistoryRow, messageWindow, shareMessageNodes } from '../utils/chatMessageWindow';
interface MessagesView { nodes: MessageNode[]; hidden: number; loadMore(): void; register(node: MessageElement, element: Element | null): void; list(element: HTMLDivElement | null): void; audio(element: HTMLAudioElement, playing: boolean, ended?: boolean): void; api: MessageNodesApi; }
const Context = createContext<MessagesView | null>(null);
const BindingsContext = createContext<Pick<MessagesView, 'register' | 'audio'> | null>(null);
/** 完整消息树由 React 状态持有；旧 HTML 只作为历史文件格式在边界编解码。 */
export function ChatMessagesProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<MessageNode[]>([]);
  const current = useRef<MessageNode[]>([]);
  const [visibleCount, setVisibleCount] = useState(CHAT_INITIAL_MESSAGES);
  const visibleRef = useRef(CHAT_INITIAL_MESSAGES);
  const snapshots = useRef(new Map<number, { node: MessageElement; element: HTMLElement }>());
  const followBottom = useRef(true);
  const scrollAnchor = useRef<{ key: number; top: number; scrollTop: number; bottom: boolean } | null>(null);
  const scrollFrame = useRef(0);
  const factory = useRef(model.messageFactory()).current;
  const listRef = useRef<HTMLDivElement | null>(null);
  const sources = useRef<MessagesConnection | null>(null);
  const refs = useRef(new Map<number, Element>());
  const keys = useRef(new WeakMap<Node, number>());
  const comments = useRef(new Map<number, Comment>());
  const resized = useRef(new Set<number>());
  const observed = useRef(new Map<number, { element: HTMLElement; observer: ResizeObserver }>());
  const resizeRows = useRef(new Set<number>());
  const resizeFrame = useRef(0);
  const boundVoices = useRef(new Set<number>());
  const layoutPending = useRef(new Map<number,{shape:boolean;align:boolean;selection:boolean}>());
  const labelPending = useRef(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const listeners = useRef(new Set<()=>void>());
  const queued = useRef(false), ready = useRef(false);
  const identity = () => sources.current?.identity() ?? { peer: '聊天', peerAvatar: DEFAULT_AVATAR, userAvatar: DEFAULT_BIRD_AVATAR };
  const clone = () => structuredClone(current.current);
  function captureAnchor() {
    const list = listRef.current;
    if (!list || scrollAnchor.current) return;
    const box = list.getBoundingClientRect();
    const row = Array.from(list.children).find(element => element instanceof HTMLElement && element.classList.contains('chat-message-row') && element.getBoundingClientRect().bottom > box.top) as HTMLElement | undefined;
    scrollAnchor.current = { key: row ? keys.current.get(row) ?? -1 : -1, top: row?.getBoundingClientRect().top ?? 0, scrollTop: list.scrollTop, bottom: list.scrollHeight - list.scrollTop - list.clientHeight < 64 };
  }
  function render(next: MessageNode[], sync = true, resetWindow = false) {
    next = shareMessageNodes(current.current, next);
    if (next === current.current) return;
    captureAnchor();
    const before = current.current.filter(isHistoryRow).length, after = next.filter(isHistoryRow).length;
    // 新消息继续加入当前窗口，不挤走正在阅读的历史消息。
    if (resetWindow) { visibleRef.current = CHAT_INITIAL_MESSAGES; scrollAnchor.current = null; followBottom.current = true; }
    else if (after > before) visibleRef.current += after - before;
    current.current = next;
    const byKey = new Map(next.map(node => [node.key, node]));
    for (const [key, value] of snapshots.current) if (byKey.get(key) !== value.node) snapshots.current.delete(key);
    const apply = () => { setVisibleCount(visibleRef.current); setNodes(next); };
    if (sync && ready.current) flushSync(apply); else apply();
  }
  function snapshot(node: MessageElement): HTMLElement {
    const live = refs.current.get(node.key);
    if (live instanceof HTMLElement) return live;
    const cached = snapshots.current.get(node.key);
    if (cached?.node === node) return cached.element;
    // 未显示消息的只读兼容视图按需从 React 数据生成；不会挂到页面或反向读回状态。
    const encode = (item: MessageNode): Node => {
      if (item.kind !== 'element') return item.kind === 'comment' ? document.createComment(item.text) : document.createTextNode(item.text);
      const element = document.createElementNS(item.namespace, item.tag);
      keys.current.set(element, item.key);
      for (const attribute of item.attrs) {
        const name = attribute.prefix ? attribute.prefix + ':' + attribute.name : attribute.name;
        if (attribute.namespace) element.setAttributeNS(attribute.namespace, name, attribute.value); else element.setAttribute(name, attribute.value);
      }
      item.children.forEach(child => element.appendChild(encode(child)));
      return element;
    };
    const element = encode(node) as HTMLElement;
    snapshots.current.set(node.key, { node, element });
    return element;
  }
  function showRow(row: HTMLElement, options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }) {
    const key = keys.current.get(row), index = current.current.findIndex(node => node.key === key);
    if (index < 0) return null;
    const needed = current.current.slice(index).filter(isHistoryRow).length;
    if (needed > visibleRef.current) {
      scrollAnchor.current = null; visibleRef.current = needed;
      flushSync(() => setVisibleCount(needed));
    }
    const live = key === undefined ? null : refs.current.get(key);
    if (!(live instanceof HTMLElement)) return null;
    scrollAnchor.current = null; cancelAnimationFrame(scrollFrame.current);
    followBottom.current = false;
    live.scrollIntoView(options);
    return live;
  }
  function loadMore() {
    captureAnchor(); requestLayout(current.current,undefined,true,true); visibleRef.current += CHAT_MORE_MESSAGES;
    flushSync(() => setVisibleCount(visibleRef.current));
  }
  function childSignature(nodes:MessageNode[]):string {return JSON.stringify(nodes.map(node=>node.kind==='element'?[node.key,node.tag,childSignature(node.children)]:[node.key,node.kind,node.text]));}
  function requestLayout(next:MessageNode[], row?:MessageElement, align=false, selection=false) {
    const rows=row?[row]:next.filter(n=>n.kind==='element'&&model.hasClass(n,'chat-message-row')) as MessageElement[];
    for(const item of rows){const old=layoutPending.current.get(item.key);layoutPending.current.set(item.key,{shape:true,align:align||!!old?.align,selection:selection||!!old?.selection});}
  }
  function announce(labels=true) {
    labelPending.current ||= labels;
    if(queued.current)return; queued.current=true;
    queueMicrotask(()=>{
      queued.current=false;
      // 原先历史保存观察器先于标签观察器执行，保留其保存顺序；标签更新不会再触发一次保存。
      listeners.current.forEach(listener=>listener());
      const shouldLabel=labelPending.current;labelPending.current=false;
      if(shouldLabel){const next=structuredClone(current.current), before=JSON.stringify(next);model.labelMessages(next,identity().peer);if(JSON.stringify(next)!==before)render(next);}
    });
  }
  function publish(next: MessageNode[], notify=true, resetWindow=false) { const before=current.current;render(next,true,resetWindow);if(notify&&(next.length||before.length))announce(childSignature(next)!==childSignature(before)); }
  function mutate(action:(next:MessageNode[])=>MessageNode[]|void, notify=true) { const next=clone();const result=action(next)||next;publish(result,notify&&JSON.stringify(result)!==JSON.stringify(current.current)); }
  function getNode(next:MessageNode[],element:Element) {const key=keys.current.get(element);return key===undefined?undefined:model.elements(next,n=>n.key===key)[0];}
  function normalized(next:MessageNode[]) { const result=model.normalizeMessages(next,identity(),factory,bubble=>resized.current.add(bubble.key));requestLayout(result,undefined,true,true);return result; }
  function register(node:MessageElement,element:Element|null) {if(element){refs.current.set(node.key,element);keys.current.set(element,node.key);}else refs.current.delete(node.key);}
  function target<T extends HTMLElement=HTMLElement>(node:MessageElement|undefined):T {const result=node&&refs.current.get(node.key);if(!(result instanceof HTMLElement))throw Error('消息节点尚未挂载');return result as T;}
  function updateRow(row:HTMLElement,action:(node:MessageElement,next:MessageNode[])=>void,notify=true) {mutate(next=>{const node=getNode(next,row);if(node)action(node,next);},notify);}
  function geometry(next:MessageNode[], reference:ReadonlyMap<number,Element>=refs.current, selectionParent:HTMLElement|null=listRef.current, modes?:ReadonlyMap<number,{shape:boolean;align:boolean;selection:boolean}>):boolean {
    let changed=false;
    const assign=(node:MessageElement,name:string,value:string)=>{if(model.attr(node,name)!==value){model.setAttr(node,name,value);changed=true;}};
    for(const row of model.elements(next,n=>model.hasClass(n,'chat-message-row'))){
      const mode=modes?.get(row.key) ?? (modes?null:{shape:true,align:true,selection:true});if(!mode)continue;
      const rowElement=reference.get(row.key),bubble=model.findClass(row,'chat-bubble'),bubbleElement=bubble&&reference.get(bubble.key);
      if(!(rowElement instanceof HTMLElement)||!(bubbleElement instanceof HTMLElement)||!bubble)continue;
      const shape=model.directClass(bubble,'chat-bubble-shape');
      if(shape&&mode.shape){const g=measureChatBubbleShape(rowElement,bubbleElement);assign(shape,'viewBox',g.viewBox);
        changed=model.styleAttr(shape,{width:g.width,height:g.height,left:g.left,right:g.right})||changed;
        const base=model.elements(shape.children,n=>model.hasClass(n,'chat-bubble-shape-base'))[0];if(base)assign(base,'d',g.path);
      }
      const avatar=model.findClass(row,'chat-message-mini-avatar'),avatarElement=avatar&&reference.get(avatar.key),wrap=bubbleElement.closest('.chat-bubble-wrap');
      if(mode.align&&avatar&&avatarElement instanceof HTMLElement&&wrap){
        const ignored=new Set(['chat-bubble-shape','chat-bubble-sparkle','chat-quoted-message','chat-voice-audio']);
        const content=Array.from(bubbleElement.childNodes).filter(node=>node.nodeType===Node.TEXT_NODE?!!node.textContent?.trim():node instanceof Element&&!!node.textContent?.trim()&&!Array.from(node.classList).some(c=>ignored.has(c)));
        let last:DOMRect|null=null;for(let i=content.length-1;i>=0&&!last;i--)try{const range=document.createRange();range.selectNodeContents(content[i]);last=Array.from(range.getClientRects()).filter(r=>r.width>0&&r.height>0).at(-1)||null;}catch{/* 保留原范围测量失败的回退 */}
        const box=bubbleElement.getBoundingClientRect(),center=last?last.top+last.height/2:box.top+box.height/2;
        const lift=Math.max(0,wrap.getBoundingClientRect().bottom-(center+(avatarElement.getBoundingClientRect().height||28)/2));
        changed=model.styleAttr(avatar,{'margin-bottom':`${Math.round(lift*10)/10}px`})||changed;
      }
      if(mode.selection && selectionParent?.contains(rowElement)){
        const rowBox=rowElement.getBoundingClientRect(),box=bubbleElement.getBoundingClientRect();
        changed=model.styleAttr(row,{'--chat-select-center':`${Math.round((box.top-rowBox.top+box.height/2)*10)/10}px`})||changed;
      }
    }
    return changed;
  }
  const apiRef=useRef<MessageNodesApi|null>(null);
  if(!apiRef.current)apiRef.current={
    container:()=>listRef.current,
    rows:(limit)=>{ const rows=current.current.filter(n=>n.kind==='element'&&(model.hasClass(n,'chat-message-row')||model.hasClass(n,'chat-recall-notice')&&model.attr(n,'data-recalled-by'))) as MessageElement[]; return (limit ? rows.slice(-limit) : rows).map(snapshot); },
    html:()=>model.serializeMessageNodes(current.current),
    count:()=>model.elements(current.current,node=>model.hasClass(node,'chat-bubble')).length,
    pinned(){const node=current.current.filter((node):node is MessageElement=>node.kind==='element'&&model.hasClass(node,'chat-message-row')&&model.attr(node,'data-pinned')==='true').at(-1);return node?snapshot(node):null;},
    storedHtml(){
      const next=clone().filter(node=>node.kind!=='element'||!model.hasClass(node,'chat-date-divider')&&!model.hasClass(node,'chat-unread-divider'));
      for(const avatar of model.elements(next,node=>model.hasClass(node,'chat-message-mini-avatar')))model.removeAttr(avatar,'src');
      return model.serializeMessageNodes(next);
    },
    scrollTo:showRow,
    scrollLatest(force=false){const list=listRef.current;if(list&&(force||followBottom.current)){followBottom.current=true;list.scrollTop=list.scrollHeight;}},
    audioElements:()=>Array.from(refs.current.values()).filter((element):element is HTMLAudioElement=>element instanceof HTMLAudioElement),
    resolve(element){const key=keys.current.get(element);const live=key===undefined?null:refs.current.get(key);if(live instanceof HTMLElement)return live;const node=key===undefined?undefined:model.elements(current.current,n=>n.key===key)[0];return node?snapshot(node):element;},
    attributes(element,values){updateRow(element,node=>{for(const[key,value]of Object.entries(values))model.setAttr(node,key,value);},false);},
    id(row){const existing=getNode(current.current,row);const present=existing&&model.attr(existing,'data-message-id').trim();if(present)return present;let id='';updateRow(row,node=>{id=model.attr(node,'data-message-id').trim();if(!id){id=model.newMessageId();model.setAttr(node,'data-message-id',id);}});return id;},
    pins(){mutate(next=>{model.pinMessages(next,factory);});},
    date(container){if(container!==listRef.current){container.innerHTML=model.serializeMessageNodes(model.dateDividers(model.readMessageNodes(container,factory),factory));return;}mutate(next=>model.dateDividers(next,factory));},
    read(row,value){updateRow(row,node=>{if(model.hasClass(node,'is-user')){model.setAttr(node,'data-read',String(value));model.toggleClass(node,'is-read',value);}});apiRef.current!.receipts();},
    playing(pill,value){updateRow(pill,node=>{model.toggleClass(node,'is-playing',value);model.setAttr(node,'aria-label',value?'暂停语音消息':'播放语音消息');},false);},
    click(event){const el=event.target;if(!(el instanceof Element))return;if(!sources.current?.canInteract()){event.preventDefault();return;}
      const quote=el.closest<HTMLElement>('.chat-quoted-message');if(quote){event.preventDefault();const id=quote.dataset.quoteTarget;const node=id?current.current.find(n=>n.kind==='element'&&model.hasClass(n,'chat-message-row')&&model.attr(n,'data-message-id')===id):null;const row=node?.kind==='element'?showRow(snapshot(node)):null;
        if(!(row instanceof HTMLElement)){sources.current?.notice('原消息已不存在');return;}apiRef.current!.toggle(row,'is-quote-target',false);void row.offsetWidth;apiRef.current!.toggle(row,'is-quote-target',true);const timer=setTimeout(()=>{apiRef.current!.toggle(row,'is-quote-target',false);timers.current.delete(timer);},1300);timers.current.add(timer);return;}
      const transcript=el.closest<HTMLElement>('.chat-voice-text-result');if(transcript){event.preventDefault();const row=transcript.closest<HTMLElement>('.chat-message-row');if(row&&!transcript.classList.contains('is-collapsed'))apiRef.current!.toggleTranscript(row);return;}
      const pill=el.closest<HTMLElement>('.chat-voice-control');if(pill){event.preventDefault();sources.current?.play(pill);}
    },
    keyDown(event){const el=event.target;if(!(el instanceof Element))return;const pill=el.closest<HTMLElement>('.chat-voice-control');if(pill&&(event.key==='Enter'||event.key===' ')){event.preventDefault();sources.current?.play(pill);}},
    appendHtml(html){publish([...clone(),...model.parseMessageHtml(html,factory)]);},
    replace(html){publish(model.parseMessageHtml(html,factory),true,true);},clear(){publish([],true,true);},
    refresh(container){if(container&&container!==listRef.current){let next=model.readMessageNodes(container,factory);next=normalized(next);container.innerHTML=model.serializeMessageNodes(next);
      const elements=Array.from(container.querySelectorAll('*')),temporary=new Map<number,Element>();model.elements(next,()=>true).forEach((node,index)=>{if(elements[index])temporary.set(node.key,elements[index]);});geometry(next,temporary,container);container.innerHTML=model.serializeMessageNodes(next);return;}mutate(next=>normalized(next));
      // 原分组函数每次都会写入用户行的 data-read，值相同也触发历史保存；RAF 回调之间的保存时机须保留。
      if(model.elements(current.current,row=>model.hasClass(row,'chat-message-row')&&model.hasClass(row,'is-user')).length)announce(false);},
    receipts(container){if(container&&container!==listRef.current){const next=model.readMessageNodes(container,factory);model.receipts(next,factory);container.innerHTML=model.serializeMessageNodes(next);return;}mutate(next=>{model.receipts(next,factory);});},
    setData(element,values){updateRow(element,node=>{for(const [key,value]of Object.entries(values))model.setAttr(node,'data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value);},Object.keys(values).some(key=>['favorite','pinned','messageId','quoteTarget','read','sentAt','edited'].includes(key)));},
    toggle(element,token,value){let result=false;updateRow(element,node=>{result=model.toggleClass(node,token,value);},false);return result;},
    remove(elements){const remove=new Set(elements.map(element=>keys.current.get(element)).filter((key):key is number=>key!==undefined));mutate(next=>model.removeKeys(next,remove));},
    edit(row,value,before,changed){updateRow(row,node=>{requestLayout(current.current,node);if(changed){model.setAttr(node,'data-edited','true');if(!model.attr(node,'data-original-content'))model.setAttr(node,'data-original-content',before);}if(model.attr(node,'data-chat-ai-content'))model.setAttr(node,'data-chat-ai-content',value);
      const bubble=model.findClass(node,'chat-bubble'),caption=bubble?.children.find(n=>n.kind==='element'&&n.tag==='div'&&!model.hasClass(n,'chat-quoted-message')) as MessageElement|undefined;
      if(caption)model.setText(caption,value,factory);else if(bubble){bubble.children=bubble.children.filter(n=>n.kind!=='text');bubble.children.push(factory.text(value));}
    });},
    recall(row,content,notice,by,sentAt,seen){mutate(next=>{const key=keys.current.get(row);if(key!==undefined)model.replaceKey(next,key,model.recallNode({reply:content,recallNotice:notice,sentAt},factory,by,seen));});},
    appendPeer(text){const row=model.peerNode(text,identity().peerAvatar,factory);mutate(next=>normalized([...next,row]));return{row:target(row),caption:target(model.findClass(row,'chat-bubble')?.children.find(n=>n.kind==='element'&&n.tag==='div') as MessageElement),time:target(model.findClass(row,'chat-bubble-time'))};},
    finishPeer(row,detail){updateRow(row,node=>{requestLayout(current.current,node);
      const bubble=model.findClass(node,'chat-bubble'),time=model.findClass(node,'chat-bubble-time');if(!bubble)return;
      if(detail.voice){const caption=bubble.children.find(n=>n.kind==='element'&&n.tag==='div'&&!model.hasClass(n,'chat-quoted-message'));
        if(caption)model.replaceKey(bubble.children,caption.key,model.voiceNode(detail.voice,factory));model.toggleClass(bubble,'chat-bubble--voice',true);model.setAttr(node,'data-voice-transcript',detail.reply);if(detail.voiceAutoText)model.setResult(node,'chat-voice-text-result',detail.reply,factory);
      }
      if(detail.quote){const caption=bubble.children.find(n=>n.kind==='element'&&n.tag==='div'&&!model.hasClass(n,'chat-quoted-message'));const quote=model.quoteNode(detail.quote,detail.quoteTargetId||'',factory);if(caption)model.insertBeforeKey(bubble.children,caption.key,quote);else bubble.children.push(quote);}
      const selectionStyle=model.attr(node,'style');model.removeAttr(node,'style');
      model.setAttr(node,'data-chat-ai-content',detail.reply);model.setAttr(node,'data-sent-at',String(detail.sentAt??Date.now()));if(selectionStyle)model.setAttr(node,'style',selectionStyle);if(time)model.setText(time,new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}),factory);
    });},
    appendUser(text,voice,quote){const row=model.userNode(text,voice,quote,identity().userAvatar,factory);mutate(next=>normalized([...next,row]));return{row:target(row),time:target(model.findClass(row,'chat-bubble-time'))};},
    result(row,className,text){updateRow(row,node=>{model.setResult(node,className,text,factory);requestLayout(current.current,node);});},translation(row,text){updateRow(row,node=>model.setTranslation(node,text,factory));},
    toggleTranscript(row){let expanded=false;updateRow(row,node=>{requestLayout(current.current,node);const result=model.findClass(node,'chat-voice-text-result');if(!result)return;expanded=!model.toggleClass(result,'is-collapsed');const bubble=model.findClass(node,'chat-bubble');if(bubble)model.toggleClass(bubble,'has-message-result',expanded);},false);return expanded;},
    markRead(row,all=false){mutate(next=>{const list=all?model.elements(next,n=>model.hasClass(n,'chat-message-row')&&model.hasClass(n,'is-user')):row?[getNode(next,row)].filter((n):n is MessageElement=>!!n):[];for(const node of list){if(!model.hasClass(node,'is-user'))continue;model.setAttr(node,'data-read','true');model.toggleClass(node,'is-read',true);}model.receipts(next,factory);});},
    identity(){const next=clone();model.labelMessages(next,identity().peer);render(next);},
    unread(count){let marker:MessageElement|undefined,first:MessageElement|undefined;const n=Math.max(0,Number(count)||0);if(!n)return null;
      mutate(next=>{next=model.removeKeys(next,new Set(model.elements(next,node=>model.hasClass(node,'chat-unread-divider')).map(node=>node.key)));const rows=model.elements(next,row=>model.hasClass(row,'chat-message-row')&&model.hasClass(row,'is-chat')&&model.attr(row,'data-recalled')!=='true'&&model.attr(row,'data-ai-pending')!=='true');first=rows[Math.max(0,rows.length-n)];if(first){marker=factory.element('div',{class:'chat-unread-divider',role:'separator'},[factory.text('以下为新消息')]);model.insertBeforeKey(next,first.key,marker);}return next;});return marker&&first?(showRow(snapshot(first),{behavior:'auto',block:'start'}),{divider:target(marker),firstUnread:target(first)}):null;
    },
    repair(){let repaired=false;mutate(next=>{repaired=model.repairStructuredMessages(next,factory);});return repaired;},
    bindVoice(pill){const key=keys.current.get(pill);if(key===undefined)return;if(boundVoices.current.has(key))return;boundVoices.current.add(key);updateRow(pill,node=>{const wave=model.findClass(node,'chat-voice-wave');if(wave&&wave.children.filter(n=>n.kind==='element').length!==6)wave.children=Array.from({length:6},()=>factory.element('span'));model.toggleClass(node,'is-playing',false);model.setAttr(node,'aria-label','播放语音消息');},false);},
    forwardHtml(html,text,items,source,mode,record){const isolated=model.messageFactory(),next=model.parseMessageHtml(html,isolated);next.push(model.forwardNode(text,items,source,mode,record,isolated));return model.serializeMessageNodes(next);},
    backgroundHtml(html,detail){const isolated=model.messageFactory(),next=model.parseMessageHtml(html,isolated);if(!detail.recalled)for(const row of model.elements(next,n=>model.hasClass(n,'chat-message-row')&&model.hasClass(n,'is-user'))){model.toggleClass(row,'is-read',true);model.setAttr(row,'data-read','true');}next.push(model.backgroundNode(detail,isolated));return model.serializeMessageNodes(next);},
    recallHtml(html,detail){const isolated=model.messageFactory(),next=model.parseMessageHtml(html,isolated);const row=model.elements(next,n=>model.hasClass(n,'chat-message-row')&&model.attr(n,'data-message-id')===detail.messageId)[0];if(!row)return null;model.replaceKey(next,row.key,model.recallNode(detail,isolated));return model.serializeMessageNodes(next);},
    onChange(listener){listeners.current.add(listener);return()=>listeners.current.delete(listener);}
  };
  const api=apiRef.current;
  const registerRef=useCallback(register,[]);
  const registerList=useCallback((element:HTMLDivElement|null)=>{listRef.current=element;},[]);
  useEffect(()=>{const list=listRef.current;if(!list)return;const scroll=()=>{if(!scrollAnchor.current)followBottom.current=list.scrollHeight-list.scrollTop-list.clientHeight<64;};list.addEventListener('scroll',scroll,{passive:true});return()=>list.removeEventListener('scroll',scroll);},[]);
  const onAudio=useCallback((audio:HTMLAudioElement,playing:boolean,ended=false)=>{if(ended)audio.currentTime=0;const pill=audio.closest<HTMLElement>('.chat-voice-control');if(!pill)return;updateRow(pill,node=>{model.toggleClass(node,'is-playing',playing);model.setAttr(node,'aria-label',playing?'暂停语音消息':'播放语音消息');},false);},[]);
  useEffect(()=>{ready.current=true;return()=>{ready.current=false;cancelAnimationFrame(scrollFrame.current);cancelAnimationFrame(resizeFrame.current);observed.current.forEach(v=>v.observer.disconnect());listeners.current.clear();for(const timer of timers.current)clearTimeout(timer);};},[]);
  useLayoutEffect(()=>{const connect=(event:Event)=>{const detail=(event as CustomEvent<MessagesConnection>).detail;sources.current=detail;detail.accept(api);};window.addEventListener('qingtuan:chat-messages-connect',connect);return()=>window.removeEventListener('qingtuan:chat-messages-connect',connect);},[api]);
  useLayoutEffect(()=>{
    // React 不插入额外包裹；旧 HTML 中的注释通过组件效果保留原位置。
    const liveKeys=new Set<number>();const collectComments=(items:MessageNode[])=>{items.forEach(item=>{if(item.kind==='comment')liveKeys.add(item.key);else if(item.kind==='element')collectComments(item.children);});};collectComments(nodes);
    for(const[key,comment]of comments.current)if(!liveKeys.has(key)){comment.remove();comments.current.delete(key);}
    const aliveComments=new Set<number>();
    const restore=(children:MessageNode[],parent:Node,offset=0)=>{
      children.forEach((node,index)=>{if(node.kind==='comment'){aliveComments.add(node.key);let comment=comments.current.get(node.key);if(!comment){comment=document.createComment(node.text);comments.current.set(node.key,comment);keys.current.set(comment,node.key);}comment.textContent=node.text;if(parent.childNodes[index+offset]!==comment)parent.insertBefore(comment,parent.childNodes[index+offset]||null);}else if(node.kind==='element'){const element=refs.current.get(node.key);if(element)restore(node.children,element);}});
    };
    const visible=messageWindow(nodes,visibleCount).nodes;
    if(listRef.current){const button=listRef.current.querySelector('[data-chat-load-more]');restore(visible,listRef.current,button?1:0);}for(const[key,comment]of comments.current)if(!aliveComments.has(key)){comment.remove();comments.current.delete(key);}
    for(const[key,item]of observed.current){if(!refs.current.has(key)){item.observer.disconnect();observed.current.delete(key);}}
    if(typeof ResizeObserver==='function')for(const key of resized.current){const element=refs.current.get(key);if(element instanceof HTMLElement&&!observed.current.has(key)){const observer=new ResizeObserver(()=>{
      const row=element.closest('.chat-message-row'),key=row&&keys.current.get(row);if(key==null)return;
      resizeRows.current.add(key);if(resizeFrame.current)return;
      // 同一帧的多个气泡尺寸变化只复制、测量一次消息树。
      resizeFrame.current=requestAnimationFrame(()=>{resizeFrame.current=0;const modes=new Map([...resizeRows.current].map(key=>[key,{shape:true,align:true,selection:true}]));resizeRows.current.clear();const next=clone();if(geometry(next,refs.current,listRef.current,modes))render(next);});
    });observer.observe(element);observed.current.set(key,{element,observer});}}
    if(layoutPending.current.size){
      const requested=new Map(layoutPending.current);layoutPending.current.clear();
      const initial=new Map(requested),after=new Map<number,{shape:boolean;align:boolean;selection:boolean}>();
      for(const[key,mode]of initial)if(mode.align&&mode.selection){initial.set(key,{...mode,selection:false});after.set(key,{shape:false,align:false,selection:true});}
      const next=structuredClone(current.current);let changed=geometry(next,refs.current,listRef.current,initial);
      if(changed&&after.size){for(const[key,mode]of after)layoutPending.current.set(key,mode);}
      else if(after.size)changed=geometry(next,refs.current,listRef.current,after)||changed;
      if(changed)render(next,false);
    }
    const restoreScroll=()=>{
      const anchor=scrollAnchor.current,list=listRef.current;if(!anchor||!list)return;
      if(anchor.bottom)list.scrollTop=list.scrollHeight;
      else {const element=refs.current.get(anchor.key);if(element instanceof HTMLElement)list.scrollTop+=element.getBoundingClientRect().top-anchor.top;else list.scrollTop=anchor.scrollTop;}
    };
    restoreScroll();cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current=requestAnimationFrame(()=>{restoreScroll();scrollAnchor.current=null;});
  },[nodes,visibleCount]);
  useEffect(()=>{const resize=()=>{const next=structuredClone(current.current);const modes=new Map(model.elements(next,n=>model.hasClass(n,'chat-message-row')).map(n=>[n.key,{shape:false,align:false,selection:true}]));if(geometry(next,refs.current,listRef.current,modes))render(next);};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  const bindings=useMemo(()=>({register:registerRef,audio:onAudio}),[registerRef,onAudio]);
  const windowed=messageWindow(nodes,visibleCount);
  return <BindingsContext.Provider value={bindings}><Context.Provider value={{nodes:windowed.nodes,hidden:windowed.hidden,loadMore,register:registerRef,list:registerList,audio:onAudio,api}}>{children}</Context.Provider></BindingsContext.Provider>;
}
export function useChatMessages(){const value=useContext(Context);if(!value)throw Error('ChatMessagesProvider is required');return value;}
export function ChatMessageContent(){const {nodes,hidden,loadMore}=useChatMessages();return <>{hidden>0&&<PressedButton data-chat-load-more type="button" className="chat-history-load-more sp-press-bare" onClick={loadMore} aria-label="加载更早的聊天记录">查看更多消息</PressedButton>}{nodes.map(node=><MessageNodeView key={node.key} node={node}/>)}</>;}
const MessageNodeView=memo(function MessageNodeView({node}:{node:MessageNode}){if(node.kind==='comment')return null;if(node.kind==='text')return <Fragment>{node.text}</Fragment>;return <MessageElementView node={node}/>;});
function MessageElementView({node}:{node:MessageElement}){
  const {register,audio}=useContext(BindingsContext)!;const prior=useRef<NativeAttribute[]>([]);
  const ref=useCallback((element:Element|null)=>{
    register(node,element);if(!element)return;
    for(const old of prior.current)if(!node.attrs.some(a=>a.name===old.name&&a.namespace===old.namespace&&a.prefix===old.prefix)){if(old.namespace)element.removeAttributeNS(old.namespace,old.name);else element.removeAttribute(old.prefix?old.prefix+':'+old.name:old.name);}
    for(const attribute of node.attrs){const name=attribute.prefix?attribute.prefix+':'+attribute.name:attribute.name;
      if(attribute.namespace){if(element.getAttributeNS(attribute.namespace,attribute.name)!==attribute.value)element.setAttributeNS(attribute.namespace,name,attribute.value);}else if(element.getAttribute(name)!==attribute.value)element.setAttribute(name,attribute.value);}
    // 保留历史 HTML 的属性排列：完成回复后的布局 style 位于回复元数据之后。
    if(node.attrs.at(-1)?.name==='style'&&element.attributes.item(element.attributes.length-1)?.name!=='style'){const style=element.getAttribute('style');if(style!==null){element.removeAttribute('style');element.setAttribute('style',style);}}
    prior.current=node.attrs;
  },[node,register]);
  const props:{ref:(element:Element|null)=>void;type?:string;onPlay?:(event:React.SyntheticEvent<HTMLAudioElement>)=>void;onPause?:(event:React.SyntheticEvent<HTMLAudioElement>)=>void;onEnded?:(event:React.SyntheticEvent<HTMLAudioElement>)=>void}={ref};
  if(node.tag==='input')props.type=model.attr(node,'type')||'text';
  if(node.tag==='audio'){props.onPlay=event=>audio(event.currentTarget,true);props.onPause=event=>audio(event.currentTarget,false);props.onEnded=event=>audio(event.currentTarget,false,true);}
  return createElement(node.tag,props,node.children.length?node.children.map(child=><MessageNodeView key={child.key} node={child}/>):undefined);
}
