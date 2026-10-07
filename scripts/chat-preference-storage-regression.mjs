import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source=fs.readFileSync(base+'/reference/original.html','utf8');
const helpers=source.slice(source.indexOf('    function getChatPreferenceDefaults()'),source.indexOf("    let activeWallpaperUrl"))+'\n'+source.slice(source.indexOf('    function loadChatPreferences()'),source.indexOf('    function applyChatRoomPreferences()'));
fs.writeFileSync(base+'/reference/chat-preference-tools.js',helpers);
const compiled=ts.transpileModule(fs.readFileSync(base+'/src/utils/chatPreferences.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const native=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const BY='smallphone_chat_preferences_by_chat_v2',OLD='smallphone_chat_preferences_v1';
const summary={scope:'Strict TypeScript preference defaults/load/save compared with untouched original functions; no browser rendering assertions in this suite.',checks:[]};
function storage(initial,failure){const values={...initial},events=[];return {values,events,getItem(key){events.push(['get',key]);if(failure==='read')throw Error('read failed');return values[key]??null},setItem(key,value){events.push(['set',key,value]);if(failure==='write')throw Error('write failed');values[key]=String(value)}};}
function same(label,original,migrated){const equal=JSON.stringify(original)===JSON.stringify(migrated);summary.checks.push({label,storageAndResultEqual:equal,differences:equal?[]:[{original,migrated}]});if(!equal)throw Error('Mismatch '+label);}
function originalEnv(store,key){const ctx=vm.createContext({localStorage:store,key,CHAT_PREFERENCES_KEY:OLD,CHAT_PREFERENCES_BY_CHAT_KEY:BY,chatPreferences:null});new vm.Script('function getCurrentChatPreferenceKey(){return key;}\n'+helpers).runInContext(ctx);return ctx;}
try{
const defaults=native.getChatPreferenceDefaults();const originalDefaults=new vm.Script('getChatPreferenceDefaults()').runInContext(originalEnv(storage({},''),'no-character'));
same('preference-defaults',originalDefaults,defaults);
const cases=[
 ['missing',{},'no-character'],['malformed-by-chat',{[BY]:'{'},'role'],['malformed-legacy',{[BY]:'{}',[OLD]:'{'},'role'],
 ['null-by-chat',{[BY]:'null'},'role'],['boolean-by-chat',{[BY]:'true'},'role'],['string-by-chat',{[BY]:'"text"'},'role'],['array-by-chat',{[BY]:'[]'},'role'],
 ['legacy-moon-fallback',{[OLD]:JSON.stringify({readReceipt:false,timeDisplay:'hidden',soundFeedback:true,openingText:'旧资料'})},'moon'],
 ['legacy-ignored-for-role',{[OLD]:JSON.stringify({soundFeedback:true})},'role'],['legacy-null',{[OLD]:'null'},'moon'],
 ['role-does-not-read-other',{[BY]:JSON.stringify({other:{soundFeedback:true,customModel:'其他模型'}})},'role'],
 ['falsy-saved-role',{[BY]:JSON.stringify({role:false}),[OLD]:JSON.stringify({soundFeedback:true})},'role'],
 ['truthy-saved-primitive',{[BY]:JSON.stringify({role:'abc'})},'role'],
 ['explicit-booleans',{[BY]:JSON.stringify({role:{readReceipt:false,segmented:false,timeAware:false,typingIndicator:false,voiceTranscribe:false,voiceDirect:true,aiVoice:true,voiceAutoText:true,voiceAutoTranslate:true,soundFeedback:true,vibrationFeedback:true}})},'role'],
 ['nonboolean-values',{[BY]:JSON.stringify({role:{readReceipt:0,segmented:'false',timeAware:null,typingIndicator:0,voiceTranscribe:0,voiceDirect:1,aiVoice:'true',soundFeedback:1,vibrationFeedback:'true'}})},'role'],
 ['minimum-clamps',{[BY]:JSON.stringify({role:{segmentDelay:-1,contextMessages:2,fontSize:0,wallpaperFade:-9,wallpaperBlur:-2}})},'role'],
 ['maximum-clamps',{[BY]:JSON.stringify({role:{segmentDelay:5000,contextMessages:999,fontSize:99,wallpaperFade:999,wallpaperBlur:99}})},'role'],
 ['numeric-coercions',{[BY]:JSON.stringify({role:{segmentDelay:'1200',contextMessages:'42',fontSize:'12.3',wallpaperFade:null,wallpaperBlur:''}})},'role'],
 ['invalid-numbers',{[BY]:JSON.stringify({role:{segmentDelay:'bad',contextMessages:'bad',fontSize:'bad',wallpaperFade:'bad',wallpaperBlur:'bad'}})},'role'],
 ['valid-enums',{[BY]:JSON.stringify({role:{timeDisplay:'all',replyLength:'short',quotePolicy:'free',fontType:'url'}})},'role'],
 ['invalid-enums',{[BY]:JSON.stringify({role:{timeDisplay:'bad',replyLength:false,quotePolicy:2,fontType:null}})},'role'],
 ['text-normalization',{[BY]:JSON.stringify({role:{customModel:'  mock 模型  ',openingText:'长'.repeat(850),fontName:'字'.repeat(180),fontUrl:'x'.repeat(1900),bubbleCss:'c'.repeat(5100),linkedWorldBooks:[0,null,'世界书',false],unknown:{keep:'pending'}}})},'role'],
 ['invalid-linked-books',{[BY]:JSON.stringify({role:{linkedWorldBooks:'not array',customModel:42,openingText:false,fontName:0,fontUrl:{x:1}}})},'role'],
 ['prototype-key',{[BY]:'{}'},'constructor'],
];
for(const [label,initial,key] of cases){const a=storage(initial,''),b=storage(initial,'');const ctx=originalEnv(a,key);const old=new vm.Script('loadChatPreferences()').runInContext(ctx);globalThis.localStorage=b;const next=native.loadChatPreferences(key);same('load-'+label,{result:old,events:a.events},{result:next,events:b.events});}
for(const raw of ['{}','[]','null','true','false','3','"text"','{','{"other":{"soundFeedback":true}}']){const initial={[BY]:raw};const a=storage(initial,''),b=storage(initial,'');const ctx=originalEnv(a,'role');ctx.chatPreferences={...defaults,soundFeedback:true,customModel:'mock'};new vm.Script('saveChatPreferences()').runInContext(ctx);globalThis.localStorage=b;native.saveChatPreferences('role',{...defaults,soundFeedback:true,customModel:'mock'});same('save-'+raw,{values:a.values,events:a.events},{values:b.values,events:b.events});}
for(const failure of ['read','write']){const a=storage({[BY]:'{}'},failure),b=storage({[BY]:'{}'},failure);const ctx=originalEnv(a,'role');ctx.chatPreferences={...defaults,soundFeedback:true};new vm.Script('saveChatPreferences()').runInContext(ctx);globalThis.localStorage=b;native.saveChatPreferences('role',{...defaults,soundFeedback:true});same('save-'+failure+'-failure',{values:a.values,events:a.events},{values:b.values,events:b.events});}
const a=storage({},'read'),b=storage({},'read');const ctx=originalEnv(a,'role');const old=new vm.Script('loadChatPreferences()').runInContext(ctx);globalThis.localStorage=b;same('load-read-failure',{result:old,events:a.events},{result:native.loadChatPreferences('role'),events:b.events});
fs.writeFileSync(base+'/docs/chat-preference-storage-validation-results.json',JSON.stringify(summary,null,2));console.log('Preference reference checks passed: '+summary.checks.length);
}catch(error){summary.failure=error.message;fs.writeFileSync(base+'/docs/chat-preference-storage-validation-results.json',JSON.stringify(summary,null,2));throw error;}
