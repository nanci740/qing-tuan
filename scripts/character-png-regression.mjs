import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
import ts from 'typescript';
const pngModule=ts.transpileModule(fs.readFileSync(base+'/src/utils/characterPng.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const originalHelpers=fs.readFileSync(base+'/reference/dossier-png-tools.js','utf8');
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/test-png.js'){res.setHeader('Content-Type','application/javascript');res.end(pngModule);return;}const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4190,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4190')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4190/'+(i===0?'original.html':''),{waitUntil:'load'});
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
// 原始工具只供测试建立固定 PNG，不进入迁移产品。
await pages[0].evaluate(source=>{window.__png=new Function(source+'\nreturn {readDossierFromPng,renderDossierPhotoPng,attachDossierToPng,pngChunk,makeITXtChunk,makeTextChunk,encodeBase64Utf8};')();},originalHelpers);
await pages[1].evaluate(async()=>{window.__png=await import('/test-png.js');});
const fixtures=await pages[0].evaluate(async()=>{
 const h=window.__png,c=document.createElement('canvas');c.width=6;c.height=4;const ctx=c.getContext('2d');ctx.fillStyle='#5295ae';ctx.fillRect(0,0,6,4);ctx.fillStyle='#eeada2';ctx.fillRect(2,1,2,2);const photo=c.toDataURL('image/png');const base=new Uint8Array(await(await fetch(photo)).arrayBuffer());
 const card={name:'林/青:测试',nickname:'阿青',birthday:'09.21',constellation:'处女座',relationship:'旅伴',mbti:'INFJ',quote:'一同行走',appearanceText:'白发\n绿眼',speechHabitsText:'慢慢说话',onlineStyle:'短句',offlineStyle:'安静',memoriesText:'雨天见面',otherSettingsText:'其他世界',secretMemo:'私密备忘',favoriteThings:'茶',tokenItem:'旧钥匙',dislikes:'噪声',selectedTags:['温柔','自定义'],customTags:['自定义'],relationships:[{id:'r1',targetName:'朋友',note:'同乡'}],photoUrl:photo,photoPositionX:25,photoPositionY:70,isStamped:false,stampDate:'2024.03.02',stampStyle:'confidential',worldbook:{entries:[{name:'未知世界书',content:'不丢字段'}]},unknown:{nested:['额外资料',42]}};
 const insert=chunks=>Array.from(new Uint8Array([...base.slice(0,-12),...chunks.flatMap(a=>Array.from(a)),...base.slice(-12)]));
 const privateChunk=value=>h.pngChunk('spCH',new TextEncoder().encode(JSON.stringify(value)));
 const portable=value=>h.makeITXtChunk('qingtuan-character',JSON.stringify(value));
 const external=(key,value)=>h.makeTextChunk(key,h.encodeBase64Utf8(JSON.stringify(value)));
 const wanwan={spec:'chara_card_v3',data:{name:'兼容角色',description:'name: 卡片名\nbirth: 09.21（处女座）\nage: 25\nheight: 180\nCore_Identity: |\n  核心身份\nPhysical_Manifestation: |\n  外貌说明\nBehavioral_Blueprint: |\n  举止风格\nspeech_style: |\n  轻声\nfamily: |\n  家族来历\nDynamic_Interaction_Engine: |\n  关系网\nlikes: |\n  清茶\nunknown_setting: |\n  未知设定\nother_settings: |\n  显式其他',personality:'冷静',scenario:'场景',first_mes:'开场保留到其他设定',mes_example:'例句',system_prompt:'系统',post_history_instructions:'历史',alternate_greetings:['招呼'],group_only_greetings:['群招呼'],character_book:{entries:[{keys:['天气'],content:'世界书内容'}]},creator_notes_multilingual:{zh:'作者中文'},creator_notes:'作者备忘',tags:['自定义']}};
 const cases=[
 ['private-full',insert([privateChunk({app:'qingtuan-phone',dossier:card})])],
 ['portable-aliases',insert([portable({character:{characterName:'别名卡',alias:'别称',birthDate:'10.02',zodiac:'天秤座',relation:'朋友',MBTI:'INTJ',signature:'签名',persona:'外貌',speechStyle:'口吻',online:'线上',offline:'线下',backstory:'记忆',extraSettings:'额外',note:'私密',likes:'茶',tags:['标签'],avatar:photo,photoPositionX:35,photoPositionY:65}})])],
 ['portable-empty-fields',insert([portable({character:{name:'空字段'}})])],
 ['portable-data-wrapper',insert([portable({data:{name:'数据包',tags:['数据'],photo}})])],
 ['v3-wanwan-extra',insert([external('ccv3',wanwan)])],
 ['v2-compatible',insert([external('chara',{...wanwan,spec:'chara_card_v2'})])],
 ['v3-qingtuan-extension',insert([external('ccv3',{spec:'chara_card_v3',data:{name:'忽略名字',extensions:{qingtuan:{character:{name:'扩展角色',appearance:'扩展外貌',photo}}}}})])],
 ['priority-private',insert([portable({character:{name:'通用'}}),external('ccv3',wanwan),privateChunk({app:'qingtuan-phone',dossier:card})])],
 ['priority-portable',insert([external('ccv3',wanwan),portable({character:{name:'通用优先'}})])],
 ['priority-v3',insert([external('chara',{data:{name:'V2'}}),external('ccv3',wanwan)])],
 ['invalid-base64-fallback',insert([h.makeTextChunk('ccv3','%%%'),external('chara',wanwan)])],
 ['wrong-private-app-fallback',insert([privateChunk({app:'other',dossier:card}),portable({name:'后备'})])],
 ['invalid-private-json',insert([h.pngChunk('spCH',new TextEncoder().encode('{')),portable({name:'不可后备'})])],
 ['invalid-portable-json',insert([h.makeITXtChunk('qingtuan-character','{'),external('ccv3',wanwan)])],
 ['no-card',Array.from(base)],['not-png',[1,2,3]],['truncated',insert([portable({name:'截断'})]).slice(0,28)]
 ];
 return {card,photo,base:Array.from(base),cases};
});
for(const [label,bytes] of fixtures.cases){const results=await Promise.all(pages.map(p=>p.evaluate(bytes=>{try{return {value:JSON.stringify(window.__png.readDossierFromPng(new Uint8Array(bytes).buffer))}}catch(e){return {error:e.message}}},bytes)));const equal=JSON.stringify(results[0])===JSON.stringify(results[1]);summary.checks.push({label:'png-codec-'+label,differences:equal?[]:results,codecEqual:equal});if(!equal)throw Error('Codec mismatch '+label);}
const exports=await Promise.all(pages.map(p=>p.evaluate(async({base,card})=>Array.from(new Uint8Array(await(await window.__png.attachDossierToPng(new Blob([new Uint8Array(base)],{type:'image/png'}),card)).arrayBuffer())),fixtures)));
if(JSON.stringify(exports[0])!==JSON.stringify(exports[1]))throw Error('Export metadata mismatch');
summary.checks.push({label:'png-exact-chunks-crc-and-payload',differences:[],exportBytesEqual:true});
const rendered=await Promise.all(pages.map(p=>p.evaluate(async card=>Array.from(new Uint8Array(await(await window.__png.renderDossierPhotoPng(card)).arrayBuffer())),fixtures.card)));
if(JSON.stringify(rendered[0])!==JSON.stringify(rendered[1]))throw Error('Photo pixels or metadata mismatch');
summary.checks.push({label:'png-full-photo-render',differences:[],exportBytesEqual:true});
await check('png-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await both(p=>p.evaluate(()=>window.smallphoneOpenChatApp()));await click('#chatAddCharacterBtn');await check('png-empty-editor',true);
await both(async p=>{const wait=p.waitForEvent('filechooser');await p.locator('[data-cc-import]').click();const chooser=await wait;await chooser.setFiles([]);});await check('png-react-import-button-filechooser',true);

await click('[data-cc-export]');await check('png-export-name-required',true);await both(p=>p.locator('[data-field="name"]').fill('无头像'));await click('[data-cc-export]');await check('png-export-photo-required',true);await both(p=>p.locator('[data-field="name"]').fill(''));
async function importFixture(bytes){await both(async p=>{await p.locator('.cc-import-input').setInputFiles({name:'role.png',mimeType:'image/png',buffer:Buffer.from(bytes)});await p.waitForFunction(()=>document.querySelector('#saveToast')?.textContent?.includes('已从 PNG 导入')||document.querySelector('#saveToast')?.textContent?.includes('PNG'));});await both(p=>p.clock.runFor(400));}
await importFixture(fixtures.cases.find(c=>c[0]==='private-full')[1]);await check('png-private-import-replaces-empty-draft',true);
const downloads=[];for(const p of pages){const wait=p.waitForEvent('download');await p.locator('[data-cc-export]').click();const download=await wait;const stream=await download.createReadStream();const parts=[];for await(const part of stream)parts.push(part);downloads.push({name:download.suggestedFilename(),bytes:Buffer.concat(parts)});await p.clock.runFor(32);}
if(downloads[0].name!==downloads[1].name||!downloads[0].bytes.equals(downloads[1].bytes))throw Error('UI export mismatch');
summary.checks.push({label:'png-ui-download-filename-and-bytes',differences:[],downloadFilename:downloads[0].name,exportBytesEqual:true});await check('png-after-export',true);
await click('.cc-new');await both(p=>p.locator('[data-field="name"]').fill('保留的草稿'));await importFixture(fixtures.cases.find(c=>c[0]==='v3-wanwan-extra')[1]);await check('png-v3-import-keeps-nonempty-draft',true);
await click('[data-cc-panel="other"]');await check('png-v3-extra-settings-worldbook',true);await click('[data-cc-panel="secret"]');await check('png-v3-author-notes',true);
await importFixture(fixtures.cases.find(c=>c[0]==='portable-aliases')[1]);await check('png-portable-import',true);
await importFixture(fixtures.base);await check('png-invalid-import-preserves-records',true);
await both(p=>p.locator('.cc-import-input').setInputFiles([]));await check('png-cancel-import',true);
await both(async p=>{await p.reload({waitUntil:'load'});await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});await p.clock.runFor(2700)});await click('#splash-screen');await both(p=>p.clock.runFor(700));await both(p=>p.evaluate(()=>window.smallphoneOpenChatApp()));await click('#chatAddCharacterBtn');await check('png-reload-editor',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/character-png-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/character-png-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
