import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const manifest = JSON.parse(read('docs/migration-manifest.json'));
const original = read('reference/original.html');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(sha256(original) === manifest.source_sha256, 'Reference HTML differs from migration baseline');
const scripts = [...original.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const record of manifest.runtime_scripts) {
  const code = record.parts.map(read).join('');
  if (record.byte_identical_to_original) assert(code === scripts[record.index], `Unmigrated script ${record.index} differs from original`);
  else assert(manifest.react_migration?.changed_script_indexes?.includes(record.index), `Unexpected script migration ${record.index}`);
  new vm.Script(code, { filename: `runtime-script-${record.index}` });
  assert(sha256(code) === record.sha256, `Script ${record.index} checksum differs`);
}
const pages = manifest.components.filter(component => component.file.startsWith('src/pages/'));
for (const page of pages) {
  assert(fs.existsSync(path.join(root, page.file)), `Missing component: ${page.file}`);
  assert(fs.existsSync(path.join(root, page.file.replace(/\.tsx$/, '.css'))), `Missing page CSS: ${page.file}`);
}
const orders = [];
for (const cssFile of new Set(manifest.styles.map(style => style.file))) {
  for (const match of read(cssFile).matchAll(/\/\* @qingtuan-order:(\d+) \*\//g)) orders.push(Number(match[1]));
}
assert(new Set(orders).size === orders.length, 'Duplicate CSS ordering markers');
assert(fs.existsSync(path.join(root, 'src/styles/tokens.css')), 'Missing tokens.css');
for (const component of ['src/pages/Settings/Settings.tsx', 'src/components/shared/AboutAppModal.tsx']) {
  assert(!read(component).includes('OriginalElement'), `Migrated component still uses legacy element adapter: ${component}`);
}
assert(!fs.existsSync(path.join(root, 'src/pages/Settings/logic/settings-dashboard.runtime.js')), 'Old settings initializer remains');
assert(!fs.existsSync(path.join(root, 'src/components/shared/logic/about-app.runtime.js')), 'Old about initializer remains');
assert(!fs.existsSync(path.join(root, 'src/pages/Chat/Room/logic/message-labels.runtime.js')), 'Replaced message-label initializer remains');
assert(read('src/pages/Chat/Settings/ChatAppearanceControls.tsx').includes('<ChatMessageContent/>'), 'Message list is not connected to native React rendering');
const files = [];
function collect(directory) { for (const entry of fs.readdirSync(directory, {withFileTypes:true})) { const file = path.join(directory, entry.name); if (entry.isDirectory()) collect(file); else files.push(file); } }
collect(path.join(root,'src'));
assert(!files.some(file=>file.endsWith('.runtime.js')), 'A runtime.js file remains');
for (const file of files.filter(file=>/\.tsx?$/.test(file))) {
  const source=fs.readFileSync(file,'utf8');
  assert(!source.includes('ClassicScriptSlot'),`A classic script slot remains: ${file}`);
  assert(!source.includes('document.getElementById'),`A global ID lookup remains: ${file}`);
  assert(!/createElement\(['"]script['"]\)|\?raw.*runtime|initializeOriginalRuntime/.test(source),`A classic bootstrap remains: ${file}`);
}
assert(manifest.react_migration.migration_complete===true, 'Migration is incomplete');
assert(manifest.react_migration.remaining_runtime_modules.length===0,'Retained runtime modules remain');
assert(manifest.runtime_scripts.every(record=>record.parts.length===0),'A script still has retained source parts');
console.log(`React migration verified: zero runtime modules/slots, ${pages.length} page folders, ${orders.length} CSS fragments.`);
