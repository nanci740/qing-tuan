import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4191,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4191')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4191/'+(i===0?'original.html':''),{waitUntil:'load'});
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
await check('editor-initial',true);await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await both(p=>p.evaluate(()=>window.smallphoneOpenChatApp()));await click('#chatAddCharacterBtn');await check('editor-new-profile',true);
await both(p=>p.locator('[data-field="name"]').fill('林青'));await both(p=>p.locator('[data-field="nickname"]').fill('小青'));await both(p=>p.locator('[data-field="birthday"]').fill('09.21'));await both(p=>p.locator('[data-field="constellation"]').fill('处女座'));await both(p=>p.locator('[data-field="relationship"]').fill('旅伴'));await both(p=>p.locator('[data-field="mbti"]').fill('INFJ'));await both(p=>p.locator('[data-field="quote"]').fill('慢慢走，别着急。'));await check('editor-profile-fields',true);
await both(async p=>{const field=p.locator('[data-field="name"]');await field.evaluate(el=>{el.setSelectionRange(1,1);});await field.pressSequentially('·');});await check('editor-middle-text-insertion',true);
async function panel(key){await click('[data-cc-panel="'+key+'"]');}
await panel('appearance');await both(p=>p.locator('[data-field="appearanceText"]').fill('白发\n青色眼睛\n<衣服>&细节'));await check('editor-appearance-multiline',true);
await panel('personality');await both(p=>p.locator('.cc-tag[data-tag="温柔"]').click());await check('editor-select-tag',true);await both(p=>p.locator('.cc-tag[data-tag="温柔"]').click());await check('editor-deselect-tag',true);
await both(p=>p.locator('.cc-tag-input').fill('  茶 & <花>  '));await both(p=>p.locator('.cc-tag-input').press('Enter'));await check('editor-custom-tag-enter',true);
await both(p=>p.locator('.cc-tag-input').fill('茶 & <花>'));await both(p=>p.locator('.cc-tag-add-btn').click());await check('editor-duplicate-custom-tag',true);
await both(p=>p.locator('.cc-tag-input').fill('温柔'));await both(p=>p.locator('.cc-tag-add-btn').click());await check('editor-suggested-tag-custom',true);
await both(p=>p.locator('[data-tag-del="茶 & <花>"]').click());await check('editor-delete-custom-tag',true);await both(p=>p.locator('.cc-tag-input').fill('    '));await both(p=>p.locator('.cc-tag-add-btn').click());await check('editor-empty-tag-ignored',true);
await panel('speech');await both(p=>p.locator('[data-field="speechHabitsText"]').fill('轻声\n不着急'));await check('editor-speech',true);
await panel('styles');await both(p=>p.locator('[data-field="onlineStyle"]').fill('短句\n慢回复'));await both(p=>p.locator('[data-field="offlineStyle"]').fill('牵手散步'));await check('editor-online-offline',true);
await panel('network');await check('editor-empty-network',true);await both(p=>p.locator('.cc-rel-add').click());await check('editor-add-relation',true);await both(p=>p.locator('[data-rel-field="targetName"]').fill('旧友'));await both(p=>p.locator('[data-rel-field="relationType"]').fill('朋友'));await both(p=>p.locator('[data-rel-field="note"]').fill('记得一起喝茶'));await check('editor-edit-relation',true);
await both(p=>p.clock.runFor(40));await both(p=>p.locator('.cc-rel-add').click());await check('editor-relation-rebuild-retains-edits',true);await both(p=>p.locator('.cc-rel-del').last().click());await check('editor-delete-relation',true);
await panel('favorites');await both(p=>p.locator('[data-field="favoriteThings"]').fill('清茶'));await both(p=>p.locator('[data-field="tokenItem"]').fill('旧钥匙'));await both(p=>p.locator('[data-field="dislikes"]').fill('噪声'));await check('editor-favorites',true);
await panel('memories');await both(p=>p.locator('[data-field="memoriesText"]').fill('雨天见面\n约好再来'));await check('editor-memories',true);await panel('other');await both(p=>p.locator('[data-field="otherSettingsText"]').fill('另外一个世界'));await check('editor-other',true);await panel('secret');await both(p=>p.locator('[data-field="secretMemo"]').fill('你不知道的小秘密'));await check('editor-secret',true);
await both(p=>p.clock.runFor(400));await check('editor-draft-autosave',true);await click('.cc-save');await check('editor-old-save-adapter',true);await click('#chatAddCharacterBtn');await panel('network');await check('editor-second-draft-quick-links',true);await both(p=>p.locator('[data-field="name"]').evaluate(el=>{el.value='朋友二';el.dispatchEvent(new Event('input',{bubbles:true}));}));
// Playwright fill 发出真实输入事件；不通过手动赋值绕过 React 输入追踪。
await panel('profile');await both(p=>p.locator('[data-field="name"]').fill('朋友二'));await panel('network');await both(p=>p.locator('.cc-chip').first().click());await check('editor-quick-linked-relation',true);await click('.cc-save');await click('#chatAddCharacterBtn');await click('.cc-switch');await check('editor-record-menu',true);await click('[data-card-index="0"]');await check('editor-restored-first-record',true);await panel('network');await check('editor-restored-relations',true);
await panel('personality');await both(p=>p.locator('.cc-tag-input').fill('尚未添加'));await click('.cc-switch');await click('[data-card-index="1"]');await panel('personality');await check('editor-tag-input-retains-switch',true);
await both(async p=>{await p.reload({waitUntil:'load'});await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});await p.clock.runFor(2700)});await click('#splash-screen');await both(p=>p.clock.runFor(700));await both(p=>p.evaluate(()=>window.smallphoneOpenChatApp()));await click('#chatAddCharacterBtn');await click('.cc-switch');await click('[data-card-index="0"]');await panel('network');await check('editor-reload-record-relations',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/character-editor-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/character-editor-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
