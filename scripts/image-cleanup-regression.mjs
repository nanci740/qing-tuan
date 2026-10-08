import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(process.env.QT_TEST_RUNTIME?path.join(process.env.QT_TEST_RUNTIME,'package.json'):import.meta.url);
const {chromium:pw}=require('playwright');const mod=process.env.CHROMIUM_EXECUTABLE?null:require('@sparticuz/chromium');const chromium=mod?.default||mod;
const code=ts.transpileModule(fs.readFileSync(path.join(root,'src/utils/imageAssets.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/imageAssets.js')){res.setHeader('Content-Type','text/javascript');return res.end(code);}
 if(req.url==='/test'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><body>test</body></html>');}
 const rel=req.url.split('?')[0].replace(/^\/qing-tuan\//,'');
 try{const file=path.join(root,'dist',rel||'index.html');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await pw.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||await chromium.executablePath(),args:process.env.QT_DISABLE_GPU?['--no-sandbox','--disable-gpu','--use-gl=disabled']:chromium?chromium.args.filter(a=>a!=='--single-process'):['--no-sandbox'],headless:true});
const checks=[];const check=(name,condition)=>{if(!condition)throw Error(name);checks.push(name);};
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const newPage=async()=>{const p=await context.newPage();await p.goto(origin+'/test');await p.evaluate(async()=>{window.api=await import('/imageAssets.js');await window.api.initializeImageAssets();});return p;};
 let page=await newPage();
 const seed=await page.evaluate(async()=>{
   const refs=[];for(let i=0;i<5;i++)refs.push(await api.storeImage('data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text>${i}</text></svg>`)));
   await api.saveImageSlots({avatar_star_custom:refs[0],smallphone_main_wallpaper:'https://example.com/wall.png'});
   localStorage.setItem('smallphone_dossier_records_v1',JSON.stringify([{id:'shared',photoUrl:refs[0]},{id:'role',photoUrl:refs[1]}]));
   localStorage.setItem('smallphone_chat_characters_v1',JSON.stringify([{id:'shared',photoUrl:refs[0]}]));
   localStorage.setItem('smallphone_world_books_v1',JSON.stringify([{id:'world',cover:refs[2]}]));
   return refs;
 });
 await page.close();page=await newPage();
 let stats=await page.evaluate(()=>api.getImageLibraryStats());
 check('deduplicated count and old orphan candidates',stats.totalCount===5&&stats.usedCount===3&&stats.unusedCount===2&&stats.protectedCount===0);
 const tempRef=await page.evaluate(()=>api.storeImage('data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg"><text>draft</text></svg>')));
 stats=await page.evaluate(()=>api.getImageLibraryStats());check('new unsaved upload is protected',stats.totalCount===6&&stats.protectedCount===1&&stats.unusedCount===2);
 const dbKeys=()=>page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('qingtuan_image_assets_v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise(resolve=>{const r=db.transaction('images').objectStore('images').getAllKeys();r.onsuccess=()=>resolve(r.result);});}finally{db.close();}});
 const bytes=stats.unusedBytes;const cleaned=await page.evaluate(()=>api.cleanUnusedImages());
 check('only orphan images removed with accurate released bytes',cleaned.deletedCount===2&&cleaned.deletedBytes===bytes);
 const remaining=await dbKeys();check('shared avatar, dossier, world cover and unsaved draft remain',remaining.length===4&&[...seed.slice(0,3),tempRef].every(ref=>remaining.includes(ref)));
 check('used image still resolves and exports',await page.evaluate(()=>api.readImageSlot('avatar_star_custom').startsWith('data:image/')&&api.decodePhotoRecords(JSON.parse(localStorage.getItem('smallphone_dossier_records_v1'))).every(r=>r.photoUrl.startsWith('data:image/'))));
 check('external image and settings unchanged',await page.evaluate(()=>api.readImageSlot('smallphone_main_wallpaper')==='https://example.com/wall.png'&&JSON.parse(localStorage.getItem('smallphone_world_books_v1'))[0].id==='world'));
 check('second cleanup is harmless',(await page.evaluate(()=>api.cleanUnusedImages())).deletedCount===0);
 // Insert an old orphan without adding it to the live display cache.
 const orphan='qt-image:'+'a'.repeat(64);
 const addOrphan=()=>page.evaluate(async ref=>{const db=await new Promise(resolve=>{const r=indexedDB.open('qingtuan_image_assets_v1');r.onsuccess=()=>resolve(r.result);});try{await new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(new Blob(['old'],{type:'image/png'}),ref);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});}finally{db.close();}},orphan);
 await addOrphan();let other=await newPage();
 const blocked=await page.evaluate(()=>api.cleanUnusedImages().then(()=>'',e=>e.message));check('another open app session prevents deletion',blocked.includes('关闭其他')&&(await dbKeys()).includes(orphan));
 await other.close();
 const abortResult=await page.evaluate(async()=>{
   const original=IDBCursor.prototype.delete;IDBCursor.prototype.delete=function(){const r=original.call(this);this.source.transaction.abort();return r;};
   try{return await api.cleanUnusedImages().then(()=>false,()=>true);}finally{IDBCursor.prototype.delete=original;}
 });check('transaction abort preserves every image',abortResult&&(await dbKeys()).includes(orphan));
 const corrupt=await page.evaluate(async()=>{const key='smallphone_world_books_v1',saved=localStorage.getItem(key);localStorage.setItem(key,'{broken');try{return await api.cleanUnusedImages().then(()=>false,()=>true);}finally{localStorage.setItem(key,saved);}});
 check('damaged association data stops cleanup',corrupt&&(await dbKeys()).includes(orphan));
 const denied=await page.evaluate(async()=>{const original=Storage.prototype.getItem;Storage.prototype.getItem=function(){throw Error('blocked');};try{return await api.cleanUnusedImages().then(()=>false,()=>true);}finally{Storage.prototype.getItem=original;}});
 check('storage read failure stops cleanup',denied&&(await dbKeys()).includes(orphan));
 const missing=await page.evaluate(async()=>{localStorage.setItem('future_image_ref','qt-image:'+'b'.repeat(64));try{return await api.cleanUnusedImages().then(()=>false,()=>true);}finally{localStorage.removeItem('future_image_ref');}});
 check('missing referenced image aborts earlier deletions',missing&&(await dbKeys()).includes(orphan));
 await page.evaluate(ref=>localStorage.setItem('future_image_ref',ref),orphan);
 check('unknown settings references are conservatively retained',(await page.evaluate(()=>api.cleanUnusedImages())).deletedCount===0&&(await dbKeys()).includes(orphan));
 await page.evaluate(()=>localStorage.removeItem('future_image_ref'));check('cleanup recovers after errors',(await page.evaluate(()=>api.cleanUnusedImages())).deletedCount===1);
 // Refresh makes abandoned session-only uploads eligible, while current references stay protected.
 await page.close();page=await newPage();stats=await page.evaluate(()=>api.getImageLibraryStats());
 check('abandoned draft is eligible after reopening',stats.unusedCount===1&&stats.usedCount===3);
 await page.close();
 // UI integration: confirm/cancel and theme/narrow-screen behavior.
 page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('smallphone_splash_mode','off'));
 await page.goto(origin+'/qing-tuan/');await page.waitForSelector('#imageStorageSection',{state:'attached'});
 const click=selector=>page.evaluate(selector=>document.querySelector(selector).click(),selector);
 await click('#inspectImageStorageBtn');await page.waitForFunction(()=>!document.querySelector('#cleanImageStorageBtn').disabled);
 check('only one settings cleanup card',await page.locator('#imageStorageSection').count()===1);
 await click('[data-dock-icon-key="settings"]');await click('#settingBackup');await page.waitForSelector('#dataManagementPage.active');
 await page.locator('#imageStorageSection').scrollIntoViewIfNeeded();
 check('cleanup entry is visible in data management',await page.locator('#imageStorageSection').isVisible());
 await page.setViewportSize({width:320,height:640});
 check('cleanup card fits narrow mobile',await page.locator('#imageStorageSection').evaluate(e=>e.scrollWidth<=e.clientWidth));
 await page.setViewportSize({width:390,height:844});await page.locator('#imageStorageSection').scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(root,'..','image-cleanup-settings.png')});
 const before=await dbKeys();await click('#cleanImageStorageBtn');await page.waitForSelector('.sp-confirm-btn.is-primary',{state:'attached'});await click('.sp-confirm-btn:not(.is-primary)');
 check('cancel confirmation deletes nothing',JSON.stringify(await dbKeys())===JSON.stringify(before));
 await click('#cleanImageStorageBtn');await page.waitForSelector('.sp-confirm-btn.is-primary',{state:'attached'});await click('.sp-confirm-btn.is-primary');await page.waitForFunction(()=>document.querySelector('#imageStorageSection dd:last-child').textContent.includes('张'));
 await page.waitForFunction(()=>document.querySelector('#cleanImageStorageBtn').disabled&&!document.querySelector('#inspectImageStorageBtn').disabled);
 check('confirmed UI cleanup preserves referenced pictures',(await dbKeys()).length===3);
 const colors=await page.locator('.image-storage-summary').evaluate(e=>{const old=getComputedStyle(e).color;document.documentElement.style.setProperty('--theme-color','#D3AFBA');const changed=getComputedStyle(e).color;document.documentElement.style.removeProperty('--theme-color');return {old,changed};});check('cleanup text follows theme',colors.old!==colors.changed);
 check('no browser runtime errors',errors.length===0);
 await context.close();console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();server.close();}
