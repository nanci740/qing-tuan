import type { NativeAttribute } from './dom';
export type MessageNode = MessageElement | MessageText | MessageComment;
export interface MessageElement { kind: 'element'; key: number; tag: string; namespace: string; attrs: NativeAttribute[]; children: MessageNode[] }
export interface MessageText { kind: 'text'; key: number; text: string }
export interface MessageComment { kind: 'comment'; key: number; text: string }
export interface MessageFactory { element(tag: string, attrs?: Record<string, unknown> | NativeAttribute[], children?: MessageNode[], namespace?: string): MessageElement; text(value: unknown): MessageText; comment(value: string): MessageComment; key(): number }
/** members：群聊时每个成员（archiveId）给你看的名字和头像，消息照 data-speaker 换。 */
export interface MessageIdentity { peer: string; peerAvatar: string; userAvatar: string; members?: Record<string, { name: string; avatar: string }> }
export interface MessageVoice { dataUrl: string; seconds?: number; lengthText?: string }
/** 家机发的照片。state：pending 正在画、done 画好了、failed 没画出来（可以重画）、text 没开生图时的文字照片（放预设照片，点开看描述，之后可以画）。
    prompt 是给生图模型的英文描述（他用文字打的照片一开始是空的），caption 是一句中文说明。 */
export interface MessagePhoto { id: string; prompt: string; caption: string; state: 'pending' | 'done' | 'failed' | 'text'; src?: string; error?: string;
  /** 中文画面描述：文字照片点开看的那段（他写的，比 caption 详细）。 */
  scene?: string;
  /** 你自己发的照片（预览里不能重画）。只在打开预览时用，不存。 */
  mine?: boolean }
/** 表情包：标签（他照这个挑的）和图片（上传的是图片库编号 qt-image:…，或网址）。 */
export interface MessageSticker { tag: string; image: string }
/** 转账、红包、亲属卡（他给你开的，amount 是每月额度）：金额记「分」（整数）。收没收、退没退记在钱包里（walletStorage），卡片照钱包显示。 */
/** 群聊才有：count 群红包个数、split lucky 拼手气 / even 平分；to 你转账给哪个成员（archiveId）；by 是哪个成员发的。 */
export interface MessagePay { id: string; kind: 'transfer' | 'packet' | 'family'; amount: number; note: string; count?: number; split?: 'lucky' | 'even'; to?: string; by?: string }
/** 定位卡片：地点一定有；地址、距离（例如「3 公里」）可以没有。都是写出来的，不是真的定位。 */
export interface MessageLocation { place: string; address?: string; distance?: string }
export interface PeerMessageDetail { reply: string; photo?: MessagePhoto | null; location?: MessageLocation | null; sticker?: MessageSticker | null; pay?: MessagePay | null; sentAt?: number; quote?: string; quoteTargetId?: string; voice?: MessageVoice | null; voiceAutoText?: boolean; translation?: string; recalled?: boolean; recallNotice?: string; chatKey?: string; speaker?: string; rejected?: boolean }
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
  appendUser(text: string, voice: MessageVoice | null, quote: {text: string;targetId: string}, photo?: MessagePhoto | null, location?: MessageLocation | null, sticker?: MessageSticker | null, pay?: MessagePay | null): {row:HTMLElement; time:HTMLElement};
  result(row: HTMLElement, className: string, text: string): void; translation(row: HTMLElement, text: string): void; toggleTranscript(row: HTMLElement): boolean;
  markRead(row?: HTMLElement | null, all?: boolean): void; identity(): void;
  unread(count: number): {divider:HTMLElement;firstUnread:HTMLElement} | null; repair(): boolean;
  bindVoice(pill: HTMLElement): void;
  forwardHtml(html: string, text: string, items: unknown, source: unknown, mode: unknown, record: unknown): string;
  backgroundHtml(html: string, detail: PeerMessageDetail): string;
  recallHtml(html: string, detail: PeerMessageDetail & {messageId?: string}): string | null;
  /** 拍一拍：开着的聊天直接加一行；没开着的聊天改存着的记录。 */
  pat(by: 'user' | 'self' | 'assistant', text: string, suffix: string, who?: { from?: string; target?: string }): void;
  patHtml(html: string, by: 'user' | 'self' | 'assistant', text: string, suffix: string, who?: { from?: string; target?: string }): string;
  /** 中间一行灰字的系统提示（红包被领了之类）：开着的聊天直接加；没开着的改存着的记录。 */
  notice(text: string): void;
  noticeHtml(html: string, text: string): string;
  /** 照片画好、画失败或要重画：用照片编号找到那一行换掉；找不到就回传 false / null。 */
  photo(photo: MessagePhoto): boolean;
  photoHtml(html: string, photo: MessagePhoto): string | null;
  onChange(listener: ()=>void): ()=>void;
}
export interface MessagesConnection { canInteract(): boolean; play(pill: HTMLElement): void; photo(row: HTMLElement): void; notice(message: string): void; identity(): MessageIdentity; accept(api: MessageNodesApi): void }
