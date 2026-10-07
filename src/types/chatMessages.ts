import type { NativeAttribute } from './dom';
export type MessageNode = MessageElement | MessageText | MessageComment;
export interface MessageElement { kind: 'element'; key: number; tag: string; namespace: string; attrs: NativeAttribute[]; children: MessageNode[] }
export interface MessageText { kind: 'text'; key: number; text: string }
export interface MessageComment { kind: 'comment'; key: number; text: string }
export interface MessageFactory { element(tag: string, attrs?: Record<string, unknown> | NativeAttribute[], children?: MessageNode[], namespace?: string): MessageElement; text(value: unknown): MessageText; comment(value: string): MessageComment; key(): number }
export interface MessageIdentity { peer: string; peerAvatar: string; userAvatar: string }
export interface MessageVoice { dataUrl: string; seconds?: number; lengthText?: string }
export interface PeerMessageDetail { reply: string; sentAt?: number; quote?: string; quoteTargetId?: string; voice?: MessageVoice | null; voiceAutoText?: boolean; translation?: string; recalled?: boolean; recallNotice?: string; chatKey?: string }
export interface MessageNodesApi {
  container(): HTMLDivElement|null;
  rows(limit?: number): HTMLElement[];
  html(): string;
  storedHtml(): string;
  count(): number;
  pinned(): HTMLElement | null;
  scrollTo(row: HTMLElement, options?: ScrollIntoViewOptions): HTMLElement | null;
  scrollLatest(force?: boolean): void;
  audioElements(): HTMLAudioElement[];
  resolve(element: HTMLElement): HTMLElement;
  attributes(element: HTMLElement, values: Record<string, unknown>): void; id(row: HTMLElement): string; pins(): void;
  date(container: HTMLElement): void; read(row: HTMLElement, value: boolean): void;
  playing(pill: HTMLElement, value: boolean): void; click(event: Event): void; keyDown(event: KeyboardEvent): void;
  appendHtml(html: string): void;
  replace(html: string): void; clear(): void; refresh(container?: HTMLElement | null): void; receipts(container?: HTMLElement | null): void;
  setData(element: HTMLElement, values: Record<string, unknown>): void; toggle(element: HTMLElement, token: string, value?: boolean): boolean;
  remove(elements: HTMLElement[]): void; edit(row: HTMLElement, value: string, before: string, changed: boolean): void;
  recall(row: HTMLElement, content: string, notice: string, by: string, sentAt: number, seen?: boolean): void;
  appendPeer(text: string): { row: HTMLElement; caption: HTMLElement; time: HTMLElement };
  finishPeer(row: HTMLElement, detail: PeerMessageDetail): void;
  appendUser(text: string, voice: MessageVoice | null, quote: {text: string;targetId: string}): {row:HTMLElement; time:HTMLElement};
  result(row: HTMLElement, className: string, text: string): void; translation(row: HTMLElement, text: string): void; toggleTranscript(row: HTMLElement): boolean;
  markRead(row?: HTMLElement | null, all?: boolean): void; identity(): void;
  unread(count: number): {divider:HTMLElement;firstUnread:HTMLElement} | null; repair(): boolean;
  bindVoice(pill: HTMLElement): void;
  forwardHtml(html: string, text: string, items: unknown, source: unknown, mode: unknown, record: unknown): string;
  backgroundHtml(html: string, detail: PeerMessageDetail): string;
  recallHtml(html: string, detail: PeerMessageDetail & {messageId?: string}): string | null;
  onChange(listener: ()=>void): ()=>void;
}
export interface MessagesConnection { canInteract(): boolean; play(pill: HTMLElement): void; notice(message: string): void; identity(): MessageIdentity; accept(api: MessageNodesApi): void }
