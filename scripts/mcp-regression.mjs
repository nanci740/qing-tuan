import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4177,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4177')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4177/'+(i===0?'original.html':''),{waitUntil:'load'});
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
   if(a.name==='selected' && node.closest('#apiSettingsPage'))continue;
   if(a.name==='data-qt-token'||a.name==='onerror'||a.name==='onload')continue;
   // 新迁移表单的实际状态由 formState 比较；CSS 不使用这些值属性选择器。
   if(a.name==='value' && node.closest('#themeSettingsPage,#voiceImageSettingsPage'))continue;
   if(a.name==='checked' && node.closest('#voiceImageSettingsPage'))continue;
   // React受控复选框反射默认checked属性；实际checked状态在formState单独比较。
   if(a.name==='checked' && node.closest('#backgroundActivityPage,#mcpSettingsPage,#mcpServiceModal,#mcpToolsModal,#apiSettingsPage'))continue;
   // JSX默认值反射value属性；编辑值在formState比较，原样式无[value]选择器。
   if(a.name==='value' && node.closest('#personalProfilePage,#mcpServiceModal,#apiSettingsPage,#apiModelModal,#musicSettingsPage'))continue;
   if(a.name==='style'){
     const parts=Array.from(node.style).filter(p=>!(node.hasAttribute('data-qt-token')||node.matches('.theme-swatch,.chat-settings-entry-icon'))||!p.startsWith('--')).map(p=>[p,node.style.getPropertyValue(p),node.style.getPropertyPriority(p)]).sort((a,b)=>a[0].localeCompare(b[0]));
     if(parts.length)attrs.push(['style',parts]);
   }else attrs.push([a.name,a.value]);
  }
  attrs.sort((a,b)=>a[0].localeCompare(b[0]));
  return [node.tagName,attrs,node.matches('#mcpDescriptionInput') ? [] : [...node.childNodes].map(normalize).filter(Boolean)];
 };
 const visible=[];
 for(const el of document.body.querySelectorAll('*')){
  if(el.tagName==='SCRIPT')continue;const r=el.getBoundingClientRect();const st=getComputedStyle(el);
  if(st.display==='none'||r.width===0||r.height===0)continue;
  visible.push({tag:el.tagName,id:el.id,cls:el.getAttribute('class')||'',rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000),styles:styleNames.map(p=>st.getPropertyValue(p))});
 }
 const storage=Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]);
 const formState=[...document.querySelectorAll('input,textarea,select')].map(el=>[el.id,el.tagName,el.type||'',el.value,Boolean(el.checked),el.selectedIndex??null]);
 return {dom:normalize(document.body),visible,storage,formState,focus:[document.activeElement.tagName,document.activeElement.id,document.activeElement.className,document.activeElement.matches(":focus-visible")],time:Date.now()};
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
async function click(selector){if(['#viChoiceConfirm','#viChoiceCancel','#mcpSaveBtn','#mcpCancelBtn','#mcpToolsDoneBtn','#mcpBackBtn'].includes(selector)){await both(p=>p.locator(selector).click());return;}await both(p=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click()},selector))}
await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingMcp');await check('mcp-initial',true);await both(p=>p.clock.setFixedTime(new Date('2026-10-06T02:16:30+08:00')));
const rpcCalls=[[],[]];const tools=[{name:'read_note',description:'读取笔记',inputSchema:{type:'object'}},{name:'write_note',description:'写入笔记',inputSchema:{type:'object'}}];
for(const [i,p] of pages.entries())await p.route('**/mcp-*',async route=>{const data=route.request().postDataJSON();rpcCalls[i].push([new URL(route.request().url()).pathname,data,route.request().headers()]);if(route.request().url().endsWith('mcp-legacy')&&route.request().headers()['mcp-method'])return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:{message:'legacy only'}})});if(data.method==='notifications/initialized')return route.fulfill({status:202,body:''});return route.fulfill({status:200,headers:{'Mcp-Session-Id':'mock-session'},contentType:'application/json',body:JSON.stringify({jsonrpc:'2.0',id:data.id,result:data.method==='initialize'?{protocolVersion:'2025-11-25'}:{tools}})});});
await click('#mcpAddServiceBtn');await check('mcp-add-open',true);
await click('#mcpSaveBtn');await check('mcp-validation-missing-name',true);
await both(p=>p.locator('#mcpNameInput').fill('测试服务'));await click('#mcpSaveBtn');await check('mcp-validation-missing-url');
await both(p=>p.locator('#mcpUrlInput').fill('not-a-url'));await click('#mcpSaveBtn');await check('mcp-validation-url');
await both(p=>p.locator('#mcpUrlInput').fill('http://127.0.0.1:4177/mcp-modern'));await both(p=>p.locator('#mcpDescriptionInput').fill('测试服务的描述'));await both(p=>p.locator('#mcpTokenInput').fill('token-test'));
await click('#mcpAddHeaderBtn');await both(p=>p.locator('.mcp-header-row input').nth(0).fill('X-Test'));await both(p=>p.locator('.mcp-header-row input').nth(1).fill('custom-header'));await check('mcp-header-added',true);
await click('#mcpTransportBtn');await check('mcp-transport-choice',true);
await both(p=>p.locator('#viChoiceList .vi-choice-item').nth(1).click());await click('#viChoiceConfirm');await check('mcp-sse-choice',true);
await click('#mcpTestBtn');await check('mcp-sse-test-preserved',true);
await click('#mcpTransportBtn');await both(p=>p.locator('#viChoiceList .vi-choice-item').nth(0).click());await click('#viChoiceConfirm');
await click('#mcpSaveBtn');await check('mcp-service-saved',true);
await click('#mcpMasterEnabled');await check('mcp-master-on',true);
await click('.mcp-edit-btn');await click('#mcpTestBtn');await both(p=>p.waitForFunction(()=>document.getElementById('mcpModalStatus').classList.contains('ok')));await check('mcp-modern-tools',true);
await click('#mcpCancelBtn');await click('.mcp-tools-open');await check('mcp-tools-modal',true);
await both(p=>p.locator('#mcpToolList .mcp-switch').first().click());await check('mcp-tool-permission',true);
await click('#mcpRefreshToolsBtn');await both(p=>p.waitForFunction(()=>!document.getElementById('mcpRefreshToolsBtn').disabled));await check('mcp-tools-refresh-permission',true);
await click('#mcpToolsDoneBtn');await click('.mcp-edit-btn');await both(p=>p.locator('#mcpUrlInput').fill('http://127.0.0.1:4177/mcp-legacy'));await click('#mcpTestBtn');await both(p=>p.waitForFunction(()=>document.getElementById('mcpModalStatus').classList.contains('ok')));await check('mcp-legacy-fallback',true);
await click('#mcpCancelBtn');await click('#mcpBackBtn');await click('#settingApi');await both(p=>p.locator('#apiBaseUrl').fill('http://127.0.0.1:4177/api-mock'));await both(p=>p.locator('#apiKeyInput').fill('mock-key'));await both(p=>p.locator('#apiModelInput').fill('mock-model'));await click('#apiSaveBtn');await click('#apiBackBtn');await click('#settingMcp');await click('.mcp-edit-btn');
for(const p of pages)await p.route('**/api-mock/chat/completions',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:'“生成的服务描述”'}}]})}));await click('#mcpGenerateDescBtn');await both(p=>p.waitForFunction(()=>document.getElementById('mcpDescriptionInput').value==='生成的服务描述'));await check('mcp-description-generated',true);
await click('#mcpSaveBtn');await check('mcp-service-updated',true);
await both(async p=>{await p.reload({waitUntil:'load'});await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});await p.clock.runFor(2700)});await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingMcp');await check('mcp-restored',true);
await both(p=>p.locator('.mcp-service-head .mcp-switch').click());await check('mcp-service-disabled',true);
await click('.mcp-edit-btn');await both(p=>p.keyboard.press('Escape'));await check('mcp-modal-escape');
await click('.mcp-edit-btn');await click('.mcp-header-remove');await check('mcp-header-removed');
await click('#mcpDeleteBtn');await check('mcp-deleted',true);
await click('#mcpBackBtn');await click('#settingVoiceAi');await click('#voiceProviderBtn');await check('shared-voice-choice-open',true);await both(p=>p.locator('#viChoiceList .vi-choice-item').nth(1).click());await click('#viChoiceConfirm');await check('shared-voice-choice-confirmed',true);
const normalizeCalls=rows=>rows.map(([url,data,headers])=>[url,data,Object.fromEntries(Object.entries(headers).filter(([key])=>!['referer'].includes(key)))]);
if(JSON.stringify(normalizeCalls(rpcCalls[0]))!==JSON.stringify(normalizeCalls(rpcCalls[1])))throw Error('MCP requests differ');summary.rpcCalls=normalizeCalls(rpcCalls[0]);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/mcp-native-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/mcp-native-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
