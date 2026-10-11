// Original pixel artwork: room shell only (floor, walls, window). Furniture will be separate hand-made images.
// 房间：x 沿右墙 0..23，y 沿左墙 0..15；右边 x 19..23 是凸出去的衣柜区，y 8..11.5 是低一阶的玄关。
export const ROOM = { width: 23, depth: 15, main: 19, nook: 8, entry: 11.5, wall: 144 };
const R = ROOM;

function boards({ top, line }, x0, y0, w, d, z, seed = 0, xmax = () => x0 + w) {
 const row = .75; const tones = ['floorA', 'floorB', 'floorC', 'floorA', 'floorB'];
 for (let r = 0; r * row < d - .001; r++) {
  const y = y0 + r * row, h = Math.min(row, d - r * row), end = xmax(y);
  const shift = ((r * 7 + seed) % 5) * .9; let x = x0, n = 0;
  while (x < end - .001) { const len = n === 0 ? 1.6 + shift : 4.5; const nx = Math.min(end, x + len); top(x, y, nx - x, h, z, tones[(r * 3 + n * 2 + seed) % 5], null); if ((r + n) % 3 === 0) line([x + .4, y + .18, z], [Math.min(nx - .3, x + 2.2), y + .18, z], 'floorHi'); if (nx < end) line([nx, y, z], [nx, y + h, z], 'floorSeam'); x = nx; n++; }
  if (r) line([x0, y, z], [end, y, z], 'floorSeam');
 }
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
};
