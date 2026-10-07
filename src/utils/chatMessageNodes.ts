import type { NativeAttribute } from '../types/dom';
import type { MessageComment, MessageElement, MessageFactory, MessageIdentity, MessageNode, MessageVoice, PeerMessageDetail } from '../types/chatMessages';
import { parseChatAiSegmentedReply } from './chatReplyParser';
const HTML = 'http://www.w3.org/1999/xhtml';
export const SVG = 'http://www.w3.org/2000/svg';
export function messageFactory(): MessageFactory {
  let counter = 0;
  const key = () => ++counter;
  return {
    key, text: value => ({ kind: 'text', key: key(), text: String(value ?? '') }),
    comment: text => ({ kind: 'comment', key: key(), text }),
    element: (tag, attrs = {}, children = [], namespace = HTML) => ({ kind: 'element', key: key(), tag, namespace,
      attrs: Array.isArray(attrs) ? attrs : Object.entries(attrs).map(([name, value]) => ({ name, value: String(value) })), children })
  };
}
export function nodeAttributes(element: Element): NativeAttribute[] {
  return Array.from(element.attributes, a => ({ name: a.localName, value: a.value,
    ...(a.namespaceURI ? { namespace: a.namespaceURI } : {}), ...(a.prefix ? { prefix: a.prefix } : {}) }));
}
/** 旧 HTML 仅在导入 / 导出边界解码；页面渲染不加载 HTML 字串或旧脚本。 */
export function parseMessageHtml(html: string, factory: MessageFactory, existing?: WeakMap<Node, number>): MessageNode[] {
  const template = document.createElement('template'); template.innerHTML = html;
  return readMessageNodes(template.content, factory, existing);
}
export function readMessageNodes(parent: Node, factory: MessageFactory, existing?: WeakMap<Node, number>): MessageNode[] {
  return Array.from(parent.childNodes, node => {
    const key = existing?.get(node) ?? factory.key();
    existing?.set(node,key);
    if (node instanceof Element) return { kind: 'element', key, tag: node.localName, namespace: node.namespaceURI || HTML,
      attrs: nodeAttributes(node), children: readMessageNodes(node, factory, existing) } as MessageElement;
    return { kind: node.nodeType === Node.COMMENT_NODE ? 'comment' : 'text', key, text: node.textContent || '' } as MessageComment;
  });
}
export function serializeMessageNodes(nodes: MessageNode[]): string {
  const template = document.createElement('template');
  const encode = (node: MessageNode): Node => {
    if (node.kind !== 'element') return node.kind === 'comment' ? document.createComment(node.text) : document.createTextNode(node.text);
    const element = document.createElementNS(node.namespace, node.tag);
    for (const attr of node.attrs) {
      const name = attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name;
      if (attr.namespace) element.setAttributeNS(attr.namespace, name, attr.value); else element.setAttribute(name, attr.value);
    }
    for (const child of node.children) element.appendChild(encode(child));
    return element;
  };
  nodes.forEach(node => template.content.appendChild(encode(node)));
  return template.innerHTML;
}
export function elements(nodes: MessageNode[], predicate: (node: MessageElement) => boolean): MessageElement[] {
  const result: MessageElement[] = [];
  const visit = (node: MessageNode) => { if (node.kind !== 'element') return; if (predicate(node)) result.push(node); node.children.forEach(visit); };
  nodes.forEach(visit); return result;
}
export function attr(node: MessageElement, name: string): string { return node.attrs.find(a => a.name === name && !a.namespace)?.value || ''; }
export function setAttr(node: MessageElement, name: string, value: unknown) {
  const next = String(value); const found = node.attrs.find(a => a.name === name && !a.namespace);
  if (found) node.attrs[node.attrs.indexOf(found)] = { ...found, value: next }; else node.attrs.push({ name, value: next });
}
export function removeAttr(node: MessageElement, name: string) { node.attrs = node.attrs.filter(a => a.name !== name || !!a.namespace); }
export function hasClass(node: MessageElement, token: string) { return attr(node, 'class').split(/\s+/).includes(token); }
export function toggleClass(node: MessageElement, token: string, value?: boolean): boolean {
  const tokens = attr(node, 'class').split(/\s+/).filter(Boolean); const on = value ?? !tokens.includes(token);
  if (on && !tokens.includes(token)) tokens.push(token); if (!on) { const i = tokens.indexOf(token); if (i >= 0) tokens.splice(i, 1); }
  setAttr(node, 'class', tokens.join(' ')); return on;
}
export function findClass(node: MessageElement, token: string): MessageElement | undefined { return elements(node.children, n => hasClass(n, token))[0]; }
export function directClass(node: MessageElement, token: string): MessageElement | undefined { return node.children.find(n => n.kind === 'element' && hasClass(n, token)) as MessageElement | undefined; }
export function textOf(node: MessageNode): string { return node.kind === 'comment' ? '' : node.kind === 'text' ? node.text : node.children.map(textOf).join(''); }
export function setText(node: MessageElement, text: unknown, factory: MessageFactory) { const value = String(text ?? ''); node.children = value ? [factory.text(value)] : []; }
export function removeKeys(nodes: MessageNode[], keys: Set<number>): MessageNode[] {
  return nodes.filter(node => !keys.has(node.key)).map(node => { if (node.kind === 'element') node.children = removeKeys(node.children, keys); return node; });
}
export function replaceKey(nodes: MessageNode[], key: number, value: MessageNode) {
  const visit = (list: MessageNode[]): boolean => { const i = list.findIndex(n => n.key === key); if (i >= 0) { list[i] = value; return true; } return list.some(n => n.kind === 'element' && visit(n.children)); };
  return visit(nodes);
}
export function insertBeforeKey(nodes: MessageNode[], key: number, value: MessageNode): boolean {
  const i = nodes.findIndex(n => n.key === key); if (i >= 0) { nodes.splice(i, 0, value); return true; }
  return nodes.some(n => n.kind === 'element' && insertBeforeKey(n.children, key, value));
}
export function styleAttr(node: MessageElement, values: Record<string, string | null>): boolean {
  const holder = document.createElement('span').style; holder.cssText = attr(node, 'style');
  for (const [name, value] of Object.entries(values)) { if (value === null) holder.removeProperty(name); else holder.setProperty(name, value); }
  const next = holder.cssText; if (next === attr(node, 'style')) return false;
  setAttr(node, 'style', next); return true;
}
export function newMessageId() { return globalThis.crypto?.randomUUID ? `m-${globalThis.crypto.randomUUID()}` : `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
export function ensureMessageIds(nodes: MessageNode[]) {
  const rows = nodes.filter(n => n.kind === 'element' && hasClass(n, 'chat-message-row')) as MessageElement[];
  const used = new Set<string>();
  rows.forEach(row => { let id = attr(row, 'data-message-id').trim(); if (!id || used.has(id)) { do { id = newMessageId(); } while (used.has(id)); setAttr(row, 'data-message-id', id); } used.add(id); });
  return rows;
}
export function needsMessageMarkdown(text: unknown) { return /\*\*.+?\*\*|__.+?__|\n|^\s*[-*•]\s+/m.test(String(text || '')); }
export function formatMessageMarkdown(text: unknown) {
  const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text || '').split('\n').map(line => String(line).replace(/[&<>"']/g, c => escapes[c])
    .replace(/^\s*[-*•]\s+/, '・').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>')).join('<br>');
}
export function messageText(row: MessageElement) {
  if (attr(row, 'data-voice-transcript')) return attr(row, 'data-voice-transcript').trim();
  const bubble = findClass(row, 'chat-bubble'); if (!bubble) return '';
  const ignored = ['chat-bubble-shape', 'chat-voice-control', 'chat-voice-text-result', 'chat-message-translation', 'chat-message-translation-card', 'chat-quoted-message', 'chat-bubble-sparkle'];
  const copy = structuredClone(bubble);
  copy.children = removeKeys(copy.children, new Set(elements(copy.children, n => ignored.some(c => hasClass(n, c))).map(n => n.key)));
  return textOf(copy).replace(/\s+/g, ' ').trim();
}
export function quoteText(row: MessageElement) { const text = messageText(row); if (text) return text.slice(0, 120); const length = findClass(row, 'chat-voice-length'); return length && textOf(length).trim() ? `[语音 ${textOf(length).trim()}]` : '[消息]'; }
export function labelMessages(nodes: MessageNode[], peer: string) {
  for (const row of elements(nodes, n => hasClass(n, 'chat-message-row'))) {
    const ms = Number(attr(row, 'data-sent-at')), date = Number.isFinite(ms) && ms > 0 ? new Date(ms) : null;
    const pad = (n: number) => String(n).padStart(2, '0');
    setAttr(row, 'data-sender', hasClass(row, 'is-user') ? '我' : peer.trim() || '对方');
    setAttr(row, 'data-time', date ? `\u00a0\u00a0\u00a0${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` : '');
  }
}
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
export function timelineLabel(ms: number, now = new Date()) {
  const date = new Date(ms); if (!Number.isFinite(date.getTime())) return '';
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay(date, now)) return time;
  if (sameDay(date, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return `昨天 ${time}`;
  return `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${time}`;
}
export function dateDividers(nodes: MessageNode[], factory: MessageFactory) {
  nodes = removeKeys(nodes, new Set(elements(nodes, n => hasClass(n, 'chat-date-divider')).map(n => n.key)));
  let previous: number | null = null; let dateBefore: Date | null = null;
  for (const row of nodes.filter(n => n.kind === 'element' && hasClass(n, 'chat-message-row')) as MessageElement[]) {
    const ms = Number(attr(row, 'data-sent-at')); if (!Number.isFinite(ms) || ms <= 0) continue;
    const date = new Date(ms);
    if (!dateBefore || !sameDay(date, dateBefore) || previous === null || ms - previous >= 300000) {
      insertBeforeKey(nodes, row.key, factory.element('div', { class: 'chat-date-divider', 'data-generated': 'true', role: 'separator' }, [factory.text(timelineLabel(ms))]));
    }
    previous = ms; dateBefore = date;
  }
  return nodes;
}
export function svgNode(factory: MessageFactory, attrs: Record<string, unknown>, paths: string[]) {
  return factory.element('svg', attrs, paths.map(d => factory.element('path', { d }, [], SVG)), SVG);
}
export function receipts(nodes: MessageNode[], factory: MessageFactory) {
  for (const row of elements(nodes, n => hasClass(n, 'chat-message-row') && hasClass(n, 'is-user'))) {
    const time = findClass(row, 'chat-bubble-time'); if (!time) continue;
    let receipt = findClass(time, 'chat-read-receipt');
    if (!receipt) { receipt = factory.element('span', { class: 'chat-read-receipt' }); time.children.push(receipt); }
    setAttr(receipt, 'aria-label', '已读');
    if (!elements(receipt.children, n => n.tag === 'svg').length) receipt.children = [svgNode(factory, { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, ['M18 6 7 17l-5-5','m22 10-7.5 7.5L13 16'])];
  }
}
const pinPaths = ['M12 17v5','M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z'];
export function pinMessages(nodes: MessageNode[], factory: MessageFactory) {
  for (const row of elements(nodes, n => hasClass(n, 'chat-message-row'))) {
    const time = findClass(row, 'chat-bubble-time'); if (!time) continue;
    let badge = findClass(time, 'chat-message-pin-indicator');
    if (attr(row, 'data-pinned') !== 'true') { if (badge) time.children = removeKeys(time.children, new Set([badge.key])); continue; }
    if (!badge) badge = factory.element('span', { class: 'chat-message-pin-indicator' });
    time.children = removeKeys(time.children, new Set([badge.key])); time.children.unshift(badge);
    if (elements(badge.children, n => n.tag === 'span').length || !elements(badge.children, n => n.tag === 'svg').length)
      badge.children = [svgNode(factory, { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, pinPaths)];
  }
}
export function normalizeMessages(nodes: MessageNode[], identity: MessageIdentity, factory: MessageFactory, shapeCreated: (bubble: MessageElement) => void) {
  for (const row of elements(nodes, n => hasClass(n, 'chat-message-row'))) {
    const bubble = findClass(row, 'chat-bubble');
    if (hasClass(row, 'is-chat') && bubble) for (const caption of bubble.children) {
      if (caption.kind !== 'element' || caption.tag !== 'div' || ['chat-quoted-message','chat-voice-control','chat-voice-text-result','chat-bubble-shape','chat-bubble-shape-base'].some(c => hasClass(caption, c)) || attr(caption,'data-md') === '1' || caption.children.some(n => n.kind === 'element')) continue;
      const raw = attr(row, 'data-chat-ai-content') || textOf(caption);
      if (needsMessageMarkdown(raw)) { caption.children = parseMessageHtml(formatMessageMarkdown(raw), factory); setAttr(caption, 'data-md', '1'); }
    }
    let avatar = findClass(row, 'chat-message-mini-avatar');
    if (hasClass(row, 'is-chat') || hasClass(row, 'is-user')) {
      if (!avatar) { avatar = factory.element('img', {class:'chat-message-mini-avatar',alt:''}); if (hasClass(row,'is-chat')) row.children.unshift(avatar); else row.children.push(avatar); }
      setAttr(avatar, 'src', hasClass(row, 'is-chat') ? identity.peerAvatar : identity.userAvatar);
    }
  }
  const rows = ensureMessageIds(nodes);
  rows.forEach((row, index) => {
    const quote = findClass(row,'chat-quoted-message'); if (!quote || attr(quote,'data-quote-target') || !textOf(quote).trim()) return;
    for (let i=index-1;i>=0;i--) if (quoteText(rows[i]) === textOf(quote).trim()) { setAttr(quote,'data-quote-target',attr(rows[i],'data-message-id')); break; }
  });
  nodes = dateDividers(nodes, factory);
  rows.forEach(row => {
    if (hasClass(row,'is-user')) { const read = attr(row,'data-read')==='true' || hasClass(row,'is-read'); setAttr(row,'data-read',String(read)); toggleClass(row,'is-read',read); }
    const i=nodes.findIndex(n=>n.key===row.key); const next=nodes.slice(i+1).find(n=>n.kind==='element');
    const sender=hasClass(row,'is-user')?'is-user':'is-chat';
    toggleClass(row,'is-tail', !(next?.kind==='element' && hasClass(next,'chat-message-row') && hasClass(next,sender)));
    const bubble=findClass(row,'chat-bubble'); if (!bubble) return;
    const legacy=directClass(bubble,'chat-message-translation'); if(legacy){setTranslation(row,textOf(legacy),factory);bubble.children=bubble.children.filter(n=>n.key!==legacy.key);}
    if (!directClass(bubble,'chat-bubble-shape')) {
      const shape=factory.element('svg',{class:'chat-bubble-shape','aria-hidden':'true',focusable:'false',preserveAspectRatio:'none'},[
        factory.element('path',{class:'chat-bubble-shape-base','stroke-width':'.5','vector-effect':'non-scaling-stroke'},[],SVG)],SVG);
      bubble.children.unshift(shape); shapeCreated(bubble);
    }
  });
  return nodes;
}
export function voiceLength(seconds: number) { const whole=Math.max(1,Math.round(Number.isFinite(seconds)?seconds:0)); return whole<60?`${whole}″`:`${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`; }
export function voiceNode(voice: MessageVoice, factory: MessageFactory) {
  return factory.element('div',{class:'chat-voice-control',role:'button',tabindex:'0','aria-label':'播放语音消息'},[
    factory.element('audio',{class:'chat-voice-audio',preload:'metadata',src:voice.dataUrl}),
    factory.element('div',{class:'chat-voice-wave','aria-hidden':'true'},Array.from({length:6},()=>factory.element('span'))),
    factory.element('span',{class:'chat-voice-length'},[factory.text(voice.lengthText ?? voiceLength(voice.seconds ?? 0))])]);
}
export function quoteNode(text: string, target: string, factory: MessageFactory) { const q=factory.element('div',{class:'chat-quoted-message'},[factory.text(text)]); if(target)setAttr(q,'data-quote-target',target);return q; }
export function peerNode(text: string, avatar: string, factory: MessageFactory) {
  const caption=factory.element('div',{},[factory.text(text)]); if(needsMessageMarkdown(text)){caption.children=parseMessageHtml(formatMessageMarkdown(text),factory);setAttr(caption,'data-md','1');}
  return factory.element('div',{class:'chat-message-row is-chat','data-ai-pending':'false'},[
    factory.element('img',{class:'chat-message-mini-avatar',alt:'',src:avatar}),
    factory.element('div',{class:'chat-bubble-wrap'},[factory.element('div',{class:'chat-bubble'},[caption]),factory.element('div',{class:'chat-bubble-time'})])]);
}
export function userNode(text: string, voice: MessageVoice | null, quote: {text:string;targetId:string}, avatar: string, factory: MessageFactory) {
  const row=factory.element('div',{class:'chat-message-row is-user','data-sent-at':String(Date.now()),'data-message-id':newMessageId()});
  if(text)setAttr(row,'data-chat-ai-content',text);
  const bubble=factory.element('div',{class:voice?'chat-bubble chat-bubble--voice':'chat-bubble'});
  if(quote.text)bubble.children.push(quoteNode(quote.text,quote.targetId,factory));
  if(voice)bubble.children.push(voiceNode(voice,factory));if(text)bubble.children.push(factory.element('div',{},[factory.text(text)]));
  row.children=[factory.element('div',{class:'chat-bubble-wrap'},[bubble,factory.element('div',{class:'chat-bubble-time'},[factory.text(new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}))])]),factory.element('img',{class:'chat-message-mini-avatar',alt:'',src:avatar})];
  return row;
}
export function setResult(row: MessageElement, className: string, text: string, factory: MessageFactory) {
  const bubble=findClass(row,'chat-bubble'); if(!bubble)return;let result=directClass(bubble,className);
  if(!result){result=factory.element('div',{class:className});bubble.children.push(result);}setText(result,text,factory);toggleClass(bubble,'has-message-result',true);
}
export function setTranslation(row: MessageElement, text: string, factory: MessageFactory) {
  const wrap=findClass(row,'chat-bubble-wrap'),bubble=wrap&&findClass(wrap,'chat-bubble'); if(!wrap||!bubble)return;
  let card=directClass(wrap,'chat-message-translation-card');if(!card){card=factory.element('div',{class:'chat-message-translation-card'});insertBeforeKey(wrap.children,wrap.children[wrap.children.findIndex(n=>n.key===bubble.key)+1]?.key ?? -1,card) || wrap.children.push(card);}
  setText(card,text,factory);
}
export function recallNode(detail: PeerMessageDetail, factory: MessageFactory, by='assistant', seen?: boolean) {
  const node=factory.element('div',{class:'chat-recall-notice'});
  if(by==='user'){node.children=[factory.text(detail.recallNotice||'你撤回了一条消息')];}
  setAttr(node,'data-recalled-by',by);setAttr(node,'data-recalled-content',String(detail.reply||''));
  if(seen!==undefined)setAttr(node,'data-seen-by-ai',String(seen));setAttr(node,'data-sent-at',String(Number(detail.sentAt)||Date.now()));
  if(by!=='user')node.children=[factory.text(String(detail.recallNotice||'对方撤回了一条消息'))];return node;
}
export function repairStructuredMessages(nodes: MessageNode[], factory: MessageFactory) {
  let repaired=false;
  for(const row of elements(nodes,n=>hasClass(n,'chat-message-row')&&hasClass(n,'is-chat'))){
    const bubble=findClass(row,'chat-bubble');if(!bubble||hasClass(bubble,'chat-bubble--voice'))continue;
    const caption=bubble.children.find(n=>n.kind==='element'&&n.tag==='div'&&!['chat-quoted-message','chat-bubble-shape','chat-bubble-shape-base'].some(c=>hasClass(n,c))) as MessageElement|undefined;
    const raw=String(attr(row,'data-chat-ai-content')||caption&&textOf(caption)||'').trim();if(!/["']replies["']\s*:/i.test(raw))continue;
    const segments=parseChatAiSegmentedReply(raw,[]).segments.filter(s=>s&&s!=='这条回复的格式有误，请重试。');if(!segments.length)continue;
    const original=structuredClone(row);let cursor=row;
    segments.forEach((text,index)=>{
      const target=index?cloneWithKeys(original,factory):row;const b=findClass(target,'chat-bubble');const c=b?.children.find(n=>n.kind==='element'&&n.tag==='div'&&!['chat-quoted-message','chat-bubble-shape','chat-bubble-shape-base'].some(k=>hasClass(n,k))) as MessageElement|undefined;
      if(c)setText(c,text,factory);else if(b)setText(b,text,factory);setAttr(target,'data-chat-ai-content',text);
      if(index){const quote=findClass(target,'chat-quoted-message');if(quote)target.children=removeKeys(target.children,new Set([quote.key]));setAttr(target,'data-message-id','msg_'+Date.now()+'_'+Math.random().toString(36).slice(2,9));insertAfterKey(nodes,cursor.key,target);cursor=target;}
    });repaired=true;
  }
  return repaired;
}
function cloneWithKeys(node: MessageElement, factory: MessageFactory): MessageElement { const copy=structuredClone(node);const visit=(n:MessageNode)=>{n.key=factory.key();if(n.kind==='element')n.children.forEach(visit);};visit(copy);return copy; }
function insertAfterKey(nodes: MessageNode[], key: number, value: MessageNode): boolean { const i=nodes.findIndex(n=>n.key===key);if(i>=0){nodes.splice(i+1,0,value);return true;}return nodes.some(n=>n.kind==='element'&&insertAfterKey(n.children,key,value)); }
export function backgroundNode(detail: PeerMessageDetail, factory: MessageFactory) {
  if(detail.recalled)return recallNode(detail,factory);
  const reply=String(detail.reply||'').trim(); const stamp=Number(detail.sentAt)||Date.now();
  const row=factory.element('div',{class:'chat-message-row is-chat','data-ai-pending':'false','data-chat-ai-content':reply,'data-sent-at':String(stamp),'data-message-id':'msg_'+Date.now()+'_'+Math.random().toString(36).slice(2,9)});
  const bubble=factory.element('div',{class:detail.voice?.dataUrl?'chat-bubble chat-bubble--voice':'chat-bubble'});
  if(detail.quote)bubble.children.push(quoteNode(String(detail.quote),String(detail.quoteTargetId||''),factory));
  if(detail.voice?.dataUrl){setAttr(row,'data-voice-transcript',reply);bubble.children.push(voiceNode({...detail.voice,lengthText:String(detail.voice.lengthText||'')},factory));if(detail.voiceAutoText)setResultInBubble(bubble,reply,factory);}else bubble.children.push(factory.element('div',{},[factory.text(reply)]));
  row.children=[factory.element('img',{class:'chat-message-mini-avatar',alt:''}),factory.element('div',{class:'chat-bubble-wrap'},[bubble,factory.element('div',{class:'chat-bubble-time'},[factory.text(new Date(stamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}))])])];
  if(detail.translation){setTranslation(row,String(detail.translation),factory);setAttr(row,'data-simplified-translation',String(detail.translation));}return row;
}
function setResultInBubble(bubble:MessageElement,text:string,factory:MessageFactory){bubble.children.push(factory.element('div',{class:'chat-voice-text-result'},[factory.text(text)]));toggleClass(bubble,'has-message-result',true);}
function htmlText(value: unknown) { return String(value ?? '').replace(/\r\n?/g,'\n').replace(/\0/g,''); }
export function forwardNode(text: string, rawItems: unknown, source: unknown, mode: unknown, rawRecord: unknown, factory: MessageFactory) {
  const items=Array.isArray(rawItems)?rawItems as Record<string,unknown>[]:[];const record=rawRecord as Record<string,unknown>|null;
  const bubble=factory.element('div',{class:'chat-bubble'});
  if(mode==='record'&&items.length&&record){
    const preview=(Array.isArray(record.items)?record.items as Record<string,unknown>[]:[]).slice(0,3).map(item=>factory.element('div',{class:'chat-forward-record-line'},[factory.text(htmlText(item.speaker||'消息')+': '+htmlText(item.text||'[消息]'))]));
    bubble.children=[factory.element('div',{class:'chat-forward-record-card','data-forward-record-id':htmlText(record.id)},[
      factory.element('div',{class:'chat-forward-record-title'},[factory.text(htmlText(record.title))]),factory.element('div',{class:'chat-forward-record-preview'},preview),factory.element('div',{class:'chat-forward-record-divider'}),factory.element('div',{class:'chat-forward-record-footer'},[factory.text('聊天记录')])])];
  }else bubble.children=[factory.text('[转发] '+text)];
  const line=(item:Record<string,unknown>)=>(item?.speaker==='我'?'用户':item?.speaker||'消息')+'：'+(item?.spoken?(item?.text||'[语音]')+'（内容：'+item.spoken+'）':item?.text||'[消息]');
  const sourceLabel=source?'用户与「'+source+'」的聊天':'用户的另一个聊天';
  const content=mode==='record'&&items.length?'[用户转发了一份聊天记录给你，来自'+sourceLabel+'，共 '+items.length+' 条'+(items.length>30?'，以下是最近 30 条':'')+'：]\n'+items.slice(-30).map(line).join('\n'):'[用户转发了一条消息给你，来自'+sourceLabel+'] '+(items[0]?line(items[0]):text);
  return factory.element('div',{class:'chat-message-row is-user','data-chat-ai-content':content,'data-sent-at':String(Date.now())},[factory.element('div',{class:'chat-bubble-wrap'},[bubble,factory.element('div',{class:'chat-bubble-time'},[factory.text(new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}))])])]);
}
