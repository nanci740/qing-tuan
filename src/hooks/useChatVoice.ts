import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {transcriptionConnection,recordingExtension,transcriptionError} from '../utils/voiceTranscription';
import {performChatRequest} from '../utils/apiClient';
import {getSavedConfig} from '../utils/apiStorage';
import {extractChatAiReply} from '../utils/chatReplyParser';
import type {MessageNodesApi,MessageVoice} from '../types/chatMessages';
export interface ChatVoiceServices {send():void;resize():void;text(row:HTMLElement):string;input():void;}
export interface ChatVoiceApi {translateText(source:string):Promise<string>;voiceConfig():{baseUrl?:string;apiKey?:string;model?:string;provider?:string};recording():boolean;draft():MessageVoice|null;reset():void;cancel():void;toggle():Promise<void>;play(pill:HTMLElement):void;transcribe(row:HTMLElement,options?:{showResult?:boolean}):Promise<string>;translate(row:HTMLElement):Promise<string>;prepare(text:string):Promise<MessageVoice|null>;wav(row:HTMLElement):Promise<string>;}
interface RecorderState {voiceTextAbort:AbortController|null;voiceTextEpoch:number;voiceRecorder:MediaRecorder|null;voiceStream:MediaStream|null;voiceChunks:Blob[];voiceDataUrl:string;voiceTimer:ReturnType<typeof setTimeout>|null;recordingCancelled:boolean;voiceRecordStartedAt:number;voiceDurationSec:number;}
export function useChatVoice(messages:MessageNodesApi){
 const [view,setView]=useState({recording:false,label:'录制语音'});
 const services=useRef<ChatVoiceServices|null>(null);
 const media=useRef<RecorderState>({voiceTextAbort:null,voiceTextEpoch:0,voiceRecorder:null,voiceStream:null,voiceChunks:[],voiceDataUrl:'',voiceTimer:null,recordingCancelled:false,voiceRecordStartedAt:0,voiceDurationSec:0});
 const update=(patch:Partial<typeof view>)=>flushSync(()=>setView(previous=>({...previous,...patch})));
 const notice=(detail:string)=>window.dispatchEvent(new CustomEvent('qingtuan:toast',{detail}));
    async function prepareAiVoiceAudio(text:string) {
        const blob = await window.smallphoneSynthesizeSpeech?.(text);
        if (!blob || !blob.size) return null;
        let seconds = 0;
        try {
            const AudioCtx = window.AudioContext || (window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
            if(!AudioCtx)throw Error("AudioContext unavailable");const ctx = new AudioCtx();
            try { seconds = (await ctx.decodeAudioData(await blob.arrayBuffer())).duration; } finally { ctx.close?.(); }
        } catch (error) {}
        let dataUrl = '';
        if (/wav/i.test(blob.type)) {
            const wavBase64 = await audioBlobToWavBase64(blob);
            if (wavBase64) dataUrl = 'data:audio/wav;base64,' + wavBase64;
        }
        if (!dataUrl) dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
        return dataUrl ? { dataUrl, seconds: Math.max(0.5, seconds || text.length / 4) } : null;
    }
    // 把语音消息的录音（webm / m4a）解码后重新编码成 16kHz 单声道 16-bit wav，回传 base64
    async function chatVoiceRowToWavBase64(row:HTMLElement) {
        return audioBlobToWavBase64(await audioBlobFromRow(row));
    }
    async function audioBlobToWavBase64(blob:Blob) {
        const AudioCtx = window.AudioContext || (window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
        if (!AudioCtx || !window.OfflineAudioContext) return '';
        if(!AudioCtx)throw Error("AudioContext unavailable");const ctx = new AudioCtx();
        let decoded;
        try { decoded = await ctx.decodeAudioData(await blob.arrayBuffer()); }
        finally { ctx.close?.(); }
        const rate = 16000;
        const frames = Math.max(1, Math.ceil(decoded.duration * rate));
        const offline = new OfflineAudioContext(1, frames, rate);
        const source = offline.createBufferSource();
        source.buffer = decoded;
        source.connect(offline.destination);
        source.start();
        const samples = (await offline.startRendering()).getChannelData(0);
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const text = (offset:number, value:string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
        text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE');
        text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
        view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        text(36, 'data'); view.setUint32(40, samples.length * 2, true);
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(binary);
    }

    async function audioBlobFromRow(row:HTMLElement) {
        const audio = row?.querySelector<HTMLAudioElement>('.chat-voice-audio');
        const source = audio?.currentSrc || audio?.src || '';
        if (!source) throw new Error('这条语音没有可读取的音频');
        const response = await fetch(source);
        if (!response.ok) throw new Error('无法读取这条语音');
        return response.blob();
    }
    async function transcribeVoiceRow(row:HTMLElement, { showResult = true }: {showResult?:boolean} = {}) {
        if (!row?.querySelector<HTMLAudioElement>('.chat-voice-audio')) return '';
        if (row.dataset.voiceTranscript) {
            if (showResult) messages.result(row, 'chat-voice-text-result', row.dataset.voiceTranscript);
            return row.dataset.voiceTranscript;
        }
        const config = readSavedVoiceService();
        const connection = transcriptionConnection(config);
        const requestEpoch = ++media.current.voiceTextEpoch;
        media.current.voiceTextAbort?.abort();
        media.current.voiceTextAbort = new AbortController();
        if (connection.provider === 'gemini') {
            const wavBase64 = await chatVoiceRowToWavBase64(row);
            if (!wavBase64) throw new Error('这个浏览器没办法转换录音');
            const res = await fetch(connection.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': connection.apiKey },
                body: JSON.stringify({ contents: [{ parts: [
                    { text: '请把这段语音逐字转写成文字。只输出转写内容，不要加任何说明、引号或标点以外的符号。' },
                    { inline_data: { mime_type: 'audio/wav', data: wavBase64 } }
                ] }] }),
                signal: media.current.voiceTextAbort.signal
            });
            if (!res.ok) throw await transcriptionError(res);
            const data = await res.json();
            if (requestEpoch !== media.current.voiceTextEpoch) return '';
            const text = (data?.candidates?.[0]?.content?.parts || []).map((part:{text?:string}) => part?.text || '').join('').trim();
            if (!text) throw new Error('接口没有返回识别文字');
            messages.setData(row,{voiceTranscript:text});
            if (showResult) messages.result(row, 'chat-voice-text-result', text);
            return text;
        }
        const blob = await audioBlobFromRow(row);
        const ext = recordingExtension(blob.type);
        const form = new FormData();
        form.append('file', blob, 'recording.' + ext);
        form.append('model', connection.model);
        const res = await fetch(connection.endpoint, {
            method: 'POST', headers: {'Authorization': 'Bearer ' + connection.apiKey},
            body: form, signal: media.current.voiceTextAbort.signal
        });
        if (!res.ok) throw await transcriptionError(res);
        const data = await res.json();
        if (requestEpoch !== media.current.voiceTextEpoch) return '';
        const text = data?.text?.trim();
        if (!text) throw new Error('接口没有返回识别文字');
        messages.setData(row,{voiceTranscript:text});
        if (showResult) messages.result(row, 'chat-voice-text-result', text);
        return text;
    }

    async function translateMessageRow(row:HTMLElement) {
        let source = services.current!.text(row);
        if (!source && row?.querySelector<HTMLAudioElement>('.chat-voice-audio')) source = await transcribeVoiceRow(row, { showResult: false });
        return translateText(source,row);
    }
    async function translateText(source:string,row?:HTMLElement){
        if (!source) throw new Error('这条消息没有可翻译的文字');
        const config = getSavedConfig();
        const model = config?.featureModels?.chat || config?.model;
        if (!config?.apiKey || !config.baseUrl || !model) {
            throw new Error('请先在 API 设置保存地址、Key 和聊天模型');
        }
        const requestEpoch = ++media.current.voiceTextEpoch;
        media.current.voiceTextAbort?.abort();
        const data = await performChatRequest([
            {role:'system',content:'Translate the user text into Simplified Chinese (zh-CN). Return only the translation without commentary.'},
            {role:'user',content:source}
        ], {...config, model, stream:false, temperature:0.2});
        if (requestEpoch !== media.current.voiceTextEpoch) return '';
        const translated = extractChatAiReply(data);
        if (!translated || Array.isArray(translated)) throw new Error('接口没有返回译文');
        if(row){messages.setData(row,{simplifiedTranslation:translated});messages.translation(row, translated);}
        return translated;
    }

    async function toggleMic() {
        if (media.current.voiceRecorder?.state === 'recording') {
            media.current.voiceDurationSec = Math.max(.1, (performance.now() - media.current.voiceRecordStartedAt) / 1000);
            update({label:'正在发送语音'});
            media.current.voiceRecorder.stop();
            releaseMic();
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
            notice('当前环境不支持录音，请使用支持麦克风的 HTTPS 页面');
            return;
        }
        try {
            resetVoiceRecordingDraft();
            media.current.voiceStream = await navigator.mediaDevices.getUserMedia({audio:true});
            media.current.voiceChunks = []; media.current.recordingCancelled = false;
            const preferred = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
            const mimeType = preferred.find(type => MediaRecorder.isTypeSupported(type));
            media.current.voiceRecorder = new MediaRecorder(media.current.voiceStream, mimeType ? {mimeType} : undefined);
            media.current.voiceRecorder.ondataavailable = event => { if (event.data?.size) media.current.voiceChunks.push(event.data); };
            media.current.voiceRecorder.onstop = () => {
                releaseMic();
                if (media.current.recordingCancelled) { resetVoiceRecordingDraft(); return; }
                const blob = new Blob(media.current.voiceChunks, {type: media.current.voiceRecorder!.mimeType || 'audio/webm'});
                if (!blob.size || blob.size > 2 * 1024 * 1024) {
                    resetVoiceRecordingDraft();
                    notice('录音太大，请缩短后重试');
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    media.current.voiceDataUrl = String(reader.result || '');
                    services.current?.send();
                };
                reader.readAsDataURL(blob);
            };
            media.current.voiceRecorder.start();
            media.current.voiceRecordStartedAt = performance.now();
            update({recording:true});
            update({label:'发送语音'});
            media.current.voiceTimer = setTimeout(() => {
                if (media.current.voiceRecorder?.state === 'recording') {
                    media.current.voiceDurationSec = Math.max(.1, (performance.now() - media.current.voiceRecordStartedAt) / 1000);
                    media.current.voiceRecorder.stop(); releaseMic();
                }
            }, 30000);
        } catch (error) {
            releaseMic(); resetVoiceRecordingDraft();
            notice('未获得麦克风权限，无法录音');
        }
    }

    function resetVoiceRecordingDraft() {
        media.current.voiceDataUrl = '';
        media.current.voiceDurationSec = 0;
        media.current.voiceRecordStartedAt = 0;
        services.current?.resize();
    }
    const formatVoiceTime = (seconds:number) => {
        const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
        return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
    };
    function releaseMic() {
        if (media.current.voiceTimer) { clearTimeout(media.current.voiceTimer); media.current.voiceTimer = null; }
        media.current.voiceStream?.getTracks().forEach(track => track.stop());
        media.current.voiceStream = null;
        update({recording:false});
        update({label:'录制语音'});
    }
    function readSavedVoiceService() {
        try { return JSON.parse(localStorage.getItem('smallphone_voice_image_settings_v1') || '{}')?.voice || {}; }
        catch (_) { return {}; }
    }
    function pauseOtherChatVoiceBubbles(currentAudio:HTMLAudioElement) {
        messages.audioElements().forEach(audio => {
            if (audio !== currentAudio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }
    function toggleChatVoiceBubble(pill:HTMLElement) {
        messages.bindVoice(pill);
        const audio = pill?.querySelector<HTMLAudioElement>('.chat-voice-audio');
        if (!audio) return;
        if (!audio.paused) {
            audio.pause();
            return;
        }
        pauseOtherChatVoiceBubbles(audio);
        messages.playing(pill,true);
        const handlePlayFailure = () => {
            messages.playing(pill,false);
            if (true) notice('无法播放当前语音');
        };
        try {
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(handlePlayFailure);
            }
        } catch (error) {
            handlePlayFailure();
        }
    }

 const apiRef=useRef<ChatVoiceApi|null>(null);
 if(!apiRef.current)apiRef.current={translateText,voiceConfig:readSavedVoiceService,recording:()=>media.current.voiceRecorder?.state==='recording',draft:()=>media.current.voiceDataUrl?{dataUrl:media.current.voiceDataUrl,seconds:media.current.voiceDurationSec}:null,reset:resetVoiceRecordingDraft,cancel(){if(media.current.voiceRecorder?.state==='recording'){media.current.recordingCancelled=true;media.current.voiceRecorder.stop();releaseMic();}resetVoiceRecordingDraft();},toggle:toggleMic,play:toggleChatVoiceBubble,transcribe:transcribeVoiceRow,translate:translateMessageRow,prepare:prepareAiVoiceAudio,wav:chatVoiceRowToWavBase64};
 useEffect(()=>()=>{media.current.recordingCancelled=true;if(media.current.voiceRecorder?.state==='recording')media.current.voiceRecorder.stop();if(media.current.voiceTimer)clearTimeout(media.current.voiceTimer);media.current.voiceStream?.getTracks().forEach(track=>track.stop());media.current.voiceTextAbort?.abort();},[]);
 return {view,services,api:apiRef.current,click(){void apiRef.current!.toggle();services.current?.input();}};
}
