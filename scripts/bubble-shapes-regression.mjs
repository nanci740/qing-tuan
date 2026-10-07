import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':u.pathname==='/reference/chat-font-fixture.otf'?base+'/reference/chat-font-fixture.otf':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.otf')?'font/otf':file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4217,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={dateClock:'Date is fixed at the same value for each action; timers and animation frames still advance. Avoids 1ms RAF date rounding drift between runtimes.',hiddenCharacterDialogFocus:'canonicalized to BODY while hidden; visible focus remains strict (browser frame timing)',viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4217')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    let messageId = 0;
    Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>`00000000-0000-4000-8000-${String(++messageId).padStart(12,'0')}`});
    window.operationsCopies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.operationsCopies.push(text)}});
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4217/'+(i===0?'original.html':''),{waitUntil:'load'});
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
     const parts=Array.from(node.style).filter(p=>!(node.hasAttribute('data-qt-token')||node.matches('.theme-swatch,.chat-settings-entry-icon'))||!p.startsWith('--')).map(p=>[p,node.style.getPropertyValue(p).replace(/blob:http:\/\/127\.0\.0\.1:4217\/[a-f0-9-]+/g,'blob:asset'),node.style.getPropertyPriority(p)]).sort((a,b)=>a[0].localeCompare(b[0]));
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
  visible.push({tag:el.tagName,id:el.id,cls:el.getAttribute('class')||'',rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000),styles:styleNames.map(p=>st.getPropertyValue(p).replace(/blob:http:\/\/127\.0\.0\.1:4217\/[a-f0-9-]+/g,'blob:asset'))});
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
 if(diffs.length)throw new Error('Mismatch at '+label);
}
let actionDate=fixed.getTime()+1100;
async function both(action){for(const p of pages){await p.clock.setFixedTime(new Date(actionDate));await action(p);await p.clock.runFor(32)}actionDate+=32;}
async function click(selector){await both(p=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click()},selector))}
await check('bubble-shapes-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');
await click('#chatAddCharacterBtn');await both(p=>p.locator('[data-field="name"]').fill('操作测试狐狸'));await click('.cc-save');await both(p=>p.locator('[data-character-id]').first().click());
for(const text of ['第一条原文 <&>','第二条用于编辑','第三条用于删除','第四条用于撤回']){await both(p=>p.locator('#chatComposeField').fill(text));await click('#chatSendBtn');}
const row=index=>`.chat-message-row.is-user:nth-of-type(${index+1})`;
async function menu(index=0){await both(p=>p.locator('.chat-message-row.is-user').nth(index).dispatchEvent('contextmenu'));await both(p=>p.clock.runFor(32));}
async function action(name){await click(`[data-message-action="${name}"]`)}

await check('bubble-shapes-user-consecutive-tail',true);
await both(p=>p.evaluate(()=>window.refreshChatBubbleGroups(document.querySelector('.chat-message-list'))));await check('bubble-shapes-refresh-no-duplicate-svg',true);
await both(p=>p.locator('#chatComposeField').fill('多行正文\n第二行 <&>\n第三行加长加长加长加长加长加长加长'));await click('#chatSendBtn');await check('bubble-shapes-multiline-new-message',true);
await menu();await action('quote');await both(p=>p.locator('#chatComposeField').fill('带引用的长消息，测试外框尺寸变化。'.repeat(6)));await click('#chatSendBtn');await check('bubble-shapes-quote-height-and-tail',true);
await menu(1);await action('edit');await both(p=>p.locator('#chatEditInput').fill('修改后的多行\n内容变长，内容变长，内容变长，内容变长。'));await click('#chatEditSave');await check('bubble-shapes-edit-resizes-frame',true);
await menu(3);await action('delete');await click('.sp-confirm-btn.is-primary');await check('bubble-shapes-delete-regroups-tail',true);
for(const width of [320,430,700,390]){
 await both(p=>p.setViewportSize({width,height:844}));await both(p=>p.evaluate(()=>window.refreshChatBubbleGroups(document.querySelector('.chat-message-list'))));await check('bubble-shapes-viewport-'+width,true);
}
await both(p=>p.evaluate(()=>{const bubble=document.querySelector('.chat-message-row .chat-bubble');bubble.style.width='150px';bubble.style.minHeight='96px'}));
await both(p=>p.waitForFunction(()=>{const b=document.querySelector('.chat-message-row .chat-bubble');return b.querySelector('svg').getAttribute('viewBox')===`0 0 ${b.offsetWidth} ${b.offsetHeight}`}));await check('bubble-shapes-native-resize-observer',true);
await both(p=>p.evaluate(()=>{const bubble=document.querySelector('.chat-message-row .chat-bubble');bubble.style.removeProperty('width');bubble.style.removeProperty('min-height')}));
await both(p=>p.waitForFunction(()=>{const b=document.querySelector('.chat-message-row .chat-bubble');return b.querySelector('svg').getAttribute('viewBox')===`0 0 ${b.offsetWidth} ${b.offsetHeight}`}));await check('bubble-shapes-observer-reset',true);
async function importHtml(html){await click('#chatRoomMore');await click('[data-room-action="settings"]');await click('[data-chat-settings-entry="data"] .chat-settings-entry-button');await both(p=>p.locator('#chatImportFile').setInputFiles({name:'shapes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'qingtuan-chat',html}))}));await both(p=>p.locator('.sp-confirm-btn.is-primary').waitFor({state:'visible'}));await click('.sp-confirm-btn.is-primary');await click('#chatSettingsBack');}
const makeRow=(side,body,id,shape='')=>`<div class="chat-message-row is-${side}" data-message-id="${id}" data-sent-at="${fixed.getTime()}"><div class="chat-bubble-wrap"><div class="chat-bubble">${shape}<div>${body}</div></div><div class="chat-bubble-time">03:00</div></div></div>`;
await importHtml(makeRow('chat','**粗体**\n- 第一项\n__强调__','md')+makeRow('chat','短回复','md2')+makeRow('user','你的回复','user'));await check('bubble-shapes-both-directions-markdown',true);
await both(p=>p.evaluate(()=>window.refreshChatBubbleGroups(document.querySelector('.chat-message-list'))));await check('bubble-shapes-repeated-import-refresh',true);
await click('#chatRoomMore');await click('[data-room-action="settings"]');await check('bubble-shapes-hidden-room',true);await click('#chatSettingsBack');await check('bubble-shapes-visible-again',true);
const standard='<svg class="chat-bubble-shape" aria-hidden="true" focusable="false" preserveAspectRatio="none" data-extra="keep" style="opacity:0.8;fill:rgb(1, 2, 3)"><path class="chat-bubble-shape-base" stroke-width=".5" vector-effect="non-scaling-stroke" data-path="keep" d="M0 0Z"/></svg>';
await importHtml(makeRow('chat','旧标准外框保留属性','standard',standard));await check('bubble-shapes-standard-history-attributes',true);
await both(p=>p.evaluate(()=>{const b=document.querySelector('.chat-bubble');b.style.minHeight='110px'}));await both(p=>p.waitForTimeout(70));await check('bubble-shapes-import-existing-no-extra-observer',true);
await both(p=>p.evaluate(()=>window.refreshChatBubbleGroups(document.querySelector('.chat-message-list'))));await check('bubble-shapes-import-explicit-refresh',true);
const custom='<svg class="chat-bubble-shape" data-custom="preserved"><!--保留注释--><defs><linearGradient id="custom-gradient"><stop offset="0" stop-color="red"/></linearGradient></defs><path class="chat-bubble-shape-base" d="M0 0Z"/><path d="M1 1h2"/></svg>';
await importHtml(makeRow('chat','自定义旧外框','custom',custom));await check('bubble-shapes-custom-import-nodes-comments-kept',true);
await both(p=>p.evaluate(()=>window.refreshChatBubbleGroups(document.querySelector('.chat-message-list'))));await check('bubble-shapes-custom-refresh-first-base-only',true);
await importHtml(makeRow('user','没有base路径','no-base','<svg class="chat-bubble-shape"><circle cx="5" cy="5" r="3"/></svg>'));await check('bubble-shapes-missing-base-keeps-custom-shape',true);
await both(p=>p.reload({waitUntil:'load'}));await both(p=>p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'}));await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('[data-dock-icon-key="chat"]');await both(p=>p.locator('[data-character-id]').first().click());await check('bubble-shapes-refresh-history-restored',true);
await both(p=>p.locator('#chatComposeField').fill('刷新后新发送'));await click('#chatSendBtn');await check('bubble-shapes-new-after-history-restore',true);
const detachedResults = [];
for (const page of pages) detachedResults.push(await page.evaluate(html => {
  const container = document.createElement('div'); container.innerHTML = html;
  window.refreshChatBubbleGroups(container);
  return container.innerHTML;
}, makeRow('chat','离线一','offline1')+makeRow('chat','离线二','offline2')+makeRow('user','离线三','offline3')));
if (detachedResults[0] !== detachedResults[1]) throw Error('Detached multi-row serialization differs');
await check('bubble-shapes-detached-multiple-rows-serialize-preserved',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/bubble-shapes-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/bubble-shapes-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
