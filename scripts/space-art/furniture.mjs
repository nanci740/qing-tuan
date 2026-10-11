// Original pixel artwork. Every asset uses the same 2:1 ground projection and light from the window.
// 房间：x 沿右墙 0..23，y 沿左墙 0..15；右边 x 19..23 是凸出去的衣柜区，y 8..11.5 是低一阶的玄关。
export const ROOM = { width: 23, depth: 15, main: 19, nook: 8, entry: 11.5, wall: 144 };
const R = ROOM;

// 墙面上的圆（时钟等），按墙面方向斜切。
function diskX({ p, P }, y, z, r, c, edge = 'ink') { const pts = []; for (let i = 0; i < 28; i++) { const t = i / 28 * Math.PI * 2; pts.push(P(0, y + r * Math.cos(t) / 16, z + r * Math.sin(t))); } p.poly(pts, c, edge); }
function boards({ top, line }, x0, y0, w, d, z, seed = 0, xmax = () => x0 + w) {
 const row = .75; const tones = ['floorA', 'floorB', 'floorC', 'floorA', 'floorB'];
 for (let r = 0; r * row < d - .001; r++) {
  const y = y0 + r * row, h = Math.min(row, d - r * row), end = xmax(y);
  const shift = ((r * 7 + seed) % 5) * .9; let x = x0, n = 0;
  while (x < end - .001) { const len = n === 0 ? 1.6 + shift : 4.5; const nx = Math.min(end, x + len); top(x, y, nx - x, h, z, tones[(r * 3 + n * 2 + seed) % 5], null); if ((r + n) % 3 === 0) line([x + .4, y + .18, z], [Math.min(nx - .3, x + 2.2), y + .18, z], 'floorHi'); if (nx < end) line([nx, y, z], [nx, y + h, z], 'floorSeam'); x = nx; n++; }
  if (r) line([x0, y, z], [end, y, z], 'floorSeam');
 }
}
function bookRow(s, x, y, w, z, h, face = 'Y', seed = 0) {
 const colors = ['teal', 'cream', 'tealLight', 'pink', 'woodLight', 'tealDark', 'paper', 'blue'];
 let k = 0; for (let u = 0; u < w - .12; u += .16 + (k % 3) * .03) { const c = colors[(k * 5 + seed) % colors.length], bh = h - ((k * 3 + seed) % 4) * 2; if (face === 'Y') s.faceY(x + u, y, .14 + (k % 3) * .03, z, bh, c); else s.faceX(x, y + u, .14 + (k % 3) * .03, z, bh, c); k++; if ((k + seed) % 7 === 0) u += .2; }
}
function sky(s, poly, z0, h, opts = {}) {
 const { p, P, faceY } = s; p.clip(poly);
 const [ax, ay] = poly[0];
 p.rect(ax - 200, ay - 300, 600, 600, 'skyTop');
 p.rect(ax - 200, poly[0][1] - h * .55, 600, 400, 'skyHi');
 p.rect(ax - 200, poly[0][1] - h * .3, 600, 400, 'sky');
 for (const [dx, dy, r] of opts.clouds ?? []) { p.ellipse(ax + dx, ay + dy, r, Math.ceil(r / 2), 'cloud'); p.ellipse(ax + dx + r, ay + dy + 1, Math.ceil(r * .7), Math.ceil(r / 3), 'cloud'); p.ellipse(ax + dx - r, ay + dy + 2, Math.ceil(r * .6), Math.ceil(r / 3), 'cloud'); }
 for (const [dx, w, bh] of opts.city ?? []) { p.rect(ax + dx, ay - z0 - bh - 4 + dx / 2, w, bh + 40, 'city'); p.rect(ax + dx + 1, ay - z0 - bh - 3 + dx / 2, 1, bh, 'cityHi'); for (let j = 4; j < bh; j += 5) p.rect(ax + dx + 3, ay - z0 - bh - 4 + dx / 2 + j, Math.max(1, w - 5), 1, 'cityHi'); }
 for (const [dx, dy, r] of opts.trees ?? []) { p.ellipse(ax + dx, ay + dy, r, r, 'tree', 'treeDark'); p.ellipse(ax + dx - 2, ay + dy - 2, Math.ceil(r / 2), Math.ceil(r / 2), 'treeHi'); }
 p.clip(null);
}

export const drawings = {
 floor(s) {
  const { faceX, faceY, quad } = s;
  faceY(-.6, R.depth, R.main + .6, -10, 10, 'slab');
  faceX(R.main, R.entry, R.depth - R.entry, -10, 10, 'slabDark');
  faceX(R.width, -.6, R.nook + .6, -10, 10, 'slabDark');
  faceY(R.main, R.entry, R.width - R.main, -12, 6, 'slab');
  faceX(R.width, R.nook, R.entry - R.nook, -12, 6, 'slabDark');
  s.top(R.main, R.nook, R.width - R.main, R.entry - R.nook, -6, 'floorB');
  boards(s, R.main, R.nook, R.width - R.main, R.entry - R.nook, -6, 3);
  s.top(R.main, R.nook, R.width - R.main, R.entry - R.nook, -6, null);
  faceY(R.main, R.nook, R.width - R.main, -6, 6, 'floorShade');
  faceX(R.main, R.nook, R.entry - R.nook, -6, 6, 'floorShade');
  const L = [[0, 0], [R.width, 0], [R.width, R.nook], [R.main, R.nook], [R.main, R.depth], [0, R.depth]];
  quad(L.map(([x, y]) => [x, y, 0]), 'floorA');
  boards(s, 0, 0, R.width, R.depth, 0, 0, y => y < R.nook - .001 ? R.width : R.main);
  quad(L.map(([x, y]) => [x, y, 0]), null);
  s.line([0, R.depth, -1], [R.main, R.depth, -1], 'floorHi');
 },
 wallLeft(s) {
  const { faceX, faceY, top, line } = s;
  faceX(0, 0, R.depth, 0, R.wall, 'wallL');
  for (let y = .5; y < R.depth; y += .9) line([0, y, 12], [0, y, R.wall - 10], 'wallLStripe');
  faceX(0, 0, R.depth, 10, 10, 'wallLShade', null);
  faceX(0, 0, R.depth, 0, 10, 'trim'); line([0, 0, 10], [0, R.depth, 10], 'trimHi');
  faceX(0, 0, R.depth, R.wall - 7, 7, 'trimHi'); line([0, 0, R.wall - 7], [0, R.depth, R.wall - 7], 'trim');
  top(-.6, 0, .6, R.depth, R.wall, 'trim');
  faceY(-.6, R.depth, .6, -10, R.wall + 10, 'wallEdge');
 },
 wallRight(s) {
  const { faceX, faceY, top, line } = s;
  faceY(0, 0, R.width, 0, R.wall, 'wallR');
  for (let x = .5; x < R.width; x += .9) line([x, 0, 12], [x, 0, R.wall - 10], 'wallRStripe');
  faceY(0, 0, R.width, 10, 10, 'wallRShade', null);
  faceY(0, 0, R.width, 0, 10, 'trim'); line([0, 0, 10], [R.width, 0, 10], 'trimHi');
  faceY(0, 0, R.width, R.wall - 7, 7, 'trimHi'); line([0, 0, R.wall - 7], [R.width, 0, R.wall - 7], 'trim');
  top(-.6, -.6, R.width + .6, .6, R.wall, 'trim');
  faceX(R.width, -.6, .6, -10, R.wall + 10, 'wallEdge');
 },
 // 窗户连同窗台、格纹窗帘和左侧垂下来的藤蔓，锚点在窗台面的左端。
 window(s) {
  const { p, P, faceY, box, line, plaidY, vine } = s;
  faceY(-.25, .01, 5.5, -2, 78, 'trim');
  for (const [x, w] of [[.2, 1.4], [1.8, 1.4], [3.4, 1.4]]) {
   const z0 = 3, h = 67, poly = [P(x, .02, z0), P(x + w, .02, z0), P(x + w, .02, z0 + h), P(x, .02, z0 + h)];
   sky(s, poly, z0, h, { clouds: [[8 - x * 6, -50, 6], [22 - x * 4, -38, 4]], city: [[2, 7, 18], [10, 5, 26], [16, 8, 14], [24, 6, 22]], trees: [[4, -6, 7], [13, -3, 8], [22, 2, 7], [30, 5, 8]] });
   faceY(x, .02, w, z0, h, null, 'woodShade');
   line([x + .2, .03, z0 + h - 8], [x + .6, .03, z0 + h - 20], 'cloud'); line([x + .3, .03, z0 + h - 6], [x + .5, .03, z0 + h - 12], 'cloud');
  }
  for (const x of [1.6, 3.2]) faceY(x, .03, .2, 0, 72, 'woodLight');
  faceY(.2, .03, 4.6, 50, 2, 'woodLight', null);
  faceY(0, .03, 5, 0, 3, 'woodLight'); faceY(0, .03, 5, 70, 3, 'woodLight');
  box(-.35, 0, 5.7, .75, -6, 6, ['woodHi', 'woodLight', 'wood']);
  faceY(-1.9, .3, 8.8, 84, 3, 'wood'); for (const x of [-2, 6.8]) { const [cx, cy] = P(x, .3, 85); p.ellipse(cx, cy, 2, 2, 'woodLight', 'ink'); }
  for (const x0 of [-1.6, 4.9]) {
   plaidY(x0, .32, 1.7, -2, 84, .34, 10, ['fabric', 'plaidMid', 'plaidDark']);
   for (let x = x0 + .3; x < x0 + 1.6; x += .45) line([x, .33, 0], [x, .33, 80], 'fabricShade');
   for (let x = x0; x < x0 + 1.7; x += .34) { const [a, b] = P(x, .33, 84); p.dot(a, b + 1, 'wood'); }
  }
  const [vx, vy] = P(-1.7, .35, 86); vine(vx, vy, 46, 2, 1); vine(vx + 6, vy + 2, 30, 2, 2);
 },
 wallLamp(s) {
  const { p, P, faceY } = s; const [cx, cy] = P(.3, .1, 0);
  p.ellipse(cx, cy - 6, 22, 20, 'glow'); p.ellipse(cx, cy - 6, 13, 12, 'glow');
  faceY(0, .01, .6, -12, 14, 'trim'); p.line([cx, cy - 2], [cx + 4, cy - 6], 'brownDark');
  p.poly([[cx - 5, cy - 18], [cx + 5, cy - 18], [cx + 8, cy - 4], [cx - 8, cy - 4]], 'lampLight', 'woodShade');
  p.line([cx - 4, cy - 15], [cx - 6, cy - 6], 'white'); p.line([cx - 8, cy - 4], [cx + 8, cy - 4], 'sun');
 },
 wallShelf(s) {
  const { p, P, box, faceX, cyl, leaf, vine } = s;
  for (const y of [.4, 2.9]) { faceX(.25, y, .14, -10, 10, 'woodShade'); }
  box(0, 0, 1.0, 3.4, 0, 4);
  box(.2, 1.3, .7, .9, 4, 9, ['teal', 'tealLight', 'tealDark']); faceX(.91, 1.45, .6, 7, 3, 'cream', null);
  bookRow(s, .9, .25, .9, 4, 12, 'X', 2);
  cyl(.5, 2.9, .28, 4, 9, 'deep', 'pot', 'potShade');
  const [ax, ay] = P(.5, 2.9, 14);
  for (const [a, l] of [[-2.4, 10], [-1.9, 12], [-1.3, 11], [-.8, 9], [-3, 8]]) leaf(ax, ay, a, l, 3);
  vine(ax - 4, ay + 2, 40, 2, 3); vine(ax + 3, ay + 4, 26, 2, 0);
 },
 wallClock(s) {
  const { p, P, line } = s;
  diskX(s, 0, 0, 13, 'tealDark'); diskX(s, 0, 0, 10, 'fabric', 'tealShade');
  for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; const [x, y] = P(0, Math.cos(t) * 8.5 / 16, Math.sin(t) * 8.5); p.dot(x, y, i % 3 ? 'creamShade' : 'deep'); }
  line([0, 0, 0], [0, -.25, 5], 'ink'); line([0, 0, 0], [0, .3, -1], 'ink'); const [x, y] = P(0, 0, 0); p.dot(x, y, 'pink');
 },
 pictureLeft(s) {
  const { p, P, faceX } = s;
  faceX(0, 0, 3.6, 0, 30, 'wood'); faceX(.01, .15, 3.3, 3, 24, 'fabric', 'woodShade');
  const poly = [P(.02, .35, 6), P(.02, 3.25, 6), P(.02, 3.25, 24), P(.02, .35, 24)]; p.clip(poly);
  const [ax, ay] = P(.02, .35, 6); p.rect(ax - 60, ay - 40, 120, 80, 'skyHi'); p.ellipse(ax - 14, ay - 15, 6, 2, 'cloud'); p.ellipse(ax - 36, ay - 2, 5, 2, 'cloud');
  for (let i = 0; i < 6; i++) p.ellipse(ax - i * 9, ay + 4 + i * 3, 12, 6, i % 2 ? 'tree' : 'treeHi');
  p.clip(null); faceX(.02, .35, 2.9, 6, 18, null, 'woodShade');
 },
 photosLeft(s) {
  const { faceX, line } = s;
  for (const [y, z, c] of [[0, 14, 'tealHi'], [.9, 6, 'pink'], [1.7, 16, 'skyHi'], [2.6, 4, 'tealLight']]) { faceX(0, y, .7, z, 11, 'white'); faceX(.01, y + .1, .5, z + 3, 7, c, null); line([.02, y + .35, z + 13], [.02, y + .35, z + 11], 'pink'); }
 },
 toteBag(s) {
  const { p, P, faceX, line } = s;
  const [hx, hy] = P(0, .6, 36); p.dot(hx, hy, 'brownDark'); p.line([hx, hy], [hx + 8, hy + 10], 'woodShade'); p.line([hx, hy], [hx - 7, hy + 14], 'woodShade');
  faceX(.02, 0, 1.25, 0, 24, 'paper', 'woodShade'); faceX(.03, .3, .65, 6, 10, 'tealLight', null);
  const [cx, cy] = P(.03, .62, 11); p.dot(cx - 2, cy, 'ink'); p.dot(cx + 2, cy - 1, 'ink'); line([.03, .1, 21], [.03, 1.15, 21], 'creamShade');
 },
 corkboard(s) {
  const { faceY, line } = s;
  faceY(0, 0, 3.2, 0, 30, 'wood'); faceY(.15, .01, 2.9, 3, 24, 'woodHi', null);
  for (const [x, z, c] of [[.35, 14, 'fabric'], [1.2, 9, 'tealHi'], [2.05, 15, 'paper'], [.6, 4, 'pink'], [1.7, 4, 'white']]) { faceY(x, .02, .6, z, 9, c); line([x + .1, .03, z + 5], [x + .45, .03, z + 5], 'gray'); faceY(x + .25, .04, .1, z + 8, 1, 'teal', null); }
 },
 sunlight(s) {
  const { quad } = s;
  for (const [a, w] of [[0, 1.4], [1.6, 1.4], [3.2, 1.4]]) {
   quad([[a + .3, .4, 0], [a + w + .3, .4, 0], [a + w + 3.4, 7, 0], [a + 3.4, 7, 0]], 'sunlight', null);
   quad([[a + .8, 1.4, 0], [a + w - .1, 1.4, 0], [a + w + 1.6, 4.8, 0], [a + 2.4, 4.8, 0]], 'sunlightHi', null);
  }
 },
 bed(s) {
  const { p, P, box, faceX, faceY, line, shadow, plaid, plaidX, plaidY } = s;
  const W = 5, D = 6.2;
  shadow(W, D);
  box(0, 0, W, .45, 0, 56, ['woodLight', 'wood', 'woodShade']);
  for (let i = 0; i < 4; i++) faceY(.25 + i * 1.15, .46, .95, 34, 16, 'woodLight');
  line([0, .45, 54], [W, .45, 54], 'woodHi');
  box(0, .45, W, D - .45, 0, 15, ['woodLight', 'wood', 'woodShade']);
  for (const y0 of [.75, 2.6, 4.45]) { faceX(W + .01, y0, 1.6, 2, 11, 'woodLight'); line([W + .02, y0 + .55, 8], [W + .02, y0 + 1.05, 8], 'brownDark'); }
  box(.15, .5, W - .3, D - .85, 15, 9, ['fabric', 'fabric', 'fabricShade']);
  for (const x0 of [.35, W / 2 + .1]) { box(x0, .65, W / 2 - .45, 1.25, 24, 6, ['white', 'fabric', 'fabricShade']); line([x0 + .2, 1.7, 29], [x0 + W / 2 - .7, 1.7, 29], 'fabricShade'); }
  plaidX(W - .15, 2.1, D - 2.75, 12, 13, .45, 6);
  plaidY(.15, D - .65, W - .3, 12, 13, .45, 6);
  plaid(.15, 2.1, W - .3, D - 2.75, 25, .45);
  box(.15, 1.9, W - .3, .6, 24, 2, ['fabric', 'fabric', 'fabricShade']);
  box(0, D - .35, W, .35, 0, 20, ['woodLight', 'wood', 'woodShade']); line([.1, D, 16], [W - .1, D, 16], 'woodHi');
  const [fx, fy] = P(W - 1.4, 1.35, 33);
  for (let i = 0; i < 5; i++) { const t = i / 5 * Math.PI * 2 - Math.PI / 2; p.ellipse(fx + Math.cos(t) * 6, fy + Math.sin(t) * 4, 4, 3, 'fabric', 'woodShade'); }
  p.ellipse(fx, fy, 4, 3, 'sun', 'woodShade'); p.dot(fx - 2, fy, 'ink'); p.dot(fx + 2, fy, 'ink'); p.dot(fx, fy + 1, 'pink');
 },
 lowShelf(s) {
  const { box, faceX, line, shadow } = s;
  shadow(2, 2.6); box(0, 0, 2, 2.6, 0, 30);
  faceX(2.01, .2, 2.2, 3, 24, 'deep');
  faceX(2.02, .2, 2.2, 14, 2, 'woodLight', null);
  bookRow(s, 2.02, .3, 2, 16, 10, 'X', 1); bookRow(s, 2.02, .3, 1.1, 4, 9, 'X', 4);
  faceX(2.03, 1.5, .8, 3, 7, 'tealLight'); line([2.04, 1.75, 6], [2.04, 2.05, 6], 'tealDark');
 },
 photoFrame(s) {
  const { box, faceX } = s;
  box(0, 0, .25, .9, 0, 14, ['woodLight', 'wood', 'woodShade']); faceX(.26, .12, .66, 3, 9, 'skyHi'); faceX(.27, .12, .66, 3, 4, 'treeHi', null);
 },
 laundry(s) {
  const { box, top, faceY, line, shadow } = s;
  shadow(1.3, 1.1); box(0, 0, 1.3, 1.1, 0, 18, ['fabric', 'white', 'fabricShade']);
  top(.12, .12, 1.06, .86, 18, 'blueLight'); top(.12, .12, 1.06, .3, 18, 'tealLight', null);
  for (let x = .25; x < 1.2; x += .25) line([x, 1.1, 3], [x, 1.1, 15], 'fabricShade'); faceY(.4, 1.11, .5, 12, 3, 'fabricShade', null);
 },
 nightstand(s) {
  const { box, faceY, line, shadow } = s;
  shadow(1.5, 1.6); box(0, 0, 1.5, 1.6, 0, 28);
  for (const z of [4, 15]) { faceY(.12, 1.61, 1.26, z, 9, 'woodLight'); line([.6, 1.62, z + 5], [.9, 1.62, z + 5], 'brownDark'); }
 },
 alarm(s) {
  const { p, P, box, faceY } = s;
  box(0, 0, .8, .45, 0, 9, ['tealLight', 'teal', 'tealDark']); faceY(.12, .46, .56, 2, 5, 'black');
  const [x, y] = P(.18, .47, 4); for (let i = 0; i < 3; i++) p.rect(x + i * 3, y + i * 1.5 - 1, 2, 2, 'greenHi');
 },
 lamp(s) {
  const { p, P, box, line } = s;
  box(0, 0, .7, .6, 0, 3, ['tealLight', 'teal', 'tealDark']); line([.35, .3, 3], [.35, .3, 16], 'brownDark');
  const [x, y] = P(.35, .3, 18); p.ellipse(x, y - 2, 13, 10, 'glow');
  p.poly([[x - 4, y - 8], [x + 4, y - 8], [x + 8, y + 1], [x - 8, y + 1]], 'teal', 'tealDark'); p.line([x - 3, y - 6], [x - 6, y], 'tealHi'); p.line([x - 7, y + 1], [x + 7, y + 1], 'sun');
 },
 radio(s) {
  const { box, faceY, line } = s;
  box(0, 0, 1.5, .55, 0, 11, ['cream', 'fabric', 'creamShade']);
  for (let x = .15; x < .7; x += .12) line([x, .56, 2], [x, .56, 9], 'creamShade');
  faceY(.8, .56, .55, 4, 4, 'black'); faceY(.85, .57, .45, 5, 2, 'greenHi', null); line([.3, .25, 12], [1.2, .25, 12], 'deep');
 },
 smallPlant(s) {
  const { P, cyl, leaf } = s;
  cyl(.3, .3, .22, 0, 7, 'deep', 'pot', 'potShade');
  const [x, y] = P(.3, .3, 8);
  for (const [a, l] of [[-2.6, 7], [-2, 8], [-1.5, 9], [-1, 8], [-.5, 7], [-1.8, 6]]) leaf(x, y, a, l, 3);
 },
 plant(s) {
  const { P, cyl, leaf, shadow } = s;
  shadow(1.1, 1.1);
  cyl(.55, .55, .42, 0, 15, 'deep', 'pot', 'potShade');
  const [x, y] = P(.55, .55, 15);
  const leaves = [[-2.9, 18, 6], [-2.4, 22, 7], [-1.95, 24, 7], [-1.55, 25, 7], [-1.15, 23, 7], [-.7, 20, 6], [-.25, 16, 6], [-2.2, 15, 5], [-1.3, 16, 5], [-3.2, 13, 5]];
  leaves.forEach(([a, l, w], i) => leaf(x + (i % 2 ? 1 : -1), y - 2, a, l, w, i > 6 ? 'leafHi' : 'leaf'));
 },
 tvStand(s) {
  const { box, faceX, line, shadow } = s;
  shadow(2.4, 5.4); box(0, 0, 2.4, 5.4, 0, 24);
  faceX(2.41, .25, 1.6, 3, 18, 'deep'); faceX(2.42, .4, 1.3, 4, 6, 'gray'); faceX(2.43, .5, .9, 6, 2, 'grayDark', null); faceX(2.42, .25, 1.6, 12, 2, 'woodLight', null); faceX(2.42, .55, 1.0, 14, 4, 'grayDark');
  for (const z of [3, 13]) { faceX(2.41, 2.05, 1.6, z, 8, 'woodLight'); line([2.42, 2.6, z + 4], [2.42, 3.1, z + 4], 'brownDark'); }
  faceX(2.41, 3.85, 1.3, 3, 18, 'deep'); bookRow(s, 2.42, 3.95, 1.1, 4, 12, 'X', 3);
  line([2.4, 0, 24], [2.4, 5.4, 24], 'woodHi');
 },
 tv(s) {
  const { p, P, box, faceX } = s;
  box(.1, .5, .9, 1.9, 0, 30, ['gray', 'grayDark', 'black']);
  box(.9, 0, 1.0, 2.9, 0, 40, ['gray', 'grayDark', 'grayDark']);
  faceX(1.91, .18, 2.1, 5, 31, 'black');
  const poly = [P(1.92, .32, 8), P(1.92, 2.14, 8), P(1.92, 2.14, 33), P(1.92, .32, 33)]; p.clip(poly);
  const [ax, ay] = poly[0]; p.rect(ax - 40, ay - 50, 80, 70, 'skyTop'); p.rect(ax - 40, ay - 16, 80, 30, 'skyHi');
  p.ellipse(ax - 10, ay - 22, 6, 3, 'cloud'); p.ellipse(ax - 22, ay - 14, 5, 2, 'cloud');
  for (let i = 0; i < 5; i++) p.ellipse(ax - i * 7, ay + 1 + i * 3, 10, 5, i % 2 ? 'tree' : 'treeHi');
  p.clip(null); faceX(1.92, .32, 1.82, 8, 25, null, 'grayDark');
  faceX(1.92, 2.3, .4, 10, 4, 'greenHi'); faceX(1.92, 2.3, .4, 18, 3, 'gray'); faceX(1.92, 2.3, .4, 24, 3, 'gray');
  box(.4, .2, .9, .5, 40, 5, ['grayDark', 'black', 'black']);
 },
 cat(s) {
  const { p, P } = s; const [x, y] = P(.45, .45, 0);
  p.ellipse(x + 7, y - 4, 4, 2, 'fabric', 'creamShade');
  p.ellipse(x, y - 6, 7, 6, 'white', 'creamShade');
  p.poly([[x - 7, y - 19], [x - 6, y - 26], [x - 2, y - 21]], 'white', 'creamShade'); p.poly([[x + 7, y - 19], [x + 6, y - 26], [x + 2, y - 21]], 'white', 'creamShade');
  p.dot(x - 5, y - 23, 'pink'); p.dot(x + 5, y - 23, 'pink');
  p.ellipse(x, y - 17, 8, 6, 'white', 'creamShade');
  p.dot(x - 3, y - 17, 'ink'); p.dot(x + 3, y - 17, 'ink'); p.dot(x, y - 15, 'pink'); p.rect(x - 6, y - 15, 2, 1, 'pink'); p.rect(x + 5, y - 15, 2, 1, 'pink');
  p.ellipse(x - 4, y - 1, 3, 2, 'fabric', 'creamShade'); p.ellipse(x + 4, y - 1, 3, 2, 'fabric', 'creamShade');
 },
 controller(s) {
  const { p, P } = s; const [x, y] = P(.4, .3, 0);
  p.ellipse(x - 3, y, 4, 3, 'fabric', 'gray'); p.ellipse(x + 4, y, 4, 3, 'fabric', 'gray'); p.rect(x - 3, y - 2, 7, 4, 'fabric');
  p.dot(x - 4, y - 1, 'tealDark'); p.dot(x + 4, y - 1, 'pink'); p.dot(x + 5, y, 'teal');
 },
 pouf(s) {
  const { cyl, P, p } = s; cyl(.8, .8, .75, 0, 9, 'tealLight', 'teal', 'tealDark');
  const [x, y] = P(.8, .8, 9); p.ellipse(x, y, 10, 5, 'tealLight', 'tealShade'); p.dot(x, y, 'tealDark');
 },
 floorCushion(s) {
  const { box, line, top } = s;
  box(0, 0, 1.7, 1.6, 0, 6, ['fabric', 'fabricShade', 'creamShade']);
  for (const a of [.55, 1.1]) { line([a, .1, 6], [a, 1.5, 6], 'fabricShade'); line([.1, a, 6], [1.6, a, 6], 'fabricShade'); }
  top(.5, .5, .15, .15, 6, 'woodLight', null);
 },
 rug(s) {
  const { plaid, top, line } = s;
  top(0, 0, 10, 5.6, .5, 'fabric');
  plaid(.25, .25, 9.5, 5.1, .5, .55, ['fabric', 'plaidMid', 'plaidDark']);
  for (let x = .1; x < 10; x += .25) line([x, 5.6, .5], [x, 5.85, .5], 'fabricShade');
  for (let y = .1; y < 5.6; y += .25) line([10, y, .5], [10.25, y, .5], 'fabricShade');
 },
 sofa(s) {
  const { p, P, box, line, shadow, leg, plaidY, top, faceY } = s;
  shadow(5.4, 2.8);
  for (const [x, y] of [[.25, .2], [4.95, .2], [.25, 2.4], [4.95, 2.4]]) leg(x, y, 0, 5, .2, ['wood', 'woodShade', 'brownDark']);
  box(0, .2, 5.4, 2.6, 5, 11, ['fabric', 'fabric', 'fabricShade']);
  box(.2, 0, 5, .8, 5, 34, ['fabric', 'fabricShade', 'creamShade']);
  for (let x = 2.05; x < 4.6; x += 1.3) line([x, .8, 18], [x, .8, 36], 'fabricShade');
  box(0, .2, .75, 2.6, 5, 21, ['white', 'fabric', 'fabricShade']); faceY(0, 2.8, .75, 22, 4, 'white', null);
  for (let i = 0; i < 3; i++) { const x = .75 + i * 1.3; box(x, .8, 1.28, 1.95, 16, 6, ['white', 'fabric', 'fabricShade']); }
  plaidY(2.5, .82, 1.9, 14, 26, .38, 7, ['tealLight', 'teal', 'tealDark']); top(2.5, .2, 1.9, .62, 39, 'teal', 'tealDark');
  for (let x = 2.6; x < 4.4; x += .25) { const [a, b] = P(x, .82, 14); p.dot(a, b + 1, 'tealDark'); }
  box(3.3, .85, .9, .3, 21, 12, ['tealHi', 'tealLight', 'tealShade']);
  const [fx, fy] = P(1.5, 1.05, 30);
  for (let i = 0; i < 5; i++) { const t = i / 5 * Math.PI * 2 - Math.PI / 2; p.ellipse(fx + Math.cos(t) * 7, fy + Math.sin(t) * 6, 5, 4, 'fabric', 'woodShade'); }
  p.ellipse(fx, fy, 5, 4, 'sun', 'woodShade'); p.dot(fx - 2, fy, 'ink'); p.dot(fx + 2, fy, 'ink');
  box(4.65, .2, .75, 2.6, 5, 21, ['white', 'fabric', 'fabricShade']); faceY(4.65, 2.8, .75, 22, 4, 'white', null);
 },
 floorLamp(s) {
  const { p, P, cyl } = s;
  const [x, y] = P(.5, .5, 0); p.ellipse(x, y - 64, 26, 22, 'glow');
  cyl(.5, .5, .32, 0, 2, 'woodLight', 'wood', 'woodShade');
  p.rect(x, y - 60, 2, 58, 'brownDark'); p.dot(x + 1, y - 40, 'woodShade');
  p.poly([[x - 7, y - 76], [x + 8, y - 76], [x + 13, y - 58], [x - 12, y - 58]], 'lampLight', 'woodShade');
  p.line([x - 5, y - 73], [x - 9, y - 60], 'white'); p.line([x - 12, y - 58], [x + 13, y - 58], 'sun');
 },
 table(s) {
  const { box, leg, shadow, line, top } = s;
  shadow(4.2, 2.2);
  for (const [x, y] of [[.15, .15], [3.8, .15]]) leg(x, y, 0, 20, .25);
  box(.6, .6, 1.4, 1.1, 0, 10, ['fabric', 'white', 'fabricShade']);
  box(2.3, .8, 1.0, .9, 0, 9, ['tealLight', 'teal', 'tealDark']); line([2.6, 1.7, 5], [3, 1.7, 5], 'tealHi');
  for (const [x, y] of [[.15, 1.8], [3.8, 1.8]]) leg(x, y, 0, 20, .25);
  box(0, 0, 4.2, 2.2, 20, 4);
  for (let y = .55; y < 2.2; y += .55) line([.1, y, 24], [4.1, y, 24], 'woodLight');
  top(.2, .15, 3.8, .08, 24, 'woodHi', null);
 },
 handheld(s) {
  const { box, top } = s;
  box(0, 0, 1.3, .8, 0, 4, ['tealLight', 'fabric', 'tealDark']); top(.3, .15, .7, .45, 4, 'screen'); top(.1, .3, .1, .1, 4, 'black'); top(1.12, .3, .1, .1, 4, 'pink');
 },
 mug(s) {
  const { p, P, cyl } = s; cyl(.25, .25, .2, 0, 7, 'brownDark', 'tealLight', 'tealDark');
  const [x, y] = P(.25, .25, 4); p.ellipse(x + 6, y, 2, 2, 'tealLight', 'tealDark'); p.dot(x + 6, y, 'tealLight');
 },
 phone(s) { const { box, top } = s; box(0, 0, .45, .75, 0, 1, ['grayDark', 'black', 'black']); top(.06, .08, .33, .58, 1, 'screen', null); },
 sideTable(s) {
  const { box, faceY, faceX, line, shadow } = s;
  shadow(1.6, 1.6); box(0, 0, 1.6, 1.6, 0, 24);
  faceY(.12, 1.61, 1.36, 3, 18, 'deep'); faceY(.12, 1.62, 1.36, 12, 2, 'woodLight', null); bookRow(s, .2, 1.62, 1.2, 14, 8, 'Y', 5);
  faceY(.3, 1.62, .9, 3, 8, 'fabric'); line([.6, 1.63, 6], [.8, 1.63, 8], 'tealDark');
  faceX(1.61, .2, 1.2, 4, 15, 'fabric'); line([1.62, .5, 9], [1.62, .9, 12], 'tealLight');
 },
 desk(s) {
  const { box, leg, shadow, line, faceY } = s;
  const W = 4, D = 2.3;
  shadow(W, D);
  for (const [x, y] of [[.12, .12], [.12, D - .3]]) leg(x, y, 0, 30, .25);
  box(.4, .3, 1.3, 1.4, 0, 12, ['fabric', 'white', 'fabricShade']); line([.7, 1.7, 8], [1.3, 1.7, 8], 'fabricShade');
  box(W - 1.5, .1, 1.5, D - .1, 0, 30, ['woodLight', 'wood', 'woodShade']);
  for (const z of [3, 12, 21]) { faceY(W - 1.4, D + .01, 1.3, z, 8, 'tealLight'); line([W - .95, D + .02, z + 4], [W - .55, D + .02, z + 4], 'brownDark'); }
  box(0, 0, W, D, 30, 4);
  for (let y = .55; y < D; y += .55) line([.1, y, 34], [W - .1, y, 34], 'woodLight');
 },
 crt(s) {
  const { p, P, box, faceY, top, line } = s;
  box(.55, .1, 1.0, .7, 0, 3, ['cream', 'creamShade', 'gray']);
  box(.3, .1, 1.5, .8, 3, 18, ['cream', 'creamShade', 'gray']);
  box(0, .8, 2.1, .8, 3, 26, ['fabric', 'cream', 'creamShade']);
  faceY(.2, 1.61, 1.7, 7, 19, 'grayDark');
  const poly = [P(.32, 1.62, 9), P(1.78, 1.62, 9), P(1.78, 1.62, 24), P(.32, 1.62, 24)]; p.clip(poly);
  const [ax, ay] = poly[0]; p.rect(ax - 10, ay - 40, 60, 60, 'skyTop'); p.ellipse(ax + 12, ay - 8, 5, 2, 'cloud'); p.rect(ax - 10, ay - 3, 60, 10, 'tree');
  p.clip(null); faceY(.32, 1.62, 1.46, 9, 15, null, 'ink');
  line([.4, 1.63, 5], [.8, 1.63, 5], 'creamShade'); const [x, y] = P(1.8, 1.62, 5); p.dot(x, y, 'greenHi');
  top(.5, 1.0, .6, .3, 29, 'white', null);
 },
 keyboard(s) {
  const { box, top } = s;
  box(0, 0, 2.2, .7, 0, 2, ['fabric', 'creamShade', 'gray']);
  for (let x = .12; x < 2.05; x += .22) for (let y = .12; y < .55; y += .2) top(x, y, .16, .12, 2, 'white', 'creamShade');
 },
 mouse(s) { const { p, P } = s; const [x, y] = P(.2, .2, 0); p.ellipse(x, y - 1, 3, 2, 'fabric', 'gray'); p.dot(x, y - 2, 'gray'); },
 books(s) {
  const { box, line } = s;
  const colors = [['teal', 'tealLight', 'tealDark'], ['fabric', 'paper', 'creamShade'], ['pink', 'pink', 'woodShade']];
  colors.forEach((c, i) => { box(i * .05, 0, 1.1, .8, i * 3, 3, c); line([.1 + i * .05, .81, i * 3 + 1], [1 + i * .05, .81, i * 3 + 1], 'white'); });
 },
 chair(s) {
  const { box, leg, faceY, line, shadow } = s;
  shadow(1.6, 1.6);
  for (const [x, y] of [[.1, .1], [1.3, .1], [.1, 1.3], [1.3, 1.3]]) leg(x, y, 0, 16, .2);
  box(0, 0, 1.6, 1.6, 16, 3, ['woodLight', 'wood', 'woodShade']); box(.1, .1, 1.4, 1.35, 19, 3, ['tealHi', 'tealLight', 'tealShade']);
  for (const x of [.08, 1.32]) leg(x, 1.38, 19, 22, .2);
  faceY(.15, 1.5, 1.3, 30, 9, 'tealLight'); line([.2, 1.51, 37], [1.4, 1.51, 37], 'tealHi'); box(.05, 1.38, 1.5, .2, 39, 3);
 },
 bookcase(s) {
  const { box, faceY, faceX, line, shadow, P, p } = s;
  shadow(1.8, 1.6); box(0, 0, 1.8, 1.6, 0, 108, ['woodLight', 'wood', 'woodShade']);
  faceY(.12, 1.61, 1.56, 52, 52, 'deep');
  for (const [z, seed] of [[54, 1], [72, 6], [90, 3]]) { bookRow(s, .18, 1.62, 1.4, z, 14, 'Y', seed); faceY(.12, 1.62, 1.56, z - 2, 2, 'woodLight', null); }
  for (const [z, h] of [[4, 22], [28, 21]]) for (const x of [.12, .92]) { faceY(x, 1.61, .76, z, h, 'tealLight'); line([x + .55, 1.62, z + h / 2 - 2], [x + .55, 1.62, z + h / 2 + 2], 'brownDark'); }
  faceX(1.81, .5, .9, 50, 2, 'brownDark'); const [hx, hy] = P(1.81, .9, 52); p.line([hx, hy], [hx - 5, hy + 8], 'tealDark'); p.line([hx, hy], [hx + 5, hy + 6], 'tealDark');
  faceX(1.82, .4, .95, 26, 18, 'teal'); faceX(1.83, .55, .55, 30, 6, 'tealLight', null);
 },
 wardrobe(s) {
  const { box, faceY, faceX, line, shadow, P, vine } = s;
  shadow(3, 2.3); box(0, 0, 3, 2.3, 0, 116, ['white', 'fabric', 'fabricShade']);
  for (const x of [.15, 1.55]) { faceY(x, 2.31, 1.3, 32, 78, 'white'); line([x + (x < 1 ? 1.15 : .15), 2.32, 66], [x + (x < 1 ? 1.15 : .15), 2.32, 78], 'gray'); }
  for (const x of [.15, 1.55]) { faceY(x, 2.31, 1.3, 5, 24, 'tealLight'); line([x + .45, 2.32, 18], [x + .85, 2.32, 18], 'brownDark'); }
  faceY(2.05, 2.33, .45, 60, 12, 'white'); faceY(2.1, 2.34, .35, 63, 6, 'skyHi', null);
  box(.4, .3, 1.9, 1.3, 116, 14, ['tealHi', 'tealLight', 'tealShade']); line([.5, 1.6, 124], [2.2, 1.6, 124], 'tealDark');
  const [x, y] = P(3, 2.2, 116); vine(x - 2, y, 52, 3, 1); vine(x + 3, y - 4, 70, 2, 4);
  faceX(3.01, .2, 1.9, 4, 24, 'fabricShade', null);
 },
 door(s) {
  const { box, faceX, line, P, p } = s;
  box(0, -.25, .4, .25, 0, 96, ['woodLight', 'door', 'doorShade']);
  box(0, 0, .3, 2.2, 0, 92, ['doorHi', 'door', 'door']);
  for (const [y, z, h] of [[.25, 52, 34], [1.15, 52, 34], [.25, 8, 38], [1.15, 8, 38]]) { faceX(.31, y, .8, z, h, 'doorShade'); faceX(.32, y + .08, .64, z + 3, h - 5, 'door', null); }
  const [x, y] = P(.32, 1.95, 46); p.rect(x - 1, y - 1, 3, 2, 'sun'); p.dot(x + 2, y, 'yellow');
  box(0, 2.2, .4, .25, 0, 96, ['woodLight', 'door', 'doorShade']); box(0, -.25, .4, 2.7, 96, 5, ['woodLight', 'door', 'doorShade']);
  line([.31, .05, 90], [.31, 2.15, 90], 'doorHi');
 },
 shoeBox(s) {
  const { p, P, box, faceY, line, shadow } = s;
  shadow(1.3, 1.0); box(0, 0, 1.3, 1.0, 0, 14);
  faceY(.15, 1.01, 1.0, 3, 8, 'white'); line([.4, 1.02, 7], [.75, 1.02, 7], 'gray');
  for (const [dx, c] of [[.35, 'teal'], [.85, 'tealLight']]) { const [x, y] = P(dx, .5, 14); p.ellipse(x, y, 5, 3, c, 'tealDark'); p.ellipse(x - 2, y - 1, 2, 1, 'fabric'); }
 },
 entryMat(s) {
  const { p, P, top } = s;
  top(0, 0, 2.3, 1.6, .5, 'tealLight'); top(.15, .15, 2.0, 1.3, .5, 'teal', null);
  const [x, y] = P(1.15, .8, 1); p.ellipse(x, y, 7, 4, 'fabric'); p.ellipse(x - 5, y - 3, 2, 2, 'fabric'); p.ellipse(x + 5, y - 3, 2, 2, 'fabric'); p.dot(x - 2, y - 1, 'ink'); p.dot(x + 2, y - 1, 'ink'); p.dot(x, y + 1, 'pink');
 },
 mat(s) { const { top, line } = s; top(0, 0, 2.6, 1.3, .5, 'fabric'); top(.15, .15, 2.3, 1.0, .5, 'tealLight', null); for (let x = .4; x < 2.4; x += .4) line([x, .2, .5], [x, 1.1, .5], 'fabric'); },
};
