import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4178,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4178')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4178/'+(i===0?'original.html':''),{waitUntil:'load'});
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
async function click(selector){await both(p=>p.evaluate(selector=>document.querySelector(selector).click(),selector))}
async function realClick(selector){await both(p=>p.locator(selector).click())}
await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingApi');await check('api-initial',true);await both(p=>p.clock.setFixedTime(new Date('2026-10-06T02:16:30+08:00')));
const requests=[[],[]];let failing=false;
for(const [i,p] of pages.entries())await p.route('**/mock-api/**',async route=>{const request=route.request();const data=request.method()==='POST'?request.postDataJSON():null;requests[i].push([new URL(request.url()).pathname,data,request.headers()]);if(request.url().includes('/stream-')) { const claude=request.url().includes('/stream-claude/'); const chunks=claude ? [{message:{model:'claude-test',usage:{input_tokens:3}}},{delta:{text:'甲'}},{delta:{text:'乙'},usage:{output_tokens:2}}] : [{model:'stream-test',choices:[{delta:{content:'甲'}}]},{choices:[{delta:{content:'乙'}}],usage:{prompt_tokens:3,completion_tokens:2,total_tokens:5}}]; return route.fulfill({status:200,contentType:'text/event-stream',body:chunks.map(chunk=>'data: '+JSON.stringify(chunk)+'\n').join('')+'data: [DONE]\n'}); } if(request.url().includes('/fallback-failure/'))return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'主接口失败'}})}); const body=request.url().endsWith('/models')?{data:[{id:'model-b'},{id:'model-a'},{id:'model-a'}]}:failing?{error:{message:'模拟连接错误'}}:{model:'model-a',choices:[{message:{content:'OK'}}],usage:{prompt_tokens:2,completion_tokens:1,total_tokens:3}};return route.fulfill({status:failing?500:200,contentType:'application/json',body:JSON.stringify(body)});});
await click('#apiProviderTypeBtn');await check('api-provider-picker',true);
await realClick('#apiProviderList [data-value="claude"]');await check('api-provider-selected',true);await realClick('#apiProviderConfirm');await check('api-provider-confirmed',true);
await both(p=>p.locator('#apiBaseUrl').fill('http://127.0.0.1:4178/mock-api/v1'));await both(p=>p.locator('#apiKeyInput').fill('key-test'));await click('#apiKeyToggle');await check('api-key-visible',true);await click('#apiKeyToggle');
await click('#apiProviderTypeBtn');await realClick('#apiProviderList [data-value="custom-compatible"]');await realClick('#apiProviderConfirm');await both(p=>p.locator('#apiBaseUrl').fill('http://127.0.0.1:4178/mock-api/v1'));await check('api-custom-provider',true);
await both(async p=>{await p.evaluate(()=>document.getElementById('apiFetchModelsBtn').click());await p.waitForFunction(()=>document.getElementById('apiModelModal').classList.contains('open'))});await check('api-model-list',true);
await both(p=>p.locator('#apiModelSearchInput').fill('missing'));await check('api-model-search-empty',true);await both(p=>p.locator('#apiModelSearchInput').fill('model-b'));await check('api-model-search-match',true);
await realClick('#apiModelList [data-model="model-b"]');await realClick('#apiModelConfirm');await check('api-model-confirmed',true);
await click('#apiAdvancedToggle');await check('api-advanced-open',true);
await both(p=>p.locator('#apiTemperature').fill('a1.2.3b'));await both(p=>p.locator('#apiRetryCount').fill('x0a'));await both(p=>p.locator('#apiMaxTokens').fill('123x'));await check('api-numeric-filters');await click('#apiAdvancedSaveBtn');await check('api-advanced-save');await click('#apiAdvancedResetBtn');await check('api-advanced-reset',true);
await click('#apiFallbackEnabled');await check('api-fallback-toggle',true);await click('#apiFallbackProviderBtn');await realClick('#apiProviderList [data-value="deepseek"]');await realClick('#apiProviderConfirm');await check('api-fallback-provider',true);
await both(p=>p.locator('#apiFallbackBaseUrl').fill('http://127.0.0.1:4178/mock-api/fallback'));await both(p=>p.locator('#apiFallbackApiKey').fill('fallback-key'));
await both(async p=>{await p.evaluate(()=>document.getElementById('apiFallbackModelBtn').click());await p.waitForFunction(()=>document.getElementById('apiModelModal').classList.contains('open'))});await check('api-fallback-model-list',true);await realClick('#apiModelList [data-model="model-a"]');await realClick('#apiModelConfirm');await check('api-fallback-model-selected',true);
await both(async p=>{await p.evaluate(()=>document.getElementById('apiChatModelBtn').click());await p.waitForFunction(()=>document.getElementById('apiModelModal').classList.contains('open'))});await check('api-feature-model-default',true);await realClick('#apiModelList [data-model="model-a"]');await realClick('#apiModelConfirm');await check('api-feature-model-selected',true);
await both(async p=>{await p.evaluate(()=>document.getElementById('apiDiaryModelBtn').click());await p.waitForFunction(()=>document.getElementById('apiModelModal').classList.contains('open'))});await both(p=>p.keyboard.press('Escape'));await check('api-model-escape');
await click('#apiSaveBtn');await check('api-all-saved',true);
await both(async p=>{await p.evaluate(()=>document.getElementById('apiTestBtn').click());await p.waitForFunction(()=>!document.getElementById('apiTestBtn').disabled)});await check('api-connection-success',true);
await realClick('#apiBackBtn');await click('#settingApi');await check('api-enter-restores-saved',true);
await both(p=>p.locator('#apiRetryCount').fill('0'));failing=true;await both(async p=>{await p.evaluate(()=>document.getElementById('apiTestBtn').click());await p.waitForFunction(()=>!document.getElementById('apiTestBtn').disabled)});await check('api-connection-failure',true);failing=false;
await click('#apiFallbackEnabled');await check('api-fallback-off-persisted',true);
const messageCases = [{role:'system',content:'系统一'},{role:'user',content:'早期消息'},{role:'system',content:'系统二'},{role:'assistant',content:'先前回答'},{role:'user',content:'最新消息'}];
async function serviceRequest(label,overrides,messages=messageCases){
 const results=[];await both(async p=>{results.push(await p.evaluate(async({overrides,messages})=>{const chunks=[];const data=await window.smallphoneApi.requestChat(messages,{...overrides,onChunk:(chunk,collected)=>chunks.push([chunk,collected])});return {data,chunks};},{overrides,messages}));});
 if(JSON.stringify(results[0])!==JSON.stringify(results[1]))throw Error('Service response differs: '+label);await check(label);summary[label]=results[0];
}
await serviceRequest('api-context-gpt5-token-key',{provider:'custom-compatible',baseUrl:'http://127.0.0.1:4178/mock-api/gpt5',model:'gpt-5.1',stream:false,contextMessages:1,retryCount:0});
await serviceRequest('api-claude-request-shape',{provider:'claude',baseUrl:'http://127.0.0.1:4178/mock-api/claude',model:'claude-test',stream:false,contextMessages:2,retryCount:0});
await serviceRequest('api-openai-stream-chunks',{provider:'custom-compatible',baseUrl:'http://127.0.0.1:4178/mock-api/stream-openai',model:'stream-test',stream:true,retryCount:0});
await serviceRequest('api-claude-stream-chunks',{provider:'claude',baseUrl:'http://127.0.0.1:4178/mock-api/stream-claude',model:'claude-test',stream:true,retryCount:0});
await serviceRequest('api-feature-model-routing',{feature:'chat',provider:'custom-compatible',baseUrl:'http://127.0.0.1:4178/mock-api/feature',stream:false,retryCount:0});
await serviceRequest('api-fallback-after-failure',{provider:'custom-compatible',baseUrl:'http://127.0.0.1:4178/mock-api/fallback-failure',stream:false,retryCount:0,fallbackEnabled:true});
const normalizeCalls=rows=>rows.map(([url,data,headers])=>[url,data,Object.fromEntries(Object.entries(headers).filter(([key])=>key!=='referer'))]);
if(JSON.stringify(normalizeCalls(requests[0]))!==JSON.stringify(normalizeCalls(requests[1])))throw Error('API requests differ');summary.requests=normalizeCalls(requests[0]);summary.errors=errors;if(errors.some(items=>items.length))throw Error('Application page errors');
fs.writeFileSync(base+'/docs/api-native-validation-results.json',JSON.stringify(summary,null,2));console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/api-native-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
