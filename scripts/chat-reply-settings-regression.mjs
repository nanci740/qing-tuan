import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4203,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={hiddenCharacterDialogFocus:'canonicalized to BODY while hidden; visible focus remains strict (browser frame timing)',viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4203')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    let messageId = 0;
    Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>`00000000-0000-4000-8000-${String(++messageId).padStart(12,'0')}`});
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4203/'+(i===0?'original.html':''),{waitUntil:'load'});
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
 return {requests:window.replySettingRequests||[],dom:normalize(document.body),visible,storage,formState,focus:document.activeElement.closest('#characterCard')?.hidden?['BODY','','',false]:[document.activeElement.tagName,document.activeElement.id,document.activeElement.className,document.activeElement.matches(":focus-visible")],time:Date.now()};
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
await check('reply-settings-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');
for(const name of ['回复小鸟','回复狐狸']){await click('#chatAddCharacterBtn');await both(p=>p.locator('[data-field="name"]').fill(name));await click('.cc-save')}
await both(p=>p.locator('[data-character-id]').first().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');
const section=key=>`[data-chat-settings-entry="${key}"] .chat-settings-entry-button`;
await click(section('reply'));await check('reply-settings-defaults',true);
await click('#chatSettingSegmented');await check('reply-settings-segmented-off-disables-range',true);
await both(p=>p.evaluate(()=>{if(!document.querySelector('#chatSettingDelay').disabled||!document.querySelector('#chatSettingDelay').closest('.chat-setting-range-row').classList.contains('is-disabled'))throw Error('Delay range is not disabled')}));
await click('#chatSettingSegmented');await check('reply-settings-segmented-on',true);
async function range(id,value){await both(p=>p.evaluate(({id,value})=>{const input=document.querySelector(id);input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}))},{id,value}))}
for(const value of [200,1200,2000]){await range('#chatSettingDelay',value);await check('reply-settings-delay-'+value,true)}
for(const value of [10,80,200]){await range('#chatSettingContext',value);await check('reply-settings-context-'+value,true)}
await both(p=>p.locator('#chatSettingDelay').focus());await both(p=>p.locator('#chatSettingDelay').press('ArrowLeft'));await check('reply-settings-delay-native-keyboard',true);
await both(p=>p.locator('#chatSettingContext').focus());await both(p=>p.locator('#chatSettingContext').press('ArrowLeft'));await check('reply-settings-context-native-keyboard',true);
for(const value of ['short','detailed','natural']){await both(p=>p.selectOption('#chatSettingReplyLength',value));await check('reply-settings-length-'+value,true)}
for(const value of ['never','free','necessary']){await both(p=>p.selectOption('#chatSettingQuotePolicy',value));await check('reply-settings-quote-'+value,true)}
await click('#chatSettingTimeAware');await check('reply-settings-time-aware-off',true);await click('#chatSettingTimeAware');await check('reply-settings-time-aware-on',true);
await both(p=>p.locator('#chatSettingCustomModel').fill('  模型 / mock  '));await check('reply-settings-model-draft-not-saved',true);
await both(p=>p.locator('#chatSettingCustomModel').blur());await check('reply-settings-model-blur-trims-and-saves',true);
await both(p=>p.locator('#chatSettingCustomModel').fill('  enter-model  '));await both(p=>p.locator('#chatSettingCustomModel').press('Enter'));await check('reply-settings-model-enter-commit',true);
await both(p=>p.locator('#chatSettingCustomModel').fill('输入法组合文字'));await both(p=>p.locator('#chatSettingCustomModel').dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,keyCode:229}));await check('reply-settings-ime-enter-keeps-draft',true);
await both(p=>p.locator('#chatSettingCustomModel').fill('还没有提交'));await check('reply-settings-model-uncommitted-draft',true);
await click('#chatSettingVibration');await check('reply-settings-no-apply-feedback-keeps-model-draft',true);await click('#chatSettingVibration');
await range('#chatSettingContext',60);await check('reply-settings-other-control-resets-uncommitted-model',true);
await both(p=>p.locator('#chatSettingCustomModel').fill(''));await both(p=>p.locator('#chatSettingCustomModel').blur());await check('reply-settings-model-cleared-follow-default',true);
await both(p=>p.locator('#chatSettingCustomModel').fill('  pointer-model  '));await both(p=>p.locator('#chatSettingSegmented').click());await check('reply-settings-pointer-blur-commits-before-toggle',true);await click('#chatSettingSegmented');
await both(p=>p.locator('#chatSettingCustomModel').fill(''));await both(p=>p.locator('#chatSettingCustomModel').blur());
await range('#chatSettingDelay',900);await both(p=>p.selectOption('#chatSettingReplyLength','detailed'));await both(p=>p.selectOption('#chatSettingQuotePolicy','free'));await click('#chatSettingTimeAware');
await click('#chatSettingsBack');await click('#chatRoomBack');await both(p=>p.locator('[data-character-id]').last().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');await check('reply-settings-second-character-defaults',true);
await click('#chatSettingSegmented');await both(p=>p.locator('#chatSettingCustomModel').fill('second-model'));await both(p=>p.locator('#chatSettingCustomModel').blur());await check('reply-settings-second-character-independent',true);
await click('#chatSettingsBack');await click('#chatRoomBack');await both(p=>p.locator('[data-character-id]').first().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');await check('reply-settings-first-character-restored',true);
await both(p=>p.evaluate(()=>{window.replySavedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='smallphone_chat_preferences_by_chat_v2')throw Error('mock storage full');return window.replySavedSetItem.call(this,key,value)}}));
await range('#chatSettingDelay',2000);await check('reply-settings-delay-storage-failure-restores',true);
await both(p=>p.locator('#chatSettingCustomModel').fill('failed-model'));await both(p=>p.locator('#chatSettingCustomModel').blur());await check('reply-settings-model-storage-failure-restores',true);
await both(p=>p.evaluate(()=>{Storage.prototype.setItem=window.replySavedSetItem}));await both(p=>p.locator('#chatSettingCustomModel').fill('  request-model  '));await both(p=>p.locator('#chatSettingCustomModel').blur());await range('#chatSettingDelay',200);await range('#chatSettingContext',40);await both(p=>p.selectOption('#chatSettingReplyLength','short'));await both(p=>p.selectOption('#chatSettingQuotePolicy','never'));await check('reply-settings-save-retry',true);
await both(p=>p.evaluate(()=>{
 window.replySettingRequests=[];
 window.smallphoneApi={...window.smallphoneApi,getConfig:()=>({baseUrl:'https://reply.invalid',apiKey:'mock',model:'default-model'}),requestChat:async(messages,options)=>{window.replySettingRequests.push({messages,options});return {choices:[{message:{content:JSON.stringify({replies:[{text:'第一段'},{text:'第二段'}]})}}]}}};
}));
await click('#chatSettingsBack');await both(p=>p.locator('#chatComposeField').fill('请按设置回复'));await click('#chatSendBtn');await both(p=>p.clock.runFor(8500));await check('reply-settings-request-and-two-segments',true);
await both(p=>p.evaluate(()=>{if(window.replySettingRequests.length!==1||window.replySettingRequests[0].options.model!=='request-model'||window.replySettingRequests[0].options.maxTokens!==500||window.replySettingRequests[0].options.contextMessages!==40)throw Error('Wrong configured request')}));
await click('#chatRoomMore');await click('[data-room-action="settings"]');await click('#chatSettingSegmented');await click('#chatSettingsBack');await both(p=>p.locator('#chatComposeField').fill('这次不分段'));await click('#chatSendBtn');await both(p=>p.clock.runFor(8500));await check('reply-settings-request-without-segments',true);
await both(p=>p.reload({waitUntil:'load'}));await both(p=>p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'}));await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');await both(p=>p.locator('[data-character-id]').first().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');await click(section('reply'));await check('reply-settings-refresh-restores-values',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/chat-reply-settings-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/chat-reply-settings-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
