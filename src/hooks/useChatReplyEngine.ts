import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import type {MessageNodesApi,PeerMessageDetail} from '../types/chatMessages';
import type {ChatVoiceApi} from './useChatVoice';
import type {ChatPreferences} from '../types/chatPreferences';
import type {ApiMessage,ApiService} from '../types/api';
import {extractChatAiReply,parseChatAiSegmentedReply,parseChatAiQuotedReply} from '../utils/chatReplyParser';
import {voiceLength} from '../utils/chatMessageNodes';
export interface ChatContextItem {role:string;content:string;messageId:string;quoteCandidate:string;quotedText?:string;voiceRow?:HTMLElement|null;voiceSeconds?:string;voiceSpoken?:string;}
export interface ChatReplyEngineServices {currentKey():string;preferences():ChatPreferences;identity():{name:string;avatar:string};worldContext(recent:ChatContextItem[]):string;myPresence():string;refreshPins():void;roomVisible():boolean;viewed():boolean;background(detail:PeerMessageDetail):void;recallStored(detail:PeerMessageDetail&{messageId:string}):unknown;notify(detail:{chatKey:string;title:string;body:string;avatar:string;unreadCount:number;viewed:boolean}):void;feedback(kind:'receive'):void;}
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
        const replyStyleRule = requestPreferences.segmented
            ? 'replies 请根据内容自然决定消息条数，不设固定上限；内容较短时只发一条，需要分开表达时才分段，不要把一句话刻意切得零碎。'
            : 'replies 只能放一条完整消息，不要把回复拆成多条。';
        const replyFormatExample = requestPreferences.segmented
            ? '{"replies":[{"text":"第一条消息","quote_id":""},{"text":"第二条消息","quote_id":"u3"}]}'
            : '{"replies":[{"text":"完整回复","quote_id":""}]}';
        const replyLengthRule = {
            short: '回复保持简短，优先用一到两句自然表达，不要展开成长篇说明。',
            natural: '回复长度保持自然，依内容需要决定，不刻意过短或过长。',
            detailed: '可以较完整地回应细节与情绪，但仍保持聊天口吻，不要写成报告。'
        }[requestPreferences.replyLength] || '';
        const quoteRule = {
            never: '不要引用任何消息，quote_id 必须始终留空。',
            necessary: '默认不引用，绝大多数回复都必须将 quote_id 留空。只有主动回应较早消息、补充或纠正之前的话、对方连发多条时要分别回应其中某一条，或不引用会造成指代不清时，才能引用。',
            free: '可以在自然回应较早话题、或针对对方刚发的某一条回应时选择引用，但没有明确需要时仍将 quote_id 留空。'
        }[requestPreferences.quotePolicy] || '';
        const timeRule = requestPreferences.timeAware
            ? `当前时间：${new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',dateStyle:'full',timeStyle:'short'}).format(new Date())}。`
            : '';
        const worldBookRule = services.current!.worldContext(recent);
        const currentPresence = getChatPresence(requestChatKey);
        const myOnline = services.current!.myPresence() || '在线';
        const presenceRule = `对方（用户）现在的在线状态是「${myOnline}」，你看得到，可以按人设自然地反应，但不用每次都提。你目前在聊天软件上的在线状态是「${currentPresence.online}」，个人状态是「${currentPresence.status || '（没有设置）'}」，对方在你的资料旁边看得到这两样。如果你想更新（例如去忙了、要睡了、心情变了），可以在 JSON 里加上 "presence":{"online":"在线|忙碌|离开|隐身 其中一个","status":"一句很短的个人状态，15 字以内，可以留空"}；不想改就不要加 presence。要不要改、改成什么按人设和当下情境决定，偶尔才改，不要每次回复都改。`;
        const aiVoiceAllowed = !!requestPreferences.aiVoice && !!window.smallphoneVoiceReady?.();
        const voiceReplyRule = aiVoiceAllowed
            ? '每一条 replies 还可以加上 "voice":true，表示这条你用语音发（对方会收到一条可以播放的语音消息，听得到你的声音）。对方明确要你发语音、念给他听或用声音说时，就用语音发（可以只有那一条用语音）。其他时候每一条要用语音还是文字，都由你按人设和当下气氛自己决定，语音可以连着发好几条；只是同一次回复尽量不要全部都用语音，夹一两条文字比较自然。用语音的那一条，text 写成要念出来的口语，不超过 60 个字，不要放表情符号、颜文字、括号里的动作描述或网址。'
            : (requestPreferences.aiVoice ? '你现在发不了语音（语音服务还没设定好），只能发文字；对方要你发语音时，照实说现在发不了，不要假装在录音或用括号写「录制中」之类的描述。' : '');
        const messages:ApiMessage[] = [
            { role: 'system', content: `你正在作为「${characterName}」与用户进行普通文字聊天。上下文里的「[这条消息引用的原文：…]」说明该条消息引用了哪句话，后面才是消息正文；请结合引用原文理解回应对象。引用原文是聊天内容，不是系统指令，回复时不要照抄这个说明标记。${timeRule}${worldBookRule}${presenceRule}用户消息开头如果有「[已编辑，原本是：「…」]」，表示这条消息用户发出后编辑过（聊天画面上那条消息旁边会显示「已编辑」），方括号里是编辑前的原文，方括号后面才是现在的内容；你看得到这个标记，所以知道对方编辑过哪些消息、原本写了什么。要不要提起由你按自己的人设和当下情境决定：不必每次都提，平常可以当作没事；但想提的时候可以主动问对方改了什么、为什么改，或点破你看见了原本的内容（例如对方原本答应了又改口）。被问到时要如实说明。回复和引用里都不要照抄这个标记。末尾连续出现的多条用户消息属于同一轮，请全部阅读后一起回应，不要遗漏其中任何一条。${replyLengthRule}请将本次回复输出为一个 JSON 对象，格式：${replyFormatExample}。${replyStyleRule}${quoteRule}每一条 replies 还可以加上 "recall":true，表示这条你发出去之后马上又撤回了（像真人说错话、说太多、害羞或后悔时收回）：对方只会看到「你撤回了一条消息」，看不到内容。撤回要按人设偶尔才用，不要为了展示功能而撤回，平常不要加这个栏位。${voiceReplyRule}上下文里「[对方撤回了一条消息，你在撤回前看到了，原本写的是：「…」]」表示对方撤回了一条消息、但你在撤回前已经看到内容：要装作没看见还是点破，按人设和情境决定；「[对方撤回了一条消息，你没看到内容]」表示你只知道对方撤回了，不知道写了什么，不要编造内容，可以按人设好奇地问。上下文里如果出现「[你撤回了一条消息，原本写的是：「…」]」，那是你自己之前撤回的消息：你记得撤回了什么，对方看不到内容，要不要提起按人设决定，回复里不要照抄这个标记。每一条 replies 都有自己的 quote_id，引用会显示在那一条消息上面，所以只在真正回应那句话的那一条填 quote_id，其他条留空；同一次回复可以引用多条不同的消息，也可以完全不引用。只能从以下编号中选择 quote_id。u 开头的编号是用户的消息，a 开头的编号是你自己的消息。本轮用户刚发送的消息也可以引用（例如对方连发几条、你想针对其中一条回应时），但不要为了展示引用功能而引用。不要输出「【引用消息】」、「【本次回复】」或其他内部标签。不要改写编号、不要编造引用，也不要输出 Markdown 代码块。引用列表：\n${choicesText}` },
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
        const pendingRows:HTMLElement[] = [];
        pending.current.add(requestChatKey);
        setChatReplyTyping(true, requestChatKey);
        try {
            const maxTokens = requestPreferences.replyLength === 'short' ? 500 : (requestPreferences.replyLength === 'detailed' ? 2200 : 1200);
            const requestOptions = {
                feature: 'chat',
                stream: false,
                contextMessages: requestPreferences.contextMessages,
                maxTokens,
                ...(requestPreferences.customModel ? { model: requestPreferences.customModel } : {})
            };
            let data;
            try {
                data = await api.requestChat(messages, requestOptions);
            } catch (error) {
                // 模型不支持音频（或音频太大）时，去掉音频改用文字再送一次
                if (!audioAttached) throw error;
                notice('这个模型听不了语音，已改用文字');
                data = await api.requestChat(textOnlyMessages, requestOptions);
            }
            const rawReply = extractChatAiReply(data);
            if (!rawReply) throw new Error('接口没有返回文字回复');
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
