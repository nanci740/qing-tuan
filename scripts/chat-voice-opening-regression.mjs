import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4204,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={dateClock:'Date is fixed at the same value for each action; timers and animation frames still advance. Avoids 1ms RAF date rounding drift between runtimes.',hiddenCharacterDialogFocus:'canonicalized to BODY while hidden; visible focus remains strict (browser frame timing)',viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4204')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    let messageId = 0;
    Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>`00000000-0000-4000-8000-${String(++messageId).padStart(12,'0')}`});
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4204/'+(i===0?'original.html':''),{waitUntil:'load'});
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
 return {ensureResult:window.openingEnsureResult??null,openingSelection:document.activeElement.id==='chatSettingOpening'?[document.activeElement.selectionStart,document.activeElement.selectionEnd]:null,dom:normalize(document.body),visible,storage,formState,focus:document.activeElement.closest('#characterCard')?.hidden?['BODY','','',false]:[document.activeElement.tagName,document.activeElement.id,document.activeElement.className,document.activeElement.matches(":focus-visible")],time:Date.now()};
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
let actionDate=fixed.getTime()+1100;
async function both(action){for(const p of pages){await p.clock.setFixedTime(new Date(actionDate));await action(p);await p.clock.runFor(32)}actionDate+=32;}
async function click(selector){await both(p=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click()},selector))}
await check('voice-opening-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');
for(const name of ['开场小鸟','开场狐狸']){await click('#chatAddCharacterBtn');await both(p=>p.locator('[data-field="name"]').fill(name));await click('.cc-save')}
await both(p=>p.locator('[data-character-id]').first().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');
const section=key=>`[data-chat-settings-entry="${key}"] .chat-settings-entry-button`;
await click(section('reply'));await check('voice-opening-flags-defaults',true);
for(const id of ['chatSettingVoiceTranscribe','chatSettingVoiceDirect','chatSettingVoiceAutoText','chatSettingVoiceAutoTranslate']){await click('#'+id);await check('voice-opening-toggle-'+id,true);await click('#'+id)}
await click('#chatSettingAiVoice');await check('voice-opening-ai-service-not-ready-warning',true);await click('#chatSettingAiVoice');await both(p=>p.clock.runFor(1800));
await both(p=>p.evaluate(()=>{window.voiceReadyOriginal=window.smallphoneVoiceReady;delete window.smallphoneVoiceReady}));await click('#chatSettingAiVoice');await check('voice-opening-ai-missing-ready-hook-warning',true);await click('#chatSettingAiVoice');await both(p=>p.clock.runFor(1800));
await both(p=>p.evaluate(()=>{window.smallphoneVoiceReady=()=>true}));await click('#chatSettingAiVoice');await check('voice-opening-ai-ready-no-warning',true);await click('#chatSettingAiVoice');
await both(p=>p.locator('#chatSettingCustomModel').fill('暂不提交的模型'));await click('#chatSettingVoiceDirect');await check('voice-opening-save-only-keeps-model-draft',true);await click('#chatSettingVoiceDirect');await both(p=>p.locator('#chatSettingCustomModel').blur());
await click(section('opening'));await both(p=>p.locator('#chatSettingOpening').fill('  <开场> & 第一行\n第二行  '));await check('voice-opening-input-multiline-special-text',true);
await both(p=>p.locator('#chatSettingOpening').evaluate(el=>{el.setSelectionRange(5,5)}));await both(p=>p.keyboard.insertText('中'));await check('voice-opening-edit-middle-retains-caret',true);
await click('#chatSettingRestart');await check('voice-opening-restart-confirm',true);await click('.sp-confirm-btn');await check('voice-opening-restart-cancel-keeps-draft',true);
await click('#chatSettingRestart');await click('.sp-confirm-btn.is-primary');await check('voice-opening-restart-creates-trimmed-opening',true);
await both(p=>p.evaluate(()=>{window.openingEnsureResult=window.smallphoneEnsureChatOpening()}));await check('voice-opening-existing-message-no-duplicate',true);
await both(p=>p.locator('#chatComposeField').fill('保留输入草稿'));await click('#chatRoomMore');await click('[data-room-action="settings"]');await click('#chatSettingRestart');await click('.sp-confirm-btn.is-primary');await check('voice-opening-restart-keeps-composer-draft',true);
await click('#chatRoomMore');await click('[data-room-action="settings"]');await both(p=>p.locator('#chatSettingOpening').fill('   \n   '));await click('#chatSettingRestart');await click('.sp-confirm-btn.is-primary');await check('voice-opening-whitespace-clears-with-empty-warning',true);
await both(p=>p.evaluate(()=>{window.openingEnsureResult=window.smallphoneEnsureChatOpening()}));await check('voice-opening-empty-ensure-returns-false',true);
await click('#chatRoomMore');await click('[data-room-action="settings"]');await both(p=>p.evaluate(()=>{const el=document.querySelector('#chatSettingOpening');el.value='长'.repeat(810);el.dispatchEvent(new Event('input',{bubbles:true}))}));await check('voice-opening-long-display-versus-storage-cap',true);
await click(section('reply'));await click('#chatSettingVoiceAutoText');await click(section('opening'));await check('voice-opening-save-only-keeps-long-display',true);
await click('#chatSettingsBack');await click('#chatRoomMore');await click('[data-room-action="settings"]');await check('voice-opening-apply-restores-capped-text',true);
await both(p=>p.evaluate(()=>{window.openingOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='smallphone_chat_preferences_by_chat_v2')throw Error('mock storage full');return window.openingOriginalSetItem.call(this,key,value)}}));
await both(p=>p.locator('#chatSettingOpening').fill('保存失败仍在本次输入显示'));await check('voice-opening-text-storage-error-keeps-display',true);
await click(section('reply'));await click('#chatSettingVoiceAutoTranslate');await check('voice-opening-flag-storage-error-keeps-toggle',true);
await click(section('opening'));await click('#chatSettingRestart');await click('.sp-confirm-btn.is-primary');await check('voice-opening-restart-uses-unsaved-session-text',true);
await both(p=>p.evaluate(()=>{Storage.prototype.setItem=window.openingOriginalSetItem;window.smallphoneVoiceReady=window.voiceReadyOriginal}));
await click('#chatRoomMore');await click('[data-room-action="settings"]');await both(p=>p.locator('#chatSettingOpening').fill('第一角色的开场'));await click(section('reply'));await click('#chatSettingVoiceDirect');await click('#chatSettingsBack');await click('#chatRoomBack');
await both(p=>p.locator('[data-character-id]').last().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');await check('voice-opening-second-role-default-flags',true);await click(section('opening'));await check('voice-opening-second-role-empty-text',true);
await both(p=>p.locator('#chatSettingOpening').fill('第二角色的开场'));await click('#chatSettingRestart');await click('.sp-confirm-btn.is-primary');await check('voice-opening-second-role-independent-opening',true);
await click('#chatRoomBack');await both(p=>p.locator('[data-character-id]').first().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');await check('voice-opening-first-role-values-restored',true);
await both(p=>p.reload({waitUntil:'load'}));await both(p=>p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'}));await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');await both(p=>p.locator('[data-character-id]').first().click());await click('#chatRoomMore');await click('[data-room-action="settings"]');await click(section('opening'));await check('voice-opening-refresh-restores-text-and-history',true);await click(section('reply'));await check('voice-opening-refresh-restores-flags',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/chat-voice-opening-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/chat-voice-opening-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
