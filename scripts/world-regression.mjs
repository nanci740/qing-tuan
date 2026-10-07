import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4186,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4186')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4186/'+(i===0?'original.html':''),{waitUntil:'load'});
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
   if(a.name==='selected' && node.closest('#apiSettingsPage,#voiceImageSettingsPage,#worldPage'))continue;
   if(a.name==='data-qt-token'||a.name==='onerror'||a.name==='onload')continue;
   if((a.name==='value'||a.name==='checked')&&node.closest('#worldPage'))continue;
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
  const childNodes=(node.tagName==='TEXTAREA'&&node.closest('#worldPage')?[]:[...node.childNodes]).map(normalize).filter(Boolean);for(let i=childNodes.length-1;i>0;i--)if(childNodes[i][0]==='text'&&childNodes[i-1][0]==='text'){childNodes[i-1][1]+=childNodes[i][1];childNodes.splice(i,1);}return [node.tagName,attrs,childNodes];
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
 if(diffs.length){fs.writeFileSync(base+'/work/world-mismatch-snapshots.json',JSON.stringify({a,b}));throw new Error('Mismatch at '+label);}
}
async function both(action){for(const p of pages){await action(p);await p.clock.runFor(32)}}
async function click(selector){await both(p=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click()},selector))}
await check('world-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await both(p=>p.locator('.app-item[data-app-icon-key="world"]').click());await check('world-empty',true);
async function fill(id,value){await both(p=>p.locator('#'+id).fill(value));}
async function range(id,value){await both(p=>p.locator('#'+id).evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));},value));}
async function realClick(selector){await both(p=>p.locator(selector).first().click());}
async function picker(id,value){await realClick(`[data-world-select-for="${id}"]`);await check('world-picker-'+id+'-open',true);await realClick(`[data-value="${value}"]`);await realClick('#worldPickerConfirm');}
await realClick('#worldTopAction');await check('world-menu',true);await both(p=>p.keyboard.press('Escape'));await check('world-menu-escape');await realClick('#worldTopAction');await realClick('#worldMenuNew');await check('world-new-book',true);
await realClick('#wbSave');await check('world-missing-name');await fill('wbName',' 青丘旧事 ');await fill('wbDesc',' 世界书简介 ');await check('world-book-draft',true);await picker('wbBind','all');await realClick('#wbSave');await check('world-book-saved',true);
async function addEntry(name,body){await realClick('#worldTopAction');await fill('weTitle',name);await fill('weContent',body);await fill('weKeys','青丘,月夜');await realClick('#weSave');}
await realClick('#worldTopAction');await realClick('#weSave');await check('world-missing-entry-fields');await fill('weTitle','月夜');await fill('weContent',' 月夜世界设定内容 ');await fill('weKeys','青丘,月夜');await realClick('.world-advanced summary');await check('world-entry-advanced',true);
await picker('weTrigger','always');await picker('weMatch','regex');await picker('wePosition','tail');await picker('weRole','assistant');await range('weProbability',65);await fill('weDepth','0');await fill('weSticky','2');await fill('wePriority','120');await realClick('#weCase');await realClick('#weRecursive');await check('world-entry-advanced-values',true);await realClick('#weSave');await check('world-entry-saved',true);
await both(p=>p.clock.runFor(1));await addEntry('山林','山林设定');await both(p=>p.clock.runFor(1));await addEntry('故人','故人设定');await check('world-three-entries',true);
await fill('worldEntrySearch','月夜');await check('world-search',true);await realClick('#worldEntryClear');await realClick('[data-world-entry-filter="disabled"]');await check('world-disabled-filter',true);await realClick('[data-world-entry-filter="all"]');await both(p=>p.locator('[data-entry-toggle]').nth(1).click());await realClick('[data-world-entry-filter="disabled"]');await check('world-disabled-filter-item',true);await realClick('[data-world-entry-filter="all"]');
await both(p=>p.locator('[data-copy-entry]').nth(0).click());await check('world-copy-entry',true);
await both(async p=>{const row=p.locator('[data-world-entry-card]').first();const r=await row.boundingBox();const last=await p.locator('[data-world-entry-card]').last().boundingBox();await p.mouse.move(r.x+r.width*.5,r.y+35);await p.mouse.down();await p.clock.runFor(420);await p.mouse.move(r.x+r.width*.5,last.y+last.height*.8);});await check('world-sort-drag',true);await both(p=>p.mouse.up());await both(p=>p.clock.runFor(700));await check('world-sort-finished',true);
await both(p=>p.locator('[data-open-entry]').first().click());await check('world-edit-entry',true);await realClick('#weDelete');await check('world-delete-entry-dialog',true);await realClick('[data-world-confirm="cancel"]');await both(p=>p.clock.runFor(200));await realClick('#weDelete');await realClick('[data-world-confirm="ok"]');await both(p=>p.clock.runFor(200));await check('world-entry-deleted',true);
await realClick('#worldEditBook');await check('world-edit-book',true);
const cover=await pages[0].evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=640;c.getContext('2d').fillRect(0,0,900,640);return c.toDataURL().split(',')[1]});await both(p=>p.locator('#wbCoverFile').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:Buffer.from(cover,'base64')}));await both(p=>p.waitForFunction(()=>document.querySelector('#wbCoverThumb img')));await check('world-cover-upload',true);await realClick('#wbSave');await realClick('#worldBack');await check('world-shelf-cover',true);
await realClick('#worldTopAction');await realClick('#worldMenuExport');await both(p=>p.clock.runFor(1));await check('world-export');
await both(async p=>{await p.reload({waitUntil:'load'});await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});await p.clock.runFor(2700)});await click('#splash-screen');await both(p=>p.clock.runFor(700));await realClick('.app-item[data-app-icon-key="world"]');await check('world-reload',true);
const importData={books:[{name:'导入书',description:'导入说明',entries:[{title:'导入条目',content:'导入内容',trigger:'always'}]}]};await both(p=>p.locator('#worldImportJsonFile').setInputFiles({name:'book.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(importData))}));await both(p=>p.waitForSelector('.world-json-import-overlay.open'));await check('world-import-dialog',true);await realClick('[data-world-import="append"]');await both(p=>p.clock.runFor(200));await check('world-import-appended',true);
await both(p=>p.locator('#worldImportJsonFile').setInputFiles({name:'book.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(importData))}));await both(p=>p.waitForSelector('.world-json-import-overlay.open'));await realClick('[data-world-import="replace"]');await both(p=>p.clock.runFor(32));await check('world-overwrite-dialog',true);await realClick('[data-world-confirm="ok"]');await both(p=>p.clock.runFor(200));await check('world-import-replaced',true);
await both(p=>p.locator('#worldImportJsonFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')}));await check('world-import-invalid');
await realClick('[data-open-book]');await realClick('#worldEditBook');await realClick('#wbDelete');await check('world-delete-book-dialog',true);await realClick('[data-world-confirm="ok"]');await both(p=>p.clock.runFor(200));await check('world-book-deleted',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/world-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/world-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
