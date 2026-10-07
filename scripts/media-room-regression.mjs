import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':u.pathname==='/reference/chat-font-fixture.otf'?base+'/reference/chat-font-fixture.otf':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.otf')?'font/otf':file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4248,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={dateClock:'Date is fixed at the same value for each action; timers and animation frames still advance. Avoids 1ms RAF date rounding drift between runtimes.',hiddenCharacterDialogFocus:'canonicalized to BODY while hidden; visible focus remains strict (browser frame timing)',viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4248')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    let messageId = 0;
    Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>`00000000-0000-4000-8000-${String(++messageId).padStart(12,'0')}`});
    window.operationsCopies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.operationsCopies.push(text)}});
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4248/'+(i===0?'original.html':''),{waitUntil:'load'});
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
     const parts=Array.from(node.style).filter(p=>!(node.hasAttribute('data-qt-token')||node.matches('.theme-swatch,.chat-settings-entry-icon'))||!p.startsWith('--')).map(p=>[p,node.style.getPropertyValue(p).replace(/blob:http:\/\/127\.0\.0\.1:4248\/[a-f0-9-]+/g,'blob:asset'),node.style.getPropertyPriority(p)]).sort((a,b)=>a[0].localeCompare(b[0]));
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
  visible.push({tag:el.tagName,id:el.id,cls:el.getAttribute('class')||'',rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000),styles:styleNames.map(p=>st.getPropertyValue(p).replace(/blob:http:\/\/127\.0\.0\.1:4248\/[a-f0-9-]+/g,'blob:asset'))});
 }
 const storage=Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]);
 const formState=[...document.querySelectorAll('input,textarea,select')].map(el=>[el.id,el.tagName,el.type||'',el.value,Boolean(el.checked),el.selectedIndex??null]);
 const db=await new Promise((resolve,reject)=>{const req=(window.dataSavedOpen||window.appearanceSavedOpen||indexedDB.open).call(indexedDB,'smallphone_chat_assets_v1',2);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
 const assets=[];
 for(const store of ['wallpapers','fonts']) {const entries=await new Promise((resolve,reject)=>{const result=[];const req=db.transaction(store).objectStore(store).openCursor();req.onsuccess=()=>{const c=req.result;if(c){result.push([c.key,c.value]);c.continue()}else resolve(result)};req.onerror=()=>reject(req.error)});for(const [key,blob] of entries){const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());assets.push([store,key,blob.type,blob.size,blob.name??null,[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')]);}}db.close();
 return {mediaLog:window.mediaLog??[],triggerRequests:window.triggerRequests??[],scrollCalls:window.pinScrollCalls??[],clipboard:window.operationsCopies??[],apiCalls:window.operationsApiCalls??[],assets,download:window.chatDataDownload??null,ensureResult:window.openingEnsureResult??null,openingSelection:document.activeElement.id==='chatSettingOpening'?[document.activeElement.selectionStart,document.activeElement.selectionEnd]:null,dom:normalize(document.body),visible,storage,formState,focus:document.activeElement.closest('#characterCard')?.hidden?['BODY','','',false]:[document.activeElement.tagName,document.activeElement.id,document.activeElement.className,document.activeElement.matches(":focus-visible")],time:Date.now()};
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
 if(diffs.length){fs.writeFileSync(base+'/work/media-room-mismatch-snapshots.json',JSON.stringify({a,b}));throw new Error('Mismatch at '+label);}
}
let actionDate=fixed.getTime()+1100;
async function both(action){for(const p of pages){await p.clock.setFixedTime(new Date(actionDate));await action(p);await p.clock.runFor(32)}actionDate+=32;}
async function click(selector){await both(p=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click()},selector))}
await check('media-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');
for(const name of ['录音狐狸','录音小鸟']){await click('#chatAddCharacterBtn');await both(p=>p.locator('[data-field="name"]').fill(name));await click('.cc-save');}await both(p=>p.locator('[data-character-id]').first().click());
await both(p=>p.evaluate(()=>{window.mediaLog=[];window.recordSize=8;window.denyMic=false;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async options=>{window.mediaLog.push(['permission',options]);if(window.denyMic)throw Error('denied');return {getTracks:()=>[{stop(){window.mediaLog.push(['stop-track']);}}]};}}});class Recorder{state='inactive';mimeType='';constructor(stream,options){this.mimeType=options?.mimeType||'audio/webm';window.mediaLog.push(['recorder',this.mimeType]);}static isTypeSupported(type){window.mediaLog.push(['support',type]);return type==='audio/webm;codecs=opus';}start(){this.state='recording';window.mediaLog.push(['start']);}stop(){this.state='inactive';window.mediaLog.push(['stop']);this.ondataavailable?.({data:new Blob([new Uint8Array(window.recordSize)],{type:this.mimeType})});this.onstop?.();}}Object.defineProperty(window,'MediaRecorder',{configurable:true,writable:true,value:Recorder});}));
await both(p=>p.locator('#chatComposeField').fill('录音仍保留文字草稿'));await click('#chatMicBtn');await check('media-recording-state',true);await both(p=>p.clock.runFor(2100));await click('#chatMicBtn');await both(p=>p.waitForFunction(()=>document.querySelector('.chat-message-row .chat-voice-audio')));await check('media-send-recording-keeps-text-draft',true);
await both(p=>p.evaluate(()=>window.denyMic=true));await click('#chatMicBtn');await check('media-permission-denied',true);await both(p=>p.evaluate(()=>{window.denyMic=false;window.recordSize=2097153;}));await click('#chatMicBtn');await click('#chatMicBtn');await check('media-large-recording-rejected',true);
await both(p=>p.evaluate(()=>window.recordSize=8));await click('#chatMicBtn');await click('#chatRoomBack');await check('media-recording-cancel-on-back',true);await both(p=>p.locator('[data-character-id]').first().click());await check('media-reenter-no-cancelled-message',true);
await click('#chatMicBtn');await both(p=>p.clock.runFor(30050));await both(p=>p.waitForFunction(()=>document.querySelectorAll('.chat-message-row .chat-voice-audio').length===2));await check('media-thirty-second-auto-send',true);
await both(p=>p.locator('#chatComposeField').fill('Search Alpha 中文'));await click('#chatSendBtn');await both(p=>p.locator('#chatComposeField').fill('another alpha 搜索内容'));await click('#chatSendBtn');await click('#chatRoomMore');await check('room-more-open',true);await click('[data-room-action="search"]');await check('room-history-search-empty',true);await both(p=>p.locator('#chatHistorySearchInput').fill('ALPHA'));await check('room-history-search-case-insensitive-results',true);await click('[data-search-nav="next"]');await check('room-history-search-next',true);await click('.chat-history-result');await check('room-history-search-result-jump',true);await both(p=>p.clock.runFor(1700));await check('room-history-search-highlight-cleared',true);
await click('#chatRoomMore');await click('[data-room-action="search"]');await both(p=>p.locator('#chatHistorySearchInput').fill('没有这个字'));await check('room-history-search-no-results',true);await both(p=>p.locator('#chatHistorySearchInput').press('Escape'));await check('room-history-search-escape',true);
await click('#chatActionToggle');await click('[data-chat-action="image"]');await check('room-quick-action-native-event',true);await click('#chatActionToggle');await check('room-quick-actions-close',true);
summary.errors=errors;if(errors.some(items=>items.length))throw Error('Application page errors');
fs.writeFileSync(base+'/docs/media-room-validation-results.json',JSON.stringify(summary,null,2));console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/media-room-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
