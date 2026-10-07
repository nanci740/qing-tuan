import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4202,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={hiddenCharacterDialogFocus:'canonicalized to BODY while hidden; visible focus remains strict (browser frame timing)',viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4202')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    let messageId = 0;
    Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>`00000000-0000-4000-8000-${String(++messageId).padStart(12,'0')}`});
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4202/'+(i===0?'original.html':''),{waitUntil:'load'});
 await page.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});
 await page.clock.runFor(100);
}
async function snapshot(page){return page.evaluate((styleNames)=>{
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
     const parts=Array.from(node.style).filter(p=>!(node.hasAttribute('data-qt-token')||node.matches('.theme-swatch,.chat-settings-entry-icon'))||!p.startsWith('--')).map(p=>[p,node.style.getPropertyValue(p),node.style.getPropertyPriority(p)]).sort((a,b)=>a[0].localeCompare(b[0]));
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
  visible.push({tag:el.tagName,id:el.id,cls:el.getAttribute('class')||'',rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000),styles:styleNames.map(p=>st.getPropertyValue(p))});
 }
 const storage=Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]);
 const formState=[...document.querySelectorAll('input,textarea,select')].map(el=>[el.id,el.tagName,el.type||'',el.value,Boolean(el.checked),el.selectedIndex??null]);
 return {feedback:window.basicFeedbackEvents||[],dom:normalize(document.body),visible,storage,formState,focus:document.activeElement.closest('#characterCard')?.hidden?['BODY','','',false]:[document.activeElement.tagName,document.activeElement.id,document.activeElement.className,document.activeElement.matches(":focus-visible")],time:Date.now()};
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
 if(diffs.length)throw new Error('Mismatch at '+label);
}
async function both(action){for(const p of pages){await action(p);await p.clock.runFor(32)}}
async function click(selector){await both(p=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click()},selector))}
await check('basic-settings-initial',true);
await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');
for(const name of ['设置小鸟','设置狐狸']){await click('#chatAddCharacterBtn');await both(p=>p.locator('[data-field="name"]').fill(name));await click('.cc-save')}
await both(p=>p.locator('[data-character-id]').first().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');
const section=key=>`[data-chat-settings-entry="${key}"] .chat-settings-entry-button`;
await click(section('display'));await check('basic-display-defaults',true);
await click('#chatSettingReadReceipt');await check('basic-read-receipt-off',true);await click('#chatSettingReadReceipt');await check('basic-read-receipt-on',true);
for(const value of ['all','hidden','group']){await both(p=>p.selectOption('#chatSettingTimeDisplay',value));await check('basic-time-'+value,true)}
await click('#chatSettingTypingIndicator');await check('basic-typing-off',true);await click('#chatSettingTypingIndicator');await check('basic-typing-on',true);
await both(p=>p.evaluate(()=>{
 window.basicFeedbackEvents=[];window.basicThrowAudio=false;window.basicThrowVibrate=false;
 const log=(...args)=>window.basicFeedbackEvents.push(args);
 class FeedbackAudio {
  constructor(){this.currentTime=.25;this.destination={};log('context');}
  createOscillator(){if(window.basicThrowAudio)throw Error('mock audio denied');const frequency={value:0};return {frequency,type:'',connect(node){log('oscillator-connect');return node},start(){log('oscillator-start',frequency.value,this.type)},stop(time){log('oscillator-stop',time)}};}
  createGain(){return {gain:{setValueAtTime(...args){log('gain-set',...args)},exponentialRampToValueAtTime(...args){log('gain-ramp',...args)}},connect(){log('gain-connect')}};}
  close(){return Promise.resolve();}
 }
 window.FeedbackAudio=FeedbackAudio;Object.defineProperty(window,'AudioContext',{configurable:true,writable:true,value:FeedbackAudio});
 Object.defineProperty(window,'webkitAudioContext',{configurable:true,writable:true,value:FeedbackAudio});
 Object.defineProperty(navigator,'vibrate',{configurable:true,writable:true,value:pattern=>{log('vibrate',pattern);if(window.basicThrowVibrate)throw Error('mock vibration denied');return true}});
}));
await click(section('feedback'));await click('#chatSettingSound');await check('basic-sound-enable-preview',true);
await click('#chatSettingVibration');await check('basic-vibration-enable-previews-both',true);
await click('#chatSettingSound');await check('basic-sound-disable-no-preview',true);
await both(p=>p.evaluate(()=>{window.AudioContext=undefined}));await click('#chatSettingSound');await check('basic-webkit-fallback',true);
await both(p=>p.evaluate(()=>{window.basicThrowAudio=true;window.basicThrowVibrate=true}));await click('#chatSettingVibration');await click('#chatSettingVibration');await check('basic-feedback-errors-silent',true);
await both(p=>p.evaluate(()=>{window.basicThrowAudio=false;window.basicThrowVibrate=false;window.AudioContext=window.FeedbackAudio}));
await click('#chatSettingsBack');await click('#chatRoomBack');await both(p=>p.locator('[data-character-id]').last().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');await check('basic-second-character-defaults',true);
await click(section('display'));await click('#chatSettingReadReceipt');await both(p=>p.selectOption('#chatSettingTimeDisplay','hidden'));await click('#chatSettingTypingIndicator');await check('basic-second-character-independent',true);
await click('#chatSettingsBack');await click('#chatRoomBack');await both(p=>p.locator('[data-character-id]').first().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');await check('basic-first-character-restored',true);
await both(p=>p.evaluate(()=>{
 window.basicSetItem=Storage.prototype.setItem;
 Storage.prototype.setItem=function(key,value){if(key==='smallphone_chat_preferences_by_chat_v2')throw Error('mock storage full');return window.basicSetItem.call(this,key,value)};
}));
await click('#chatSettingReadReceipt');await check('basic-display-save-failure-reloads-saved',true);
await click(section('feedback'));await click('#chatSettingSound');await check('basic-feedback-save-failure-keeps-local-toggle',true);
await both(p=>p.evaluate(()=>{Storage.prototype.setItem=window.basicSetItem}));await click('#chatSettingSound');await check('basic-feedback-save-retry',true);
await click(section('data'));await click('#chatResetPreferences');await click('.sp-confirm-btn.is-primary');
await both(p=>p.evaluate(()=>new Promise(resolve=>{const done=()=>document.querySelector('#saveToast')?.textContent==='当前角色设置已恢复默认';if(done()){resolve();return;}const observer=new MutationObserver(()=>{if(done()){observer.disconnect();resolve();}});observer.observe(document.querySelector('#saveToast'),{childList:true,subtree:true,characterData:true});})));
await click(section('display'));await check('basic-reset-restores-controlled-fields',true);
await click(section('feedback'));await click('#chatSettingSound');await click('#chatSettingVibration');await click('#chatSettingsBack');
await both(p=>p.evaluate(()=>{
 window.smallphoneApi={...window.smallphoneApi,getConfig:()=>({baseUrl:'https://basic.invalid',apiKey:'mock',model:'mock-model'}),requestChat:async()=>({choices:[{message:{content:JSON.stringify({replies:[{text:'回复音效与震动'}]})}}]})};
}));await both(p=>p.locator('#chatComposeField').fill('发送音效与震动'));await click('#chatSendBtn');await check('basic-send-feedback',true);await both(p=>p.clock.runFor(8500));await check('basic-receive-feedback',true);
await both(p=>p.evaluate(()=>{if(!window.basicFeedbackEvents.some(e=>e[0]==='oscillator-start'&&e[1]===610)||!window.basicFeedbackEvents.some(e=>e[0]==='vibrate'&&JSON.stringify(e[1])==='[15,28,15]'))throw Error('Receive feedback missing')}));
await both(p=>p.reload({waitUntil:'load'}));await both(p=>p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'}));
await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');await both(p=>p.locator('[data-character-id]').first().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');await click(section('feedback'));await check('basic-refresh-restores-saved-fields',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/chat-basic-settings-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/chat-basic-settings-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
