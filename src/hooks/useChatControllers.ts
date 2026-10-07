import {useWorld} from '../providers/WorldProvider';
import {useEffect,useRef} from 'react';
import {useNativeRefs} from '../providers/NativeRefsProvider';
import {useChatNavigation} from '../providers/ChatNavigationProvider';
import {useSettingsNavigation} from '../providers/SettingsNavigationProvider';
import type {ChatNavigationServices,ChatNavigationApi} from '../providers/ChatNavigationProvider';
import type {ChatIdentityApi} from '../providers/ChatIdentityProvider';
import type {RoomToolsApi,RoomToolsServices} from '../providers/ChatRoomToolsProvider';
import type {MessageNodesApi,MessagesConnection,PeerMessageDetail} from '../types/chatMessages';
import type {ChatVoiceApi,ChatVoiceServices} from './useChatVoice';
import type {ChatReplyEngineApi,ChatReplyEngineServices,ChatContextItem} from './useChatReplyEngine';
import type {ChatComposerApi,ChatComposerServices} from '../types/chatComposer';
import type {ChatReplyTriggerApi,ChatReplyTriggerServices} from '../types/chatReplyTriggers';
import type {ChatReplyParserApi} from '../types/chatReplyParser';
import type {ChatPreferences,ChatPreferenceBridge,ChatPreferenceServices} from '../types/chatPreferences';
import type {MessageOperationsApi,MessageOperationsServices} from '../types/chatMessageOperations';
import type {MessageSelectionApi,MessageSelectionServices,ChatSelectionServices} from '../types/chatSelection';
import type {ChatPinsBridge,ChatPinsServices} from '../types/chatPins';
import type {ChatCharacter,ChatCharacterStoreBridge} from '../types/chatCharacters';
import type {ChatCharacterActionsServices,ChatConfirmationOptions,ChatConfirmationRequest} from '../types/chatCharacterActions';
import type {ReplyNotificationBridge,ReplyNotificationServices,ReplyDetail} from '../types/replyNotification';
import type {ForwardRecordsApi,ForwardSourceItem} from '../types/chatForwardRecords';
import type {RecordDetailServices} from '../types/chatRecordDetail';
import type {ForwardPickerApi,ForwardPickerServices,ForwardPayload} from '../types/chatForward';
import type {CharacterChatServices} from '../types/characterDossier';
import type {ChatThreadSnapshot} from '../types/chatThread';
import type {ApiService} from '../types/api';
import {linkedWorldContext} from '../utils/chatWorldContext';
import {loadChatPreferences as readPreferences} from '../utils/chatPreferences';
import {DEFAULT_AVATAR} from '../utils/defaultAvatar';
import {showToast} from '../utils/toast';
interface ChatPublicApi {
 smallphoneMessages:MessageNodesApi;
 smallphoneApi?:ApiService;
 smallphoneSyncRoomIdentity(character:ChatCharacter):void;
 smallphoneSetChatStatus(value:string):void;
 smallphoneSyncChatReplyTyping():void;
 smallphoneOpenChatApp():void;
 smallphoneOpenCharacterChat(key:unknown):boolean;
 smallphoneGetActiveCharacterProfile():ChatCharacter|null;
 smallphoneGetActiveCharacterPrompt():string;
 smallphoneSyncChatSettingsIdentity():void;
 smallphoneAppendBackgroundReply(detail:PeerMessageDetail):boolean;
 smallphoneRecallStoredMessage(detail?:PeerMessageDetail&{messageId?:string}):boolean;
 smallphoneHandleReplyComplete(detail?:ReplyDetail):void;
 smallphoneGetChatDraft(key?:string):string;
 smallphoneLoadCurrentChatDraft():void;
 smallphoneDeleteChatDraft(key:unknown):void;
 smallphoneEnsureChatOpening():boolean;
 applyChatRoomPreferences():void;
 refreshChatBubbleGroups(container?:HTMLElement|null):void;
 refreshChatDateDividers(container:HTMLElement):void;
 syncChatReadReceipts(container?:HTMLElement|null):void;
 setChatMessageRead(target:HTMLElement|null,isRead?:boolean):void;
 bindChatVoiceBubble(pill:HTMLElement):void;
 smallphoneRefreshPinnedMessages():void;
 smallphoneOpenForwardPicker(payload:ForwardPayload):void;
 smallphoneCloseForwardPicker():void;
 smallphoneFlushAutoReply(key:unknown):void;
 smallphoneSetAutoReplyDelay(value:unknown):void;
 smallphoneParseChatAiSegmentedReply:ChatReplyParserApi['segmented'];
 smallphoneShowChatConfirm(options?:ChatConfirmationOptions):Promise<boolean>;
 smallphoneChatTargets():{key:string;name:string}[];
 smallphoneOpenCharacterCard(id?:unknown):void;
}
function serviceError(error:unknown){if(error instanceof Error&&error.name==='AbortError')return '已取消';return String(error instanceof Error?error.message:'请求失败').slice(0,150);}
export function useChatControllers(messages:MessageNodesApi){const refs=useNativeRefs()!,navigation=useChatNavigation(),settingsNavigation=useSettingsNavigation(),world=useWorld();const otherPages=useRef({settingsNavigation,world});otherPages.current={settingsNavigation,world};const history=useRef<{activeKey:string;restoring:boolean;histories:Record<string,string>;times:Record<string,number>;counts:Record<string,number>}>({activeKey:'',restoring:false,histories:{},times:{},counts:{}});const state=useRef({preferences:readPreferences('no-character'),suppressVoiceUntil:0});
useEffect(()=>{const bridge=window as unknown as Window&ChatPublicApi;const dispose:(()=>void)[]=[];function listen<T=unknown>(target:EventTarget,name:string,handler:(event:CustomEvent<T>)=>void){const listener=(event:Event)=>handler(event as CustomEvent<T>);target.addEventListener(name,listener);dispose.push(()=>target.removeEventListener(name,listener));}function frame(action:FrameRequestCallback){const id=requestAnimationFrame(action);dispose.push(()=>cancelAnimationFrame(id));}function later(action:()=>void,delay:number){const id=window.setTimeout(action,delay);dispose.push(()=>window.clearTimeout(id));}
const original=new Map<string,unknown>();for(const key of Object.keys(bridge).filter(key=>/^(smallphone|refreshChat|syncChat|setChat|bindChat|applyChat)/.test(key)))original.set(key,Reflect.get(bridge,key));
function initChatApplication(){
    const page = refs.get<HTMLElement>('chatAppPage')!;
    const roomView = refs.get<HTMLElement>('chatRoomView')!;
    const messageList = messages.container()!;
    let messageNodes!: MessageNodesApi;
    window.dispatchEvent(new CustomEvent<MessagesConnection>('qingtuan:chat-messages-connect', { detail: {
        identity: () => ({ peer: refs.get<HTMLElement>('chatRoomName')?.textContent || '对方',
            peerAvatar: refs.get<HTMLImageElement>('chatRoomAvatar')?.currentSrc || refs.get<HTMLImageElement>('chatRoomAvatar')?.src || getCurrentUserAvatarSrc(),
            userAvatar: getCurrentUserAvatarSrc() }),
        canInteract: () => Date.now() >= state.current.suppressVoiceUntil && !messageSelection.active(),
        play: toggleChatVoiceBubble, notice: showChatNotice,
        accept: api => { messageNodes = api; bridge.smallphoneMessages = api; }
    } }));
    let composer!:ChatComposerApi;
    window.dispatchEvent(new CustomEvent<{services:ChatComposerServices;accept(api:ChatComposerApi):void}>('qingtuan:chat-composer-connect',{detail:{
        services:{currentKey:getCurrentChatPreferenceKey,voiceReady:()=>!!chatVoice.draft(),send:sendMessage,
            inputDelay:()=>replyTriggers.input()}, // 还在打字：自动回复重新倒数
        accept:api=>{composer=api;}
    }}));
    let chatVoice!:ChatVoiceApi;
    window.dispatchEvent(new CustomEvent<{services:ChatVoiceServices;accept(api:ChatVoiceApi):void}>('qingtuan:chat-voice-connect',{detail:{services:{send:sendMessage,resize:resizeComposer,text:getMessageText,input:()=>replyTriggers.input()},accept:api=>{chatVoice=api;}}}));
    function readSavedVoiceService(){return chatVoice.voiceConfig();}
    function toggleChatVoiceBubble(pill:HTMLElement){chatVoice.play(pill);}
    function transcribeVoiceRow(row:HTMLElement,options?:{showResult?:boolean}){return chatVoice.transcribe(row,options);}
    function translateMessageRow(row:HTMLElement){return chatVoice.translate(row);}
    let replyEngine!:ChatReplyEngineApi;
    window.dispatchEvent(new CustomEvent<{services:ChatReplyEngineServices;accept(api:ChatReplyEngineApi):void}>('qingtuan:chat-reply-engine-connect',{detail:{services:{currentKey:getCurrentChatPreferenceKey,preferences:()=>{state.current.preferences=loadChatPreferences();return state.current.preferences;},identity:()=>({name:refs.get<HTMLElement>('chatRoomName')?.textContent?.trim()||'角色',avatar:refs.get<HTMLImageElement>('chatRoomAvatar')?.currentSrc||refs.get<HTMLImageElement>('chatRoomAvatar')?.src||''}),worldContext:getLinkedWorldBookContext,myPresence:()=>bridge.smallphoneGetMyPresence?.()||'在线',refreshSide:()=>bridge.smallphoneRefreshChatSide?.(),refreshPins:refreshPinBar,roomVisible:()=>!roomView.classList.contains('is-hidden'),viewed:()=>page.classList.contains('active')&&!roomView.classList.contains('is-hidden'),background:detail=>bridge.smallphoneAppendBackgroundReply?.(detail),recallStored:detail=>bridge.smallphoneRecallStoredMessage?.(detail),notify:detail=>bridge.smallphoneHandleReplyComplete?.(detail),feedback:triggerChatFeedback},accept:api=>{replyEngine=api;bridge.smallphoneGetChatPresence=api.presence;bridge.smallphoneSyncChatReplyTyping=api.syncTyping;bridge.smallphoneSetChatStatus=api.status;}}}));
    function requestCurrentChatAiReply(){return replyEngine.request();}
    function appendChatAiReplyBubble(message:string){const pending=messageNodes.appendPeer(message);messageList.scrollTop=messageList.scrollHeight;return pending;}
    let chatIdentity!:ChatIdentityApi;
    window.dispatchEvent(new CustomEvent<{accept(api:ChatIdentityApi):void}>('qingtuan:chat-identity-connect',{detail:{accept:api=>{chatIdentity=api;bridge.smallphoneSyncRoomIdentity=api.room;}}}));
    // 设置数据由 TypeScript 读取 / 保存，React 控件通过类型化接口协作。
    let preferenceBridge!:ChatPreferenceBridge;
    window.dispatchEvent(new CustomEvent<{services:ChatPreferenceServices;accept(api:ChatPreferenceBridge):void}>('qingtuan:chat-preferences-connect', { detail: {
        services: {
            currentKey: getCurrentChatPreferenceKey,
            readCurrent: () => state.current.preferences,
            adopt: preferences => { state.current.preferences = preferences; },
            apply: applyChatRoomPreferences,
            hasMessages: () => !messageList || Boolean(messageList.querySelector('.chat-message-row')),
            clearMessages: () => messageNodes.clear(),
            chatName: () => refs.get<HTMLElement>('chatRoomName')?.textContent || '',
            readMessages: () => messageList?.innerHTML || '',
            replaceMessages: html => messageNodes.replace(html),
            finishImport() {
                messageList.querySelectorAll<HTMLElement>('.chat-voice-control').forEach(pill => bridge.bindChatVoiceBubble?.(pill));
                refreshChatBubbleGroups(messageList); syncChatReadReceipts(messageList);
                messageList.scrollTop = messageList.scrollHeight;
            },
            appendOpening(opening) {
                // 消息模型、开场判断与重新开场流程由 React 管理。
                const pending = appendChatAiReplyBubble(opening);
                messageNodes.finishPeer(pending.row, { reply: opening, sentAt: Date.now() });
                ensureChatMessageId(pending.row);
                refreshChatBubbleGroups(messageList);
                messageList.scrollTop = messageList.scrollHeight;
            }
        },
        accept(api) { preferenceBridge = api; }
    }}));
    let messageOperations!:MessageOperationsApi;
    window.dispatchEvent(new CustomEvent<{services:MessageOperationsServices;accept(api:MessageOperationsApi):void}>('qingtuan:message-operations-connect', { detail: {
        services: {
            read(row) {
                row = messageNodes.resolve(row);
                const bubble = row.querySelector('.chat-bubble');
                const caption = bubble?.querySelector(':scope > div:not(.chat-quoted-message)');
                let repliedAfter = false;
                // 他看到了没：这则后面他已经回过 → 一定看过；他还没回 → 有 40% 机率刚好在撤回前看到
                for (let next = row.nextElementSibling; next; next = next.nextElementSibling) {
                    if (next.classList?.contains('chat-message-row') && next.classList.contains('is-chat')) { repliedAfter = true; break; }
                }
                return {user:row.classList.contains('is-user'),voice:!!row.querySelector('.chat-voice-audio'),sentAt:Number(row.dataset.sentAt),favorite:row.dataset.favorite==='true',pinned:row.dataset.pinned==='true',transcript:!!row.querySelector('.chat-voice-text-result'),editText:caption?.textContent||getMessageText(row),text:getMessageText(row),quote:getQuoteText(row),id:row.dataset.messageId||'',recallContent:String(row.dataset.chatAiContent||getForwardItemText(row)||getMessageText(row)||'').trim(),repliedAfter};
            },
            id:ensureChatMessageId,
            anchor(row) {
                row = messageNodes.resolve(row);
                const bubble = row.querySelector('.chat-bubble');
                let contentRect = bubble?.getBoundingClientRect() || row.getBoundingClientRect();
                // 讯息文字实际占的范围（讯息格本身是整行宽，要量里面的字才知道字到哪里结束）
                if (bubble) { const range = document.createRange(); range.selectNodeContents(bubble); const rect = range.getBoundingClientRect(); if (rect.width && rect.height) contentRect = rect; }
                // 左右：固定接在「我 14:47:24 ✓✓」那行时间（有勾勾就接勾勾）的最后面，每则都在同一个位置附近，不会乱跑
                const timeBox=row.querySelector('.chat-bubble-time'),receiptRect=timeBox?.querySelector('.chat-read-receipt')?.getBoundingClientRect();
                const left=receiptRect?.width?receiptRect.right:timeBox?timeBox.getBoundingClientRect().left-6:contentRect.left;
                return {left,top:contentRect.top,height:contentRect.height};
            },
            selectLongPress:row=>messageSelection.longPress(messageNodes.resolve(row)),
            suppressVoice: until => { state.current.suppressVoiceUntil=until; },
            focusCompose:()=>composer.focus(),
            favorite:(row,value)=>messageNodes.setData(row,{favorite:value}),
            pin:(row,value)=>{messageNodes.setData(row,{pinned:value});refreshPinBar();},
            selection:row=>beginSelection(messageNodes.resolve(row)),forward:row=>forwardRows([row]),
            transcribe:row=>transcribeVoiceRow(messageNodes.resolve(row)),translate:row=>translateMessageRow(messageNodes.resolve(row)),toggleTranscript:toggleTranscriptResult,
            sharedConfirm:()=>!!bridge.smallphoneShowChatConfirm,
            remove(rows,fromSelection){messageNodes.remove(rows.map(row=>messageNodes.resolve(row)).filter(row=>row.isConnected));if(fromSelection)clearSelection();refreshChatBubbleGroups(messageList);refreshPinBar();},
            edit:(row,updated,before,changed)=>messageNodes.edit(row,updated,before,changed),
            recall:(row,data)=>messageNodes.recall(row,data.content,'你撤回了一条消息','user',data.sentAt,data.seen),
            finishRecall(){refreshChatBubbleGroups(messageList);refreshPinBar();}
        },accept(api){messageOperations=api;}
    }}));
    state.current.preferences = loadChatPreferences();
    const selectionHeaderAnchor = document.createComment('chat-selection-header-mount');
    const selectionToolbarAnchor = document.createComment('chat-selection-toolbar-mount');
    roomView.insertBefore(selectionHeaderAnchor,roomView.querySelector('.chat-room-more-backdrop'));
    roomView.insertBefore(selectionToolbarAnchor,roomView.querySelector('.chat-room-more-backdrop'));
    let messageSelection!:MessageSelectionApi;
    window.dispatchEvent(new CustomEvent<{services:MessageSelectionServices;accept(api:MessageSelectionApi):void}>('qingtuan:message-selection-connect',{detail:{
        services:{list:messageList,allRows:()=>Array.from(messageList?.querySelectorAll<HTMLElement>('.chat-message-row')||[]),
            selected:row=>row.classList.contains('is-selected'),
            setSelected:(row,value)=>messageNodes.toggle(row,'is-selected',value),
            clearSelected:()=>messageList?.querySelectorAll<HTMLElement>('.is-selected').forEach(row=>messageNodes.toggle(row,'is-selected',false)),
            refreshGroups:()=>refreshChatBubbleGroups(messageList),notice:showChatNotice},
        accept:api=>{messageSelection=api;}
    }}));
    window.dispatchEvent(new CustomEvent<{services:ChatSelectionServices}>('qingtuan:selection-toolbar-connect',{detail:{
        services:{host:roomView,headerAnchor:selectionHeaderAnchor,toolbarAnchor:selectionToolbarAnchor,
            rows:()=>messageSelection.rows(),clear:clearSelection,search:openChatHistorySearch,
            quote:getQuoteText,favorite:row=>row.dataset.favorite==='true',
            setFavorite:(row,value)=>messageNodes.setData(row,{favorite:value}),
            copy:text=>messageOperations.copy(text),forward:forwardRows,
            remove:rows=>messageOperations.deleteRows(rows,true),notice:showChatNotice,error:serviceError}
    }}));
    state.current.suppressVoiceUntil = 0;


    function syncChatIdentity() {
        let activeCharacter = null;
        try { activeCharacter = bridge.smallphoneGetActiveCharacterProfile?.() || null; }
        catch (error) { activeCharacter = null; }
        if (!activeCharacter) return;
        chatIdentity.room(activeCharacter);
        messageNodes?.identity();
    }

    // React 导航通过类型化接口协作消息 / 录音 / 草稿服务。
    let chatNavigation!:ChatNavigationApi;
    window.dispatchEvent(new CustomEvent<{services:ChatNavigationServices;accept(api:ChatNavigationApi):void}>('qingtuan:chat-navigation-connect', { detail: {
        services: {
            prepareList() {
                // 回到聊天列表不取消自动回复：倒数完照样回（回复会进背景、算未读）
                chatVoice.cancel();
                closeMessageMenu();
                closeChatRoomMoreMenu();
                closeChatHistorySearch();
                closeChatEditModal();
                clearSelection();
                clearPendingQuote();
                bridge.smallphoneCloseForwardPicker?.();
            },
            finishList() {
                roomTools.closeQuick();
            },
            prepareRoom() {
                syncChatIdentity();
                applyChatRoomPreferences();
                loadCurrentChatDraft();
            },
            finishRoom() {
                requestAnimationFrame(() => {
                    refreshChatBubbleGroups(messageList);
                    refreshPinBar();
                    if (messageList) messageList.scrollTop = messageList.scrollHeight;
                });
            },
            syncIdentity: syncChatIdentity,
            prepareSettings() {
                closeMessageMenu();
                closeChatRoomMoreMenu();
                closeChatHistorySearch();
                syncChatSettingsIdentity();
                applyChatRoomPreferences();
            }
        },
        accept(api) { chatNavigation = api; }
    }}));
    function openChatApp() { chatNavigation?.openApp(); }
    bridge.smallphoneOpenChatApp = openChatApp;

    function resizeComposer(){composer.resize();}

    function getCurrentUserAvatarSrc() {
        const settingsAvatar = refs.get<HTMLImageElement>('settingsProfileAvatarImg')?.currentSrc
            || refs.get<HTMLImageElement>('settingsProfileAvatarImg')?.src;
        if (settingsAvatar) return settingsAvatar;
        try {
            return localStorage.getItem('smallphone_settings_profile_avatar_v1')
                || localStorage.getItem('avatar_star_custom')
                || DEFAULT_AVATAR;
        } catch (err) {
            return DEFAULT_AVATAR;
        }
    }
    function ensureChatMessageId(row:HTMLElement) { return messageNodes.id(row); }
    function refreshChatBubbleGroups(container:HTMLElement|null = messageList) { messageNodes.refresh(container); }
    function refreshChatDateDividers(container:HTMLElement) { messageNodes.date(container); }
    function syncChatReadReceipts(container:HTMLElement|null = messageList) { messageNodes.receipts(container); }
    function setChatMessageRead(target:HTMLElement|null,isRead=true) {
        const row = target?.classList?.contains('chat-message-row') ? target : target?.closest<HTMLElement>('.chat-message-row');
        if (row) messageNodes.read(row, Boolean(isRead));
    }
    bridge.refreshChatBubbleGroups = container => { if (container) messageNodes.importForeign(container); messageNodes.refresh(container); };
    bridge.refreshChatDateDividers = refreshChatDateDividers;
    bridge.syncChatReadReceipts = syncChatReadReceipts;
    bridge.setChatMessageRead = setChatMessageRead;
    function bindChatVoiceBubble(pill:HTMLElement) { if (pill) messageNodes.bindVoice(pill); }
    bridge.bindChatVoiceBubble = bindChatVoiceBubble;
    // 文字消息先單獨發送，角色回覆只由月亮按鈕手動觸發。
    let replyTriggers!:ChatReplyTriggerApi;
    window.dispatchEvent(new CustomEvent<{services:ChatReplyTriggerServices;accept(api:ChatReplyTriggerApi):void}>('qingtuan:chat-reply-triggers-connect',{detail:{
        services:{currentKey:getCurrentChatPreferenceKey,recording:()=>chatVoice.recording(),
            configured(){const config=bridge.smallphoneApi?.getConfig?.();return !!(bridge.smallphoneApi?.requestChat&&config?.baseUrl&&config?.apiKey);},
            reply:requestCurrentChatAiReply},accept:api=>{replyTriggers=api;}
    }}));
    let replyParser!:ChatReplyParserApi;
    window.dispatchEvent(new CustomEvent<{accept(api:ChatReplyParserApi):void}>('qingtuan:chat-reply-parser-connect', {
        detail: { accept: api => { replyParser = api; } }
    }));
    function parseChatAiSegmentedReply(raw:unknown,quoteChoices:Parameters<ChatReplyParserApi['segmented']>[1]=[]) { return replyParser.segmented(raw, quoteChoices); }
    // 历史记录模块位于另一个独立作用域，通过明确接口复用同一套解析器。
    bridge.smallphoneParseChatAiSegmentedReply = parseChatAiSegmentedReply;
    function sendMessage() {
        if (!composer.hasField() || !messageList) return;
        const text = composer.text().trim();
        const voiceDraft=chatVoice.draft();
        const sendingVoice = Boolean(voiceDraft);
        const sendingText = sendingVoice ? '' : text;
        if (!text && !voiceDraft) return;

        const pending = messageNodes.appendUser(sendingText, voiceDraft, messageOperations.quote());
        const row = pending.row;
        const time = pending.time;
        triggerChatFeedback('send');
        refreshChatBubbleGroups(messageList);
        syncChatReadReceipts(messageList);

        if (!sendingVoice) {
            composer.sentText();
        }
        chatVoice.reset();
        clearPendingQuote();
        resizeComposer();
        roomTools.closeQuick();
        messageList.scrollTop = messageList.scrollHeight;
        // 你发的语音：开了「语音自动转文字」、也有语音 API 就自动转
        if (sendingVoice && state.current.preferences.voiceAutoText) {
            const voiceService = readSavedVoiceService();
            if (voiceService.apiKey && voiceService.baseUrl) transcribeVoiceRow(row).catch(() => {});
        }
        scheduleAutoReply();
    }

    function showChatNotice(message:string) {
        if (true) showToast(message);
    }
    function getCurrentChatPreferenceKey() {
        return String(bridge.smallphoneGetActiveChatKey?.() || 'no-character');
    }
    function loadCurrentChatDraft(){composer.load();}
    bridge.smallphoneGetChatDraft = key=>composer.read(key);
    bridge.smallphoneLoadCurrentChatDraft = loadCurrentChatDraft;
    bridge.smallphoneDeleteChatDraft = key=>composer.erase(key);
    function getLinkedWorldBookContext(recentMessages:ChatContextItem[]){return linkedWorldContext(state.current.preferences.linkedWorldBooks,recentMessages);}
    function triggerChatFeedback(kind:'send'|'receive') { preferenceBridge.feedback(kind, state.current.preferences); }
    function loadChatPreferences() { return preferenceBridge.load(getCurrentChatPreferenceKey()); }
    function applyChatRoomPreferences() {
        state.current.preferences = loadChatPreferences();
        preferenceBridge.sync(state.current.preferences);
        navigation.appearanceClass('chat-hide-read-receipts', !state.current.preferences.readReceipt);
        navigation.appearanceClass('chat-time-group', state.current.preferences.timeDisplay === 'group');
        navigation.appearanceClass('chat-time-hidden', state.current.preferences.timeDisplay === 'hidden');
        // 在线状态由角色自身状态控制，聊天设置不再覆盖它。
        navigation.appearanceClass('chat-is-offline',false);
        chatIdentity.summaries(state.current.preferences);
        preferenceBridge.appearance();
    }
    bridge.applyChatRoomPreferences = applyChatRoomPreferences;
    function syncChatSettingsIdentity(){let profile=null;try{profile=bridge.smallphoneGetActiveCharacterProfile?.()||null;}catch{}const avatar=refs.get<HTMLImageElement>('chatRoomAvatar');chatIdentity.settings(profile,avatar?.getAttribute('src')||avatar?.currentSrc||avatar?.src||'',refs.get<HTMLElement>('chatRoomName')?.textContent?.trim()||'当前角色');}
    bridge.smallphoneSyncChatSettingsIdentity=syncChatSettingsIdentity;
    let roomTools!:RoomToolsApi;
    window.dispatchEvent(new CustomEvent<{services:RoomToolsServices;accept(api:RoomToolsApi):void}>('qingtuan:chat-room-tools-connect',{detail:{services:{closeMessage:closeMessageMenu,text:getMessageText},accept:api=>{roomTools=api;}}}));
    function closeChatRoomMoreMenu(){roomTools.closeMore();}
    function closeChatHistorySearch(){roomTools.closeSearch();}
    function openChatHistorySearch(text?:string){roomTools.openSearch(text);}
    bridge.smallphoneEnsureChatOpening = () => preferenceBridge.ensureOpening(true);
    function toggleTranscriptResult(row:HTMLElement) { return messageNodes.toggleTranscript(row); }
    function getMessageText(row:HTMLElement|null) {
        if (!row) return '';
        if (row.dataset.voiceTranscript) return row.dataset.voiceTranscript.trim();
        const bubble = row.querySelector('.chat-bubble');
        if (!bubble) return '';
        const clone = bubble.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.chat-bubble-shape,.chat-voice-control,.chat-voice-text-result,.chat-message-translation,.chat-message-translation-card,.chat-quoted-message,.chat-bubble-sparkle').forEach(node => node.remove());
        return (clone.textContent||'').replace(/\s+/g, ' ').trim();
    }
    function getQuoteText(row:HTMLElement|null) {
        const text = getMessageText(row);
        if (text) return text.slice(0, 120);
        const length = row?.querySelector('.chat-voice-length')?.textContent?.trim();
        return length ? `[语音 ${length}]` : '[消息]';
    }

    function getMessageTimeText(row:HTMLElement) {
        const time = row?.querySelector('.chat-bubble-time');
        if (!time) return '';
        const clone = time.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.chat-read-receipt,.chat-message-pin-indicator').forEach(node => node.remove());
        return (clone.textContent||'').replace(/\s+/g, ' ').trim();
    }
    function getCurrentChatRoomName() {
        return refs.get<HTMLElement>('chatRoomName')?.textContent?.trim() || '当前聊天';
    }
    function getForwardItemText(row:HTMLElement|null) {
        const length = row?.querySelector('.chat-voice-length')?.textContent?.trim();
        if (length && row?.querySelector('.chat-voice-control, .chat-voice-audio')) return `[语音] ${length}`;
        if (length && row?.dataset?.voiceTranscript) return `[语音] ${length}`;
        return getQuoteText(row);
    }
    function collectForwardItems(rows:HTMLElement[]) {
        const roomName = getCurrentChatRoomName();
        return rows.map(row => ({
            speaker: row.classList.contains('is-user') ? '我' : roomName,
            side: row.classList.contains('is-user') ? 'user' : 'peer',
            sentAt: Number(row.dataset.sentAt) || 0,
            text: getForwardItemText(row),
            spoken: String(row.dataset.voiceTranscript || '').trim(),
            time: getMessageTimeText(row)
        }));
    }
    function clearPendingQuote(){messageOperations.clearQuote();}
    function closeMessageMenu(){messageOperations.closeMenu();}
    let chatPins!:ChatPinsBridge;
    window.dispatchEvent(new CustomEvent<{services:ChatPinsServices;accept(api:ChatPinsBridge):void}>('qingtuan:chat-pins-connect', {detail:{
        services:{
            syncSlots(){ messageNodes.pins(); return []; },
            clearSlot:()=>{},canOwnSlot:()=>false,
            latest(){const all=messageList?.querySelectorAll<HTMLElement>('.chat-message-row[data-pinned="true"]');return all?.length?all[all.length-1]:null;},
            quote:getQuoteText,
            highlight:(row,enabled)=>messageNodes.toggle(row,'is-quote-target',enabled),
            scroll:row=>row.scrollIntoView({behavior:'smooth',block:'center'})
        },accept(api){chatPins=api;}
    }}));
    function refreshPinBar(){chatPins.refresh();}
    bridge.smallphoneRefreshPinnedMessages=refreshPinBar;
    function clearSelection(){messageSelection.clear();}
    function beginSelection(row:HTMLElement){messageSelection.begin(row);}
    function forwardRows(rows:HTMLElement[]) {
        const items = collectForwardItems(rows);
        const text = items.map(item => item.text).join('\n');
        bridge.smallphoneOpenForwardPicker?.({
            text,
            items,
            sourceChatName: getCurrentChatRoomName(),
            mode: rows.length > 1 ? 'record' : 'text'
        });
    }
    function closeChatEditModal(){messageOperations.closeEdit();}
    function scheduleAutoReply(){replyTriggers.schedule();}
    bridge.smallphoneFlushAutoReply = nextKey=>replyTriggers.flush(nextKey);
    bridge.smallphoneSetAutoReplyDelay = value=>replyTriggers.setDelay(value);

    syncChatIdentity();
    applyChatRoomPreferences();
    resizeComposer();
    refreshChatBubbleGroups(messageList);
    syncChatReadReceipts(messageList);
return ()=>{selectionHeaderAnchor.remove();selectionToolbarAnchor.remove();};
}
const disposeApp=initChatApplication();
    const ACTIVE_KEY = 'smallphone_chat_active_character_v1';
    const CHAT_HISTORY_KEY = 'smallphone_chat_histories_v1';
    const CHAT_TIME_KEY = 'smallphone_chat_last_times_v1';

    // React 操作菜单在原 body 位置挂载；聊天仅保留数据提交服务。
    const characterActionsAnchor = document.createComment('chat-character-actions-mount');
    document.body.insertBefore(characterActionsAnchor,refs.get('chatHistoryMount'));

    const replyNotificationAnchor = document.createComment('chat-reply-notification-mount');
    document.body.insertBefore(replyNotificationAnchor,refs.get('chatHistoryMount'));

    // React 持有角色清单；剩余聊天模块仅从此同步接口读取。
    let characterStore!:ChatCharacterStoreBridge;
    window.dispatchEvent(new CustomEvent<{accept(api:ChatCharacterStoreBridge):void}>('qingtuan:chat-character-store-connect', { detail: { accept: store => { characterStore = store; } } }));

    const chatMessageList = messages.container()!;
    const emptyChatHistory = '';
    navigation.activeKey(history.current.activeKey);
    try {
        const savedHistories = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '{}');
        history.current.histories = savedHistories && typeof savedHistories === 'object' ? savedHistories : {};
        if (Object.prototype.hasOwnProperty.call(history.current.histories, 'moon')) {
            delete history.current.histories.moon;
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.current.histories));
        }
    } catch (error) {
        history.current.histories = {};
    }

    try {
        const savedTimes = JSON.parse(localStorage.getItem(CHAT_TIME_KEY) || '{}');
        history.current.times = savedTimes && typeof savedTimes === 'object' ? savedTimes : {};
    } catch (error) {
        history.current.times = {};
    }

    let replyBridge!:ReplyNotificationBridge;
    window.dispatchEvent(new CustomEvent<ReplyNotificationServices&{accept(api:ReplyNotificationBridge):void}>('qingtuan:reply-notification-connect', { detail: {
        accept: bridge => { replyBridge = bridge; }, anchor: replyNotificationAnchor,
        find: key => characterStore.read().find(item => item.archiveId === key),
        open: key => bridge.smallphoneOpenCharacterChat?.(key),
        updateThread: updateThreadPreview
    } }));

    let forwardRecords!:ForwardRecordsApi;
    window.dispatchEvent(new CustomEvent<{accept(api:ForwardRecordsApi):void}>('qingtuan:forward-records-connect',{detail:{accept:api=>{forwardRecords=api;}}}));

    const roomViewHost = refs.get<HTMLElement>('chatRoomView')!;
    const recordDetailAnchor = document.createComment('chat-record-detail-mount');
    roomViewHost?.appendChild(recordDetailAnchor);
    let recordDetail!:{close():void};
    window.dispatchEvent(new CustomEvent<RecordDetailServices>('qingtuan:record-detail-connect',{detail:{
        host:roomViewHost,anchor:recordDetailAnchor,
        read:id=>forwardRecords.read(id),
        // 头像：我 = 资料卡头像；对方 = 来源角色的照片（找不到就用预设）
        avatars(record){
        const selfAvatar = (() => {
            const img = refs.get<HTMLImageElement>('settingsProfileAvatarImg');
            if (img && img.src && !img.classList.contains('avatar-missing')) return img.currentSrc || img.src;
            try { return localStorage.getItem('avatar_star_custom') || DEFAULT_AVATAR || ''; }
            catch (error) { return DEFAULT_AVATAR || ''; }
        })();
        const sourceName = record.sourceName || String(record.title || '').replace(/^你与/, '').replace(/的聊天记录$/, '');
        const peer = (typeof characterStore.read() !== 'undefined' ? characterStore.read() : []).find(c => String(c.name || c.nickname || '').trim() === sourceName);
        const peerAvatar = peer?.photoUrl || DEFAULT_AVATAR || '';
            return {selfAvatar,peerAvatar};
        },accept:api=>{recordDetail=api;}
    }}));

    const forwardPickerAnchor = document.createComment('chat-forward-picker-mount');
    document.body.insertBefore(forwardPickerAnchor,refs.get('chatHistoryMount'));
    function getForwardTargetsData() {
        return characterStore.read().map(character => ({
            key: character.archiveId,
            name: String(character.name || character.nickname || '未命名角色').trim() || '未命名角色',
            avatar: character.photoUrl || DEFAULT_AVATAR,
            preview: getLastChatPreview(character.archiveId) || '',
            lastTime: Number(history.current.times[character.archiveId] || 0),
            time: getLastChatPreview(character.archiveId) ? formatThreadTime(Number(history.current.times[character.archiveId] || 0)) : ''
        }));
    }
    let forwardPicker!:ForwardPickerApi;
    window.dispatchEvent(new CustomEvent<ForwardPickerServices&{accept(api:ForwardPickerApi):void}>('qingtuan:forward-picker-connect',{detail:{anchor:forwardPickerAnchor,targets:getForwardTargetsData,accept:api=>{forwardPicker=api;}}}));
    bridge.smallphoneCloseForwardPicker = () => forwardPicker.close();
    bridge.smallphoneOpenForwardPicker = payload => forwardPicker.open(payload);
    Object.entries(history.current.histories).forEach(([key, html]) => {
        const template = document.createElement('template');
        template.innerHTML = html || '';
        history.current.counts[key] = template.content.querySelectorAll('.chat-bubble').length;
    });

    function saveChatHistories() {
        try {
            // 将历史中残留的内联头像剔除，重新载入时会自动从角色档案读取。
            Object.keys(history.current.histories).forEach(key => {
                const html = history.current.histories[key];
                if (!html || !html.includes('data:image/')) return;
                const template = document.createElement('template');
                template.innerHTML = html;
                template.content.querySelectorAll('.chat-message-mini-avatar').forEach(img => img.removeAttribute('src'));
                history.current.histories[key] = template.innerHTML;
            });
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.current.histories));
        } catch (error) {
            showToast('聊天记录保存失败：请检查存储空间');
        }
    }

    function saveChatLastTimes() {
        try { localStorage.setItem(CHAT_TIME_KEY, JSON.stringify(history.current.times)); } catch (error) {}
    }

    function formatThreadTime(timestamp:unknown) {
        const value = Number(timestamp);
        if (!Number.isFinite(value) || value <= 0) return '';
        const now = new Date();
        const date = new Date(value);
        const diff = Math.max(0, now.getTime() - date.getTime());

        if (diff < 60 * 1000) return '现在';

        const sameDay =
            now.getFullYear() === date.getFullYear() &&
            now.getMonth() === date.getMonth() &&
            now.getDate() === date.getDate();

        if (sameDay) {
            return date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday =
            yesterday.getFullYear() === date.getFullYear() &&
            yesterday.getMonth() === date.getMonth() &&
            yesterday.getDate() === date.getDate();

        if (isYesterday) return '昨天';

        if (now.getFullYear() === date.getFullYear()) {
            return String(date.getMonth() + 1) + '/' + String(date.getDate());
        }

        return String(date.getFullYear()) + '/' +
            String(date.getMonth() + 1) + '/' +
            String(date.getDate());
    }

    function getLastChatPreview(key:string) {
        const html = history.current.histories[key];
        if (!html) return '';
        const template = document.createElement('template');
        template.innerHTML = html;
        const bubbles = template.content.querySelectorAll('.chat-bubble');
        if (!bubbles.length) return '';
        const lastBubble = bubbles[bubbles.length - 1];
        // 语音消息：显示「[语音] 4″」，不要只剩秒数
        if (lastBubble.querySelector('.chat-voice-control')) {
            const seconds = lastBubble.querySelector('.chat-voice-length')?.textContent?.trim() || '';
            return ('[语音] ' + seconds).trim();
        }
        const last = lastBubble.cloneNode(true) as HTMLElement;
        last.querySelectorAll('.chat-bubble-sparkle').forEach(node => node.remove());
        return text(last.textContent, '').replace(/^\\s*(?:你|我)[:：]\\s*/, '');
    }

    function setUnreadCount(key:string,count:unknown) { replyBridge.setUnread(key, count); }

    // 主画面消息小窗用：按聊天 key 直接打开那个角色的聊天
    bridge.smallphoneOpenCharacterChat = key => {
        const character = characterStore.read().find(item => item.archiveId === key);
        if (!character) return false;
        otherPages.current.settingsNavigation.closeSettings();
        otherPages.current.world.closeWorld();
        document.body.style.overflow = '';
        bridge.smallphoneOpenChatApp?.();
        activateCharacter(character);
        return true;
    };

    bridge.smallphoneHandleReplyComplete = detail => replyBridge.complete(detail);

    function threadSnapshot(character:ChatCharacter):ChatThreadSnapshot {
        const draft = String(bridge.smallphoneGetChatDraft?.(character.archiveId) || '').trim();
        const lastPreview = getLastChatPreview(character.archiveId);
        return {
            id: character.archiveId,
            name: text(character.name, text(character.nickname, '未命名角色')),
            photoUrl: character.photoUrl || '', favorite: Boolean(character.favorite), pinned: Boolean(character.pinned),
            preview: draft ? `草稿：${draft.replace(/\s+/g, ' ').slice(0, 42)}` : lastPreview,
            draft: Boolean(draft), time: !draft && lastPreview ? formatThreadTime(history.current.times[character.archiveId]) : '',
            unread: Math.max(0, Number(replyBridge.unread(character.archiveId)) || 0),
            activate: () => activateCharacter(character),
            openActions: (x, y) => openCharacterActions(character, x, y),
        };
    }
    function updateThreadPreview(key:string) {
        if (!key) return;
        const character = characterStore.read().find(item => item.archiveId === key);
        if (character) window.dispatchEvent(new CustomEvent('qingtuan:chat-thread-snapshot', { detail: { kind: 'update', threads: [threadSnapshot(character)] } }));
    }

    function refreshThreadTimes() {
        characterStore.read().forEach(character => updateThreadPreview(character.archiveId));
    }

    function saveCurrentHistory() {
        if (!chatMessageList || history.current.restoring || !history.current.activeKey) return;

        // 聊天记录不重复存储角色/用户头像的 Base64（多条消息会撑满 localStorage）。
        const historyCopy = chatMessageList.cloneNode(true) as HTMLDivElement;
        historyCopy.querySelectorAll('.chat-message-mini-avatar').forEach(img => img.removeAttribute('src'));
        historyCopy.querySelectorAll('.chat-unread-divider, .chat-date-divider').forEach(divider => divider.remove());
        const html = historyCopy.innerHTML;
        const currentCount = chatMessageList.querySelectorAll('.chat-bubble').length;
        const previousCount = Number(history.current.counts[history.current.activeKey] || 0);

        history.current.histories[history.current.activeKey] = html;
        history.current.counts[history.current.activeKey] = currentCount;

        if (currentCount > previousCount) {
            history.current.times[history.current.activeKey] = Date.now();
            saveChatLastTimes();
        }

        saveChatHistories();
        updateThreadPreview(history.current.activeKey);
    }

    // 后台消息也使用同一套 TypeScript 消息模型；这里只保留旧历史格式的持久化服务。
    bridge.smallphoneRecallStoredMessage = (detail = {reply:''}) => {
        const key = String(detail.chatKey || '');
        if (!key || !detail.messageId) return false;
        const html = bridge.smallphoneMessages.recallHtml(key === history.current.activeKey ? chatMessageList.innerHTML : (history.current.histories[key] || ''), detail);
        if (html === null) return false;
        if (key === history.current.activeKey) bridge.smallphoneMessages.replace(html);
        history.current.histories[key] = html;
        const template = document.createElement('template'); template.innerHTML = html;
        history.current.counts[key] = template.content.querySelectorAll('.chat-bubble').length;
        saveChatHistories();
        return true;
    };
    function appendBackgroundReply(detail:PeerMessageDetail = {reply:''}) {
        const key = String(detail.chatKey || '');
        const reply = String(detail.reply || '').trim();
        if (!key || !reply || key === history.current.activeKey) return false;
        const html = bridge.smallphoneMessages.backgroundHtml(history.current.histories[key] || emptyChatHistory, detail);
        history.current.histories[key] = html;
        if (detail.recalled) { saveChatHistories(); return true; }
        const template = document.createElement('template'); template.innerHTML = html;
        history.current.counts[key] = template.content.querySelectorAll('.chat-bubble').length;
        history.current.times[key] = Number(detail.sentAt) || Date.now();
        saveChatLastTimes();saveChatHistories();updateThreadPreview(key);
        return true;
    }
    bridge.smallphoneAppendBackgroundReply = appendBackgroundReply;
    bridge.smallphoneGetActiveChatKey = () => history.current.activeKey;
    listen<{chatKey?:unknown}>(window,'smallphone-chat-draft-change', event => {
        const key = String(event.detail?.chatKey || '');
        if (key) updateThreadPreview(key);
    });

    bridge.smallphoneChatTargets = () => characterStore.read().map(c=>({key:c.archiveId,name:c.name||'未命名角色'}));
    listen<{targetKey?:string;text?:string;items?:ForwardSourceItem[];sourceChatName?:unknown;mode?:unknown}>(window,'smallphone-forward-message',event=>{
        const {targetKey,text,items,sourceChatName,mode}=event.detail||{};
        if(!targetKey||!text)return;
        const record = mode === 'record' && Array.isArray(items) && items.length ? forwardRecords.create(items,sourceChatName) : null;
        history.current.histories[targetKey] = bridge.smallphoneMessages.forwardHtml(targetKey===history.current.activeKey?chatMessageList.innerHTML:(history.current.histories[targetKey]||emptyChatHistory),text,items,sourceChatName,mode,record);
        history.current.times[targetKey]=Date.now();saveChatLastTimes();saveChatHistories();updateThreadPreview(targetKey);
        if(targetKey===history.current.activeKey)restoreHistory(targetKey);
    });
    function restoreHistory(key:string,unreadCount=0) {
        if (!chatMessageList) return;
        history.current.restoring = true;
        bridge.smallphoneMessages.replace(key ? (history.current.histories[key] || emptyChatHistory) : emptyChatHistory);
        let repairedStructuredReplies = false;
        try {
            repairedStructuredReplies = bridge.smallphoneMessages.repair();
        } catch (error) {
            // 修复旧格式失败也不能阻断聊天记录的正常保存。
            repairedStructuredReplies = false;
        }
        const unreadMarker = bridge.smallphoneMessages.unread(unreadCount);
        recordDetail.close();
        chatMessageList.querySelectorAll<HTMLElement>('.chat-voice-control').forEach(pill => {
            bridge.bindChatVoiceBubble?.(pill);
        });
        bridge.refreshChatBubbleGroups?.(chatMessageList);
        bridge.syncChatReadReceipts?.(chatMessageList);
        bridge.smallphoneRefreshPinnedMessages?.();
        frame(() => {
            history.current.restoring = false;
            if (key && !history.current.histories[key]) {
                bridge.smallphoneEnsureChatOpening?.();
                saveCurrentHistory();
            } else if (repairedStructuredReplies) {
                // 將修好的舊訊息立即寫回，重新整理後不會再恢復成整包 JSON。
                saveCurrentHistory();
            }
            if (unreadMarker?.divider?.isConnected) {
                unreadMarker.divider.scrollIntoView({ behavior: 'auto', block: 'start' });
                later(() => {
                    if (!unreadMarker.divider.isConnected) return;
                    bridge.smallphoneMessages.toggle(unreadMarker.divider,'is-leaving',true);
                    later(() => bridge.smallphoneMessages.remove([unreadMarker.divider]), 230);
                }, 1800);
            } else {
                chatMessageList.scrollTop = chatMessageList.scrollHeight;
            }
        });
    }

    // React 消息控制器在内容提交后通知保存，不再观察消息 DOM。
    dispose.push(bridge.smallphoneMessages.onChange(saveCurrentHistory));
    const persistActiveChatHistory = () => saveCurrentHistory();
    listen(window,'pagehide',persistActiveChatHistory);
    listen(window,'beforeunload',persistActiveChatHistory);
    listen(document,'visibilitychange', () => {
        if (document.visibilityState === 'hidden') persistActiveChatHistory();
    });

    function text(value:unknown,fallback:unknown='') {
        const result = String(value == null ? '' : value).trim();
        return result || String(fallback);
    }


    function activateCharacter(character:ChatCharacter) {
        bridge.smallphoneFlushAutoReply?.(character.archiveId);
        saveCurrentHistory();
        history.current.activeKey = character.archiveId;
        const unreadBeforeOpen = Math.max(0, Number(replyBridge.unread(history.current.activeKey)) || 0);
        setUnreadCount(history.current.activeKey, 0);
        navigation.activeKey(history.current.activeKey);
        try {
            localStorage.setItem(ACTIVE_KEY, JSON.stringify(character));
        } catch (error) {}

    
        navigation.showRoom();
    

        frame(() => {
            bridge.smallphoneSyncRoomIdentity(character);
            bridge.smallphoneMessages.identity();
            bridge.smallphoneSetChatStatus(text(character.relationship,'陪着你'));
            bridge.applyChatRoomPreferences?.();
            bridge.smallphoneLoadCurrentChatDraft?.();
            bridge.smallphoneSyncChatReplyTyping?.();
            if (history.current.histories[history.current.activeKey]) {
                restoreHistory(history.current.activeKey, unreadBeforeOpen);
            } else if (chatMessageList) {
                history.current.restoring = true;
                bridge.smallphoneMessages.clear();
                history.current.restoring = false;
                bridge.smallphoneEnsureChatOpening?.();
            }
        });
    }

    function openCharacterActions(character:ChatCharacter,x:number,y:number) {
        window.dispatchEvent(new CustomEvent('qingtuan:chat-character-actions-open', { detail: {
            id: character.archiveId, name: text(character.name, text(character.nickname, '未命名角色')),
            pinned: Boolean(character.pinned), favorite: Boolean(character.favorite), x, y
        } }));
    }

    // 确认弹窗：资料卡同款窗口，排法跟世界书删除弹窗一样——标题、说明、左取消右确认两颗等宽按钮（样式见 .sp-confirm）
    function showChatConfirm({ title = '确认操作', message = '', confirmText = '确定', cancelText = '取消', danger = false }:ChatConfirmationOptions = {}) {
        const string = (value:unknown) => value == null ? '' : String(value);
        const options = { title: string(title), message: string(message), confirmText: string(confirmText), cancelText: string(cancelText), danger };
        return new Promise<boolean>(resolve => window.dispatchEvent(new CustomEvent<ChatConfirmationRequest>('qingtuan:chat-confirm', { detail: { options, resolve } })));
    }
    bridge.smallphoneShowChatConfirm = showChatConfirm;

    window.dispatchEvent(new CustomEvent<ChatCharacterActionsServices>('qingtuan:chat-character-actions-services', { detail: {
        anchor: characterActionsAnchor,
        read: characterStore.readFlags,
        patch: (id, fields) => characterStore.patch(id, fields),
        remove: id => characterStore.removeFromList(id)
    } }));

    function renderCharacters() {
        const ordered = characterStore.ordered();
        window.dispatchEvent(new CustomEvent('qingtuan:chat-thread-snapshot', { detail: { kind: 'rebuild', threads: ordered.map(threadSnapshot) } }));
    }

    function syncCharacterAvatarEverywhere(character:ChatCharacter) {
        if (!character?.archiveId) return;

        // 同步已保存的聊天记录头像
        const savedHtml = history.current.histories[character.archiveId];
        if (savedHtml) {
            const template = document.createElement('template');
            template.innerHTML = savedHtml;
            template.content.querySelectorAll('.chat-message-row.is-chat .chat-message-mini-avatar').forEach(img => {
                img.removeAttribute('src');
            });
            history.current.histories[character.archiveId] = template.innerHTML;
            saveChatHistories();
        }

        // 如果当前正打开这个角色，也同步聊天页和当前画面里的历史消息头像
        if (history.current.activeKey === character.archiveId) {
            bridge.smallphoneSyncRoomIdentity(character);
            if (chatMessageList) {
                bridge.smallphoneMessages.refresh();
                saveCurrentHistory();
            }
        }
    }

    function cleanupCharacterChat(character:ChatCharacter) {
        delete history.current.histories[character.archiveId];
        bridge.smallphoneDeleteChatDraft?.(character.archiveId);
        setUnreadCount(character.archiveId, 0);
    }
    function finishCharacterRemoval(character:ChatCharacter) {
        if (history.current.activeKey === character.archiveId) {
            navigation.showList();
            history.current.activeKey = '';
            navigation.activeKey(history.current.activeKey);
            try { localStorage.removeItem(ACTIVE_KEY); } catch (error) {}
            history.current.restoring = true;
            bridge.smallphoneMessages.clear();
            history.current.restoring = false;
        }
    }
    function syncSavedCharacter(character:ChatCharacter) {
        syncCharacterAvatarEverywhere(character);
        if (history.current.activeKey === character.archiveId) {
            bridge.smallphoneSyncRoomIdentity(character);
            bridge.smallphoneMessages.identity();
        }
    }
    characterStore.attach({ render: renderCharacters, syncSaved: syncSavedCharacter, cleanup: cleanupCharacterChat,
        saveHistories: saveChatHistories, finishRemoval: finishCharacterRemoval, confirm: showChatConfirm });

    // 类型化聊天服务接口：档案、角色清单、存储、弹窗与会话由 React 控制器协作。
    const characterArchiveAnchor = document.createComment('character-archive-mount');
    document.body.insertBefore(characterArchiveAnchor,refs.get('chatHistoryMount'));refs.get('chatHistoryMount')?.remove();
    window.dispatchEvent(new CustomEvent<CharacterChatServices>('qingtuan:character-chat-services', { detail: {
        anchor: characterArchiveAnchor, saveToChat: characterStore.saveArchive, removeFromChat: characterStore.removeByDossier,
        confirm: showChatConfirm, syncIdentity: () => bridge.smallphoneSyncChatSettingsIdentity?.()
    } }));
    function openCharacterCard(targetDossierId?:unknown) { window.dispatchEvent(new CustomEvent('qingtuan:character-dialog-open', { detail: targetDossierId })); }
    window.dispatchEvent(new CustomEvent('qingtuan:chat-list-services', { detail: { openCharacterCard } }));
    bridge.smallphoneOpenCharacterCard = openCharacterCard;

    renderCharacters();
    const timer=window.setInterval(refreshThreadTimes, 10000);dispose.push(()=>window.clearInterval(timer));

    function buildCharacterPrompt(character:ChatCharacter|null) {
        if (!character) return '';
        const lines = [
            '角色姓名：' + text(character.name, character.nickname),
            '昵称：' + text(character.nickname),
            '与你的关系：' + text(character.relationship),
            '生日与星座：' + [text(character.birthday), text(character.constellation)].filter(Boolean).join(' '),
            'MBTI：' + text(character.mbti),
            '外貌与气质：' + text(character.appearanceText),
            '性格标签：' + (character.selectedTags || []).join('、'),
            '说话习惯：' + text(character.speechHabitsText),
            '线上相处：' + text(character.onlineStyle),
            '线下相处：' + text(character.offlineStyle),
            '喜欢：' + text(character.favoriteThings),
            '不喜欢：' + text(character.dislikes),
            '随身信物：' + text(character.tokenItem),
            '共同回忆：' + text(character.memoriesText),
            '其他设定：' + text(character.otherSettingsText),
            '私密备忘：' + text(character.secretMemo),
        ];
        return lines.filter(line => !line.endsWith('：')).join('\n');
    }

    bridge.smallphoneGetActiveCharacterProfile = () => characterStore.read().find(item => item.archiveId === history.current.activeKey) || null;
    bridge.smallphoneGetActiveCharacterPrompt = () => buildCharacterPrompt(bridge.smallphoneGetActiveCharacterProfile());

listen<unknown>(window,'qingtuan:open-notice-chat',event=>{const opened=event.detail&&bridge.smallphoneOpenCharacterChat?.(event.detail);if(!opened)bridge.smallphoneOpenChatApp?.();});
dispose.push(()=>{characterActionsAnchor.remove();replyNotificationAnchor.remove();recordDetailAnchor.remove();forwardPickerAnchor.remove();characterArchiveAnchor.remove();});

return ()=>{disposeApp?.();dispose.forEach(action=>action());for(const key of Object.keys(bridge).filter(key=>/^(smallphone|refreshChat|syncChat|setChat|bindChat|applyChat)/.test(key))){if(original.has(key))Reflect.set(bridge,key,original.get(key));else Reflect.deleteProperty(bridge,key);}};
},[messages,navigation,refs]);}
