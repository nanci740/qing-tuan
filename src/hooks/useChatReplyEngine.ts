import { kv } from '../utils/kvStorage';
import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import type {MessageLocation,MessageNodesApi,MessagePay,MessagePhoto,MessageSticker,PeerMessageDetail} from '../types/chatMessages';
import {chatPhotoLook,chatPhotoReady,generateChatPhoto} from '../utils/chatPhoto';
import {chatPhotoDataUrl,saveChatPhoto} from '../utils/chatPhotoStore';
import type {ChatVoiceApi} from './useChatVoice';
import type {ChatPreferences} from '../types/chatPreferences';
import type {ApiMessage,ApiService} from '../types/api';
import {extractChatAiReply,emptyChatReplyReason,parseChatAiSegmentedReply,parseChatAiQuotedReply} from '../utils/chatReplyParser';
import {locationText,payFromData,payLabel,payText,stickerText,voiceLength} from '../utils/chatMessageNodes';
import {familyCardText,receivePay,settlePendingFromMe} from '../utils/walletStorage';
import {inQuietHours,personaAllowed,readMeSettings} from '../utils/meSettingsStorage';
import {aiStickers,findAiSticker,stickerDataUrl} from '../utils/stickerStorage';
import type {WorldInjection,WorldMessage} from '../utils/chatWorldContext';
import {buildChatSystemPrompt} from '../utils/chatPromptSections';
import {resolvePreset} from '../utils/presetStorage';
import {readProfileText} from './usePersonalProfile';
import {activePersona,activePersonaPrompt} from '../utils/meStorage';
/** 他怎么叫你：「我」里正在用的人设名字，没有就用主画面个人资料的名字。 */
const myName = () => activePersona()?.name.trim() || readProfileText('personal_profile_name').trim();
/** 他用文字打出来的照片（学上下文的「[照片] …」，或写成「[照片：…]」「【图片】…」）：认出来就回传那句说明，没写说明就叫「一张照片」；不是就回传 null。 */
function loosePhotoCaption(text:string):string|null {
    const match = /^\s*[\[【（(]\s*(?:照片|图片|相片|圖片)\s*(?:[:：]\s*([^\]】）)]*))?[\]】）)]\s*([\s\S]*)$/.exec(text);
    if (!match) return null;
    return [match[1], match[2]].map(part => (part || '').trim()).filter(Boolean).join(' ') || '一张照片';
}
/** 他用文字打出来的表情（「[表情] 生气」「[表情包：生气]」）：回传那个标签，不是就回传 null。 */
function looseStickerTag(text:string):string|null {
    const match = /^\s*[\[【（(]\s*(?:表情包?|贴图)\s*(?:[:：]\s*([^\]】）)]*))?[\]】）)]\s*([\s\S]*)$/.exec(text);
    return match ? (match[1] || match[2] || '').trim() : null;
}
/** 他学着上下文打了「[转账] ¥200」「[红包] ¥66，留言「…」」（也有写成英文 [transfer]、[packet] 的）：当成真的转账、红包。
    后面带着状态括号（「（对方还没收）」这种）是在照抄旧卡片，回传 false，那一句不发。 */
function loosePay(text:string):Omit<MessagePay,'id'>|false|null {
    const match = /^\s*[\[【]\s*(转账|红包|亲属卡|transfer|packet|red\s*packet|hongbao|family\s*card)\s*[\]】]\s*([\s\S]*)$/i.exec(text);
    if (!match) return null;
    if (/[（(][^）)]*(收|拆|退)[^）)]*[）)]/.test(match[2])) return false;
    const amount = /[¥￥]?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*元?/.exec(match[2]), note = /留言\s*[「“"]([^」”"]*)[」”"]/.exec(match[2]);
    const cents = amount ? Math.round(Number(amount[1].replace(/,/g, '')) * 100) : 0;
    return cents > 0 ? { kind: /亲属卡|family/i.test(match[1]) ? 'family' : /红包|packet|hongbao/i.test(match[1]) ? 'packet' : 'transfer', amount: cents, note: (note?.[1] || '').trim().slice(0, 40) } : false;
}
/** 文字照片在 photos 里的记号：表示「是照片，但画面描述还没写」。 */
const LOOSE_PHOTO = '\u0000loose-photo';
export interface ChatContextItem {role:string;content:string;messageId:string;quoteCandidate:string;quotedText?:string;voiceRow?:HTMLElement|null;voiceSeconds?:string;voiceSpoken?:string;
 /** 你发的照片的编号：送的时候从照片库拿出图片附给模型看。 */
 photoId?:string;
 /** 表情的图（qt-image: 编号或网址）：最近几张也附上图，他才知道表情长什么样。 */
 stickerImage?:string;}
export interface ChatReplyEngineServices {currentKey():string;preferences():ChatPreferences;identity():{name:string;avatar:string};worldContext(recent:ChatContextItem[],chatKey:string,selectedIds:string[],limit:number):WorldInjection;persona(chatKey:string):string;myPresence():string;refreshPins():void;roomVisible():boolean;viewed():boolean;background(detail:PeerMessageDetail):void;recallStored(detail:PeerMessageDetail&{messageId:string}):unknown;notify(detail:{chatKey:string;title:string;body:string;avatar:string;unreadCount:number;viewed:boolean}):void;feedback(kind:'receive'):void;character(chatKey:string):{name:string;appearance:string};
 /** 没开着的聊天用：那个聊天的设定、名字和头像、存着的聊天记录（一行一个元素）。 */
 preferencesFor(chatKey:string):ChatPreferences;identityFor(chatKey:string):{name:string;avatar:string};historyRows(chatKey:string):HTMLElement[];photo(detail:{chatKey:string;photo:MessagePhoto}):void;}
export interface ChatReplyEngineApi {request():Promise<void>;
 /** 家机主动找你：照那个聊天的记录，最后加一条系统提示请他开口。 */
 proactive(chatKey:string,prompt:string):Promise<void>;syncTyping():void;reloadPresence():void;presence(key:unknown):{online:string;status:string};status(text:string):void;
 /** 重画一张照片（点了失败的照片、或在照片预览里改了描述）。 */
 photo(chatKey:string,photo:MessagePhoto):void;
 /** 这张照片现在是不是正在画（重新整理后留下的「接收中」不算）。 */
 drawing(id:string):boolean;
 /** 你生图时的「补充描写」：用跟他回话一样的预设、世界书、人设和聊天记录，把你写的几个词写成完整的画面描述。 */
 photoPrompt(keywords:string,includeMe:boolean):Promise<string>;}
/** 世界书和预设单独成一条的消息插进聊天记录：front 放在聊天记录前面，tail 放在最后，depth 插在倒数第几条消息之前。 */
function insertInjected(list:ApiMessage[], injected:WorldMessage[]):ApiMessage[] {
    if (!injected.length) return list;
    const pick = (place:string) => injected.filter(item => item.place === place).map(({ role, content }) => ({ role, content }));
    const history = list.slice(1), inserts = new Map<number, ApiMessage[]>();
    for (const item of injected.filter(item => item.place === 'depth')) {
        const at = Math.max(0, history.length - item.depth);
        inserts.set(at, [...(inserts.get(at) || []), { role: item.role, content: item.content }]);
    }
    return [...list.slice(0, 1), ...pick('front'), ...history.flatMap((message, index) => [...(inserts.get(index) || []), message]), ...(inserts.get(history.length) || []), ...pick('tail')];
}
const CHAT_PRESENCE_KEY = 'smallphone_chat_presence_v1';
const PRESENCE_STATES = ['在线', '忙碌', '离开', '隐身'];
export function useChatReplyEngine(nodes:MessageNodesApi,voice:ChatVoiceApi){
 const services=useRef<ChatReplyEngineServices|null>(null);
 const pending=useRef(new Set<string>()),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 const preferences=useRef<ChatPreferences|null>(null);
 const [presenceMap,setPresenceMap]=useState<Record<string,{online:string;status:string}>>(readChatPresenceMap);
 const presenceRef=useRef(presenceMap);
 const [status,setStatus]=useState({text:'陪着你',resting:undefined as string|undefined,typing:undefined as string|undefined,key:undefined as string|undefined});
 const statusRef=useRef(status);
 const update=(patch:Partial<typeof status>)=>{statusRef.current={...statusRef.current,...patch};flushSync(()=>setStatus(statusRef.current));};
 const target=window as Window&{smallphoneApi?:ApiService};
 function later(callback:()=>void,delay:number){const timer=setTimeout(()=>{timers.current.delete(timer);callback();},delay);timers.current.add(timer);return timer;}
 const notice=(detail:string)=>window.dispatchEvent(new CustomEvent('qingtuan:toast',{detail}));
 function scroll(){nodes.scrollLatest();}
 function setChatReplyTyping(isTyping:boolean,chatKey=services.current!.currentKey()){
  if(!isActiveReplyChat(chatKey))return;const value=statusRef.current;
  if(isTyping){if(!preferences.current?.typingIndicator)return;update({resting:value.typing!=='true'?value.text.trim()||'陪着你':value.resting,typing:'true',key:String(chatKey),text:'对方正在输入…'});return;}
  update({text:value.typing==='true'&&value.key===String(chatKey)?value.resting||'陪着你':value.text,resting:undefined,typing:undefined,key:undefined});
 }
    /** stored：没开着的聊天，从存着的聊天记录读出来的那些行（编号照记录上的，不用另外配）。 */
    function collectCurrentChatContext(stored?:HTMLElement[]) {
        const context:ChatContextItem[] = [];
        // 只读最近的消息就够：送给模型的最多是「上下文条数」那么多条，多拿一些给撤回、待发这类会被略过的。
        const limit = Math.max(60, (Number(preferences.current?.contextMessages) || 30) * 2 + 20);
        const rows = stored ? stored.slice(-limit) : nodes.rows(limit);
        const idOf = (row:HTMLElement) => stored ? row.dataset.messageId || '' : nodes.id(row);
        for (const row of rows) {
            // 我撤回的讯息：他有看到就知道原文，没看到只知道我撤回了一条
            if (row.classList.contains('chat-recall-notice') && row.dataset.recalledBy === 'user') {
                const recalled = String(row.dataset.recalledContent || '').trim();
                const seen = row.dataset.seenByAi === 'true' && recalled;
                context.push({
                    role: 'user',
                    content: seen ? '[对方撤回了一条消息，你在撤回前看到了，原本写的是：「' + recalled + '」]' : '[对方撤回了一条消息，你没看到内容]',
                    messageId: '',
                    quoteCandidate: ''
                });
                continue;
            }
            // 对方（AI）自己撤回的讯息：让它知道撤回了什么（对方看不到内容）
            if (row.classList.contains('chat-recall-notice')) {
                const recalled = String(row.dataset.recalledContent || '').trim();
                if (recalled) context.push({ role: 'assistant', content: '[你撤回了一条消息，原本写的是：「' + recalled + '」]', messageId: '', quoteCandidate: '' });
                continue;
            }
            if (row.dataset.aiPending === 'true' || row.dataset.recalled === 'true') continue;
            const quotedText = row.querySelector('.chat-quoted-message')?.textContent?.trim() || '';
            const withQuote = (body: string) => quotedText
                ? '[这条消息引用的原文：' + JSON.stringify(quotedText) + ']\n' + body
                : body;
            // 语音消息：有转好的文字就给 AI 看文字；没有的话至少告诉它收到一条几秒的语音（以前整条跳过，AI 会以为没有新消息）
            if (row.querySelector('.chat-voice-control, .chat-voice-audio')) {
                const isUserVoice = row.classList.contains('is-user');
                const useTranscript = preferences.current?.voiceTranscribe !== false;
                const spoken = String((isUserVoice ? (useTranscript ? row.dataset.voiceTranscript : '') : (row.dataset.chatAiContent || row.dataset.voiceTranscript)) || '').trim();
                const seconds = row.querySelector('.chat-voice-length')?.textContent?.trim() || '';
                const voiceContent = spoken
                    ? (isUserVoice ? '[语音消息' + (seconds ? ' ' + seconds : '') + '] ' + spoken : spoken)
                    : '[对方发来一条语音' + (seconds ? '（' + seconds + '）' : '') + '，你听不清内容]';
                if (!isUserVoice && !spoken) continue;
                context.push({ role: isUserVoice ? 'user' : 'assistant', content: withQuote(voiceContent),
                    messageId: idOf(row), quoteCandidate: spoken, quotedText,
                    voiceRow: isUserVoice ? row : null, voiceSeconds: seconds, voiceSpoken: spoken });
                continue;
            }
            // 旧消息不一定有专用数据字段，优先提取气泡中的正文元素。
            let content = row.dataset.chatAiContent || '';
            // 转账、红包：照钱包现在的状态写（收下、退回、过期），不用存在记录里的旧字
            if (row.dataset.payId) content = payText(payFromData(row.dataset), row.classList.contains('is-user'));
            if (!content) {
                const bubble = row.querySelector('.chat-bubble');
                if (!bubble || bubble.classList.contains('chat-bubble--voice')) continue;
                const textDiv = Array.from(bubble.children).find(child =>
                    child.tagName === 'DIV' && !child.classList.contains('chat-quoted-message')
                    && !child.classList.contains('chat-bubble-shape')
                    && !child.classList.contains('chat-bubble-shape-base'));
                content = textDiv?.textContent?.trim() ||
                    Array.from(bubble.childNodes).filter(node => node.nodeType === 3)
                        .map(node => node.textContent).join(' ').trim();
            }
            const isUserMessage = row.classList.contains('is-user');
            // 舊版本可能已把回覆 JSON 顯示在氣泡內。傳回 AI 前先淨化，
            // 避免模型繼續模仿「正文 + quote_id 尾巴」的錯誤格式。
            if (!isUserMessage && content) {
                content = parseChatAiQuotedReply(content, []).reply;
            }
            if (!content || content === '你撤回了一条消息') continue;
            // 引用只用编辑后的文字（不带「已编辑」标记）
            const quoteText = content;
            // 编辑过的讯息：让 AI 知道这条改过、原本写的是什么
            if (isUserMessage && row.dataset.edited === 'true' && row.dataset.originalContent && row.dataset.originalContent !== content) {
                content = '[已编辑，原本是：「' + row.dataset.originalContent + '」] ' + content;
            }
            // 你发的照片：文字写成「对方发来一张照片」加附言，图片本身另外附上。
            if (isUserMessage && row.dataset.photoId) {
                const caption = String(row.dataset.photoCaption || '').trim();
                context.push({ role: 'user', content: withQuote('[对方发来一张照片' + (caption ? '，附言：「' + caption + '」' : '') + ']'),
                    messageId: idOf(row), quoteCandidate: caption ? '[照片] ' + caption : '[照片]', quotedText,
                    photoId: row.dataset.photoId });
                continue;
            }
            // 将引用快照和正文一起传给 AI，较早原文超出上下文时仍可读到。
            // 引用候选仍只保留正文，避免把上下文说明显示在引用卡里。
            context.push({ role: isUserMessage ? 'user' : 'assistant', content: withQuote(content),
                messageId: idOf(row), quoteCandidate: quoteText, quotedText,
                // 他自己发过、已经画好的照片：之后也把图片附给他看。
                photoId: !isUserMessage && row.dataset.photoId && row.querySelector('.chat-photo.is-done') ? row.dataset.photoId : undefined,
                stickerImage: row.dataset.stickerImage || undefined });
        }
        return context;
    }

    function isActiveReplyChat(chatKey:unknown) {
        return String(services.current!.currentKey()) === String(chatKey || '');
    }
    function appendChatAiReplyBubble(message:string) {
        const pending = nodes.appendPeer(message);
        scroll();
        return pending;
    }
    // 在线 / 状态：每个角色一笔，AI 回复时想改才改
    function readChatPresenceMap() {
        try { const map = JSON.parse(kv.getItem(CHAT_PRESENCE_KEY) || '{}'); return map && typeof map === 'object' ? map : {}; }
        catch (error) { return {}; }
    }
    function getChatPresence(chatKey:unknown) {
        const saved = presenceRef.current[String(chatKey || '')] || {};
        return { online: PRESENCE_STATES.includes(saved.online) ? saved.online : '在线', status: String(saved.status || '').slice(0, 30) };
    }
    function setChatPresence(chatKey:unknown, update:object) {
        if (!chatKey || !update || typeof update !== 'object') return;
        const map = {...presenceRef.current};
        const current = getChatPresence(chatKey);
        const next = { ...current };
        const fields=update as {online?:unknown;status?:unknown};
        if (PRESENCE_STATES.includes(String(fields.online || '').trim())) next.online = String(fields.online).trim();
        if (typeof fields.status === 'string') next.status = fields.status.trim().slice(0, 30);
        map[String(chatKey)] = next;
        try { kv.setItem(CHAT_PRESENCE_KEY, JSON.stringify(map)); } catch (error) {}
        presenceRef.current=map;setPresenceMap(map);
    }
    
    // 对方撤回自己的讯息：讯息换成「XX撤回了一条消息」提示，原文存在提示上（给 AI 读，画面上看不到）
    function recallAiMessageRow(row:HTMLElement, chatKey:string, reply:string, noticeText:string) {
        if (row?.isConnected && isActiveReplyChat(chatKey)) {
            nodes.recall(row,reply,noticeText,'assistant',Date.now());
            nodes.refresh();
            services.current?.refreshPins();
            return;
        }
        services.current?.recallStored({ chatKey, messageId: row?.dataset?.messageId || '', reply, recallNotice: noticeText });
    }
    // 家机的照片：先放一张「照片接收中」，背景慢慢画，画好或失败再换掉那一张（换了聊天也找得到）。
    const drawing = useRef(new Set<string>());
    async function drawPhoto(chatKey:string, photo:MessagePhoto) {
        drawing.current.add(photo.id);
        services.current?.photo({ chatKey, photo: { ...photo, state: 'pending', src: undefined, error: undefined } });
        try {
            // 他用文字打了「[照片] …」的那种只有说明、没有画面描述：先照说明把画面补完整（只补得了正在看的聊天）
            if (!photo.prompt.trim()) {
                if (chatKey !== services.current!.currentKey()) throw new Error('这张照片只有说明，打开那个聊天再点一下就能画');
                photo = { ...photo, prompt: await writeOwnPhotoPrompt(photo.caption) };
            }
            const src = await saveChatPhoto(photo.id, await generateChatPhoto(photo.prompt, services.current!.character(chatKey)));
            services.current?.photo({ chatKey, photo: { ...photo, state: 'done', src, error: undefined } });
        } catch (error) {
            const message = String((error as {message?:unknown}|null)?.message || error || '生图失败').slice(0, 120);
            services.current?.photo({ chatKey, photo: { ...photo, state: 'failed', src: undefined, error: message } });
            if (isActiveReplyChat(chatKey)) notice('照片没画出来：' + message);
        } finally { drawing.current.delete(photo.id); }
    }
    // 你生图的补充描写：跟他回话同一套底子（预设、世界书、人设、最近的聊天、预设参数），只是最后多一句「这次帮对方写照片的画面」，
    // 回传沿用平常的 JSON，取 photo 栏位；没写出 photo 就当作被拒绝，不拿去画。
    async function writeUserPhotoPrompt(keywords:string, includeMe:boolean) {
        const userName = myName();
        return writePhotoPrompt(`[系统提示] 这一次不用回话：对方（${userName || '用户'}）想自己画一张照片发给你，请你照对方给的关键词，把这张照片的画面写完整。关键词：「${keywords.trim()}」。` +
            `照着关键词的意思补上合理的细节，关键词指定的内容不要改掉；${includeMe ? '画面里有对方本人；' : ''}画面里有你自己时要写出你的外貌特征。`);
    }
    // 他自己发的照片只有一句说明（用文字打了「[照片] …」）：照那句说明把画面补完整，才能拿去画。
    async function writeOwnPhotoPrompt(caption:string) {
        return writePhotoPrompt(`[系统提示] 这一次不用回话：你刚刚发了一张照片给对方，照片的说明是「${caption.trim()}」，请把这张照片的画面写完整。` +
            '照着说明补上合理的细节，说明里的内容不要改掉；画面里有你自己时要写出你的外貌特征，有对方时照上面照片的写法写。');
    }
    async function writePhotoPrompt(task:string) {
        const requestPreferences = { ...services.current!.preferences() };
        preferences.current = requestPreferences;
        const chatKey = services.current!.currentKey();
        const api = target.smallphoneApi, config = api?.getConfig?.();
        if (!api?.requestChat || !config?.baseUrl || !config?.apiKey) throw new Error('先在 API 设置填好聊天模型，才能补充描写');
        const characterName = services.current!.identity().name;
        const recent = collectCurrentChatContext().slice(-Math.max(1, Number(requestPreferences.contextMessages) || 30));
        const world = services.current!.worldContext(recent, chatKey, requestPreferences.linkedWorldBooks || [], requestPreferences.worldBookLimit ?? 10000);
        const currentPresence = getChatPresence(chatKey);
        const preset = resolvePreset(requestPreferences.presetId);
        const prompt = buildChatSystemPrompt({
            characterName, userName: myName(), persona: services.current!.persona(chatKey), userPersona: personaAllowed(chatKey) ? activePersonaPrompt() : '', world,
            recentText: recent.map(item => String(item.content || '')).join('\n'), trailingUserMessages: 0,
            timeText: requestPreferences.timeAware ? new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',dateStyle:'full',timeStyle:'short'}).format(new Date()) : '',
            presence: { mine: readMeSettings().privacy.presence ? services.current!.myPresence() || '在线' : '', online: currentPresence.online, status: currentPresence.status },
            segmented: false, replyLength: requestPreferences.replyLength, quotePolicy: 'never', quoteChoicesText: '', voice: 'off', photo: 'on', photoLook: chatPhotoLook(),
        }, preset);
        const ask = task + '只输出一条：{"replies":[{"text":"照片的一句中文说明","photo":"给生图模型看的画面描述（照上面照片的写法）"}]}，不要加其他回复。';
        const messages:ApiMessage[] = [{ role: 'system', content: prompt.system }, ...recent.map(({ role, content }) => ({ role, content })), { role: 'user', content: ask }];
        const injected = [...world.messages, ...prompt.messages], extra = injected.filter(item => item.role !== 'system').length;
        const data = await api.requestChat(insertInjected(messages, injected), {
            feature: 'chat',
            contextMessages: (Number(requestPreferences.contextMessages) || 30) + extra + 1,
            ...(requestPreferences.customModel ? { model: requestPreferences.customModel } : {}),
            ...(preset.params.temperature.enabled ? { temperature: preset.params.temperature.value } : {}),
            ...(preset.params.topP.enabled ? { topP: preset.params.topP.value } : {}),
            ...(preset.params.maxTokens.enabled ? { maxTokens: preset.params.maxTokens.value } : {})
        });
        const raw = extractChatAiReply(data);
        if (!raw) throw new Error(emptyChatReplyReason(data));
        const parsed = parseChatAiSegmentedReply(raw, []);
        const photo = (parsed.photos || []).find(Boolean);
        if (!photo) throw new Error('补充描写没有写出画面，模型可能拒绝了：' + parsed.segments.join(' ').slice(0, 60));
        return photo;
    }
    // 家机的语音：用语音服务念出来，回传 { dataUrl, seconds }；wav 会先压成 16kHz 单声道，聊天记录比较不占空间
    /** proactive：家机主动找你（「我 → 设置」）。可以是没开着的聊天，照存着的聊天记录回；最后多一条系统提示请他主动开口；出错都不跳提示。 */
    async function requestCurrentChatAiReply(proactive?:{chatKey:string;prompt:string}) {
        const say = proactive ? () => {} : notice;
        const requestChatKey = proactive?.chatKey || services.current!.currentKey();
        const active = isActiveReplyChat(requestChatKey);
        const requestPreferences = { ...(active ? services.current!.preferences() : services.current!.preferencesFor(requestChatKey)) };
        preferences.current=requestPreferences;
        const api = target.smallphoneApi;
        const config = api?.getConfig?.();
        if (!api?.requestChat || !config?.baseUrl || !config?.apiKey ||
            !(requestPreferences.customModel || config?.featureModels?.chat || config?.model)) {
            say('请先在 API 设置中保存地址、密钥和聊天模型');
            return;
        }
        if (!requestChatKey || requestChatKey === 'no-character') {
            say('请先选择一个角色');
            return;
        }
        if (pending.current.has(requestChatKey)) {
            say('对方正在回复中');
            return;
        }
        const look = active ? services.current!.identity() : services.current!.identityFor(requestChatKey);
        const characterName = look.name;
        const characterAvatar = look.avatar;
        // 最近还没转成文字的语音，先用「语音与生图设置」里的语音 API 转文字（没设定或失败就略过，AI 会知道收到一条语音）
        const pendingVoiceRows = proactive || !active ? [] : nodes.rows().filter(row=>row.classList.contains('chat-message-row')&&row.classList.contains('is-user'))
            .slice(-Math.max(1, Number(requestPreferences.contextMessages) || 30))
            .filter(row => row.querySelector('.chat-voice-audio') && !row.dataset.voiceTranscript && row.dataset.recalled !== 'true');
        const voiceService = voice.voiceConfig();
        if (requestPreferences.voiceTranscribe !== false && pendingVoiceRows.length && voiceService.apiKey && voiceService.baseUrl) {
            for (const row of pendingVoiceRows) {
                // 转好的文字会写在这条消息上，聊天记录会自动跟着存
                try { await voice.transcribe(row, { showResult: false }); } catch (error) {}
            }
        }
        const context = collectCurrentChatContext(active ? undefined : services.current!.historyRows(requestChatKey));
        if (proactive) context.push({ role: 'user', content: proactive.prompt, messageId: '', quoteCandidate: '' });
        else if (!context.length || context[context.length - 1].role !== 'user') {
            say('先发送一条消息');
            return;
        }
        const recent = context.slice(-Math.max(1, Number(requestPreferences.contextMessages) || 30));
        // 末尾连续的用户消息属于同一轮输入：一起读取；这一轮刚发的也可以引用（像真人聊天直接引用正在聊的那句）
        const quoteChoices = (requestPreferences.quotePolicy === 'never' ? [] : recent).filter(item => item.quoteCandidate)
            .slice(-12).map((item, index) => ({
                id: `${item.role === 'assistant' ? 'a' : 'u'}${index + 1}`,
                role: item.role,
                targetId: item.messageId,
                text: item.quoteCandidate.slice(0, 120)
            }));
        const choicesText = quoteChoices.length
            ? quoteChoices.map(item => `${item.id} [${item.role === 'assistant' ? '你自己' : '用户'}]: ${JSON.stringify(item.text)}`).join('\n')
            : '（暂无可引用的较早消息）';
        const world = services.current!.worldContext(recent, requestChatKey, requestPreferences.linkedWorldBooks || [], requestPreferences.worldBookLimit ?? 10000);
        const currentPresence = getChatPresence(requestChatKey);
        const aiVoiceAllowed = !!requestPreferences.aiVoice && !!window.smallphoneVoiceReady?.();
        // 照片随时都能发；「家机照片生图」开着、生图也设定好了才真的画出来，不然就放预设照片，点开看画面描述。
        const aiPhotoDraw = !!requestPreferences.aiPhoto && chatPhotoReady();
        let trailingUserMessages = 0;
        for (let i = recent.length - 1; i >= 0 && recent[i].role === 'user'; i--) trailingUserMessages++;
        // 聊天设置另选的预设，没选就用预设 App 里设成默认的那份。
        const preset = resolvePreset(requestPreferences.presetId);
        const prompt = buildChatSystemPrompt({
            characterName,
            userName: myName(),
            userPersona: personaAllowed(requestChatKey) ? activePersonaPrompt() : '',
            persona: services.current!.persona(requestChatKey),
            world,
            recentText: recent.map(item => String(item.content || '')).join('\n'),
            trailingUserMessages,
            timeText: requestPreferences.timeAware ? new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',dateStyle:'full',timeStyle:'short'}).format(new Date()) : '',
            presence: { mine: readMeSettings().privacy.presence ? services.current!.myPresence() || '在线' : '', online: currentPresence.online, status: currentPresence.status },
            segmented: !!requestPreferences.segmented,
            replyLength: requestPreferences.replyLength,
            quotePolicy: requestPreferences.quotePolicy,
            quoteChoicesText: choicesText,
            voice: aiVoiceAllowed ? 'on' : (requestPreferences.aiVoice ? 'unavailable' : 'off'),
            photo: 'on',
            photoLook: chatPhotoLook(), photoInteraction: requestPreferences.photoInteraction,
            stickers: aiStickers().map(item => item.tag),
            familyCard: familyCardText(requestChatKey),
        }, preset);
        // 单独成一条消息的：世界书条目和预设里自己写的条目。
        const injected = [...world.messages, ...prompt.messages];
        const messages:ApiMessage[] = [
            { role: 'system', content: prompt.system },
            ...recent.map(({ role, content }) => ({ role, content }))
        ];
        // 直接听语音：最近 3 条你发的语音改成「说明文字 + wav 音频」一起送（Claude 不收音频，略过）
        let audioAttached = false;
        if (requestPreferences.voiceDirect && config?.provider !== 'claude') {
            const voiceItems = recent.map((item, index) => ({ item, index })).filter(x => x.item.voiceRow).slice(-3);
            for (const { item, index } of voiceItems) {
                try {
                    const wavBase64 = await voice.wav(item.voiceRow!);
                    if (!wavBase64) continue;
                    const label = '[语音消息' + (item.voiceSeconds ? ' ' + item.voiceSeconds : '') + '，请直接听附上的音频]' + (item.voiceSpoken ? ' 转写参考：' + item.voiceSpoken : '');
                    messages[index + 1] = { role: 'user', content: [
                        { type: 'text', text: item.quotedText ? '[这条消息引用的原文：' + JSON.stringify(item.quotedText) + ']\n' + label : label },
                        { type: 'input_audio', input_audio: { data: wavBase64, format: 'wav' } }
                    ] };
                    audioAttached = true;
                } catch (error) {}
            }
        }
        // 最近 3 张照片（你发的、他自己发的都算）把图片本身附上（模型要能看图；看不了就退回只送文字）。
        // 你发的那条直接换成「文字 + 图片」；他发的照片不能放在他自己那条里（多数接口不收助手带图），
        // 就在那条后面补一条「附图」给他看。
        let imageAttached = false;
        const photoFollowUps = new Map<number, ApiMessage>();
        for (const { item, index } of recent.map((item, index) => ({ item, index })).filter(x => x.item.photoId).slice(-3)) {
            let url = '';
            try { url = await chatPhotoDataUrl(item.photoId!); } catch (error) {}
            if (!url) continue;
            if (item.role === 'user') messages[index + 1] = { role: 'user', content: [{ type: 'text', text: item.content }, { type: 'image_url', image_url: { url } }] };
            else photoFollowUps.set(index + 1, { role: 'user', content: [{ type: 'text', text: '[系统附图：这是你上面发给对方的那张照片，你看得到它的样子。这条不是对方说的话，不用回应这条]' }, { type: 'image_url', image_url: { url } }] });
            imageAttached = true;
        }
        // 最近 3 张表情（你发的、他发的都算）也附上图：你发的那条换成「文字 + 图」，他发的在后面补一条附图。
        for (const { item, index } of recent.map((item, index) => ({ item, index })).filter(x => x.item.stickerImage).slice(-3)) {
            const url = await stickerDataUrl(item.stickerImage!);
            if (!url) continue;
            if (item.role === 'user') messages[index + 1] = { role: 'user', content: [{ type: 'text', text: item.content }, { type: 'image_url', image_url: { url } }] };
            else photoFollowUps.set(index + 1, { role: 'user', content: [{ type: 'text', text: '[系统附图：这是你上面发给对方的那张表情的样子。这条不是对方说的话，不用回应这条]' }, { type: 'image_url', image_url: { url } }] });
            imageAttached = true;
        }
        const textOnlyMessages = messages.map(message => Array.isArray(message.content)
            ? { role: message.role, content: recent[messages.indexOf(message) - 1]?.content || message.content.filter(part => part.type === 'text').map((part:{text?:string}) => part.text).join(' ') }
            : message);
        if (photoFollowUps.size) messages.splice(0, messages.length, ...messages.flatMap((message, index) => photoFollowUps.has(index) ? [message, photoFollowUps.get(index)!] : [message]));
        const withWorld = (list:ApiMessage[]):ApiMessage[] => insertInjected(list, injected);
        const extraMessages = injected.filter(item => item.role !== 'system').length + photoFollowUps.size;
        const pendingRows:HTMLElement[] = [];
        pending.current.add(requestChatKey);
        setChatReplyTyping(true, requestChatKey);
        try {
            const requestOptions = {
                feature: 'chat',
                // 世界书多插的消息不占上下文条数，否则最前面那条会被裁掉。
                contextMessages: extraMessages ? (Number(requestPreferences.contextMessages) || 30) + extraMessages : requestPreferences.contextMessages,
                ...(requestPreferences.customModel ? { model: requestPreferences.customModel } : {}),
                // 预设里打开的参数盖过 API 设置。
                ...(preset.params.temperature.enabled ? { temperature: preset.params.temperature.value } : {}),
                ...(preset.params.topP.enabled ? { topP: preset.params.topP.value } : {}),
                ...(preset.params.maxTokens.enabled ? { maxTokens: preset.params.maxTokens.value } : {})
            };
            let data;
            try {
                data = await api.requestChat(withWorld(messages), requestOptions);
            } catch (error) {
                // 模型不支持音频、图片（或太大）时，去掉附件改用文字再送一次
                if (!audioAttached && !imageAttached) throw error;
                say(imageAttached && !audioAttached ? '这个模型看不了图片，已改用文字' : audioAttached && !imageAttached ? '这个模型听不了语音，已改用文字' : '这个模型收不了语音和图片，已改用文字');
                data = await api.requestChat(withWorld(textOnlyMessages), requestOptions);
            }
            const rawReply = extractChatAiReply(data);
            // 主动找你时他照人设决定这次不发（回了空的 replies）：什么都不做
            if (proactive && /"replies"\s*:\s*\[\s*\]/.test(rawReply)) return;
            if (!rawReply) throw new Error(emptyChatReplyReason(data));
            const parsedReply = parseChatAiSegmentedReply(rawReply, quoteChoices);
            if (parsedReply.presence) setChatPresence(requestChatKey, parsedReply.presence);
            // 照片、定位一张一条；没分条时文字合成一条，照片和定位接在后面。
            // 他学着上下文打了「[照片] …」「[图片]…」这种字：一样当成照片，那句当说明，画面描述之后再补。
            const looseCaptions = parsedReply.segments.map((text, index) => (parsedReply.photos || [])[index] || (parsedReply.locations || [])[index] ? null : loosePhotoCaption(text));
            if (looseCaptions.some(caption => caption !== null)) parsedReply.segments = parsedReply.segments.map((text, index) => looseCaptions[index] ?? text);
            const replyPhotos = parsedReply.segments.map((_, index) => (parsedReply.photos || [])[index] || (looseCaptions[index] !== null ? LOOSE_PHOTO : ''));
            if (replyPhotos.some(Boolean) && requestPreferences.aiPhoto && !chatPhotoReady()) say('生图还没设定好，照片先放预设图');
            const replyLocations = parsedReply.locations || [];
            // 表情：照标签从家机能用的表情里找一张；他学着上下文打「[表情] 生气」也一样。找不到就当没发表情，那句只是「表情」两个字的就不发了。
            const replyStickers:(MessageSticker|null)[] = parsedReply.segments.map((text, index) => {
                if (replyPhotos[index] || replyLocations[index]) return null;
                const tag = (parsedReply.stickers || [])[index] || looseStickerTag(text);
                const found = tag ? findAiSticker(tag) : null;
                return found ? { tag: found.tag, image: found.image } : null;
            });
            // 转账、红包：transfer、packet 栏位，或他打的「[转账] ¥200」
            const loosePays = parsedReply.segments.map(text => loosePay(text));
            const replyPays:(Omit<MessagePay,'id'>|null)[] = parsedReply.segments.map((_, index) => replyPhotos[index] || replyLocations[index] || replyStickers[index] ? null
                : (parsedReply.pays || [])[index] || loosePays[index] || null);
            const dropped = parsedReply.segments.map((text, index) => !replyStickers[index] && (!!(parsedReply.stickers || [])[index] && text === '表情' || looseStickerTag(text) !== null) || !replyPays[index] && loosePays[index] === false);
            const cardIndexes = parsedReply.segments.map((_, index) => index).filter(index => replyPhotos[index] || replyLocations[index] || replyStickers[index] || replyPays[index]);
            const textOnly = parsedReply.segments.filter((_, index) => !replyPhotos[index] && !replyLocations[index] && !replyStickers[index] && !replyPays[index] && !dropped[index]);
            const segments = requestPreferences.segmented
                ? parsedReply.segments.map((text, index) => dropped[index] ? '' : text)
                : [...(textOnly.length ? [textOnly.join('\n')] : []), ...cardIndexes.map(index => parsedReply.segments[index])];
            const segmentPhotos = requestPreferences.segmented
                ? replyPhotos
                : [...(textOnly.length ? [''] : []), ...cardIndexes.map(index => replyPhotos[index] || '')];
            const replyScenes = parsedReply.scenes || [];
            const segmentScenes = requestPreferences.segmented
                ? replyScenes
                : [...(textOnly.length ? [''] : []), ...cardIndexes.map(index => replyScenes[index] || '')];
            const segmentLocations:(MessageLocation|null)[] = requestPreferences.segmented
                ? replyLocations
                : [...(textOnly.length ? [null] : []), ...cardIndexes.map(index => replyPhotos[index] ? null : replyLocations[index] || null)];
            const segmentStickers:(MessageSticker|null)[] = requestPreferences.segmented
                ? replyStickers
                : [...(textOnly.length ? [null] : []), ...cardIndexes.map(index => replyStickers[index] || null)];
            const segmentPays:(Omit<MessagePay,'id'>|null)[] = requestPreferences.segmented
                ? replyPays
                : [...(textOnly.length ? [null] : []), ...cardIndexes.map(index => replyPays[index] || null)];
            // 他对你还没收的转账、红包表态（收下、退回）：先照办，卡片会跟着换状态
            if (parsedReply.receive) settlePendingFromMe(requestChatKey, parsedReply.receive);
            // 每则自己的引用；没分段时整则用第一个引用
            const segmentQuotes = requestPreferences.segmented
                ? (parsedReply.quotes || [])
                : [(parsedReply.quotes || []).find(Boolean) || null];
            const segmentRecalls = requestPreferences.segmented ? (parsedReply.recalls || []) : [];
            const segmentVoices = !aiVoiceAllowed ? [] : (requestPreferences.segmented
                ? (parsedReply.voices || [])
                : [(parsedReply.voices || []).length > 0 && (parsedReply.voices || []).every(Boolean)]);
            const recallNoticeText = `${characterName}撤回了一条消息`;
            for (let index = 0; index < segments.length; index++) {
                const photo:MessagePhoto|null = segmentPhotos[index] ? { id: 'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), prompt: segmentPhotos[index] === LOOSE_PHOTO ? '' : segmentPhotos[index], caption: segments[index], ...(segmentScenes[index] ? { scene: segmentScenes[index] } : {}), state: aiPhotoDraw ? 'pending' : 'text' } : null;
                const location = photo ? null : segmentLocations[index] || null;
                const sticker = photo || location ? null : segmentStickers[index] || null;
                const payDraft = photo || location || sticker ? null : segmentPays[index] || null;
                const pay:MessagePay|null = payDraft ? { ...payDraft, id: 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) } : null;
                // 找不到表情的那一则（只剩「表情」两个字）不发
                if (!photo && !location && !sticker && !pay && !segments[index]) continue;
                // 他发的转账、红包先记进钱包（还没收），卡片才看得到状态
                if (pay) receivePay(pay, requestChatKey, characterName);
                const reply = photo ? '[照片] ' + photo.caption : location ? locationText(location) : sticker ? stickerText(sticker) : pay ? payText(pay, false) : segments[index];
                let notifyVoiceLength = '';
                const quote = segmentQuotes[index]?.quote || '';
                const quoteTargetId = segmentQuotes[index]?.quoteTargetId || '';
                // 转账、红包不撤回
                const willRecall = !!segmentRecalls[index] && !pay;
                if (willRecall && !isActiveReplyChat(requestChatKey)) {
                    services.current?.background({ chatKey: requestChatKey, reply, recalled: true, recallNotice: recallNoticeText, sentAt: Date.now() });
                    if (index < segments.length - 1) await new Promise<void>(resolve => later(resolve, requestPreferences.segmentDelay));
                    continue;
                }
                if (isActiveReplyChat(requestChatKey)) {
                    // 这一则要用语音：先合成（还在「正在输入」的时候），合成不出来就照样发文字
                    let voiceAudio = null;
                    if (segmentVoices[index] && !willRecall && !photo && !location && !sticker && !pay) {
                        try { voiceAudio = await voice.prepare(reply); } catch (error) { voiceAudio = null; }
                    }
                    const pending = appendChatAiReplyBubble(photo ? photo.caption : location ? location.place : sticker ? sticker.tag : pay ? payLabel(pay) : reply);
                    pendingRows.push(pending.row);
                    nodes.finishPeer(pending.row, { reply, sentAt: Date.now(), quote, quoteTargetId, photo, location, sticker, pay,
                        voice: voiceAudio, voiceAutoText: !!(voiceAudio && requestPreferences.voiceAutoText) });
                    if (voiceAudio) {
                        notifyVoiceLength = voiceLength(Number(voiceAudio.seconds));
                        if (requestPreferences.voiceAutoTranslate) voice.translate(pending.row).catch(() => {});
                    }
                    if(services.current!.roomVisible()) {
                        scroll();
                    }
                    if (willRecall) {
                        const recallRow = pending.row;
                        pendingRows.splice(pendingRows.indexOf(recallRow), 1); // 已经送出的讯息，回复失败也不要删
                        later(() => recallAiMessageRow(recallRow, requestChatKey, reply, recallNoticeText), 2000 + Math.random() * 1200);
                    }
                } else {
                    // 不在看这个聊天：语音照样合成好，跟着消息一起存进那个聊天
                    let backgroundVoice = null;
                    let backgroundTranslation = '';
                    if (segmentVoices[index] && !photo && !location && !sticker && !pay) {
                        try {
                            const voiceAudio = await voice.prepare(reply);
                            if (voiceAudio) backgroundVoice = { dataUrl: voiceAudio.dataUrl, lengthText: voiceLength(Number(voiceAudio.seconds)) };
                            if (backgroundVoice) notifyVoiceLength = backgroundVoice.lengthText;
                        } catch (error) { backgroundVoice = null; }
                        if (backgroundVoice && requestPreferences.voiceAutoTranslate) {
                            try {
                                backgroundTranslation = await voice.translateText(reply) || '';
                            } catch (error) { backgroundTranslation = ''; }
                        }
                    }
                    services.current?.background({
                        chatKey: requestChatKey,
                        reply,
                        photo,
                        location,
                        sticker,
                        pay,
                        quote,
                        quoteTargetId,
                        sentAt: Date.now(),
                        voice: backgroundVoice,
                        voiceAutoText: !!(backgroundVoice && requestPreferences.voiceAutoText),
                        translation: backgroundTranslation
                    });
                }
                if (photo && aiPhotoDraw && !willRecall) void drawPhoto(requestChatKey, photo);
                // 每个气泡就是一条独立消息：出现时立即计算已读、未读与通知。
                const segmentWasViewed = isActiveReplyChat(requestChatKey) &&
                    services.current!.viewed();
                if (segmentWasViewed) nodes.markRead(null,true);
                if (!willRecall) services.current?.notify({
                    chatKey: requestChatKey,
                    title: characterName,
                    body: notifyVoiceLength ? '[语音] ' + notifyVoiceLength : pay ? payLabel(pay) : (reply || '收到一条新回复'),
                    avatar: characterAvatar,
                    unreadCount: 1,
                    viewed: segmentWasViewed
                });
                if (index < segments.length - 1) {
                    await new Promise<void>(resolve => later(resolve, requestPreferences.segmentDelay));
                }
            }
            if (!inQuietHours()) services.current!.feedback('receive');
        } catch (error) {
            nodes.remove(pendingRows);
            say('回复失败：' + String((error as {message?:unknown}|null)?.message || error || '请检查 API 设置').slice(0, 100));
        } finally {
            pending.current.delete(requestChatKey);
            setChatReplyTyping(false, requestChatKey);
            if (isActiveReplyChat(requestChatKey)) nodes.refresh();
        }
    }

 const apiRef=useRef<ChatReplyEngineApi|null>(null);
 if(!apiRef.current)apiRef.current={request:()=>requestCurrentChatAiReply(),proactive:(chatKey,prompt)=>requestCurrentChatAiReply({chatKey,prompt}),syncTyping(){const key=services.current!.currentKey();setChatReplyTyping(pending.current.has(key),key);},reloadPresence(){const map=readChatPresenceMap();presenceRef.current=map;setPresenceMap(map);},presence:getChatPresence,photo(chatKey,photo){void drawPhoto(chatKey,photo);},drawing:id=>drawing.current.has(id),photoPrompt:writeUserPhotoPrompt,status(text){update({text,typing:undefined,key:undefined,resting:undefined});}};
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);},[]);
 return {services,api:apiRef.current,status,presenceMap};
}
