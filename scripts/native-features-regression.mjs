import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4174')?route.continue():route.abort());
 await page.addInitScript(()=>{
    window.__backgroundCalls=[];
    window.__permissionChoice='denied';
    class TestNotification {
      static permission='default';
      static async requestPermission() { return this.permission=window.__permissionChoice; }
      constructor(title,options) { window.__backgroundCalls.push(['notification',title,options]); }
    }
    Object.defineProperty(window,'Notification',{configurable:true,value:TestNotification});
    Object.defineProperty(navigator,'vibrate',{configurable:true,value:value=>{window.__backgroundCalls.push(['vibrate',value]);return true;}});
    Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{async request(type){window.__backgroundCalls.push(['wakeLock',type]);const sentinel=new EventTarget();sentinel.release=async()=>{window.__backgroundCalls.push(['release']);sentinel.dispatchEvent(new Event('release'));};return sentinel;}}});
    HTMLMediaElement.prototype.play=function(){window.__backgroundCalls.push(['play',this.id]);return Promise.resolve();};
    HTMLMediaElement.prototype.pause=function(){window.__backgroundCalls.push(['pause',this.id]);};
    if (navigator.serviceWorker) navigator.serviceWorker.getRegistration=async()=>undefined;
    Math.random=()=>0.37;
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4174/'+(i===0?'original.html':''),{waitUntil:'load'});
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
   if(a.name==='value'&&node.closest('.cr-my-menu'))continue;
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
   }else if(node.id==='smallphoneBackgroundKeepAliveAudio'&&a.name==='src')attrs.push(['src','blob:quiet-wav']);else attrs.push([a.name,a.value]);
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
 if(diffs.length){fs.writeFileSync(base+'/work/native-features-final-mismatch.json',JSON.stringify({a,b}));throw new Error('Mismatch at '+label);}
}
async function both(action){for(const p of pages){await action(p);await p.clock.runFor(32)}}
async function click(selector){await both(p=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click()},selector))}
await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));
await click('#navSettingsBtn');await click('#settingBackground');await check('background-defaults',true);
await click('#backgroundReplyNotification');await check('notification-permission-denied',true);
await both(p=>p.evaluate(()=>{Notification.permission='default';window.__permissionChoice='granted';}));
await click('#backgroundReplyNotification');await check('notification-permission-granted',true);
await click('#backgroundNotificationSound');await check('notification-sound-off',true);
await click('#backgroundNotificationVibration');await check('notification-vibration-off');
await click('#backgroundNotificationVibration');await check('notification-vibration-on');
await click('#backgroundActivityEnabled');await check('keepalive-start',true);
await click('#backgroundScreenAwake');await check('screen-awake-start',true);
await click('#backgroundScreenAwake');await check('screen-awake-stop');
await click('#backgroundActivityEnabled');await check('keepalive-stop',true);
for(const [i,p] of pages.entries()) {
 await p.evaluate(i=>{const reply={title:'完成通知',body:'生成已完成',url:location.href,tag:'feature-check'};return i===0?window.smallPhoneBackgroundActivity.notifyReply(reply):window.dispatchEvent(new CustomEvent('qingtuan:notify-reply',{detail:reply}));},i);
}
await both(p=>p.clock.runFor(10));
const serviceCalls=await Promise.all(pages.map(p=>p.evaluate(()=>window.__backgroundCalls.map(x=>x[0]==='notification'?[x[0],x[1],{...x[2],data:{url:'same-local-url'}}]:x))));
if(JSON.stringify(serviceCalls[0])!==JSON.stringify(serviceCalls[1]))throw Error('Background service calls differ: '+JSON.stringify(serviceCalls));
summary.backgroundServiceCalls=serviceCalls[0];
const wavs=await Promise.all(pages.map(p=>p.locator('#smallphoneBackgroundKeepAliveAudio').evaluate(async audio=>Array.from(new Uint8Array(await (await fetch(audio.src)).arrayBuffer())))));
if(JSON.stringify(wavs[0])!==JSON.stringify(wavs[1]))throw Error('Keepalive WAV differs');
summary.quietWavBytes=wavs[0].length;
await click('#backgroundReplyNotification');await check('notification-off',true);
await both(p=>p.evaluate(()=>delete navigator.wakeLock));await click('#backgroundScreenAwake');await check('screen-awake-unsupported',true);
await both(p=>p.evaluate(()=>delete window.Notification));await click('#backgroundReplyNotification');await check('notification-unsupported',true);
await click('#backgroundActivityBackBtn');await click('#settingPersonal');await check('profile-open',true);
await both(p=>p.locator('.pp2-editable-text').nth(0).fill('青团测试'));await check('profile-name-edit',true);
await both(p=>p.locator('.pp2-editable-text').nth(0).press('Enter'));await check('profile-name-blur');
await both(p=>p.locator('.mh-mood-text').fill('今天很开心'));await check('profile-mood-side',true);
await both(p=>p.locator('.mh-mood-text').press('Enter'));await check('profile-mood-side-blur');
await both(p=>p.locator('.pp2-editable-text').nth(4).fill('晴天'));await check('profile-mood-source',true);
await both(p=>p.locator('.pp2-editable-text').nth(4).press('Enter'));await check('profile-mood-source-blur');
await both(p=>p.locator('.pp2-editable-text').nth(0).fill(''));await both(p=>p.locator('.pp2-editable-text').nth(0).press('Enter'));await check('profile-empty-blur',true);
await both(p=>p.locator('.pp2-memo-text').nth(0).fill('第一张便利贴'));await both(p=>p.locator('.pp2-memo-text').nth(0).press('Enter'));await check('profile-memo',true);
await both(p=>p.locator('.pp2-polaroid-caption').fill('我们的回忆'));await both(p=>p.locator('.pp2-polaroid-caption').press('Enter'));await check('profile-caption',true);
await both(p=>p.locator('.pp2-torn-note-text').nth(0).fill('留言一'));await both(p=>p.locator('.pp2-torn-note-text').nth(0).press('Enter'));await both(p=>p.clock.runFor(10));await check('profile-note-next-focus',true);
await both(p=>p.locator('.pp2-torn-note-text').nth(1).fill('留言二'));await both(p=>p.locator('.pp2-torn-note-text').nth(1).press('Enter'));await both(p=>p.clock.runFor(10));await check('profile-note-third-focus');
await both(p=>p.locator('.pp2-torn-note-text').nth(2).fill('留言三'));await both(p=>p.locator('.pp2-torn-note-text').nth(2).press('Enter'));await check('profile-note-complete',true);
const photo=await pages[0].evaluate(()=>{const c=document.createElement('canvas');c.width=1024;c.height=768;c.getContext('2d').fillRect(0,0,1024,768);return c.toDataURL().split(',')[1]});
await both(p=>p.locator('.pp2-polaroid-file').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')}));await both(p=>p.waitForFunction(()=>document.querySelector('.pp2-polaroid-photo').classList.contains('has-photo')));await check('profile-photo-upload',true);
await click('#profileBackBtn');await click('#settingsBackBtn');await click('.home-dot[data-page="1"]');await check('home-page-two',true);
await both(p=>p.evaluate(()=>{localStorage.setItem('smallphone_chat_characters_v1',JSON.stringify([{archiveId:'feature-char',name:'测试角色'}]));localStorage.setItem('smallphone_chat_unread_counts_v1',JSON.stringify({'feature-char':103}));window.dispatchEvent(new CustomEvent('smallphone:reply',{detail:{chatKey:'feature-char',title:'角色通知',body:'一条\n  新消息'}}));}));await check('home-notice-reply',true);
await both(p=>p.evaluate(()=>localStorage.setItem('smallphone_chat_unread_counts_v1','{}')));await both(p=>p.clock.runFor(5000));await check('home-notice-read',true);
await click('.home-dot[data-page="0"]');await check('home-page-one',true);
await both(async p=>{await p.reload({waitUntil:'load'});await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});await p.clock.runFor(2700)});await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingPersonal');await check('profile-restored',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/native-features-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/native-features-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
