import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':u.pathname==='/reference/chat-font-fixture.otf'?base+'/reference/chat-font-fixture.otf':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.otf')?'font/otf':file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4218,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={dateClock:'Date is fixed at the same value for each action; timers and animation frames still advance. Avoids 1ms RAF date rounding drift between runtimes.',hiddenCharacterDialogFocus:'canonicalized to BODY while hidden; visible focus remains strict (browser frame timing)',viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4218')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    let messageId = 0;
    Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>`00000000-0000-4000-8000-${String(++messageId).padStart(12,'0')}`});
    window.operationsCopies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.operationsCopies.push(text)}});
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4218/'+(i===0?'original.html':''),{waitUntil:'load'});
 await page.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});
 await page.clock.runFor(100);
}
async function snapshot(page){return page.evaluate(async(styleNames)=>{
 const normalize=(node)=>{
  if(node.nodeType===Node.TEXT_NODE)return ['text',node.textContent];
  if(node.nodeType===Node.COMMENT_NODE)return ['comment',node.textContent];
  if(!(node instanceof Element))return ['other',node.nodeType];
  if(node.tagName==='SCRIPT')return null;
  const attrs=[];
  for(const a of node.attributes){
   // React search input reflects default value; actual value is compared in formState.
   if(a.name==='value'&&node.id==='chatHistorySearchInput')continue;
   if(a.name==='value' && node.closest('.cr-my-menu'))continue;
   if(a.name==='selected' && node.closest('#apiSettingsPage,#voiceImageSettingsPage'))continue;
   if(a.name==='data-qt-token'||a.name==='onerror'||a.name==='onload')continue;
   // 新迁移表单的实际状态由 formState 比较；CSS 不使用这些值属性选择器。
   if(a.name==='value' && node.closest('#themeSettingsPage,#voiceImageSettingsPage'))continue;
   if(a.name==='checked' && node.closest('#voiceImageSettingsPage'))continue;
   // React受控复选框反射默认checked属性；实际checked状态在formState单独比较。
   if(a.name==='checked' && node.closest('#backgroundActivityPage,#mcpSettingsPage,#mcpServiceModal,#mcpToolsModal,#apiSettingsPage,#voiceImageSettingsPage'))continue;
   // JSX默认值反射value属性；编辑值在formState比较，原样式无[value]选择器。
   if(a.name==='value' && node.closest('#personalProfilePage,#mcpServiceModal,#apiSettingsPage,#apiModelModal,#musicSettingsPage,#themeSettingsPage,#voiceImageSettingsPage'))continue;
   if(a.name==='style'){
     const parts=Array.from(node.style).filter(p=>!(node.hasAttribute('data-qt-token')||node.matches('.theme-swatch,.chat-settings-entry-icon'))||!p.startsWith('--')).map(p=>[p,node.style.getPropertyValue(p).replace(/blob:http:\/\/127\.0\.0\.1:4218\/[a-f0-9-]+/g,'blob:asset'),node.style.getPropertyPriority(p)]).sort((a,b)=>a[0].localeCompare(b[0]));
     if(parts.length)attrs.push(['style',parts]);
   }else attrs.push([a.name,a.value]);
  }
  attrs.sort((a,b)=>a[0].localeCompare(b[0]));
  const childNodes=[...node.childNodes].map(normalize).filter(Boolean);for(let i=childNodes.length-1;i>0;i--)if(childNodes[i][0]==='text'&&childNodes[i-1][0]==='text'){childNodes[i-1][1]+=childNodes[i][1];childNodes.splice(i,1);}return [node.tagName,attrs,childNodes];
 };
 const visible=[];
 for(const el of document.body.querySelectorAll('*')){
  if(el.tagName==='SCRIPT')continue;const r=el.getBoundingClientRect();const st=getComputedStyle(el);
  if(st.display==='none'||r.width===0||r.height===0)continue;
  visible.push({tag:el.tagName,id:el.id,cls:el.getAttribute('class')||'',rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000),styles:styleNames.map(p=>st.getPropertyValue(p).replace(/blob:http:\/\/127\.0\.0\.1:4218\/[a-f0-9-]+/g,'blob:asset'))});
 }
 const storage=Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]);
 const formState=[...document.querySelectorAll('input,textarea,select')].map(el=>[el.id,el.tagName,el.type||'',el.value,Boolean(el.checked),el.selectedIndex??null]);
 const db=await new Promise((resolve,reject)=>{const req=(window.dataSavedOpen||window.appearanceSavedOpen||indexedDB.open).call(indexedDB,'smallphone_chat_assets_v1',2);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
 const assets=[];
 for(const store of ['wallpapers','fonts']) {const entries=await new Promise((resolve,reject)=>{const result=[];const req=db.transaction(store).objectStore(store).openCursor();req.onsuccess=()=>{const c=req.result;if(c){result.push([c.key,c.value]);c.continue()}else resolve(result)};req.onerror=()=>reject(req.error)});for(const [key,blob] of entries){const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());assets.push([store,key,blob.type,blob.size,blob.name??null,[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')]);}}db.close();
 return {clipboard:window.operationsCopies??[],apiCalls:window.operationsApiCalls??[],assets,download:window.chatDataDownload??null,ensureResult:window.openingEnsureResult??null,openingSelection:document.activeElement.id==='chatSettingOpening'?[document.activeElement.selectionStart,document.activeElement.selectionEnd]:null,dom:normalize(document.body),visible,storage,formState,focus:document.activeElement.closest('#characterCard')?.hidden?['BODY','','',false]:[document.activeElement.tagName,document.activeElement.id,document.activeElement.className,document.activeElement.matches(":focus-visible")],time:Date.now()};
 },styles)}
function differences(a,b,path='root',out=[]){
 if(out.length>=20)return out;
 if(JSON.stringify(a)===JSON.stringify(b))return out;
 if(Array.isArray(a)&&Array.isArray(b)){
  if(a.length!==b.length)out.push({path,oldLength:a.length,newLength:b.length});
  for(let i=0;i<Math.min(a.length,b.length);i++)differences(a[i],b[i],path+'['+i+']',out);
 }else if(a&&b&&typeof a==='object'&&typeof b==='object'){
  for(const k of new Set([...Object.keys(a),...Object.keys(b)]))differences(a[k],b[k],path+'.'+k,out);
 }else out.push({path,original:typeof a==='string'?a.slice(0,220):a,migrated:typeof b==='string'?b.slice(0,220):b});
 return out;
}
async function check(label,screenshot=false){
 const [a,b]=await Promise.all(pages.map(snapshot));const diffs=differences(a,b);
 const result={label,domEqual:JSON.stringify(a.dom)===JSON.stringify(b.dom),computedStylesAndBoundsEqual:JSON.stringify(a.visible)===JSON.stringify(b.visible),storageEqual:JSON.stringify(a.storage)===JSON.stringify(b.storage),formStateEqual:JSON.stringify(a.formState)===JSON.stringify(b.formState),visibleElements:a.visible.length,differences:diffs};
 if(screenshot){const [oldPng,newPng]=await Promise.all(pages.map(p=>p.screenshot()));result.screenshotBytesEqual=hash(oldPng)===hash(newPng);fs.writeFileSync(base+'/docs/screenshots/'+label+'-original.png',oldPng);fs.writeFileSync(base+'/docs/screenshots/'+label+'-react.png',newPng);}
 summary.checks.push(result);console.log(JSON.stringify(result));
 if(diffs.length){fs.writeFileSync(base+'/docs/native-message-debug.json',JSON.stringify({label,a,b},null,2));throw new Error('Mismatch at '+label);}
}
let actionDate=fixed.getTime()+1100;
async function both(action){for(const p of pages){await p.clock.setFixedTime(new Date(actionDate));await action(p);await p.clock.runFor(32)}actionDate+=32;}
async function click(selector){await both(p=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click()},selector))}
await check('operations-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');
await click('#chatAddCharacterBtn');await both(p=>p.locator('[data-field="name"]').fill('操作测试狐狸'));await click('.cc-save');await both(p=>p.locator('[data-character-id]').first().click());
for(const text of ['第一条原文 <&>','第二条用于编辑','第三条用于删除','第四条用于撤回']){await both(p=>p.locator('#chatComposeField').fill(text));await click('#chatSendBtn');}
const row=index=>`.chat-message-row.is-user:nth-of-type(${index+1})`;
async function menu(index=0){await both(p=>p.locator('.chat-message-row.is-user').nth(index).dispatchEvent('contextmenu'));await both(p=>p.clock.runFor(32));}
async function action(name){await click(`[data-message-action="${name}"]`)}
await menu();await check('operations-user-menu-position-items',true);await click('#chatMessageMenu');await check('operations-backdrop-close',true);
await menu();await both(p=>p.keyboard.press('Escape'));await check('operations-escape-close',true);
await menu();await action('copy');await check('operations-copy-exact-text',true);
await menu();await action('quote');await check('operations-quote-preview-and-focus',true);await click('#chatComposeQuoteClose');await check('operations-quote-clear',true);
await menu();await action('quote');await both(p=>p.locator('#chatComposeField').fill('带引用的回复'));await click('#chatSendBtn');await check('operations-quote-sent-target-and-clear',true);
await menu();await action('favorite');await check('operations-favorite-label',true);await menu();await check('operations-favorite-menu-cancel-label',true);await action('favorite');await check('operations-unfavorite-label',true);
await menu();await action('pin');await check('operations-pin-bar-and-label',true);await menu();await check('operations-pin-menu-cancel-label',true);await action('pin');await check('operations-unpin',true);
await menu(1);await action('edit');await check('operations-edit-open-focus-caret',true);await both(p=>p.locator('#chatEditInput').fill('  修改后的正文  '));await click('#chatEditSave');await check('operations-edit-trim-ai-content-original-and-label',true);
await menu(1);await action('edit');await click('#chatEditSave');await check('operations-edit-unchanged',true);
await menu(1);await action('edit');await both(p=>p.locator('#chatEditInput').fill('   '));await click('#chatEditSave');await check('operations-edit-empty-stays-open-focused',true);await click('#chatEditCancel');await check('operations-edit-cancel-keeps-content',true);
await menu(1);await action('edit');await both(p=>p.keyboard.press('Escape'));await check('operations-edit-escape',true);
await menu(1);await action('edit');await click('#chatEditOverlay');await check('operations-edit-backdrop-close',true);
await menu(2);await action('delete');await check('operations-delete-shared-confirm',true);await click('.sp-confirm-btn');await check('operations-delete-cancel',true);
await menu(2);await action('delete');await click('.sp-confirm-btn.is-primary');await check('operations-delete-confirmed',true);
await menu(2);await action('recall');await check('operations-recall-open',true);await click('#chatRecallCancel');await check('operations-recall-cancel',true);
await menu(2);await action('recall');await click('#chatRecallOverlay');await check('operations-recall-backdrop',true);
await menu(2);await action('recall');await both(p=>p.keyboard.press('Escape'));await check('operations-recall-escape',true);
await menu(2);await action('recall');await click('#chatRecallConfirm');await check('operations-recall-notice-metadata-and-seen',true);
await menu();await action('translate');await check('operations-translate-missing-api-error',true);
await both(p=>p.evaluate(()=>{window.operationsSavedClipboard=navigator.clipboard;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('clipboard denied')}}})}));await menu();await action('copy');await check('operations-clipboard-error',true);
await both(p=>p.evaluate(()=>{delete navigator.clipboard;window.operationsExec=document.execCommand;document.execCommand=action=>{if(action==='copy'){window.operationsCopies.push(document.activeElement.value);return true}return false}}));await menu();await action('copy');await check('operations-copy-legacy-fallback',true);
await both(p=>p.evaluate(()=>{document.execCommand=()=>false}));await menu();await action('copy');await check('operations-copy-fallback-failed',true);await both(p=>p.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:window.operationsSavedClipboard});document.execCommand=window.operationsExec}));
await both(p=>p.evaluate(()=>{window.operationsConfirm=window.smallphoneShowChatConfirm;delete window.smallphoneShowChatConfirm}));await menu();await action('delete');await check('operations-delete-fallback-open',true);await click('#chatDeleteCancel');await check('operations-delete-fallback-cancel',true);
await menu();await action('delete');await both(p=>p.keyboard.press('Escape'));await check('operations-delete-fallback-escape',true);
await menu();await action('delete');await click('#chatDeleteOverlay');await check('operations-delete-fallback-backdrop',true);
await menu();await action('delete');await click('#chatDeleteConfirm');await check('operations-delete-fallback-confirm',true);await both(p=>p.evaluate(()=>{window.smallphoneShowChatConfirm=window.operationsConfirm}));
await both(p=>p.locator('#chatComposeField').fill('测试长按'));await click('#chatSendBtn');
await both(p=>p.locator('.chat-message-row.is-user').last().dispatchEvent('pointerdown',{pointerType:'touch',button:0,clientX:100,clientY:300}));await both(p=>p.clock.runFor(479));await check('operations-longpress-before-threshold',true);await both(p=>p.clock.runFor(1));await check('operations-longpress-at-threshold',true);await both(p=>p.locator('#chatMessageList').dispatchEvent('pointerup'));await click('#chatMessageMenu');
await both(p=>p.locator('.chat-message-row.is-user').last().dispatchEvent('pointerdown',{pointerType:'touch',button:0,clientX:100,clientY:300}));await both(p=>p.locator('#chatMessageList').dispatchEvent('pointermove',{clientX:109,clientY:300}));await both(p=>p.clock.runFor(600));await check('operations-longpress-movement-cancelled',true);
await both(p=>p.locator('.chat-message-row.is-user').last().dispatchEvent('pointerdown',{pointerType:'touch',button:0,clientX:100,clientY:300}));await both(p=>p.locator('#chatMessageList').dispatchEvent('pointercancel'));await both(p=>p.clock.runFor(600));await check('operations-longpress-pointercancel',true);
await both(p=>p.locator('.chat-message-row.is-user').last().dispatchEvent('pointerdown',{pointerType:'mouse',button:2,clientX:100,clientY:300}));await both(p=>p.clock.runFor(600));await check('operations-non-left-mouse-ignored',true);
await menu();await both(p=>p.locator('#chatMessageList').dispatchEvent('scroll'));await check('operations-scroll-closes-menu',true);
await menu();await action('multi');await check('operations-multi-entry-delegated',true);await click('[data-select-tool="cancel"]');
await menu();await action('forward');await check('operations-forward-entry-delegated',true);await both(p=>p.evaluate(()=>window.smallphoneCloseForwardPicker?.()));
await menu();await action('quote');await click('#chatRoomBack');await check('operations-navigation-clears-quote-and-menu',true);
await both(p=>p.locator('[data-character-id]').first().click());
await click('#chatRoomMore');await click('[data-room-action="settings"]');await click('[data-chat-settings-entry="data"] .chat-settings-entry-button');
const fixture=`<div class="chat-message-row is-chat" data-message-id="peer-test"><div class="chat-bubble-wrap"><div class="chat-bubble"><div>Hello peer</div></div><div class="chat-bubble-time">03:00</div></div></div><div class="chat-message-row is-user" data-message-id="voice-test" data-voice-duration="3"><div class="chat-bubble-wrap"><div class="chat-bubble chat-bubble--voice"><div class="chat-voice-control" role="button" tabindex="0"><audio class="chat-voice-audio" preload="none" src="data:audio/wav;base64,UklGRg=="></audio><div class="chat-voice-wave"></div><span class="chat-voice-length">3″</span></div></div><div class="chat-bubble-time">03:00</div></div></div><div class="chat-message-row is-user" data-message-id="recall-window"><div class="chat-bubble-wrap"><div class="chat-bubble"><div>撤回边界</div></div><div class="chat-bubble-time">03:00</div></div></div>`;
await both(p=>p.locator('#chatImportFile').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'qingtuan-chat',html:fixture}))}));await both(p=>p.locator('.sp-confirm-btn.is-primary').waitFor({state:'visible'}));await click('.sp-confirm-btn.is-primary');await both(p=>p.clock.runFor(100));
async function menuId(id){await both(p=>p.locator(`[data-message-id="${id}"]`).dispatchEvent('contextmenu'));await both(p=>p.clock.runFor(32));}
await menuId('peer-test');await check('operations-peer-menu-restrictions',true);await click('#chatMessageMenu');await menuId('voice-test');await check('operations-voice-menu-restrictions',true);await action('transcribe');await check('operations-voice-transcribe-missing-service',true);
await both(p=>p.evaluate(()=>{
 localStorage.setItem('smallphone_api_settings_v1',JSON.stringify({baseUrl:'https://operations.test',apiKey:'test-only',model:'test-model'}));localStorage.setItem('smallphone_voice_image_settings_v1',JSON.stringify({voice:{baseUrl:'https://operations.test',apiKey:'test-only',provider:'openai'}}));
 window.operationsApiCalls=[];window.operationsFetch=window.fetch;
 window.fetch=async(input,options)=>{const url=String(input);if(!url.startsWith('https://operations.test'))return window.operationsFetch(input,options);const body=options.body instanceof FormData?[...options.body.entries()].map(([k,v])=>[k,typeof v==='string'?v:{name:v.name,type:v.type,size:v.size}]):JSON.parse(options.body);window.operationsApiCalls.push({url,method:options.method,headers:options.headers,body});return {ok:true,json:async()=>url.includes('transcriptions')?{text:'识别原文'}:{choices:[{message:{content:'简体译文'}}]}};};
}));
await menuId('peer-test');await action('translate');await both(p=>p.waitForFunction(()=>Boolean(document.querySelector('[data-message-id="peer-test"] .chat-message-translation-card'))));await check('operations-text-translate-request-result',true);
await menuId('voice-test');await action('transcribe');await both(p=>p.waitForFunction(()=>Boolean(document.querySelector('[data-message-id="voice-test"] .chat-voice-text-result'))));await check('operations-voice-transcribe-request-result',true);
await menuId('voice-test');await action('transcribe');await check('operations-transcript-collapsed',true);await menuId('voice-test');await action('transcribe');await check('operations-transcript-expanded-no-new-request',true);
await menuId('voice-test');await action('translate');await both(p=>p.waitForFunction(()=>Boolean(document.querySelector('[data-message-id="voice-test"] .chat-message-translation-card'))));await check('operations-cached-voice-translate',true);
await menuId('voice-test');await action('quote');await check('operations-voice-quote-transcript',true);await click('#chatComposeQuoteClose');
await both(p=>p.evaluate(()=>{const row=document.querySelector('[data-message-id="recall-window"]');window.smallphoneMessages?window.smallphoneMessages.setData(row,{sentAt:String(Date.now()-120000)}):row.dataset.sentAt=String(Date.now()-120000)}));await menuId('recall-window');await check('operations-recall-at-limit-hidden',true);await action('recall');await check('operations-recall-expired-action-warning',true);
await both(p=>p.evaluate(()=>{const row=document.querySelector('[data-message-id="recall-window"]');window.smallphoneMessages?window.smallphoneMessages.setData(row,{sentAt:String(Date.now()+5000)}):row.dataset.sentAt=String(Date.now()+5000)}));await menuId('recall-window');await check('operations-recall-future-time-hidden',true);await click('#chatMessageMenu');
await both(p=>p.evaluate(()=>{const row=document.querySelector('[data-message-id="recall-window"]');window.smallphoneMessages?window.smallphoneMessages.setData(row,{sentAt:String(Date.now())}):row.dataset.sentAt=String(Date.now())}));await menuId('recall-window');await action('recall');await both(p=>p.evaluate(()=>{const row=document.querySelector('[data-message-id="recall-window"]');window.smallphoneMessages?window.smallphoneMessages.setData(row,{sentAt:String(Date.now()-120001)}):row.dataset.sentAt=String(Date.now()-120001)}));await click('#chatRecallConfirm');await check('operations-recall-expires-while-confirm-open',true);
await both(p=>p.evaluate(()=>{window.fetch=window.operationsFetch}));
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/native-messages-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/native-messages-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
