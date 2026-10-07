import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {chromium as pw} from 'playwright';import chromium from '@sparticuz/chromium';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');const exe=process.env.CHROMIUM_EXECUTABLE || await chromium.executablePath();fs.chmodSync(exe,0o755);fs.mkdirSync(path.join(base,'docs','screenshots'),{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const file=u.pathname==='/original.html'?base+'/reference/original.html':path.join(base,'dist',u.pathname==='/'?'index.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
await new Promise(resolve=>server.listen(4181,'127.0.0.1',resolve));
const browser=await pw.launch({executablePath:exe,args:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const fixed=new Date('2026-10-06T02:16:25+08:00');const contexts=[];const pages=[];const errors=[[],[]];
const styles=['display','position','width','height','min-width','max-width','min-height','max-height','color','background-color','background-image','background-size','background-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-shadow','text-transform','white-space','overflow','overflow-x','overflow-y','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow','box-sizing','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','opacity','transform','z-index','flex-direction','flex-grow','flex-shrink','flex-basis','align-items','justify-content','gap','grid-template-columns','grid-template-rows','fill','stroke','stroke-width','filter','backdrop-filter','visibility','outline','outline-offset'];
const summary={viewport:{width:390,height:844},externalResources:'blocked identically for both versions; original remote URLs retained',frozenClock:true,checks:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try {
for(let i=0;i<2;i++){
 const ctx=await browser.newContext({viewport:summary.viewport,locale:'zh-CN',timezoneId:'Asia/Taipei'});contexts.push(ctx);const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors[i].push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4181')?route.continue():route.abort());
 await page.addInitScript(()=>{
    Math.random=()=>0.37;
    Object.defineProperty(navigator,'getBattery',{configurable:true,value:async()=>({level:1,charging:true,addEventListener:()=>{}})});
    Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,type:'wifi',effectiveType:'4g',addEventListener:()=>{}}});
  });
 await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+1000));
 await page.goto('http://127.0.0.1:4181/'+(i===0?'original.html':''),{waitUntil:'load'});
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
   if(a.name==='value' && node.closest('#personalProfilePage,#mcpServiceModal,#apiSettingsPage,#apiModelModal,#musicSettingsPage,#themeSettingsPage'))continue;
   if(a.name==='style'){
     const parts=Array.from(node.style).filter(p=>!(node.hasAttribute('data-qt-token')||node.matches('.theme-swatch,.chat-settings-entry-icon'))||!p.startsWith('--')).map(p=>[p,node.style.getPropertyValue(p),node.style.getPropertyPriority(p)]).sort((a,b)=>a[0].localeCompare(b[0]));
     if(parts.length)attrs.push(['style',parts]);
   }else attrs.push([a.name,a.value]);
  }
  attrs.sort((a,b)=>a[0].localeCompare(b[0]));
  return [node.tagName,attrs,[...node.childNodes].map(normalize).filter(Boolean)];
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
await check('appearance-initial',true);
await both(p=>p.clock.runFor(2500));await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingTheme');await check('appearance-open-native',true);
await click('.theme-swatch[data-color="#EBC0CA"]');await check('appearance-swatch',true);
await both(p=>p.locator('#themeHexInput').fill('no'));await click('#applyThemeHexBtn');await check('appearance-invalid-hex');
await both(p=>p.locator('#themeHexInput').fill('A1B2C3'));await both(p=>p.locator('#themeHexInput').press('Enter'));await check('appearance-custom-hex',true);
await both(p=>p.locator('#themeHexInput').fill(''));await both(p=>p.locator('#themeHexInput').blur());await check('appearance-empty-hex-blur');
await click('#themeColorPickerWrap');await check('appearance-modal-open',true);
async function range(id,value){await both(p=>p.locator('#'+id).evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));},value));}
await range('themeHueRange',247);await range('themeSaturationRange',43);await range('themeLightnessRange',88);await check('appearance-modal-hsv',true);
await click('#cancelThemeColorModal');await check('appearance-modal-cancel',true);
await click('#themeCustomPickerBtn');await both(p=>p.locator('#themeColorModalHexInput').fill('zzzz'));await click('#applyThemeColorModalHexBtn');await check('appearance-modal-invalid-hex');
await both(p=>p.locator('#themeColorModalHexInput').fill('9a6ec2'));await both(p=>p.locator('#themeColorModalHexInput').press('Enter'));await check('appearance-modal-hex-preview',true);
await click('#applyThemeColorModalBtn');await check('appearance-modal-confirm',true);
await click('#themeCustomPickerBtn');await range('themeHueRange',60);await click('#themeColorModalBackdrop');await check('appearance-modal-backdrop');
await click('#themeCustomPickerBtn');await click('#closeThemeColorModal');await click('#resetThemeColor');await check('appearance-reset-color',true);
await range('glassStrengthRange',83);await check('appearance-glass',true);
await click('[data-splash-mode="daily"]');await check('appearance-splash-daily');await click('[data-splash-mode="off"]');await check('appearance-splash-off');await click('[data-splash-mode="always"]');
const image=await pages[0].evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1400;const ctx=canvas.getContext('2d');ctx.fillStyle='#6798ab';ctx.fillRect(0,0,2000,1400);ctx.fillStyle='#f1cd66';ctx.fillRect(300,300,700,500);return canvas.toDataURL().split(',')[1];});
await both(p=>p.locator('#wallpaperFileInput').setInputFiles({name:'wall.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')}));await both(p=>p.waitForFunction(()=>localStorage.getItem('smallphone_main_wallpaper')));await check('appearance-wallpaper-upload',true);
await range('wallpaperOpacity',37);await check('appearance-wallpaper-opacity',true);
await both(p=>p.locator('#wallpaperFileInput').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('bad')}));await check('appearance-wallpaper-invalid');
await click('.theme-icon-choice[data-icon-kind="app"][data-icon-key="world"] button');await both(p=>p.locator('#customIconFileInput').setInputFiles({name:'icon.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')}));await both(p=>p.waitForFunction(()=>document.querySelector('.theme-icon-choice[data-icon-kind="app"][data-icon-key="world"] img')));await check('appearance-icon-draft',true);
await click('.theme-icon-choice[data-icon-kind="dock"][data-icon-key="home"] button');await both(p=>p.locator('#customIconFileInput').setInputFiles({name:'icon.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')}));await both(p=>p.waitForFunction(()=>document.querySelector('.theme-icon-choice[data-icon-kind="dock"][data-icon-key="home"] img')));await click('#saveCustomIconsBtn');await check('appearance-icon-save',true);
await click('#resetAllCustomIconsBtn');await check('appearance-icon-reset-draft',true);await click('#saveCustomIconsBtn');await check('appearance-icon-reset-save',true);
for(const [id,value] of [['editStarBubble',' Star 新文字 '],['editMoonBubble',' Moon 新文字 '],['editMainSubtitle','新副标题'],['editSongTitle','新音乐标题'],['editSongDetails','新装饰'],['editMp3Brand','新刻字']])await both(p=>p.locator('#'+id).fill(value));
await click('#saveMainTextsBtn');await check('appearance-texts-save',true);await click('#resetMainTextsBtn');await check('appearance-texts-reset',true);
await click('#applyCustomFontUrlBtn');await check('appearance-font-empty');await both(p=>p.locator('#customFontUrlInput').fill('data:font/woff2;base64,a'));await click('#applyCustomFontUrlBtn');await check('appearance-font-invalid-url');
const fontBytes=fs.readFileSync(base+'/node_modules/playwright-core/lib/vite/traceViewer/codicon.DCmgc-ay.ttf');
await both(p=>p.locator('#customFontFileInput').setInputFiles({name:'codicon.ttf',mimeType:'font/ttf',buffer:fontBytes}));await both(p=>p.waitForFunction(()=>localStorage.getItem('smallphone_custom_font_type')==='file'));await check('appearance-font-file',true);
await click('#themeBackBtn');await click('#settingsBackBtn');await check('appearance-home-applied',true);
await both(async p=>{await p.reload({waitUntil:'load'});await p.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'});await p.waitForFunction(()=>document.body.classList.contains('custom-ui-font-active'));await p.clock.runFor(2700)});await click('#splash-screen');await both(p=>p.clock.runFor(700));await click('#navSettingsBtn');await click('#settingTheme');await check('appearance-reload-persisted',true);
await click('#resetCustomFontBtn');await both(p=>p.waitForFunction(()=>!localStorage.getItem('smallphone_custom_font_type')));await click('#removeWallpaperBtn');await check('appearance-font-wallpaper-reset',true);
summary.errors=errors;
if(errors.some(items=>items.length)) throw Error('Application page errors');
fs.writeFileSync(base+'/docs/appearance-validation-results.json',JSON.stringify(summary,null,2));
console.log('All compared states passed.');
}catch(e){summary.errors=errors;summary.failure=e.message;fs.writeFileSync(base+'/docs/appearance-validation-results.json',JSON.stringify(summary,null,2));console.error(e.message);process.exitCode=1}
finally{await browser.close();await new Promise(r=>server.close(r));}
