import { DEFAULT_PHOTO } from './defaultPhoto';
import type { NativeAttribute } from '../types/dom';
import type { MessageComment, MessageElement, MessageFactory, MessageIdentity, MessageLocation, MessageNode, MessagePay, MessagePhoto, MessageSticker, MessageVoice, PeerMessageDetail } from '../types/chatMessages';
import { stickerImageUrl } from './stickerStorage';
import { payRecord, yuan } from './walletStorage';
import type { PayState } from './walletStorage';
import { chatPixelIconPath } from '../components/shared/ChatPixelIcon';
import { parseChatAiSegmentedReply } from './chatReplyParser';
import { adoptInlinePhoto, chatPhotoUrl } from './chatPhotoStore';
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
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'param', 'keygen', 'basefont', 'bgsound', 'frame']);
const RAW_TEXT = new Set(['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes', 'plaintext']);
const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/\u00a0/g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/\u00a0/g, '&nbsp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 照浏览器 innerHTML 的规则直接拼字符串，不先建一整份 DOM（存聊天记录时每次都要整份序列化，消息一多就慢）。 */
export function serializeMessageNodes(nodes: MessageNode[]): string {
  const out: string[] = [];
  const write = (node: MessageNode, raw: boolean) => {
    if (node.kind === 'text') { out.push(raw ? node.text : escapeText(node.text)); return; }
    if (node.kind === 'comment') { out.push('<!--', node.text, '-->'); return; }
    out.push('<', node.tag);
    for (const attr of node.attrs) out.push(' ', attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name, '="', escapeAttr(attr.value), '"');
    out.push('>');
    const html = node.namespace === HTML;
    if (html && VOID_TAGS.has(node.tag)) return;
    const childRaw = html && RAW_TEXT.has(node.tag);
    for (const child of node.children) write(child, childRaw);
    out.push('</', node.tag, '>');
  };
  for (const node of nodes) write(node, false);
  return out.join('');
}
export function elements(nodes: MessageNode[], predicate: (node: MessageElement) => boolean): MessageElement[] {
  const result: MessageElement[] = [];
  const visit = (node: MessageNode) => { if (node.kind !== 'element') return; if (predicate(node)) result.push(node); node.children.forEach(visit); };
  nodes.forEach(visit); return result;
}
/** 整棵消息树的复制：属性物件本身不会被改（setAttr 换新的），只复制阵列；比 structuredClone 快很多。 */
export function cloneNodes(nodes: MessageNode[]): MessageNode[] {
  return nodes.map(node => node.kind === 'element' ? { ...node, attrs: node.attrs.slice(), children: cloneNodes(node.children) } : { ...node });
}
/** 两棵树内容是否完全一样（取代整棵 JSON.stringify 比较；一找到不同就停）。 */
export function sameNodes(a: MessageNode[], b: MessageNode[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!sameNode(a[i], b[i])) return false;
  return true;
}
export function sameNode(a: MessageNode, b: MessageNode): boolean {
  if (a === b) return true;
  if (a.kind !== b.kind || a.key !== b.key) return false;
  if (a.kind !== 'element' || b.kind !== 'element') return (a as { text: string }).text === (b as { text: string }).text;
  if (a.tag !== b.tag || a.namespace !== b.namespace || a.attrs.length !== b.attrs.length) return false;
  for (let i = 0; i < a.attrs.length; i++) { const x = a.attrs[i], y = b.attrs[i]; if (x !== y && (x.name !== y.name || x.value !== y.value || x.namespace !== y.namespace || x.prefix !== y.prefix)) return false; }
  return sameNodes(a.children, b.children);
}
/** 只比结构（编号、标签、文字），不管属性；取代原本整棵树的 childSignature 字符串比较。 */
export function sameShape(a: MessageNode[], b: MessageNode[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.key !== y.key) return false;
    if (x.kind === 'element' || y.kind === 'element') { if (x.kind !== 'element' || y.kind !== 'element' || x.tag !== y.tag || !sameShape(x.children, y.children)) return false; }
    else if (x.kind !== y.kind || x.text !== y.text) return false;
  }
  return true;
}
/** 按编号找节点：同一棵树建一次索引，之后直接查；查不到（树后来又加了节点）就整棵找一次。 */
const keyIndexes = new WeakMap<MessageNode[], Map<number, MessageElement>>();
export function findKey(nodes: MessageNode[], key: number): MessageElement | undefined {
  let index = keyIndexes.get(nodes);
  if (!index) { index = new Map(); for (const node of elements(nodes, () => true)) index.set(node.key, node); keyIndexes.set(nodes, index); }
  const hit = index.get(key);
  if (hit) return hit;
  const found = elements(nodes, n => n.key === key)[0];
  if (found) index.set(key, found);
  return found;
}
export function attr(node: MessageElement, name: string): string { return node.attrs.find(a => a.name === name && !a.namespace)?.value || ''; }
export function setAttr(node: MessageElement, name: string, value: unknown) {
  const next = String(value); const found = node.attrs.find(a => a.name === name && !a.namespace);
  if (found) node.attrs[node.attrs.indexOf(found)] = { ...found, value: next }; else node.attrs.push({ name, value: next });
}
export function removeAttr(node: MessageElement, name: string) { node.attrs = node.attrs.filter(a => a.name !== name || !!a.namespace); }
export function hasClass(node: MessageElement, token: string) { const value = attr(node, 'class'); return value.includes(token) && value.split(/\s+/).includes(token); }
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
  if (attr(row, 'data-photo-caption')) return '[照片] ' + attr(row, 'data-photo-caption').trim();
  if (attr(row, 'data-location-place')) return locationText(readLocation(row));
  if (attr(row, 'data-sticker-tag')) return stickerText(readSticker(row));
  if (attr(row, 'data-pay-id')) return payLabel(readPay(row));
  if (attr(row, 'data-voice-transcript')) return attr(row, 'data-voice-transcript').trim();
  const bubble = findClass(row, 'chat-bubble'); if (!bubble) return '';
  const ignored = ['chat-bubble-shape', 'chat-voice-control', 'chat-voice-text-result', 'chat-message-translation', 'chat-message-translation-card', 'chat-quoted-message', 'chat-bubble-sparkle', 'chat-photo', 'chat-location', 'chat-sticker', 'chat-pay'];
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
      if (caption.kind !== 'element' || caption.tag !== 'div' || ['chat-quoted-message','chat-voice-control','chat-voice-text-result','chat-bubble-shape','chat-bubble-shape-base','chat-photo','chat-location','chat-sticker','chat-pay'].some(c => hasClass(caption, c)) || attr(caption,'data-md') === '1' || caption.children.some(n => n.kind === 'element')) continue;
      const raw = attr(row, 'data-chat-ai-content') || textOf(caption);
      if (needsMessageMarkdown(raw)) { caption.children = parseMessageHtml(formatMessageMarkdown(raw), factory); setAttr(caption, 'data-md', '1'); }
    }
    // 照片按编号换成这次开机的网址；旧的、图片直接写在记录里的，顺手搬进照片库。
    const photoId = attr(row, 'data-photo-id'), photoImg = photoId ? findClass(row, 'chat-photo-img') : undefined;
    if (photoId && photoImg) {
      const url = chatPhotoUrl(photoId), src = attr(photoImg, 'src');
      if (url && src !== url) setAttr(photoImg, 'src', url); else if (!url) adoptInlinePhoto(photoId, src);
    }
    // 表情按图片编号换成这次开机的网址（上传的表情是 blob: 短网址，不把整张图写进聊天记录）
    const stickerImage = attr(row, 'data-sticker-image'), stickerImg = stickerImage ? findClass(row, 'chat-sticker-img') : undefined;
    if (stickerImg) { const url = stickerImageUrl(stickerImage); if (url && attr(stickerImg, 'src') !== url) setAttr(stickerImg, 'src', url); }
    // 转账、红包照钱包里的状态显示（收下、退回、过期）；状态没变就不动
    const payCard = attr(row, 'data-pay-id') ? findClass(row, 'chat-pay') : undefined;
    if (payCard && (attr(payCard, 'data-pay-state') !== payState(attr(row, 'data-pay-id')) || attr(payCard, 'data-pay-look') !== PAY_LOOK)) setPay(row, readPay(row), factory);
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
/** note：你自己发的照片，把你写的话放在图片下面。 */
export function photoNode(photo: MessagePhoto, factory: MessageFactory, note = false) {
  const label = photo.state === 'done' ? '查看照片' : photo.state === 'failed' ? '重新生成照片' : photo.state === 'text' ? '查看照片描述' : '照片接收中';
  const node = factory.element('div', { class: 'chat-photo is-' + photo.state, role: 'button', tabindex: '0', 'aria-label': label, 'data-photo-id': photo.id, 'data-photo-state': photo.state });
  if (photo.state === 'done' && photo.src) node.children = [factory.element('img', { class: 'chat-photo-img', alt: photo.caption, src: photo.src, draggable: 'false' }), ...(note && photo.caption ? [factory.element('span', { class: 'chat-photo-note' }, [factory.text(photo.caption)])] : [])];
  // 文字照片（没开生图）：放小手机的预设照片（图片已被小鸟吃掉），点开看他写的画面描述
  else if (photo.state === 'text') node.children = [factory.element('img', { class: 'chat-photo-img', alt: photo.caption, src: DEFAULT_PHOTO, draggable: 'false' })];
  else if (photo.state === 'failed') node.children = [factory.element('span', { class: 'chat-photo-caption' }, [factory.text(photo.caption)]), factory.element('span', { class: 'chat-photo-status' }, [factory.text('没画出来，点一下重新生成')])];
  else node.children = [factory.element('span', { class: 'chat-photo-spinner', 'aria-hidden': 'true' }), factory.element('span', { class: 'chat-photo-status' }, [factory.text('照片接收中…')])];
  return node;
}
/** 把照片放进这一行：取代原本的文字，或换掉旧的照片（重画、画好）。 */
export function setPhoto(row: MessageElement, photo: MessagePhoto, factory: MessageFactory) {
  const bubble = findClass(row, 'chat-bubble'); if (!bubble) return;
  const old = bubble.children.find(n => n.kind === 'element' && (hasClass(n, 'chat-photo') || n.tag === 'div' && !['chat-quoted-message','chat-bubble-shape','chat-bubble-shape-base'].some(c => hasClass(n, c))));
  const node = photoNode(photo, factory, hasClass(row, 'is-user'));
  if (old) bubble.children = bubble.children.map(n => n.key === old.key ? node : n); else bubble.children.push(node);
  toggleClass(bubble, 'chat-bubble--photo', true);
  setAttr(row, 'data-photo-id', photo.id); setAttr(row, 'data-photo-caption', photo.caption); setAttr(row, 'data-photo-prompt', photo.prompt); setAttr(row, 'data-chat-ai-content', '[照片] ' + photo.caption);
  if (photo.scene) setAttr(row, 'data-photo-scene', photo.scene); else removeAttr(row, 'data-photo-scene');
  if (photo.error) setAttr(row, 'data-photo-error', photo.error); else removeAttr(row, 'data-photo-error');
}
/** 表情包在聊天记录、预览、送给模型时的文字：[表情] 生气 */
export function stickerText(sticker: MessageSticker) { return '[表情] ' + sticker.tag; }
export function readSticker(row: MessageElement): MessageSticker { return { tag: attr(row, 'data-sticker-tag'), image: attr(row, 'data-sticker-image') }; }
/** 表情包：气泡里只放一张图（不要气泡底色），图看不到就写标签。 */
export function stickerNode(sticker: MessageSticker, factory: MessageFactory) {
  const url = stickerImageUrl(sticker.image);
  return factory.element('div', { class: 'chat-sticker' }, [url
    ? factory.element('img', { class: 'chat-sticker-img', alt: sticker.tag, src: url, draggable: 'false' })
    : factory.element('span', { class: 'chat-sticker-missing' }, [factory.text('[表情] ' + sticker.tag)])]);
}
/** 把表情放进这一行：取代原本的文字。 */
export function setSticker(row: MessageElement, sticker: MessageSticker, factory: MessageFactory) {
  const bubble = findClass(row, 'chat-bubble'); if (!bubble) return;
  const old = bubble.children.find(n => n.kind === 'element' && (hasClass(n, 'chat-sticker') || n.tag === 'div' && !['chat-quoted-message','chat-bubble-shape','chat-bubble-shape-base'].some(c => hasClass(n, c))));
  const node = stickerNode(sticker, factory);
  if (old) bubble.children = bubble.children.map(n => n.key === old.key ? node : n); else bubble.children.push(node);
  toggleClass(bubble, 'chat-bubble--sticker', true);
  setAttr(row, 'data-sticker-tag', sticker.tag); setAttr(row, 'data-sticker-image', sticker.image);
  setAttr(row, 'data-chat-ai-content', stickerText(sticker));
}
/** 转账、红包现在的状态；钱包里找不到（例如钱包清掉了）就当已经收了。 */
export function payState(id: string): PayState { return payRecord(id)?.state || 'done'; }
export function readPay(row: MessageElement): MessagePay {
  return { id: attr(row, 'data-pay-id'), kind: attr(row, 'data-pay-kind') === 'packet' ? 'packet' : 'transfer', amount: Number(attr(row, 'data-pay-amount')) || 0, note: attr(row, 'data-pay-note') };
}
/** 页面上的那一行（dataset）读出转账、红包。 */
export function payFromData(data: DOMStringMap): MessagePay {
  return { id: data.payId || '', kind: data.payKind === 'packet' ? 'packet' : 'transfer', amount: Number(data.payAmount) || 0, note: data.payNote || '' };
}
/** 预览、引用、转发用的短文字：[转账] ¥520.00、[红包] 恭喜发财 */
export function payLabel(pay: MessagePay) { return pay.kind === 'packet' ? '[红包] ' + (pay.note || '恭喜发财') : '[转账] ¥' + yuan(pay.amount); }
/** 送给模型的文字，站在他的角度写：mine 表示是你（对方）发的。红包没拆之前他看不到金额。 */
export function payText(pay: MessagePay, mine: boolean) {
  const record = payRecord(pay.id), state = record?.state || 'done', expired = !!record?.expired;
  const note = pay.note ? `，留言「${pay.note}」` : '';
  const who = mine ? '你' : '对方', how = pay.kind === 'packet' ? '拆' : '收';
  const status = state === 'pending' ? `${who}还没${how}` : state === 'done' ? `${who}${pay.kind === 'packet' ? '拆开了' : '收下了'}` : expired ? `过了一天没${how}，退回了` : `${who}退回了`;
  if (pay.kind === 'packet') return `[红包] ${mine && state === 'pending' ? '' : '¥' + yuan(pay.amount)}${note}（${status}）`.replace('[红包] ，', '[红包] ');
  return `[转账] ¥${yuan(pay.amount)}${note}（${status}）`;
}
/** 卡片底下的状态字：mine 表示是你发的那张。 */
function payStatus(kind: MessagePay['kind'], state: PayState, expired: boolean, mine: boolean) {
  if (state === 'pending') return mine ? (kind === 'packet' ? '等对方拆开' : '等对方收款') : (kind === 'packet' ? '点一下拆开' : '点一下收款');
  if (state === 'done') return mine ? (kind === 'packet' ? '对方已领取' : '对方已收款') : (kind === 'packet' ? '已拆开' : '已收款');
  return expired ? (mine ? '已过期退回' : '已过期') : '已退回';
}
/** 卡片长相改过就换这个，旧记录里的卡片开的时候会照新样子重画。 */
const PAY_LOOK = '2';
/** 转账、红包卡片：左边小图示；转账中间写金额和留言，红包只写留言（像微信红包，没写就是「恭喜发财，大吉大利」）。底下一条写种类和状态。 */
export function payNode(pay: MessagePay, mine: boolean, factory: MessageFactory) {
  const record = payRecord(pay.id), state = record?.state || 'done';
  const icon = chatPixelIconPath(pay.kind === 'packet' ? 'packet' : 'yuan');
  return factory.element('div', { class: `chat-pay is-${pay.kind} is-${state}`, role: 'button', tabindex: '0', 'aria-label': pay.kind === 'packet' ? '红包' : '转账', 'data-pay-state': state, 'data-pay-look': PAY_LOOK }, [
    factory.element('div', { class: 'chat-pay-top' }, [
      factory.element('span', { class: 'chat-pay-icon', 'aria-hidden': 'true' }, [factory.element('svg', { viewBox: '-1 -1 26 26', 'shape-rendering': 'crispEdges' }, [factory.element('path', { d: icon.path, transform: icon.offset, fill: 'currentColor', 'fill-rule': 'evenodd' }, [], SVG)], SVG)]),
      factory.element('span', { class: 'chat-pay-info' }, pay.kind === 'packet'
        ? [factory.element('b', {}, [factory.text(pay.note || '恭喜发财，大吉大利')])]
        : [factory.element('b', {}, [factory.text('¥' + yuan(pay.amount))]), factory.element('small', {}, [factory.text(pay.note || (mine ? '转账给对方' : '转账给你'))])])]),
    factory.element('div', { class: 'chat-pay-foot' }, [
      factory.element('span', {}, [factory.text(pay.kind === 'packet' ? '红包' : '转账')]),
      factory.element('span', {}, [factory.text(payStatus(pay.kind, state, !!record?.expired, mine))])])]);
}
/** 把转账、红包卡片放进这一行：取代原本的文字（状态变了也是重放一次）。 */
export function setPay(row: MessageElement, pay: MessagePay, factory: MessageFactory) {
  const bubble = findClass(row, 'chat-bubble'); if (!bubble) return;
  const old = bubble.children.find(n => n.kind === 'element' && (hasClass(n, 'chat-pay') || n.tag === 'div' && !['chat-quoted-message','chat-bubble-shape','chat-bubble-shape-base'].some(c => hasClass(n, c))));
  const mine = hasClass(row, 'is-user'), node = payNode(pay, mine, factory);
  if (old) bubble.children = bubble.children.map(n => n.key === old.key ? node : n); else bubble.children.push(node);
  toggleClass(bubble, 'chat-bubble--pay', true);
  setAttr(row, 'data-pay-id', pay.id); setAttr(row, 'data-pay-kind', pay.kind); setAttr(row, 'data-pay-amount', String(pay.amount));
  if (pay.note) setAttr(row, 'data-pay-note', pay.note); else removeAttr(row, 'data-pay-note');
  setAttr(row, 'data-chat-ai-content', payText(pay, mine));
}
/** 定位卡片在聊天记录、预览、送给模型时的文字：[位置] 地点（地址）· 距你约 3 公里 */
export function locationText(location: MessageLocation) {
  return '[位置] ' + location.place + (location.address ? `（${location.address}）` : '') + (location.distance ? ` · 距你约 ${location.distance}` : '');
}
export function readLocation(row: MessageElement): MessageLocation {
  return { place: attr(row, 'data-location-place'), address: attr(row, 'data-location-address'), distance: attr(row, 'data-location-distance') };
}
/** 定位卡片：上面一块小地图（复古格线加一根图钉），下面地点、地址、距离。 */
export function locationNode(location: MessageLocation, factory: MessageFactory) {
  const info = [factory.element('b', { class: 'chat-location-place' }, [factory.text(location.place)])];
  if (location.address) info.push(factory.element('span', { class: 'chat-location-address' }, [factory.text(location.address)]));
  if (location.distance) info.push(factory.element('span', { class: 'chat-location-distance' }, [factory.text('距你约 ' + location.distance)]));
  return factory.element('div', { class: 'chat-location' }, [
    factory.element('div', { class: 'chat-location-map', 'aria-hidden': 'true' }, [factory.element('span', { class: 'chat-location-pin' })]),
    factory.element('div', { class: 'chat-location-info' }, info)]);
}
/** 把定位卡片放进这一行，取代原本的文字。 */
export function setLocation(row: MessageElement, location: MessageLocation, factory: MessageFactory) {
  const bubble = findClass(row, 'chat-bubble'); if (!bubble) return;
  const old = bubble.children.find(n => n.kind === 'element' && (hasClass(n, 'chat-location') || n.tag === 'div' && !['chat-quoted-message','chat-bubble-shape','chat-bubble-shape-base'].some(c => hasClass(n, c))));
  const node = locationNode(location, factory);
  if (old) bubble.children = bubble.children.map(n => n.key === old.key ? node : n); else bubble.children.push(node);
  toggleClass(bubble, 'chat-bubble--location', true);
  setAttr(row, 'data-location-place', location.place);
  if (location.address) setAttr(row, 'data-location-address', location.address); else removeAttr(row, 'data-location-address');
  if (location.distance) setAttr(row, 'data-location-distance', location.distance); else removeAttr(row, 'data-location-distance');
  setAttr(row, 'data-chat-ai-content', locationText(location));
}
/** 用照片编号找到那一行。 */
export function photoRow(nodes: MessageNode[], id: string) {
  return elements(nodes, n => hasClass(n, 'chat-message-row') && attr(n, 'data-photo-id') === id)[0];
}
export function quoteNode(text: string, target: string, factory: MessageFactory) { const q=factory.element('div',{class:'chat-quoted-message'},[factory.text(text)]); if(target)setAttr(q,'data-quote-target',target);return q; }
export function peerNode(text: string, avatar: string, factory: MessageFactory) {
  const caption=factory.element('div',{},[factory.text(text)]); if(needsMessageMarkdown(text)){caption.children=parseMessageHtml(formatMessageMarkdown(text),factory);setAttr(caption,'data-md','1');}
  return factory.element('div',{class:'chat-message-row is-chat','data-ai-pending':'false'},[
    factory.element('img',{class:'chat-message-mini-avatar',alt:'',src:avatar}),
    factory.element('div',{class:'chat-bubble-wrap'},[factory.element('div',{class:'chat-bubble'},[caption]),factory.element('div',{class:'chat-bubble-time'})])]);
}
export function userNode(text: string, voice: MessageVoice | null, quote: {text:string;targetId:string}, avatar: string, factory: MessageFactory, photo?: MessagePhoto | null, location?: MessageLocation | null, sticker?: MessageSticker | null, pay?: MessagePay | null) {
  const row=factory.element('div',{class:'chat-message-row is-user','data-sent-at':String(Date.now()),'data-message-id':newMessageId()});
  if(text)setAttr(row,'data-chat-ai-content',text);
  const bubble=factory.element('div',{class:voice?'chat-bubble chat-bubble--voice':'chat-bubble'});
  if(quote.text)bubble.children.push(quoteNode(quote.text,quote.targetId,factory));
  if(voice)bubble.children.push(voiceNode(voice,factory));if(text)bubble.children.push(factory.element('div',{},[factory.text(text)]));
  row.children=[factory.element('div',{class:'chat-bubble-wrap'},[bubble,factory.element('div',{class:'chat-bubble-time'},[factory.text(new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}))])]),factory.element('img',{class:'chat-message-mini-avatar',alt:'',src:avatar})];
  if(photo)setPhoto(row,photo,factory);
  if(location)setLocation(row,location,factory);
  if(sticker)setSticker(row,sticker,factory);
  if(pay)setPay(row,pay,factory);
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
    const bubble=findClass(row,'chat-bubble');if(!bubble||hasClass(bubble,'chat-bubble--voice')||hasClass(bubble,'chat-bubble--photo')||hasClass(bubble,'chat-bubble--location'))continue;
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
  if(detail.photo||detail.location||detail.sticker||detail.pay){/* 照片、定位、表情、转账等气泡放进这一行之后再换上 */}else if(detail.voice?.dataUrl){setAttr(row,'data-voice-transcript',reply);bubble.children.push(voiceNode({...detail.voice,lengthText:String(detail.voice.lengthText||'')},factory));if(detail.voiceAutoText)setResultInBubble(bubble,reply,factory);}else bubble.children.push(factory.element('div',{},[factory.text(reply)]));
  row.children=[factory.element('img',{class:'chat-message-mini-avatar',alt:''}),factory.element('div',{class:'chat-bubble-wrap'},[bubble,factory.element('div',{class:'chat-bubble-time'},[factory.text(new Date(stamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}))])])];
  if(detail.photo)setPhoto(row,detail.photo,factory);
  if(detail.location)setLocation(row,detail.location,factory);
  if(detail.sticker)setSticker(row,detail.sticker,factory);
  if(detail.pay)setPay(row,detail.pay,factory);
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
