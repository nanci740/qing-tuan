import { kv } from '../utils/kvStorage';
import {readChatRecords, saveChatRecords} from '../utils/chatRecords';
import {useProfileAvatar} from '../providers/ProfileAvatarProvider';
import {readMyPresence} from '../utils/chatPresence';
import {useWorld} from '../providers/WorldProvider';
import {useEffect,useRef} from 'react';
import {useNativeRefs} from '../providers/NativeRefsProvider';
import {useChatNavigation} from '../providers/ChatNavigationProvider';
import {useSettingsNavigation} from '../providers/SettingsNavigationProvider';
import type {ChatNavigationServices,ChatNavigationApi} from '../providers/ChatNavigationProvider';
import type {ChatIdentityApi} from '../providers/ChatIdentityProvider';
import type {RoomToolsApi,RoomToolsServices} from '../providers/ChatRoomToolsProvider';
import type {MessageLocation,MessageNodesApi,MessagePay,MessagePhoto,MessageSticker,MessagesConnection,PeerMessageDetail} from '../types/chatMessages';
import {sendPay} from '../utils/walletStorage';
import {dueSchedules,noteProactive,pickProactive} from '../utils/chatProactive';
import {momentsMemory} from '../utils/momentsEngine';
import {diaryMemory} from '../utils/diaryEngine';
import {contactName,dueUnblockChecks,isBlocked,isBlockedBy,isDeleted,setBlocked,setDeleted,subscribeContacts} from '../utils/contactsStorage';
import {buildCharacterPrompt} from '../utils/characterPrompt';
import {groupMembers,groupPersona,isGroup,memberName} from '../utils/chatGroups';
import {payFromData,payLabel,payText} from '../utils/chatMessageNodes';
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
import {collectWorldInjection} from '../utils/chatWorldContext';
import {loadChatPreferences as readPreferences} from '../utils/chatPreferences';
import {DEFAULT_AVATAR} from '../utils/defaultAvatar';
import {showToast} from '../utils/toast';
import {saveChatPhoto} from '../utils/chatPhotoStore';
import {chatPhotoReady} from '../utils/chatPhoto';
interface ChatPublicApi {
 smallphoneMessages:MessageNodesApi;
 /** 你发一张照片（相册、拍照或自己生的图），caption 是你写的说明。 */
 smallphoneSendChatPhoto(image:Blob,caption:string):Promise<void>;
 /** 你发一张定位卡片（地点是写出来的，不是真的定位）。 */
 smallphoneSendChatLocation(location:MessageLocation):void;
 smallphoneSendChatSticker(sticker:MessageSticker):void;
 /** 你发转账或红包：先从余额或 source 那张卡扣钱，扣不了（不够）就丢错，卡片不发。 */
 smallphoneSendChatPay(pay:Omit<MessagePay,'id'>,source?:string):void;
 /** 你生图的补充描写，交给回复引擎用跟他回话一样的底子来写。 */
 smallphoneWritePhotoPrompt(keywords:string,includeMe:boolean):Promise<string>;
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
 smallphoneSaveGroup(group:ChatCharacter):Promise<boolean>;
 smallphoneChatNotice(chatKey:string,text:string):void;
 smallphoneBlockContact(key:string,on:boolean):void;
 smallphoneDeleteContact(key:string):void;
 smallphoneChatProactive(key:string,prompt:string):void;
 smallphonePeerSay(key:string,text:string):void;
 smallphoneRemoveGroup(id:string):Promise<boolean>;
 smallphonePatchCharacter(id:string,fields:{pinned?:boolean;favorite?:boolean}):void;
}
function serviceError(error:unknown){if(error instanceof Error&&error.name==='AbortError')return '已取消';return String(error instanceof Error?error.message:'请求失败').slice(0,150);}
export function useChatControllers(messages:MessageNodesApi){const refs=useNativeRefs()!,navigation=useChatNavigation(),settingsNavigation=useSettingsNavigation(),world=useWorld(),profileAvatar=useProfileAvatar();const otherPages=useRef({settingsNavigation,world});otherPages.current={settingsNavigation,world};const history=useRef<{activeKey:string;restoring:boolean;histories:Record<string,string>;times:Record<string,number>;counts:Record<string,number>}>({activeKey:'',restoring:false,histories:{},times:{},counts:{}});const state=useRef({preferences:readPreferences('no-character'),suppressVoiceUntil:0});
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
            userAvatar: getCurrentUserAvatarSrc(), members: memberLooks(history.current.activeKey) }),
        canInteract: () => Date.now() >= state.current.suppressVoiceUntil && !messageSelection.active(),
        play: toggleChatVoiceBubble, notice: showChatNotice, photo: openChatPhoto,
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
    window.dispatchEvent(new CustomEvent<{services:ChatReplyEngineServices;accept(api:ChatReplyEngineApi):void}>('qingtuan:chat-reply-engine-connect',{detail:{services:{currentKey:getCurrentChatPreferenceKey,preferences:()=>{state.current.preferences=loadChatPreferences();return state.current.preferences;},identity:()=>({name:getCharacterLook(getCurrentChatPreferenceKey()).name||refs.get<HTMLElement>('chatRoomName')?.textContent?.trim()||'角色',avatar:refs.get<HTMLImageElement>('chatRoomAvatar')?.currentSrc||refs.get<HTMLImageElement>('chatRoomAvatar')?.src||''}),worldContext:getLinkedWorldBookContext,persona:getCharacterPersona,myPresence:()=>readMyPresence().online,refreshPins:refreshPinBar,roomVisible:()=>!roomView.classList.contains('is-hidden'),viewed:()=>page.classList.contains('active')&&!roomView.classList.contains('is-hidden'),background:detail=>bridge.smallphoneAppendBackgroundReply?.(detail),recallStored:detail=>bridge.smallphoneRecallStoredMessage?.(detail),character:getCharacterLook,preferencesFor:readPreferences,identityFor:storedIdentity,historyRows:storedRows,pat:(chatKey,suffix,who)=>patChat(chatKey,'assistant',suffix,who),notice:chatNotice,group:groupService,groupMemory,photo:updateChatPhoto,notify:detail=>bridge.smallphoneHandleReplyComplete?.({...detail,title:contactName(detail.chatKey,detail.title)}),feedback:triggerChatFeedback},accept:api=>{replyEngine=api;bridge.smallphoneGetChatPresence=api.presence;bridge.smallphoneRefreshChatSide=api.reloadPresence;bridge.smallphoneGetMyPresence=()=>readMyPresence().online;bridge.smallphoneSyncChatReplyTyping=api.syncTyping;bridge.smallphoneSetChatStatus=api.status;}}}));
    function requestCurrentChatAiReply(){return replyEngine.request();}
    function appendChatAiReplyBubble(message:string){const pending=messageNodes.appendPeer(message);messageNodes.scrollLatest();return pending;}
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
            readMessages: () => messageNodes.html(),
            replaceMessages: html => messageNodes.replace(html),
            finishImport() {
                messageList.querySelectorAll<HTMLElement>('.chat-voice-control').forEach(pill => bridge.bindChatVoiceBubble?.(pill));
                refreshChatBubbleGroups(messageList); syncChatReadReceipts(messageList);
                messageNodes.scrollLatest();
            },
            appendOpening(opening) {
                // 消息模型、开场判断与重新开场流程由 React 管理。
                const pending = appendChatAiReplyBubble(opening);
                messageNodes.finishPeer(pending.row, { reply: opening, sentAt: Date.now() });
                ensureChatMessageId(pending.row);
                refreshChatBubbleGroups(messageList);
                messageNodes.scrollLatest();
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
            remove(rows,fromSelection){messageNodes.remove(rows.map(row=>messageNodes.resolve(row)));if(fromSelection)clearSelection();refreshChatBubbleGroups(messageList);refreshPinBar();},
            edit:(row,updated,before,changed)=>messageNodes.edit(row,updated,before,changed),
            recall:(row,data)=>messageNodes.recall(row,data.content,'你撤回了一条消息','user',data.sentAt,data.seen),
            finishRecall(){refreshChatBubbleGroups(messageList);refreshPinBar();}
        },accept(api){messageOperations=api;}
    }}));
    state.current.preferences = loadChatPreferences();
    let messageSelection!:MessageSelectionApi;
    window.dispatchEvent(new CustomEvent<{services:MessageSelectionServices;accept(api:MessageSelectionApi):void}>('qingtuan:message-selection-connect',{detail:{
        services:{list:messageList,allRows:()=>messageNodes.rows().filter(row=>row.classList.contains('chat-message-row')),
            selected:row=>row.classList.contains('is-selected'),
            setSelected:(row,value)=>messageNodes.toggle(row,'is-selected',value),
            clearSelected:()=>messageNodes.rows().filter(row=>row.classList.contains('is-selected')).forEach(row=>messageNodes.toggle(row,'is-selected',false)),
            refreshGroups:()=>refreshChatBubbleGroups(messageList),notice:showChatNotice},
        accept:api=>{messageSelection=api;}
    }}));
    window.dispatchEvent(new CustomEvent<{services:ChatSelectionServices}>('qingtuan:selection-toolbar-connect',{detail:{
        services:{host:roomView,
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
    listen(window,'qingtuan:chat-identity-refresh',()=>syncChatIdentity());

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
                const prepared = applyChatRoomPreferences();
                loadCurrentChatDraft();
                return prepared;
            },
            finishRoom() {
                requestAnimationFrame(() => {
                    refreshChatBubbleGroups(messageList);
                    refreshPinBar();
                    if (messageList) messageNodes.scrollLatest();
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
        return profileAvatar.api.messageAvatar();
    }

    function ensureChatMessageId(row:HTMLElement) { return messageNodes.id(row); }
    function refreshChatBubbleGroups(container:HTMLElement|null = messageList) { messageNodes.refresh(container); }
    function refreshChatDateDividers(container:HTMLElement) { messageNodes.date(container); }
    function syncChatReadReceipts(container:HTMLElement|null = messageList) { messageNodes.receipts(container); }
    function setChatMessageRead(target:HTMLElement|null,isRead=true) {
        const row = target?.classList?.contains('chat-message-row') ? target : target?.closest<HTMLElement>('.chat-message-row');
        if (row) messageNodes.read(row, Boolean(isRead));
    }
    bridge.refreshChatBubbleGroups = container => messageNodes.refresh(container);
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
        messageNodes.scrollLatest(true);
        // 你发的语音：开了「语音自动转文字」、也有语音 API 就自动转
        if (sendingVoice && state.current.preferences.voiceAutoText) {
            const voiceService = readSavedVoiceService();
            if (voiceService.apiKey && voiceService.baseUrl) transcribeVoiceRow(row).catch(() => {});
        }
        scheduleAutoReply();
    }

    // 你发照片（相册、拍照、自己生图）：跟发文字一样进聊天、等家机回；图片本身之后会附给模型看。
    async function sendPhoto(image:Blob, caption:string) {
        if (!messageList) return;
        const id = 'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        let src = '';
        try { src = await saveChatPhoto(id, image); } catch { showChatNotice('照片存不进去，请检查浏览器储存空间'); return; }
        const photo:MessagePhoto = { id, prompt: '', caption: caption.trim(), state: 'done', src };
        messageNodes.appendUser('', null, messageOperations.quote(), photo);
        triggerChatFeedback('send');
        refreshChatBubbleGroups(messageList);
        syncChatReadReceipts(messageList);
        clearPendingQuote();
        roomTools.closeQuick();
        messageNodes.scrollLatest(true);
        scheduleAutoReply();
    }
    bridge.smallphoneSendChatPhoto = sendPhoto;
    // 你发定位、表情：跟发文字一样进聊天、等家机回。
    function sendCard(location:MessageLocation|null, sticker:MessageSticker|null, pay:MessagePay|null=null) {
        if (!messageList) return;
        messageNodes.appendUser('', null, messageOperations.quote(), null, location, sticker, pay);
        triggerChatFeedback('send');
        refreshChatBubbleGroups(messageList);
        syncChatReadReceipts(messageList);
        clearPendingQuote();
        roomTools.closeQuick();
        messageNodes.scrollLatest(true);
        scheduleAutoReply();
    }
    bridge.smallphoneSendChatLocation = location => { if (location.place.trim()) sendCard(location, null); };
    bridge.smallphoneSendChatSticker = sticker => { if (sticker.tag.trim() && sticker.image) sendCard(null, sticker); };
    bridge.smallphoneSendChatPay = (draft, source = '') => {
        if (!messageList) throw Error('先打开一个聊天');
        const chatKey = getCurrentChatPreferenceKey(), pay:MessagePay = { ...draft, id: 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) };
        if (isBlockedBy(chatKey)) throw Error('对方把你拉黑了，钱转不过去');
        // 群里转账记成转给那个成员（名字照本名，给模型看的）
        sendPay(pay, chatKey, pay.to ? getCharacterLook(pay.to).name : getCharacterLook(chatKey).name || getCurrentChatRoomName(), source);
        sendCard(null, null, pay);
    };
    bridge.smallphoneWritePhotoPrompt = (keywords, includeMe) => replyEngine.photoPrompt(keywords, includeMe);
    // 家机主动找你（「我 → 设置」）：每分钟看一次有没有定时到点的、有没有人该来找你；开着的那个聊天用画面上的记录
    const chatHtml=(key:string)=>key===history.current.activeKey?messageNodes.storedHtml():history.current.histories[key]||'';
    // 他把你拉黑了、你把他删了：不主动找、不定时（他拉黑你的，隔几个小时让他想想要不要放你出来）。你拉黑他的照样会来找你，只是被你拒收
    const blockedEither=(key:string)=>isBlockedBy(key)||isDeleted(key);
    const proactiveTimer=window.setInterval(()=>{for(const due of dueSchedules())if(!blockedEither(due.chatKey))void replyEngine.proactive(due.chatKey,due.prompt);
        for(const key of dueUnblockChecks())void replyEngine.proactive(key,`[系统提示：这条不是对方说的话，不要回应这条本身] 你把对方拉黑一阵子了，现在是 ${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})}。想想要不要把对方放出来。`);
        const chats=(characterStore?.read()||[]).filter(item=>!blockedEither(item.archiveId)).map(item=>({key:item.archiveId,html:chatHtml(item.archiveId),time:Number(history.current.times[item.archiveId])||0,group:!!item.group}));
        const pick=pickProactive(chats);if(!pick)return;noteProactive(pick.chatKey,chatHtml(pick.chatKey));void replyEngine.proactive(pick.chatKey,pick.prompt);},60000);
    dispose.push(()=>window.clearInterval(proactiveTimer));
    /** 拍一拍：聊天设置关着就不拍。他拍你的后缀是他回复里自己写的；拍自己不加后缀。开着的聊天直接加一行，没开着的改存着的记录。回传那一行的字。 */
    function patChat(chatKey:string,by:'user'|'self'|'assistant',aiSuffix='',who:{from?:string;target?:string}={}){
        const preferences=readPreferences(chatKey);if(!chatKey||!preferences.pat||by==='assistant'&&isBlocked(chatKey))return '';
        // 群聊：拍谁、谁拍的照成员算；你拍成员用的是那个成员私聊设定里「拍他的后缀」
        const group=!!groupService(chatKey),shown=(key:string)=>contactName(key,getCharacterLook(key).name);
        if(group&&by!=='self'&&!(by==='user'?who.target:who.from&&who.target))return '';
        const name=group?'':contactName(chatKey,getCharacterLook(chatKey).name||getCurrentChatRoomName());
        const suffix=by==='user'?(group?readPreferences(who.target!).patSuffix:preferences.patSuffix):by==='assistant'?aiSuffix:'';
        const text=group?(by==='user'?`我 拍了拍 ${shown(who.target!)}${suffix}`:by==='self'?`我 拍了拍 自己${suffix}`:`${shown(who.from!)} 拍了拍 ${who.target==='me'?'我':shown(who.target!)}${suffix}`)
            :by==='user'?`我 拍了拍 ${name}${suffix}`:by==='self'?`我 拍了拍 自己${suffix}`:`${name} 拍了拍 我${suffix}`;
        if(chatKey===history.current.activeKey){messageNodes.pat(by,text,suffix,who);messageNodes.scrollLatest();}
        else{history.current.histories[chatKey]=messageNodes.patHtml(history.current.histories[chatKey]||emptyChatHistory,by,text,suffix,who);history.current.times[chatKey]=Date.now();saveChatHistories();updateThreadPreview(chatKey);}
        return text;
    }
    /** 中间一行灰字（红包被领了之类）：开着的聊天直接加，没开着的改存着的记录。 */
    function chatNotice(chatKey:string,text:string){
        if(!chatKey||!text)return;
        if(chatKey===history.current.activeKey){messageNodes.notice(text);messageNodes.scrollLatest();}
        else{history.current.histories[chatKey]=messageNodes.noticeHtml(history.current.histories[chatKey]||emptyChatHistory,text);saveChatHistories();}
    }
    bridge.smallphoneChatNotice=chatNotice;
    /** 通讯录：你拉黑他、解除，聊天里各留一行灰字，他马上知道、照人设反应。 */
    bridge.smallphoneBlockContact=(key,on)=>{if(isBlocked(key)===on)return;setBlocked(key,on);const name=contactName(key,getCharacterLook(key).name);chatNotice(key,on?`你把${name}拉黑了`:`你解除了对${name}的拉黑`);
        void replyEngine.proactive(key,on?'[系统提示：这条不是对方说的话，不要回应这条本身] 对方刚刚在私聊里把你拉黑了：你之后发的每一条消息对方都会拒收。照你的人设对这件事做出反应。':'[系统提示：这条不是对方说的话，不要回应这条本身] 对方解除了对你的拉黑，你发的消息对方又收得到了。照你的人设反应。');};
    /** 删好友：聊天先藏起来（加回来就恢复），他过一阵子会想想要不要来加你。 */
    bridge.smallphoneDeleteContact=key=>{if(isDeleted(key))return;const name=contactName(key,getCharacterLook(key).name);chatNotice(key,`你把${name}删除了`);setDeleted(key,true);};
    bridge.smallphoneChatProactive=(key,prompt)=>{void replyEngine.proactive(key,prompt);};
    /** 他说一句（申请加回来他同意时）：开着的聊天直接出现，没开着的存进记录；你还拉黑着他就标上被拒收。 */
    bridge.smallphonePeerSay=(key,text)=>{if(!key||!text)return;const rejected=isBlocked(key);if(key===history.current.activeKey){const pending=messageNodes.appendPeer(text);messageNodes.finishPeer(pending.row,{reply:text,sentAt:Date.now(),rejected});messageNodes.scrollLatest();saveCurrentHistory();}else appendBackgroundReply({chatKey:key,reply:text,sentAt:Date.now(),rejected});if(rejected)chatNotice(key,'消息已发出，但被对方拒收了');};
    // 双击（手机上连点两下）头像或名字拍一拍：消息旁边的小头像和名字、右边栏的大头像都算；多选的时候不拍；拍他会等他回，拍自己不用
    let lastTap={who:'',at:0};
    listen(roomView,'click',event=>{
        if(roomView.classList.contains('chat-selection-mode'))return;
        const target=(event.target as Element|null)?.closest?.('.chat-message-mini-avatar,.chat-message-name,[data-cr-peer-photo],[data-cr-self-photo],[data-cr-member]');if(!target)return;
        // 群聊：拍的是那一则的发言人，或右边成员名单那一行
        const member=(target.closest<HTMLElement>('[data-cr-member]')?.dataset.crMember)||(target.closest<HTMLElement>('.chat-message-row.is-chat')?.dataset.speaker)||'';
        const who=target.matches('[data-cr-self-photo]')||target.closest('.chat-message-row.is-user')?'self':'user',key=who+member,now=Date.now();
        if(lastTap.who!==key||now-lastTap.at>400){lastTap={who:key,at:now};return;}
        lastTap={who:'',at:0};
        if(!state.current.preferences.pat){showChatNotice('拍一拍关着，可以在聊天设置打开');return;}
        if(who==='user'&&isBlockedBy(getCurrentChatPreferenceKey())){showChatNotice('对方把你拉黑了，拍不到');return;}
        if(!patChat(getCurrentChatPreferenceKey(),who,'',member?{target:member}:{}))return;
        triggerChatFeedback('send');
        if(who==='user')scheduleAutoReply();
    });

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
    // 聊天的 key 就是角色档案的 archiveId，世界书的「关联角色」存的也是它。
    function getLinkedWorldBookContext(recentMessages:ChatContextItem[],chatKey:string,selectedIds:string[],limit:number){return collectWorldInjection({selectedIds,characterId:chatKey,chatKey,recentMessages,limit});}
    // 没开着的聊天（家机主动找你）：名字、头像从角色资料拿，聊天记录从存着的 HTML 读出来
    function storedIdentity(chatKey:string){const character=characterStore?.read().find(item => item.archiveId === chatKey);return {name:character?.name||'角色',avatar:character?.photoUrl||''};}
    function storedRows(chatKey:string){const template=document.createElement('template');template.innerHTML=history.current.histories[chatKey]||'';return Array.from(template.content.children).filter((row):row is HTMLElement=>row instanceof HTMLElement&&(row.classList.contains('chat-message-row')||row.classList.contains('chat-recall-notice')&&!!row.dataset.recalledBy||row.classList.contains('chat-pat-notice')));}
    function getCharacterLook(chatKey:string){const character=characterStore?.read().find(item => item.archiveId === chatKey);return {name:character?.name||'',appearance:character?.appearanceText||''};}
    // 家机的照片：画好、失败、重画都用照片编号换掉那一张；正在看的聊天直接换，其他聊天改存档。
    function updateChatPhoto({chatKey,photo}:{chatKey:string;photo:MessagePhoto}){
        const key=String(chatKey||'');if(!key)return;
        if(key===history.current.activeKey){messageNodes.photo(photo);return;}
        const html=messageNodes.photoHtml(history.current.histories[key]||'',photo);if(html===null)return;
        history.current.histories[key]=html;saveChatHistories();
    }
    // 点照片：正在画就提示一下；画好、失败或文字照片都打开照片预览，可以看大图、存图、改描述重画（文字照片会显示画面描述，按「画出来」）。
    function openChatPhoto(row:HTMLElement){
        const box=row.querySelector<HTMLElement>('.chat-photo');const id=row.dataset.photoId||'';if(!box||!id)return;
        const state=(box.dataset.photoState||'pending') as MessagePhoto['state'];
        if(row.classList.contains('is-user')){window.dispatchEvent(new CustomEvent('qingtuan:chat-photo-view',{detail:{photo:{id,prompt:'',caption:row.dataset.photoCaption||'',state,src:box.querySelector('img')?.getAttribute('src')||undefined,mine:true},redraw:()=>{}}}));return;}
        if(state==='pending'&&replyEngine.drawing(id)){showChatNotice('照片还在画，稍等一下');return;}
        const chatKey=history.current.activeKey;
        // 画到一半页面重新整理过：当成没画出来，可以重画。
        const photo:MessagePhoto={id,prompt:row.dataset.photoPrompt||'',caption:row.dataset.photoCaption||'',scene:row.dataset.photoScene||undefined,state:state==='pending'?'failed':state,src:box.querySelector('img')?.getAttribute('src')||undefined,error:row.dataset.photoError||undefined};
        window.dispatchEvent(new CustomEvent('qingtuan:chat-photo-view',{detail:{photo,canDraw:chatPhotoReady(),redraw:(prompt:string)=>replyEngine.photo(chatKey,{...photo,prompt:prompt.trim()||photo.prompt})}}));
    }
    function getCharacterPersona(chatKey:string){const characters=characterStore?.read()||[],character=characters.find(item => item.archiveId === chatKey) || null;return isGroup(character)?groupPersona(character,characters):buildCharacterPrompt(character);}
    /** 群聊：成员给你看的名字、头像（消息照 data-speaker 换）；不是群就没有。 */
    function memberLooks(chatKey:string){let characters:ChatCharacter[]=[];try{characters=characterStore?.read()||[];}catch{/* 开机时角色清单还没接上，先当不是群 */}const group=characters.find(item=>item.archiveId===chatKey);if(!isGroup(group))return undefined;
        return Object.fromEntries(groupMembers(group,characters).map(member=>[member.archiveId,{name:contactName(member.archiveId,memberName(member)),avatar:member.photoUrl||DEFAULT_AVATAR}]));}
    /** 私聊时，他也在的群最近两天的对话（每个群最后 12 句）：让他记得群里发生的事。 */
    /** 私聊时接在提示词后面：他也在的群最近的对话、你们最近的朋友圈、他最近的日记（还有你给他看的日记）。 */
    function groupMemory(chatKey:string){
        const characters=characterStore?.read()||[],me=characters.find(item=>item.archiveId===chatKey);if(!me||isGroup(me))return '';
        const pad=(n:number)=>String(n).padStart(2,'0'),since=Date.now()-2*24*3600000,blocks:string[]=[];
        for(const group of characters.filter(item=>isGroup(item)&&item.group.members.includes(chatKey))){
            const template=document.createElement('template');template.innerHTML=group.archiveId===history.current.activeKey?messageNodes.storedHtml():history.current.histories[group.archiveId]||'';
            const lines=Array.from(template.content.querySelectorAll<HTMLElement>('.chat-message-row')).filter(row=>Number(row.dataset.sentAt)>=since&&row.dataset.recalled!=='true').slice(-12).map(row=>{
                const user=row.classList.contains('is-user'),speaker=characters.find(item=>item.archiveId===row.dataset.speaker),date=new Date(Number(row.dataset.sentAt));
                const who=user?'用户':speaker?(speaker.archiveId===chatKey?`你（${memberName(speaker)}）`:memberName(speaker)):'群成员';
                const content=row.dataset.payId?payText(payFromData(row.dataset),user):String(row.dataset.chatAiContent||row.querySelector('.chat-bubble')?.textContent||'').trim();
                return content?`${date.getMonth()+1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())} ${who}：${content.slice(0,120)}`:'';
            }).filter(Boolean);
            if(lines.length)blocks.push(`【${group.name}】\n${lines.join('\n')}`);
        }
        const moments=momentsMemory(chatKey),diary=diaryMemory(chatKey);
        return [blocks.length?`你也在下面这些群聊里，以下是最近群里的对话。这些是在群里发生的，不是这个私聊；你记得这些事，可以自然地提起，但不用刻意提，也不要照抄这个格式：\n${blocks.join('\n\n')}`:'',moments,diary].filter(Boolean).join('\n\n');
    }
    function groupService(chatKey:string){const characters=characterStore?.read()||[],group=characters.find(item=>item.archiveId===chatKey);if(!isGroup(group))return null;
        return {members:groupMembers(group,characters).map(member=>({key:member.archiveId,name:memberName(member),shown:contactName(member.archiveId,memberName(member))})),nick:group.group.nick};}
    function triggerChatFeedback(kind:'send'|'receive') { preferenceBridge.feedback(kind, state.current.preferences); }
    function loadChatPreferences() { return preferenceBridge.load(getCurrentChatPreferenceKey()); }
    function applyChatRoomPreferences() {
        state.current.preferences = loadChatPreferences();
        preferenceBridge.sync(state.current.preferences);
        navigation.appearanceClass('chat-hide-read-receipts', !state.current.preferences.readReceipt);
        navigation.appearanceClass('chat-time-group', state.current.preferences.timeDisplay === 'group');
        navigation.appearanceClass('chat-time-hidden', state.current.preferences.timeDisplay === 'hidden');
        navigation.appearanceClass('chat-hide-avatars', !state.current.preferences.avatars);
        // 在线状态由角色自身状态控制，聊天设置不再覆盖它。
        navigation.appearanceClass('chat-is-offline',false);
        chatIdentity.summaries(state.current.preferences);
        return preferenceBridge.appearance();
    }
    bridge.applyChatRoomPreferences = applyChatRoomPreferences;
    function syncChatSettingsIdentity(){let profile=null;try{profile=bridge.smallphoneGetActiveCharacterProfile?.()||null;}catch{}refs.get('chatSettingsPage')?.toggleAttribute('data-group',isGroup(profile));const avatar=refs.get<HTMLImageElement>('chatRoomAvatar');chatIdentity.settings(profile,avatar?.getAttribute('src')||avatar?.currentSrc||avatar?.src||'',refs.get<HTMLElement>('chatRoomName')?.textContent?.trim()||'当前角色');}
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
        if (row.dataset.photoCaption) return '[照片] ' + row.dataset.photoCaption.trim();
        if (row.dataset.locationPlace) return row.dataset.chatAiContent || '[位置] ' + row.dataset.locationPlace;
        if (row.dataset.stickerTag) return '[表情] ' + row.dataset.stickerTag;
        if (row.dataset.payId) return payLabel(payFromData(row.dataset));
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
        if (row?.dataset?.photoCaption) return '[照片] ' + row.dataset.photoCaption;
        if (row?.dataset?.stickerTag) return '[表情] ' + row.dataset.stickerTag;
        if (row?.dataset?.payId) return getMessageText(row);
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
            latest(){return messageNodes.pinned();},
            quote:getQuoteText,
            highlight:(row,enabled)=>messageNodes.toggle(row,'is-quote-target',enabled),
            scroll:row=>{messageNodes.scrollTo(row);}
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
    /** 发出去要等他回；他把你拉黑了就不等：最后那条标成被拒收，下面一行灰字。 */
    function scheduleAutoReply(){
        const key=history.current.activeKey;
        if(key&&isBlockedBy(key)){
            const rows=messageList?.querySelectorAll<HTMLElement>('.chat-message-row.is-user'),last=rows?.[rows.length-1];
            if(last&&last.dataset.rejected!=='true'){messageNodes.setData(last,{rejected:'true'});bridge.smallphoneChatNotice(key,'消息已发出，但被对方拒收了');}
            return;
        }
        replyTriggers.schedule();
    }
    bridge.smallphoneFlushAutoReply = nextKey=>replyTriggers.flush(nextKey);
    bridge.smallphoneSetAutoReplyDelay = value=>replyTriggers.setDelay(value);

    syncChatIdentity();
    applyChatRoomPreferences();
    resizeComposer();
    refreshChatBubbleGroups(messageList);
    syncChatReadReceipts(messageList);

}
initChatApplication();
    const ACTIVE_KEY = 'smallphone_chat_active_character_v1';

    // React 持有角色清单；剩余聊天模块仅从此同步接口读取。
    let characterStore!:ChatCharacterStoreBridge;
    window.dispatchEvent(new CustomEvent<{accept(api:ChatCharacterStoreBridge):void}>('qingtuan:chat-character-store-connect', { detail: { accept: store => { characterStore = store; } } }));

    const chatMessageList = messages.container()!;
    const emptyChatHistory = '';
    navigation.activeKey(history.current.activeKey);
    const savedChatRecords = readChatRecords();
    history.current.histories = savedChatRecords.histories;
    history.current.times = savedChatRecords.times;

    let replyBridge!:ReplyNotificationBridge;
    window.dispatchEvent(new CustomEvent<ReplyNotificationServices&{accept(api:ReplyNotificationBridge):void}>('qingtuan:reply-notification-connect', { detail: {
        accept: bridge => { replyBridge = bridge; },
        find: key => characterStore.read().find(item => item.archiveId === key),
        open: key => bridge.smallphoneOpenCharacterChat?.(key),
        updateThread: updateThreadPreview
    } }));

    let forwardRecords!:ForwardRecordsApi;
    window.dispatchEvent(new CustomEvent<{accept(api:ForwardRecordsApi):void}>('qingtuan:forward-records-connect',{detail:{accept:api=>{forwardRecords=api;}}}));

    const roomViewHost = refs.get<HTMLElement>('chatRoomView')!;
    let recordDetail!:{close():void};
    window.dispatchEvent(new CustomEvent<RecordDetailServices>('qingtuan:record-detail-connect',{detail:{
        host:roomViewHost,
        read:id=>forwardRecords.read(id),
        // 头像：我 = 资料卡头像；对方 = 来源角色的照片（找不到就用预设）
        avatars(record){
        const selfAvatar = profileAvatar.api.sidebarAvatar();
        const sourceName = record.sourceName || String(record.title || '').replace(/^你与/, '').replace(/的聊天记录$/, '');
        const peer = (typeof characterStore.read() !== 'undefined' ? characterStore.read() : []).find(c => String(c.name || c.nickname || '').trim() === sourceName);
        const peerAvatar = peer?.photoUrl || DEFAULT_AVATAR || '';
            return {selfAvatar,peerAvatar};
        },accept:api=>{recordDetail=api;}
    }}));

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
    window.dispatchEvent(new CustomEvent<ForwardPickerServices&{accept(api:ForwardPickerApi):void}>('qingtuan:forward-picker-connect',{detail:{targets:getForwardTargetsData,accept:api=>{forwardPicker=api;}}}));
    bridge.smallphoneCloseForwardPicker = () => forwardPicker.close();
    bridge.smallphoneOpenForwardPicker = payload => forwardPicker.open(payload);
    Object.entries(history.current.histories).forEach(([key, html]) => {
        const template = document.createElement('template');
        template.innerHTML = html || '';
        history.current.counts[key] = template.content.querySelectorAll('.chat-bubble').length;
    });

    let lastHistorySaveError = 0;
    function saveChatHistories() {
        // Avatars are restored from profiles; keep the existing portable message HTML format.
        Object.keys(history.current.histories).forEach(key => {
            const html = history.current.histories[key];
            if (!html || !html.includes('data:image/')) return;
            const template = document.createElement('template');template.innerHTML = html;
            template.content.querySelectorAll('.chat-message-mini-avatar').forEach(img => img.removeAttribute('src'));
            history.current.histories[key] = template.innerHTML;
        });
        void saveChatRecords(history.current.histories, history.current.times).catch(() => {
            if (!lastHistorySaveError || Date.now() - lastHistorySaveError > 8000) {
                lastHistorySaveError = Date.now();showToast('聊天记录保存失败，记录暂留在本次页面中，请重试');
            }
        });
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

    /** 聊天列表的最后一句；群聊前面加上是谁说的。 */
    function getLastChatPreview(key:string) {
        let lastSpeaker = '';
        const text = lastChatPreviewText(key, speaker => { lastSpeaker = speaker; }), member = lastSpeaker ? characterStore.read().find(item => item.archiveId === lastSpeaker) : null, who = member ? contactName(member.archiveId, memberName(member)) : '';
        return who && text ? who + '：' + text : text;
    }
    function lastChatPreviewText(key:string, onSpeaker:(speaker:string)=>void) {
        const html = history.current.histories[key];
        if (!html) return '';
        // 只拆最后几条消息来找最后一个气泡，不用每次把整份聊天记录都拆一遍（记录长了会很慢）。
        const template = document.createElement('template');
        let lastBubble: Element | undefined, from = html.length, tries = 0;
        while (!lastBubble && from > 0) {
            from = ++tries > 5 ? -1 : html.lastIndexOf('<div class="chat-message-row', from - 1);
            if (from < 0) { template.innerHTML = html; from = 0; }
            else template.innerHTML = html.slice(from);
            const bubbles = template.content.querySelectorAll('.chat-bubble');
            lastBubble = bubbles[bubbles.length - 1];
        }
        if (!lastBubble) return '';
        onSpeaker(lastBubble.closest<HTMLElement>('.chat-message-row')?.dataset.speaker || '');
        // 转发记录卡只显示消息类型，不把卡片标题、预览和页脚拼进聊天列表。
        if (lastBubble.querySelector('.chat-forward-record-card')) return '[聊天记录]';
        if (lastBubble.querySelector('.chat-photo')) return '[照片]';
        if (lastBubble.querySelector('.chat-location')) return '[位置]';
        if (lastBubble.querySelector('.chat-sticker')) return '[表情]';
        if (lastBubble.querySelector('.chat-pay.is-packet')) return '[红包]';
        if (lastBubble.querySelector('.chat-pay')) return '[转账]';
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
        // 直接进聊天室：列表先藏着，聊天室准备好才出现，不会先闪一下聊天列表。
        navigation.openApp('room');
        activateCharacter(character);
        return true;
    };

    bridge.smallphoneHandleReplyComplete = detail => replyBridge.complete(detail);

    function threadSnapshot(character:ChatCharacter):ChatThreadSnapshot {
        const draft = String(bridge.smallphoneGetChatDraft?.(character.archiveId) || '').trim();
        const lastPreview = getLastChatPreview(character.archiveId);
        return {
            id: character.archiveId,
            name: contactName(character.archiveId, text(character.name, text(character.nickname, '未命名角色'))),
            photoUrl: character.photoUrl || '', favorite: Boolean(character.favorite), pinned: Boolean(character.pinned),
            blocked: isBlocked(character.archiveId), group: isGroup(character), avatars: isGroup(character) ? groupMembers(character, characterStore.read()).slice(0, 4).map(member => member.photoUrl || DEFAULT_AVATAR) : undefined,
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
        if (character && !isDeleted(character.archiveId)) window.dispatchEvent(new CustomEvent('qingtuan:chat-thread-snapshot', { detail: { kind: 'update', threads: [threadSnapshot(character)] } }));
    }

    function refreshThreadTimes() {
        characterStore.read().forEach(character => updateThreadPreview(character.archiveId));
    }

    function saveCurrentHistory() {
        if (!chatMessageList || history.current.restoring || !history.current.activeKey) return;

        // 聊天记录不重复存储角色/用户头像的 Base64（多条消息会撑满 localStorage）。
        const html = messages.storedHtml();
        const currentCount = messages.count();
        // 布局测量或相同标签不会重复写入整份记录。
        if (history.current.histories[history.current.activeKey] === html) return;
        const previousCount = Number(history.current.counts[history.current.activeKey] || 0);

        history.current.histories[history.current.activeKey] = html;
        history.current.counts[history.current.activeKey] = currentCount;

        if (currentCount > previousCount) {
            history.current.times[history.current.activeKey] = Date.now();
        }

        saveChatHistories();
        updateThreadPreview(history.current.activeKey);
    }

    // 后台消息也使用同一套 TypeScript 消息模型；这里只保留旧历史格式的持久化服务。
    bridge.smallphoneRecallStoredMessage = (detail = {reply:''}) => {
        const key = String(detail.chatKey || '');
        if (!key || !detail.messageId) return false;
        const html = bridge.smallphoneMessages.recallHtml(key === history.current.activeKey ? messages.html() : (history.current.histories[key] || ''), detail);
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
        saveChatHistories();updateThreadPreview(key);
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
        history.current.histories[targetKey] = bridge.smallphoneMessages.forwardHtml(targetKey===history.current.activeKey?messages.html():(history.current.histories[targetKey]||emptyChatHistory),text,items,sourceChatName,mode,record);
        history.current.times[targetKey]=Date.now();saveChatHistories();updateThreadPreview(targetKey);
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
            kv.setItem(ACTIVE_KEY, JSON.stringify(character));
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
        read: characterStore.readFlags,
        patch: (id, fields) => characterStore.patch(id, fields),
        remove: id => characterStore.removeFromList(id)
    } }));

    function renderCharacters() {
        const ordered = characterStore.ordered();
        window.dispatchEvent(new CustomEvent('qingtuan:chat-thread-snapshot', { detail: { kind: 'rebuild', threads: ordered.filter(character => !isDeleted(character.archiveId)).map(threadSnapshot) } }));
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
        delete history.current.times[character.archiveId];
        delete history.current.counts[character.archiveId];
        bridge.smallphoneDeleteChatDraft?.(character.archiveId);
        setUnreadCount(character.archiveId, 0);
    }
    function finishCharacterRemoval(character:ChatCharacter) {
        if (history.current.activeKey === character.archiveId) {
            navigation.showList();
            history.current.activeKey = '';
            navigation.activeKey(history.current.activeKey);
            try { kv.removeItem(ACTIVE_KEY); } catch (error) {}
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
    window.dispatchEvent(new CustomEvent<CharacterChatServices>('qingtuan:character-chat-services', { detail: {
        saveToChat: characterStore.saveArchive, removeFromChat: characterStore.removeByDossier,
        confirm: showChatConfirm, syncIdentity: () => bridge.smallphoneSyncChatSettingsIdentity?.()
    } }));
    function openCharacterCard(targetDossierId?:unknown) { window.dispatchEvent(new CustomEvent('qingtuan:character-dialog-open', { detail: targetDossierId })); }
    window.dispatchEvent(new CustomEvent('qingtuan:chat-list-services', { detail: { openCharacterCard } }));
    bridge.smallphoneOpenCharacterCard = openCharacterCard;
    bridge.smallphonePatchCharacter = (id, fields) => { void characterStore.patch(id, fields); };
    bridge.smallphoneSaveGroup = group => characterStore.saveGroup(group);
    bridge.smallphoneRemoveGroup = id => characterStore.removeGroup(id);
    // 通讯录改了备注：聊天列表、聊天室标题和消息上的名字跟着换
    dispose.push(subscribeContacts(() => { renderCharacters(); window.dispatchEvent(new CustomEvent('qingtuan:chat-identity-refresh')); }));

    renderCharacters();
    const timer=window.setInterval(refreshThreadTimes, 10000);dispose.push(()=>window.clearInterval(timer));


    bridge.smallphoneGetActiveCharacterProfile = () => characterStore.read().find(item => item.archiveId === history.current.activeKey) || null;
    bridge.smallphoneGetActiveCharacterPrompt = () => buildCharacterPrompt(bridge.smallphoneGetActiveCharacterProfile());

listen<unknown>(window,'qingtuan:open-notice-chat',event=>{const opened=event.detail&&bridge.smallphoneOpenCharacterChat?.(event.detail);if(!opened)bridge.smallphoneOpenChatApp?.();});


return ()=>{dispose.forEach(action=>action());for(const key of Object.keys(bridge).filter(key=>/^(smallphone|refreshChat|syncChat|setChat|bindChat|applyChat)/.test(key))){if(original.has(key))Reflect.set(bridge,key,original.get(key));else Reflect.deleteProperty(bridge,key);}};
},[messages,navigation,refs]);}
