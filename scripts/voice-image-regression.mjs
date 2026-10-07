import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4184,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];const requests=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=','base64');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',async route=>{const req=route.request(),url=req.url();if(url.startsWith('http://127.0.0.1:4184')||url.startsWith('blob:'))return route.continue();if(!['api.openai.com','api.x.ai','api.mosi.cn','api-uw.minimax.io','generativelanguage.googleapis.com','image.novelai.net'].some(host=>url.includes(host)))return route.abort();requests[i].push({url,method:req.method(),body:req.postData(),authorization:req.headers().authorization||'',goog:req.headers()['x-goog-api-key']||''});const json=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});if(req.method()==='GET')return url.includes('googleapis')?json({models:['gemini-2.5-flash-preview-tts','gemini-3.1-flash-image'].map(name=>({name:'models/'+name}))}):json({data:['gpt-4o-mini-tts','moss-tts','speech-2.8-turbo','gpt-image-2','grok-imagine-image-2.0','irrelevant'].map(id=>({id}))});const body=JSON.parse(req.postData()||'{}');if(url.includes('generateContent'))return body.generationConfig?.responseModalities?.includes('AUDIO')?json({candidates:[{content:{parts:[{inlineData:{data:'AAAAAA==',mimeType:'audio/L16;rate=24000'}}]}}]}):json({candidates:[{content:{parts:[{inlineData:{data:png.toString('base64'),mimeType:'image/png'}}]}}]});if(url.includes('t2a_v2'))return json({base_resp:{status_code:0},data:{audio:'00000000'}});if(url.includes('generate-image'))return route.fulfill({status:200,contentType:'image/png',body:png});if(url.includes('images/generations'))return json({data:[{b64_json:png.toString('base64')}]});return route.fulfill({status:200,contentType:'audio/mpeg',body:Buffer.from([0,0,0,0])});});
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    let blobCounter=0; URL.createObjectURL=()=> 'blob:http://127.0.0.1:4184/mock-'+(++blobCounter); URL.revokeObjectURL=()=>{};
    const media=new WeakMap();const value=el=>{if(!media.has(el))media.set(el,{paused:true,time:0});return media.get(el)};
    Object.defineProperty(HTMLMediaElement.prototype,'duration',{configurable:true,get:()=>180});
    Object.defineProperty(HTMLMediaElement.prototype,'paused',{configurable:true,get(){return value(this).paused}});
    Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{configurable:true,get(){return value(this).time},set(n){value(this).time=n;this.dispatchEvent(new Event('timeupdate'))}});
    HTMLMediaElement.prototype.play=async function(){value(this).paused=false;this.dispatchEvent(new Event('loadedmetadata'));this.dispatchEvent(new Event('play'));};
    HTMLMediaElement.prototype.pause=function(){value(this).paused=true;this.dispatchEvent(new Event('pause'));};
    HTMLMediaElement.prototype.load=function(){value(this).time=0;};

    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4184/'+(i===0?'original.html':''),{waitUntil:'load'});
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
  const children=(node.tagName==='TEXTAREA' && node.closest('#voiceImageSettingsPage')?[]:[...node.childNodes]).map(normalize);for(let i=children.length-1;i>0;i--)if(children[i][0]==='text'&&children[i-1][0]==='text'){children[i-1][1]+=children[i][1];children.splice(i,1);}return [node.tagName,attrs,children];
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
async function click(selector){await both(p=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click()},selector))}
await check('voice-image-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingVoiceAi');await check('voice-image-open',true);
async function fill(id,value){await both(p=>p.locator('#'+id).fill(value));}
async function range(id,value){await both(p=>p.locator('#'+id).evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));},value));}
async function choose(button,label){await click('#'+button);await both(p=>p.locator('.vi-choice-item').filter({hasText:label}).first().click());await both(p=>p.locator('#viChoiceConfirm').click());}
await click('#voiceTestBtn');await check('voice-missing-config');
await fill('voiceApiKey','test-key');await click('#voiceKeyToggle');await range('voiceSpeed',1.35);await choose('voiceFormatBtn','WAV');await click('#voiceSaveBtn');await check('voice-config-save',true);
await click('#voiceEnabled');await check('voice-toggle-immediate-save');
await click('#voiceFetchModelsBtn');await both(p=>p.waitForSelector('#viChoiceModal.open'));await check('voice-models-fetched',true);await click('#viChoiceCancel');
await click('#voiceTestBtn');await both(p=>p.waitForFunction(()=>document.getElementById('voicePreview').classList.contains('show')&&!document.getElementById('voiceTestBtn').disabled));await check('voice-openai-preview',true);
await click('#voicePlayBtn');await range('voiceProgress',550);await click('#voiceVolumeBtn');await check('voice-preview-controls',true);
for(const [label,value]of [['Grok / xAI','grok'],['Moss / Mossland','moss'],['MiniMax','minimax'],['Gemini','gemini'],['自定义兼容接口','custom-compatible']]){await choose('voiceProviderBtn',label);if(value==='moss')await fill('voiceName','moss-voice');await check('voice-preset-'+value,true);await click('#voiceTestBtn');await both(p=>p.waitForFunction(()=>!document.getElementById('voiceTestBtn').disabled));await check('voice-synthesis-'+value);}
await click('#voiceSaveBtn');await click('[role="tab"][data-tab="image"]');await check('image-tab',true);
await click('#imageAddCharacterBtn');await click('#imageAddCharacterBtn');await check('image-character-limit',true);
await both(p=>p.locator('.vi-character-name').nth(1).click());await both(p=>p.locator('.vi-character-name-input').fill(' 新角色 '));await both(p=>p.locator('.vi-character-name-input').press('Enter'));await check('image-character-rename',true);
await both(p=>p.locator('.vi-character-name').nth(2).click());await both(p=>p.locator('.vi-character-name-input').fill('取消'));await both(p=>p.locator('.vi-character-name-input').press('Escape'));await check('image-character-rename-cancel');
await fill('imagePrompt','场景互动与服装');await fill('imageArtistTags','画师风格');await fill('imageNegativePrompt','全局负面词');await both(p=>p.locator('[data-character-prompt]').nth(0).fill('用户形象'));await both(p=>p.locator('[data-character-negative]').nth(1).fill('角色负面词'));await both(p=>p.locator('[data-character-prompt]').nth(2).fill('第三角色'));await check('image-builder-inputs',true);
await both(p=>p.locator('.vi-character-remove').nth(1).click());await check('image-character-remove',true);
await fill('imageApiKey','image-test-key');await choose('imageSizeBtn','1536');await choose('imageQualityBtn','High');await click('#imageEnabled');await click('#imageSaveBtn');await check('image-config-save',true);
await click('#imageTestBtn');await both(p=>p.waitForFunction(()=>document.getElementById('imagePreview').classList.contains('show')&&!document.getElementById('imageTestBtn').disabled));await check('image-openai-preview',true);
for(const [label,value]of [['Grok / xAI','grok'],['Gemini','gemini'],['NovelAI / NAI','novelai'],['自定义兼容接口','custom-compatible']]){await choose('imageProviderBtn',label);await check('image-preset-'+value,true);await click('#imageFetchModelsBtn');await both(p=>p.waitForSelector('#viChoiceModal.open'));await check('image-models-'+value);await click('#viChoiceCancel');await click('#imageTestBtn');await both(p=>p.waitForFunction(()=>!document.getElementById('imageTestBtn').disabled));await check('image-generation-'+value,true);}
await click('#imageRegenerateBtn');await both(p=>p.waitForFunction(()=>!document.getElementById('imageTestBtn').disabled));await check('image-regenerate');await click('#imageSaveBtn');
await click('#voiceImageBackBtn');await click('#settingVoiceAi');await check('voice-image-reopen',true);
await both(async p=>{await p.reload({waitUntil:'load'});await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});await p.clock.runFor(2700)});await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingVoiceAi');await check('voice-image-reload',true);
if(JSON.stringify(requests[0])!==JSON.stringify(requests[1]))throw Error('Voice/image protocol requests differ');summary.requestCount=requests[0].length;
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/voice-image-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/voice-image-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
