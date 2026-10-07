import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4179,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4179')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    let blobCounter=0; URL.createObjectURL=()=> 'blob:http://127.0.0.1:4179/mock-'+(++blobCounter); URL.revokeObjectURL=()=>{};
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
 await page.goto('http://127.0.0.1:4179/'+(i===0?'original.html':''),{waitUntil:'load'});
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
  const children=node.matches('#mcpDescriptionInput') ? [] : [...node.childNodes].map(normalize).filter(Boolean);for(let i=children.length-1;i>0;i--)if(children[i][0]==='text'&&children[i-1][0]==='text'){children[i-1][1]+=children[i][1];children.splice(i,1);}return [node.tagName,attrs,children];
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
await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingMusic');await check('music-initial',true);await both(p=>p.clock.setFixedTime(new Date('2026-10-06T02:16:30+08:00')));
await click('#musicToggleUrlBtn');await both(p=>p.locator('#musicUrlInput').fill('invalid'));await click('#musicAddUrlBtn');await check('music-url-validation',true);
let musicIdSequence=0;
async function addUrl(name){musicIdSequence++;await both(p=>p.clock.setFixedTime(new Date(1791233790000+musicIdSequence*1000)));await both(p=>p.locator('#musicUrlInput').fill('http://127.0.0.1:4179/'+name+'.mp3'));await realClick('#musicAddUrlBtn')}
await addUrl('first');await check('music-first-url',true);
await click('#musicToggleUrlBtn');await addUrl('second');await check('music-second-url',true);
await click('#musicToggleUrlBtn');await addUrl('third');await check('music-third-url',true);
await click('#musicToggleUrlBtn');await addUrl('fourth');await check('music-three-track-limit',true);await click('#musicToggleUrlBtn');
await click('[data-mode="single"]');await check('music-single-mode',true);await click('#musicAutoPlaySwitch');await click('#musicShowNotesSwitch');await check('music-switches-persisted',true);
await both(p=>p.locator('#musicTitleInput').fill('编辑第三首'));await click('#musicSaveMetaBtn');await check('music-edit-track-meta',true);
await click('.music-track-item:nth-child(2)');await check('music-select-second',true);
await both(p=>p.locator('#musicTitleInput').fill('第二首改名'));await click('#musicSaveMetaBtn');await check('music-current-title-updated',true);
const avatar=await pages[0].evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=480;c.getContext('2d').fillRect(0,0,640,480);return c.toDataURL().split(',')[1]});
await both(async p=>{await p.locator('#musicCoverInput').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:Buffer.from(avatar,'base64')});await p.waitForFunction(()=>document.querySelector('#musicCoverPreview img')?.naturalWidth>0)});await check('music-cover-draft',true);await click('#musicSaveMetaBtn');await check('music-cover-saved',true);await click('#musicRemoveCoverBtn');await check('music-cover-removed-draft',true);await click('#musicSaveMetaBtn');await check('music-cover-removal-saved',true);
// Drag uses actual pointer and the row bounds; original labels update only after release.
await both(async p=>{const handle=await p.locator('.music-track-item:nth-child(3) .music-track-drag').boundingBox();const first=await p.locator('.music-track-item:nth-child(1)').boundingBox();await p.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await p.mouse.down();await p.mouse.move(handle.x+handle.width/2,first.y+4);});await check('music-drag-live',true);await both(p=>p.mouse.up());await check('music-order-saved',true);
await realClick('#musicBackBtn');await realClick('#settingsBackBtn');await click('#playBtn');await check('music-real-player-play',true);await click('#playBtn');await check('music-real-player-pause',true);await click('#nextBtn');await check('music-real-player-next',true);await click('#prevBtn');await check('music-real-player-prev',true);
await both(p=>p.locator('#progressBarBg').click({position:{x:50,y:2}}));await check('music-real-audio-seek',true);
await click('#navSettingsBtn');await click('#settingMusic');await click('[data-mode="single"]');await both(p=>p.evaluate(()=>document.getElementById('musicAudio').dispatchEvent(new Event('ended'))));await check('music-single-ended-replay');await click('[data-mode="list"]');await both(p=>p.evaluate(()=>document.getElementById('musicAudio').dispatchEvent(new Event('ended'))));await check('music-list-ended-next');await click('[data-mode="random"]');await both(p=>p.evaluate(()=>document.getElementById('musicAudio').dispatchEvent(new Event('ended'))));await check('music-random-ended-next');
await click('.music-track-item:nth-child(1) .music-track-delete');await check('music-delete-track',true);
const wav=Buffer.alloc(44+16000);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
await both(async p=>{await p.locator('#musicFileInput').setInputFiles({name:'local.wav',mimeType:'audio/wav',buffer:wav});await p.waitForFunction(()=>document.querySelectorAll('.music-track-item').length===3 && document.getElementById('musicTitleInput').value==='local')});await check('music-add-local-file',true);
await click('.music-track-item:nth-child(3)');await both(p=>p.waitForFunction(()=>document.getElementById('musicAudio').getAttribute('src')?.startsWith('blob:')));await check('music-load-local-file',true);
await click('.music-track-item:nth-child(3) .music-track-edit');await both(async p=>{await p.locator('#musicFileInput').setInputFiles({name:'替换.wav',mimeType:'audio/wav',buffer:wav});await p.waitForFunction(()=>document.getElementById('musicTitleInput').value==='替换')});await check('music-replace-file',true);
const records=[];await both(async p=>{records.push(await p.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('smallphone_music_db',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});const list=await new Promise(resolve=>{const req=db.transaction('tracks','readonly').objectStore('tracks').getAll();req.onsuccess=()=>resolve(req.result)});db.close();return Promise.all(list.map(async record=>({id:record.id,type:record.blob.type,bytes:[...new Uint8Array(await record.blob.arrayBuffer())]})))}));});if(JSON.stringify(records[0])!==JSON.stringify(records[1]))throw Error('Music IndexedDB blobs differ');summary.indexedDbBlobsEqual=true;
await both(async p=>{await p.reload({waitUntil:'load'});await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});await p.clock.runFor(2700)});await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingMusic');await check('music-reload-restored',true);
summary.errors=errors;if(errors.some(items=>items.length))throw Error('Application page errors');fs.writeFileSync(base+'/docs/music-native-validation-results.json',JSON.stringify(summary,null,2));console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/music-native-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
