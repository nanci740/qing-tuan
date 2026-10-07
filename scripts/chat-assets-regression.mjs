import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(process.env.QT_TEST_RUNTIME?path.join(process.env.QT_TEST_RUNTIME,'package.json'):import.meta.url);
const {chromium:pw}=require('playwright');const mod=require('@sparticuz/chromium');const chromium=mod.default||mod;
const code=ts.transpileModule(fs.readFileSync(path.join(root,'src/utils/chatAppearance.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const server=http.createServer((req,res)=>{
 if(req.url==='/chatAssets.js'){res.setHeader('Content-Type','text/javascript');return res.end(code);}
 const rel=req.url.split('?')[0].replace(/^\/qing-tuan\//,'');
 const file=rel==='/fixture.otf'?path.join(root,'reference/chat-font-fixture.otf'):path.join(root,'dist',rel||'index.html');
 try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':file.endsWith('.otf')?'font/otf':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await pw.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||await chromium.executablePath(),args:process.env.QT_DISABLE_GPU?['--no-sandbox','--disable-gpu','--use-gl=disabled']:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const checks=[];const check=(name,condition)=>{if(!condition)throw Error(name);checks.push(name);};
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/qing-tuan/');
 checks.push(...await page.evaluate(async()=>{
  const api=await import('/chatAssets.js'),names=[];const check=(name,value)=>{if(!value)throw Error(name);names.push(name);};
  await api.updateChatAssets('regression',{wallpaper:new Blob(['wallpaper']),font:new Blob(['font'])});
  check('existing schema stores wallpaper and font',await(await api.readChatWallpaper('regression')).text()==='wallpaper'&&await(await api.readChatFont('regression')).text()==='font');
  const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const result=put.apply(this,args);if(this.name==='fonts')this.transaction.abort();return result;};
  let rejected=false;try{await Promise.race([api.updateChatAssets('regression',{wallpaper:new Blob(['new']),font:new Blob(['new'])}),new Promise((_,reject)=>setTimeout(()=>reject(Error('hang')),2000))]);}catch(e){if(e.message==='hang')throw e;rejected=true;}finally{IDBObjectStore.prototype.put=put;}
  check('aborted transaction rejects and preserves both old assets',rejected&&await(await api.readChatWallpaper('regression')).text()==='wallpaper'&&await(await api.readChatFont('regression')).text()==='font');
  await api.updateChatAssets('regression',{wallpaper:null,font:null});check('both deletions commit',await api.readChatFont('regression')===null&&await api.readChatWallpaper('regression')===null);
  return names;
 }));
 await page.waitForSelector('#chatAddCharacterBtn',{state:'attached'});
 const splash=await page.locator('.splash-icon-image').getAttribute('src');
 check('splash is a separate deployed asset',splash.startsWith('/qing-tuan/assets/qingtuan-splash-')&&(await page.request.get(origin+splash)).ok());
 check('splash bytes are unchanged',Buffer.compare(await(await page.request.get(origin+splash)).body(),fs.readFileSync(path.join(root,'src/assets/qingtuan-splash.webp')))===0);
 const click=selector=>page.evaluate(s=>document.querySelector(s).click(),selector);
 const fill=(selector,value)=>page.evaluate(({selector,value})=>{const e=document.querySelector(selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 await click('[data-dock-icon-key="chat"]');
 for(const name of ['存储测试甲','存储测试乙']){await click('#chatAddCharacterBtn');await fill('[data-field="name"]',name);await click('.cc-save');}
 await click('[data-character-id]');await click('#chatRoomMore');await click('[data-room-action="settings"]');
 const font=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('smallphone_chat_preferences_by_chat_v2')||'{}'));
 await page.locator('#chatFontFileInput').setInputFiles({name:'fixture.otf',mimeType:'font/otf',buffer:fs.readFileSync(path.join(root,'reference/chat-font-fixture.otf'))});
 await page.waitForFunction(()=>document.querySelector('#chatFontImportStatus').textContent==='字体已载入');
 const before=await font();const key=Object.keys(before).find(k=>before[k].fontType==='file');check('valid font commits metadata',!!key);
 const oldFont=await page.evaluate(async key=>{const a=await import('/chatAssets.js');return [...new Uint8Array(await(await a.readChatFont(key)).arrayBuffer())];},key);
 await page.locator('#chatFontFileInput').setInputFiles({name:'bad.otf',mimeType:'font/otf',buffer:Buffer.from('invalid-font')});
 await page.waitForFunction(()=>document.querySelector('#chatFontImportStatus').textContent!=='字体已载入');
 check('invalid font keeps old metadata',JSON.stringify(await font())===JSON.stringify(before));
 check('invalid font keeps old saved bytes',JSON.stringify(await page.evaluate(async key=>{const a=await import('/chatAssets.js');return [...new Uint8Array(await(await a.readChatFont(key)).arrayBuffer())];},key))===JSON.stringify(oldFont));
 await page.evaluate(()=>{window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='smallphone_chat_preferences_by_chat_v2')throw Error('test settings quota');return window.savedSetItem.call(this,k,v);};});
 await page.locator('#chatFontFileInput').setInputFiles({name:'replacement.otf',mimeType:'font/otf',buffer:fs.readFileSync(path.join(root,'reference/chat-font-fixture.otf'))});
 await page.waitForFunction(()=>document.querySelector('#chatFontImportStatus').textContent.includes('test settings quota'));
 check('metadata write failure keeps saved font settings',JSON.stringify(await font())===JSON.stringify(before));
 await page.evaluate(()=>Storage.prototype.setItem=window.savedSetItem);
 const svg={name:'wall.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="5" height="5"><rect width="5" height="5" fill="red"/></svg>')};
 await page.locator('#chatWallpaperInput').setInputFiles(svg);await page.waitForFunction(()=>document.querySelector('#chatAppPage').classList.contains('chat-wallpaper-on'));
 check('wallpaper upload displays',true);
 await page.evaluate(()=>{window.savedOpen=indexedDB.open;indexedDB.open=function(...args){if(args[0]==='smallphone_chat_assets_v1')throw Error('test asset failure');return window.savedOpen.apply(this,args);};});
 await click('#chatWallpaperRemove');await page.waitForFunction(()=>document.body.textContent.includes('test asset failure'));
 check('failed removal keeps wallpaper',await page.locator('#chatAppPage').evaluate(e=>e.classList.contains('chat-wallpaper-on')));
 await click('#chatFontReset');await page.waitForFunction(()=>document.querySelector('#chatFontImportStatus').textContent.includes('test asset failure'));
 check('failed font reset preserves settings',JSON.stringify(await font())===JSON.stringify(before));
 await page.evaluate(()=>indexedDB.open=window.savedOpen);
 await page.reload();await page.waitForSelector('#chatAddCharacterBtn',{state:'attached'});await click('[data-dock-icon-key="chat"]');await click('[data-character-id]');await click('#chatRoomMore');await click('[data-room-action="settings"]');
 await page.waitForFunction(()=>document.querySelector('#chatFontImportStatus').textContent==='字体已载入'&&document.querySelector('#chatAppPage').classList.contains('chat-wallpaper-on'));
 check('font and wallpaper restore after refresh',true);
 await page.evaluate(()=>{window.originalAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.exportPromise=fetch(this.href).then(r=>r.json());};window.addEventListener('qingtuan:chat-confirm',e=>e.detail.resolve(true));});
 await click('#chatExportCurrent');await page.waitForFunction(()=>window.exportPromise);
 const backup=await page.evaluate(()=>window.exportPromise);
 check('chat export includes both actual resources',backup.wallpaperDataUrl.startsWith('data:image/')&&backup.fontDataUrl.startsWith('data:'));
 await page.evaluate(()=>{window.putBeforeImport=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const request=window.putBeforeImport.apply(this,args);if(this.name==='fonts')this.transaction.abort();return request;};});
 const changed={...backup,html:'<div class="chat-message-row">不该导入的消息</div>'};
 await page.locator('#chatImportFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(changed))});
 await page.waitForFunction(()=>document.body.textContent.includes('聊天资源操作失败'));
 check('failed backup resource transaction leaves chat unchanged',!await page.locator('#chatAppPage').evaluate(e=>e.textContent.includes('不该导入的消息')));
 check('failed backup preserves settings',JSON.stringify(await font())===JSON.stringify(before));
 await page.evaluate(()=>IDBObjectStore.prototype.put=window.putBeforeImport);
 await page.evaluate(()=>{window.originalResetSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='smallphone_chat_preferences_by_chat_v2')throw Error('test reset quota');return window.originalResetSetItem.call(this,k,v);};});
 await click('#chatResetPreferences');await page.waitForFunction(()=>document.body.textContent.includes('test reset quota'));
 check('failed full reset rolls back both resources',await page.evaluate(async key=>{const a=await import('/chatAssets.js');return !!await a.readChatFont(key)&&!!await a.readChatWallpaper(key);},key));
 check('failed full reset retains metadata',JSON.stringify(await font())===JSON.stringify(before));
 await page.evaluate(()=>Storage.prototype.setItem=window.originalResetSetItem);
 await page.locator('#chatImportFile').setInputFiles({name:'working-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...backup,html:'<div class="chat-message-row">成功恢复的消息</div>'}))});
 await page.waitForFunction(()=>document.querySelector('#chatAppPage').textContent.includes('成功恢复的消息'));
 await page.waitForFunction(()=>document.querySelector('#chatFontImportStatus').textContent==='字体已载入');
 check('successful backup restores messages and both assets',await page.evaluate(async key=>{const a=await import('/chatAssets.js');return !!await a.readChatFont(key)&&!!await a.readChatWallpaper(key);},key));


 await click('#chatFontReset');await page.waitForFunction(()=>document.querySelector('#chatFontBadge').textContent==='DEFAULT');
 await click('#chatWallpaperRemove');await page.waitForFunction(()=>!document.querySelector('#chatAppPage').classList.contains('chat-wallpaper-on'));
 check('successful reset clears font and wallpaper',await page.evaluate(async key=>{const a=await import('/chatAssets.js');return await a.readChatFont(key)===null&&await a.readChatWallpaper(key)===null;},key));
 await page.evaluate(()=>{window.savedFontLoad=FontFace.prototype.load;FontFace.prototype.load=function(){const loaded=window.savedFontLoad.call(this);if(this.family==='SmallPhoneChatCustomFont')return loaded.then(face=>new Promise(resolve=>{window.releaseFont=()=>resolve(face);}));return loaded;};});
 await page.locator('#chatFontFileInput').setInputFiles({name:'delayed.otf',mimeType:'font/otf',buffer:fs.readFileSync(path.join(root,'reference/chat-font-fixture.otf'))});
 await page.waitForFunction(()=>typeof window.releaseFont==='function');
 await click('#chatSettingsBack');await click('#chatRoomBack');
 const ids=await page.locator('[data-character-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.characterId));
 await click(`[data-character-id="${ids[1]}"]`);await click('#chatRoomMore');await click('[data-room-action="settings"]');
 await page.evaluate(()=>{window.releaseFont();FontFace.prototype.load=window.savedFontLoad;});
 await page.waitForFunction(()=>document.querySelector('#chatFontBadge').textContent==='DEFAULT');
 check('late font completion does not alter next role',await page.locator('#chatAppPage').evaluate(e=>e.style.getPropertyValue('--chat-message-font-family')==='var(--font-active)'));
 check('no browser runtime errors',errors.length===0);
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
