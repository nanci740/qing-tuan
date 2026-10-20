import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import type {MessageNodesApi,PeerMessageDetail} from '../types/chatMessages';
import type {ChatVoiceApi} from './useChatVoice';
import type {ChatPreferences} from '../types/chatPreferences';
import type {ApiMessage,ApiService} from '../types/api';
import {extractChatAiReply,emptyChatReplyReason,parseChatAiSegmentedReply,parseChatAiQuotedReply} from '../utils/chatReplyParser';
import {voiceLength} from '../utils/chatMessageNodes';
import type {WorldInjection} from '../utils/chatWorldContext';
import {buildChatSystemPrompt} from '../utils/chatPromptSections';
export interface ChatContextItem {role:string;content:string;messageId:string;quoteCandidate:string;quotedText?:string;voiceRow?:HTMLElement|null;voiceSeconds?:string;voiceSpoken?:string;}
export interface ChatReplyEngineServices {currentKey():string;preferences():ChatPreferences;identity():{name:string;avatar:string};worldContext(recent:ChatContextItem[],chatKey:string,selectedIds:string[]):WorldInjection;persona(chatKey:string):string;myPresence():string;refreshPins():void;roomVisible():boolean;viewed():boolean;background(detail:PeerMessageDetail):void;recallStored(detail:PeerMessageDetail&{messageId:string}):unknown;notify(detail:{chatKey:string;title:string;body:string;avatar:string;unreadCount:number;viewed:boolean}):void;feedback(kind:'receive'):void;}
export interface ChatReplyEngineApi {request():Promise<void>;syncTyping():void;reloadPresence():void;presence(key:unknown):{online:string;status:string};status(text:string):void;}
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
    function collectCurrentChatContext() {
        const context:ChatContextItem[] = [];
        const rows = nodes.rows();
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
                    messageId: nodes.id(row), quoteCandidate: spoken, quotedText,
                    voiceRow: isUserVoice ? row : null, voiceSeconds: seconds, voiceSpoken: spoken });
                continue;
            }
            // 旧消息不一定有专用数据字段，优先提取气泡中的正文元素。
            let content = row.dataset.chatAiContent || '';
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
            // 将引用快照和正文一起传给 AI，较早原文超出上下文时仍可读到。
            // 引用候选仍只保留正文，避免把上下文说明显示在引用卡里。
            context.push({ role: isUserMessage ? 'user' : 'assistant', content: withQuote(content),
                messageId: nodes.id(row), quoteCandidate: quoteText, quotedText });
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
        try { const map = JSON.parse(localStorage.getItem(CHAT_PRESENCE_KEY) || '{}'); return map && typeof map === 'object' ? map : {}; }
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
        try { localStorage.setItem(CHAT_PRESENCE_KEY, JSON.stringify(map)); } catch (error) {}
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
    // 家机的语音：用语音服务念出来，回传 { dataUrl, seconds }；wav 会先压成 16kHz 单声道，聊天记录比较不占空间
    async function requestCurrentChatAiReply() {
        const requestPreferences = { ...services.current!.preferences() };
        preferences.current=requestPreferences;
        const requestChatKey = services.current!.currentKey();
        const api = target.smallphoneApi;
        const config = api?.getConfig?.();
        if (!api?.requestChat || !config?.baseUrl || !config?.apiKey ||
            !(requestPreferences.customModel || config?.featureModels?.chat || config?.model)) {
            notice('请先在 API 设置中保存地址、密钥和聊天模型');
            return;
        }
        if (!requestChatKey || requestChatKey === 'no-character') {
            notice('请先选择一个角色');
            return;
        }
        if (pending.current.has(requestChatKey)) {
            notice('对方正在回复中');
            return;
        }
        const characterName = services.current!.identity().name;
        const characterAvatar = services.current!.identity().avatar;
        // 最近还没转成文字的语音，先用「语音与生图设置」里的语音 API 转文字（没设定或失败就略过，AI 会知道收到一条语音）
        const pendingVoiceRows = nodes.rows().filter(row=>row.classList.contains('chat-message-row')&&row.classList.contains('is-user'))
            .slice(-Math.max(1, Number(requestPreferences.contextMessages) || 30))
            .filter(row => row.querySelector('.chat-voice-audio') && !row.dataset.voiceTranscript && row.dataset.recalled !== 'true');
        const voiceService = voice.voiceConfig();
        if (requestPreferences.voiceTranscribe !== false && pendingVoiceRows.length && voiceService.apiKey && voiceService.baseUrl) {
            for (const row of pendingVoiceRows) {
                // 转好的文字会写在这条消息上，聊天记录会自动跟着存
                try { await voice.transcribe(row, { showResult: false }); } catch (error) {}
            }
        }
        const context = collectCurrentChatContext();
        if (!context.length || context[context.length - 1].role !== 'user') {
            notice('先发送一条消息');
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
        const world = services.current!.worldContext(recent, requestChatKey, requestPreferences.linkedWorldBooks || []);
        const currentPresence = getChatPresence(requestChatKey);
        const aiVoiceAllowed = !!requestPreferences.aiVoice && !!window.smallphoneVoiceReady?.();
        let trailingUserMessages = 0;
        for (let i = recent.length - 1; i >= 0 && recent[i].role === 'user'; i--) trailingUserMessages++;
        const systemPrompt = buildChatSystemPrompt({
            characterName,
            persona: services.current!.persona(requestChatKey),
            world,
            recentText: recent.map(item => String(item.content || '')).join('\n'),
            trailingUserMessages,
            timeText: requestPreferences.timeAware ? new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',dateStyle:'full',timeStyle:'short'}).format(new Date()) : '',
            presence: { mine: services.current!.myPresence() || '在线', online: currentPresence.online, status: currentPresence.status },
            segmented: !!requestPreferences.segmented,
            replyLength: requestPreferences.replyLength,
            quotePolicy: requestPreferences.quotePolicy,
            quoteChoicesText: choicesText,
            voice: aiVoiceAllowed ? 'on' : (requestPreferences.aiVoice ? 'unavailable' : 'off'),
        });
        const messages:ApiMessage[] = [
            { role: 'system', content: systemPrompt },
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
        const textOnlyMessages = messages.map(message => Array.isArray(message.content)
            ? { role: message.role, content: recent[messages.indexOf(message) - 1]?.content || message.content.filter(part => part.type === 'text').map((part:{text?:string}) => part.text).join(' ') }
            : message);
        // 单独成一条消息的世界书条目：front 放在聊天记录前面，tail 放在最后，depth 插在倒数第几条消息之前。
        const withWorld = (list:ApiMessage[]):ApiMessage[] => {
            if (!world.messages.length) return list;
            const pick = (place:string) => world.messages.filter(item => item.place === place).map(({ role, content }) => ({ role, content }));
            const history = list.slice(1), inserts = new Map<number, ApiMessage[]>();
            for (const item of world.messages.filter(item => item.place === 'depth')) {
                const at = Math.max(0, history.length - item.depth);
                inserts.set(at, [...(inserts.get(at) || []), { role: item.role, content: item.content }]);
            }
            return [...list.slice(0, 1), ...pick('front'), ...history.flatMap((message, index) => [...(inserts.get(index) || []), message]), ...(inserts.get(history.length) || []), ...pick('tail')];
        };
        const extraMessages = world.messages.filter(item => item.role !== 'system').length;
        const pendingRows:HTMLElement[] = [];
        pending.current.add(requestChatKey);
        setChatReplyTyping(true, requestChatKey);
        try {
            const requestOptions = {
                feature: 'chat',
                // 世界书多插的消息不占上下文条数，否则最前面那条会被裁掉。
                contextMessages: extraMessages ? (Number(requestPreferences.contextMessages) || 30) + extraMessages : requestPreferences.contextMessages,
                ...(requestPreferences.customModel ? { model: requestPreferences.customModel } : {})
            };
            let data;
            try {
                data = await api.requestChat(withWorld(messages), requestOptions);
            } catch (error) {
                // 模型不支持音频（或音频太大）时，去掉音频改用文字再送一次
                if (!audioAttached) throw error;
                notice('这个模型听不了语音，已改用文字');
                data = await api.requestChat(withWorld(textOnlyMessages), requestOptions);
            }
            const rawReply = extractChatAiReply(data);
            if (!rawReply) throw new Error(emptyChatReplyReason(data));
            const parsedReply = parseChatAiSegmentedReply(rawReply, quoteChoices);
            if (parsedReply.presence) setChatPresence(requestChatKey, parsedReply.presence);
            const segments = requestPreferences.segmented
                ? parsedReply.segments
                : [parsedReply.segments.join('\n')];
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
                const reply = segments[index];
                let notifyVoiceLength = '';
                const quote = segmentQuotes[index]?.quote || '';
                const quoteTargetId = segmentQuotes[index]?.quoteTargetId || '';
                const willRecall = !!segmentRecalls[index];
                if (willRecall && !isActiveReplyChat(requestChatKey)) {
                    services.current?.background({ chatKey: requestChatKey, reply, recalled: true, recallNotice: recallNoticeText, sentAt: Date.now() });
                    if (index < segments.length - 1) await new Promise<void>(resolve => later(resolve, requestPreferences.segmentDelay));
                    continue;
                }
                if (isActiveReplyChat(requestChatKey)) {
                    // 这一则要用语音：先合成（还在「正在输入」的时候），合成不出来就照样发文字
                    let voiceAudio = null;
                    if (segmentVoices[index] && !willRecall) {
                        try { voiceAudio = await voice.prepare(reply); } catch (error) { voiceAudio = null; }
                    }
                    const pending = appendChatAiReplyBubble(reply);
                    pendingRows.push(pending.row);
                    nodes.finishPeer(pending.row, { reply, sentAt: Date.now(), quote, quoteTargetId,
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
                    if (segmentVoices[index]) {
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
                        quote,
                        quoteTargetId,
                        sentAt: Date.now(),
                        voice: backgroundVoice,
                        voiceAutoText: !!(backgroundVoice && requestPreferences.voiceAutoText),
                        translation: backgroundTranslation
                    });
                }
                // 每个气泡就是一条独立消息：出现时立即计算已读、未读与通知。
                const segmentWasViewed = isActiveReplyChat(requestChatKey) &&
                    services.current!.viewed();
                if (segmentWasViewed) nodes.markRead(null,true);
                if (!willRecall) services.current?.notify({
                    chatKey: requestChatKey,
                    title: characterName,
                    body: notifyVoiceLength ? '[语音] ' + notifyVoiceLength : (reply || '收到一条新回复'),
                    avatar: characterAvatar,
                    unreadCount: 1,
                    viewed: segmentWasViewed
                });
                if (index < segments.length - 1) {
                    await new Promise<void>(resolve => later(resolve, requestPreferences.segmentDelay));
                }
            }
            services.current!.feedback('receive');
        } catch (error) {
            nodes.remove(pendingRows);
            notice('回复失败：' + String((error as {message?:unknown}|null)?.message || error || '请检查 API 设置').slice(0, 100));
        } finally {
            pending.current.delete(requestChatKey);
            setChatReplyTyping(false, requestChatKey);
            if (isActiveReplyChat(requestChatKey)) nodes.refresh();
        }
    }

 const apiRef=useRef<ChatReplyEngineApi|null>(null);
 if(!apiRef.current)apiRef.current={request:requestCurrentChatAiReply,syncTyping(){const key=services.current!.currentKey();setChatReplyTyping(pending.current.has(key),key);},reloadPresence(){const map=readChatPresenceMap();presenceRef.current=map;setPresenceMap(map);},presence:getChatPresence,status(text){update({text,typing:undefined,key:undefined,resting:undefined});}};
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);},[]);
 return {services,api:apiRef.current,status,presenceMap};
}
