import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4192,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4192')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4192/'+(i===0?'original.html':''),{waitUntil:'load'});
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
await check('avatar-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await both(p=>p.evaluate(()=>window.smallphoneOpenChatApp()));await click('#chatAddCharacterBtn');await check('avatar-empty-banner',true);
await both(p=>p.locator('[data-field="nickname"]').fill('别称'));await check('avatar-nickname-fallback',true);await both(p=>p.locator('[data-field="name"]').fill('  林青  '));await both(p=>p.locator('[data-field="quote"]').fill('一路同行'));await both(p=>p.locator('[data-field="relationship"]').fill('旅伴'));await both(p=>p.locator('[data-field="mbti"]').fill('INFJ'));await both(p=>p.locator('[data-field="constellation"]').fill('处女座'));await check('avatar-banner-all-fields',true);
await both(p=>p.locator('[data-field="quote"]').fill(''));await both(p=>p.locator('[data-field="mbti"]').fill(''));await check('avatar-banner-hidden-empty-fields',true);
const fixtures=await pages[0].evaluate(()=>{const make=(w,h,color)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,w,h);ctx.fillStyle='#dd99ad';ctx.fillRect(w/4,h/4,w/2,h/2);return c.toDataURL('image/png').split(',')[1];};return {wide:make(640,180,'#aacccc'),tall:make(160,720,'#badaee'),small:make(32,24,'#ddeebb')};});
async function upload(key,label){await both(async p=>{const before=await p.locator('.cc-avatar img').getAttribute('src');await p.locator('.cc-avatar-input').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from(fixtures[key],'base64')});await p.waitForFunction(before=>{const img=document.querySelector('.cc-avatar img');return img.src&&img.getAttribute('src')!==before&&img.complete&&img.naturalWidth>0;},before);await p.clock.runFor(400);});await check(label,true);}
await both(async p=>{const wait=p.waitForEvent('filechooser');await p.locator('.cc-avatar').click();const chooser=await wait;await chooser.setFiles([]);});await check('avatar-react-filechooser-cancel',true);
await upload('wide','avatar-wide-compression');await both(p=>p.evaluate(()=>{const img=document.querySelector('.cc-avatar img');if(img.naturalWidth!==320||img.naturalHeight!==90)throw Error('Incorrect wide avatar dimensions');}));
await upload('tall','avatar-tall-compression');await both(p=>p.evaluate(()=>{const img=document.querySelector('.cc-avatar img');if(img.naturalWidth!==71||img.naturalHeight!==320)throw Error('Incorrect tall avatar dimensions');}));await upload('small','avatar-small-no-upscale');
await both(p=>p.evaluate(()=>{window.__originalToDataURL=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=function(type,quality){if(type==='image/webp')return window.__originalToDataURL.call(this,'image/png');return window.__originalToDataURL.call(this,type,quality);};}));await upload('wide','avatar-jpeg-browser-fallback');await both(p=>p.evaluate(()=>{HTMLCanvasElement.prototype.toDataURL=window.__originalToDataURL;if(!document.querySelector('.cc-avatar img').src.startsWith('data:image/jpeg'))throw Error('Missing JPEG fallback');}));
await both(p=>p.evaluate(()=>{window.__encodeCalls=[];HTMLCanvasElement.prototype.toDataURL=function(type,quality){window.__encodeCalls.push([type,quality]);if(type==='image/webp')return 'data:image/webp;base64,'+'A'.repeat(220010);return window.__originalToDataURL.call(this,type,quality);};}));await upload('tall','avatar-large-payload-jpeg-fallback');await both(p=>p.evaluate(()=>{HTMLCanvasElement.prototype.toDataURL=window.__originalToDataURL;if(JSON.stringify(window.__encodeCalls)!==JSON.stringify([['image/webp',.78],['image/jpeg',.62]]))throw Error('Incorrect large avatar fallback');}));
await both(async p=>{await p.locator('.cc-avatar-input').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await p.waitForFunction(()=>document.querySelector('#saveToast').textContent==='头像读取失败，请换一张图片');});await check('avatar-corrupt-file-preserves-image',true);
await both(p=>p.locator('.cc-avatar-input').setInputFiles({name:'not-image.txt',mimeType:'text/plain',buffer:Buffer.from('text')}));await check('avatar-nonimage-ignored',true);
await upload('wide','avatar-replace-after-error');await click('.cc-save');await check('avatar-save-sync-chat-thumbnail',true);await click('.chat-generated-thread');await check('avatar-sync-room-and-sidebar',true);
await both(async p=>{await p.reload({waitUntil:'load'});await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});await p.clock.runFor(2700)});await click('#splash-screen');await both(p=>p.clock.runFor(700));await both(p=>p.evaluate(()=>window.smallphoneOpenChatApp()));await click('.chat-generated-thread');await check('avatar-reload-chat-photo',true);await both(p=>p.evaluate(()=>window.smallphoneOpenCharacterCard('001')));await check('avatar-reload-saved-banner',true);await click('.cc-new');await check('avatar-new-record-clears-photo',true);await click('.cc-switch');await click('[data-card-index="0"]');await check('avatar-switch-restores-photo',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/character-avatar-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/character-avatar-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
