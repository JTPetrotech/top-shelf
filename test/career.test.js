/*
 * Tests for the career module (parts/45-meta.js) and the stick looks that
 * parts/30-players.js builds from it. No framework: run it with
 *
 *     node test/career.test.js
 *
 * It loads 45-meta.js into a sandbox with just enough of a browser around it
 * (a fake localStorage, btoa/atob) and then pokes at the real functions.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const PARTS = path.join(__dirname, '..', 'parts');
// loadSave() migrates through 47-career2.js, so the two ship and test together
const metaSrc = fs.readFileSync(path.join(PARTS, '45-meta.js'), 'utf8') + '\n' +
                fs.readFileSync(path.join(PARTS, '47-career2.js'), 'utf8');
const playersSrc = fs.readFileSync(path.join(PARTS, '30-players.js'), 'utf8');

const store = {};
const ctx = {
  G: {humans: 1, score: [0, 0], diff: 1},
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  },
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString('binary'),
  MATS: null,                       // no renderer in here, so applyKits no-ops
  STICK_LOOKS: {twig:{}, birch:{}, howitz:{}},
  unescape, escape, Math, Date, JSON, console
};
vm.createContext(ctx);
vm.runInContext(metaSrc, ctx);
const M = ctx;

let fails = 0;
function ok(name, cond, extra){
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   ' + extra : ''));
  if(!cond) fails++;
}

/* ---------------- save data ---------------- */
M.loadSave();
ok('fresh save starts with a stick and two skaters',
   M.SAVE.sticks.length === 1 && M.SAVE.skaters.length === 2 && M.SAVE.line.length === 2);
ok('starting coins', M.SAVE.coins === 400, 'coins=' + M.SAVE.coins);

/* ---------------- payouts ---------------- */
M.SAVE.coins = 0; ctx.G.score = [3, 1]; ctx.G.diff = 1;
let r = M.matchReward();
ok('win pays base + goals + skill', r.total === 120 + 36 + 20, 'got ' + r.total);
ok('win is recorded', M.SAVE.wins === 1 && M.SAVE.gf === 3 && M.SAVE.ga === 1);

M.SAVE.coins = 0; ctx.G.score = [2, 0];
ok('shutout bonus applies', M.matchReward().shut === 60);

M.SAVE.coins = 0; ctx.G.score = [0, 4];
r = M.matchReward();
ok('a loss still pays something small', r.total === 25 + 20 && M.SAVE.losses === 1, 'got ' + r.total);

M.SAVE.coins = 0; M.SAVE.team = 'overtm'; M.SAVE.teams.push('overtm'); ctx.G.score = [1, 0];
r = M.matchReward();
ok('travel team multiplies the payout',
   Math.abs(r.mult - 3.4) < 1e-9 && r.total === Math.round((120 + 12 + 60 + 20) * 3.4), 'got ' + r.total);
M.SAVE.team = 'sandlot';

ctx.G.humans = 2;
ok('two humans on one couch earn nothing', M.matchReward() === null);
ctx.G.humans = 1;

/* ---------------- pack odds ---------------- */
const N = 40000, seen = {common: 0, rare: 0, epic: 0, legend: 0};
for(let i = 0; i < N; i++) seen[M.rollRarity(0)]++;
const pc = k => seen[k] / N * 100;
ok('common odds land near 60%', Math.abs(pc('common') - 60) < 1.5, pc('common').toFixed(1) + '%');
ok('legendary odds land near 3%', Math.abs(pc('legend') - 3) < 0.7, pc('legend').toFixed(2) + '%');

const boosted = {common: 0, rare: 0, epic: 0, legend: 0};
for(let i = 0; i < N; i++) boosted[M.rollRarity(2)]++;
ok('gold-tier boost raises the top end', boosted.legend / N > seen.legend / N * 3,
   (boosted.legend / N * 100).toFixed(2) + '% vs ' + pc('legend').toFixed(2) + '%');

const gold = M.PACKS.filter(p => p.k === 'gold')[0];
let floorHeld = true;
for(let i = 0; i < 300; i++){
  const got = M.openPack(gold);
  const best = Math.max.apply(null, got.map(c => ['common','rare','epic','legend'].indexOf(c.r)));
  if(best < 2) floorHeld = false;
}
ok('gold pack always contains an epic or better', floorHeld);

/* ---------------- selling guards ---------------- */
M.SAVE = null; store.ts_save_v1 = ''; M.loadSave();
ok('cannot sell the stick in your hands', M.sellCard(M.SAVE.stick) === -1);
ok('cannot sell a dressed skater', M.sellCard(M.SAVE.line[0]) === -1);
const spare = M.mintStick('howitz', 'epic'); M.SAVE.sticks.push(spare);
const before = M.SAVE.coins;
ok('a spare sells for its rarity', M.sellCard(spare.u) === 220 && M.SAVE.coins === before + 220);

/* ---------------- friend codes ---------------- */
M.SAVE.handle = 'Dale';
const code = M.myCode();
const read = M.readCode(code);
ok('a code reads back as the same squad',
   read && read.handle === 'Dale' &&
   read.line[0].k === M.lineCards()[0].k &&
   Math.abs(read.stick.pw - M.equippedStick().pw) < 1e-9);
ok('a code carries which stick they hold', read && read.stick.k === M.equippedStick().k,
   read ? 'k=' + read.stick.k : 'no read');
ok('junk is rejected', M.readCode('TS1-zzzz') === null && M.readCode('hello') === null);
ok('a clipped code is rejected', M.readCode(code.slice(0, code.length - 30)) === null);

/* ---------------- a mangled save must not brick the game ---------------- */
store.ts_save_v1 = JSON.stringify({v: 1, sticks: [], skaters: [], line: ['gone'], coins: -5, team: 'nope', teams: []});
M.SAVE = null; M.loadSave();
ok('a corrupt save is repaired, not fatal',
   M.SAVE.sticks.length >= 1 && M.SAVE.skaters.length >= 2 && M.SAVE.line.length === 2 &&
   M.SAVE.coins === 0 && M.SAVE.team === 'sandlot');

/* ---------------- gear ceiling ---------------- */
let maxGear = 0;
for(const s of M.STICKS) for(const rr of M.RAR){
  const st = M.mintStick(s.k, rr.k);
  for(const c of M.SKATER_CARDS) for(const rr2 of M.RAR){
    maxGear = Math.max(maxGear, st.pw * M.mintSkater(c.k, rr2.k).sh);
  }
}
ok('raw gear can exceed the 1.45 clamp shoot() applies', maxGear > 1.45,
   'raw max ' + maxGear.toFixed(2) + 'x');

/* ---------------- every stick has a look, and the opponent always has a key ---------------- */
const looks = [...playersSrc.matchAll(/^  ([a-z0-9]+):\s*\{shaft:/gm)].map(m => m[1]);
const missing = M.STICKS.map(s => s.k).filter(k => !looks.includes(k));
ok('every stick blueprint has its own look on the ice', missing.length === 0,
   missing.length ? 'missing: ' + missing.join(', ') : looks.length + ' looks');

M.SAVE.team = 'sandlot'; M.oppOverride = null;
ok('house opponent carries a stick key', !!M.oppStickPower().k, 'k=' + M.oppStickPower().k);
M.SAVE.teams.push('overtm'); M.SAVE.team = 'overtm';
ok('a tougher circuit changes the opponent stick',
   M.oppStickPower().k !== 'birch' && M.oppStickPower().pw > 1, 'k=' + M.oppStickPower().k);

console.log(fails ? '\n' + fails + ' FAILED' : '\nall good');
process.exit(fails ? 1 : 0);
