import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import postcss from 'postcss';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(process.env.QT_TEST_RUNTIME?path.join(process.env.QT_TEST_RUNTIME,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const checks=[];const check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
function cssFiles(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?cssFiles(path.join(dir,f.name)):f.name.endsWith('.css')?[path.join(dir,f.name)]:[]);}
for(const file of cssFiles(path.join(root,'src')))postcss.parse(fs.readFileSync(file,'utf8'),{from:file});
check('all source CSS parses, including repaired appearance selectors',true);
async function serve(dist){const server=http.createServer((req,res)=>{const rel=req.url.split('?')[0].replace(/^\/qing-tuan\//,'');try{const file=path.join(dist,rel||'index.html');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,url:`http://127.0.0.1:${server.address().port}/qing-tuan/`};}
const current=await serve(path.join(root,'dist')),baseline=process.env.QT_COLOR_BASELINE?await serve(process.env.QT_COLOR_BASELINE):null;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-gpu','--use-gl=disabled'],headless:true});
const views=[['home',null,'#main-content'],['settings',null,'#settingsPage'],['appearance','settingTheme','#themeSettingsPage'],['music','settingMusic','#musicSettingsPage'],['api','settingApi','#apiSettingsPage'],['voice','settingVoiceAi','#voiceImageSettingsPage'],['mcp','settingMcp','#mcpSettingsPage'],['background','settingBackground','#backgroundActivityPage'],['cleanup','settingBackup','#dataManagementPage'],['profile','settingPersonal','#personalProfilePage'],['world',null,'.world-page'],['chat',null,'#chatListView'],['character',null,'#characterCard']];
const errors=[];
async function view(url,color,item){const [name,destination,selector]=item;const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN',timezoneId:'Asia/Taipei'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(url.split('/qing-tuan/')[0])?r.continue():r.abort());await page.addInitScript(color=>{localStorage.setItem('smallphone_splash_mode','off');if(!localStorage.getItem('smallphone_theme_color'))localStorage.setItem('smallphone_theme_color',color);Math.random=()=>.37;},color);await page.goto(url);await page.waitForSelector('#imageStorageSection',{state:'attached'});await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
 const click=sel=>page.evaluate(sel=>document.querySelector(sel).click(),sel);
 if(destination||name==='settings'){await click('[data-dock-icon-key="settings"]');if(destination)await click('#'+destination);}
 else if(name==='world')await click('[data-app-icon-key="world"]');
 else if(name==='chat'||name==='character'){await click('[data-dock-icon-key="chat"]');if(name==='character')await click('#chatAddCharacterBtn');}
 await page.waitForSelector(selector,{state:'visible'});
 return {context,page,selector};}
try{
 for(const color of ['#B5D9DC','#D7A6C1','#86AEB9']){
  for(const item of views){const {context,page,selector}=await view(current.url,color,item);const values=await page.locator(selector).evaluate(e=>{const c=getComputedStyle(e),names=['primary','accent','text','muted','page','surface','danger'];return Object.fromEntries(names.map(n=>[n,c.getPropertyValue('--color-'+n).trim()]));});check(`${color} ${item[0]} resolves all seven colors`,Object.values(values).every(v=>v&&CSSColor(v)));
   const aliases=await page.locator(selector).evaluate(e=>{const c=getComputedStyle(e);const pairs=[['--set-title','--color-text'],['--set-line','--color-muted'],['--cr-title','--color-text'],['--cr-line','--color-muted'],['--ch-title','--color-text'],['--ch-line','--color-muted'],['--cc-title','--color-text'],['--cc-line','--color-muted']];return pairs.every(([a,b])=>!c.getPropertyValue(a).trim()||c.getPropertyValue(a).trim()===c.getPropertyValue(b).trim());});check(`${color} ${item[0]} uses shared text and border roles`,aliases);
   if(item[0]==='cleanup'){await page.setViewportSize({width:320,height:640});check(`${color} cleanup fits 320px`,await page.locator('#imageStorageSection').evaluate(e=>e.scrollWidth<=e.clientWidth));}
   if(color==='#B5D9DC'&&baseline){const old=await view(baseline.url,color,item);await page.setViewportSize({width:390,height:844});const geometry=async(p,sel)=>p.locator(sel).evaluate(e=>[e,...e.querySelectorAll('*')].filter(x=>x.getBoundingClientRect().width&&x.getBoundingClientRect().height).map(x=>{const r=x.getBoundingClientRect();return [x.tagName,x.id,x.className?.baseVal??x.className,...['x','y','width','height'].map(k=>Math.round(r[k]*10)/10)]}));const a=await geometry(page,selector),b=await geometry(old.page,selector);check(`${item[0]} keeps original layout`,JSON.stringify(a)===JSON.stringify(b));await old.context.close();}
   await context.close();
  }
 }
 // Actual theme control, persistence and reload, rather than only changing CSS variables.
 const live=await view(current.url,'#B5D9DC',views.find(v=>v[0]==='appearance'));await live.page.locator('#themeHexInput').fill('#D7A6C1');await live.page.locator('#applyThemeHexBtn').click();await live.page.waitForFunction(()=>localStorage.getItem('smallphone_theme_color')==='#D7A6C1');await live.page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--theme-color')==='#D7A6C1');const before=await live.page.locator('#themeSettingsPage').evaluate(e=>getComputedStyle(e).getPropertyValue('--color-text'));await live.page.reload();await live.page.waitForSelector('#imageStorageSection',{state:'attached'});const after=await live.page.locator('#themeSettingsPage').evaluate(e=>getComputedStyle(e).getPropertyValue('--color-text'));check('theme chosen through UI persists its derived colors after reload',before===after);await live.context.close();check('no browser runtime errors',errors.length===0);
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();current.server.close();baseline?.server.close();}
function CSSColor(value){return !value.includes('var(')&&!value.includes('NaN')&&value!=='initial';}
