/*
 * Tests for kits, custom sticks, pro mode, franchise seasons and story
 * chapters (parts/47-career2.js, on top of parts/45-meta.js).
 *
 *     node test/career2.test.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const PARTS = path.join(__dirname, '..', 'parts');
const read = f => fs.readFileSync(path.join(PARTS, f), 'utf8');

const store = {};
const ctx = {
  G: {humans: 1, score: [0, 0], diff: 1, surface: 'ice'},
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  },
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString('binary'),
  MATS: null,                       // no renderer here, so applyKits no-ops
  STICK_LOOKS: {
    twig:   {curve:0.028, len:0.32, h0:0.082, h1:0.060, thick:0.024, girth:1.00},
    birch:  {curve:0.038, len:0.34, h0:0.082, h1:0.060, thick:0.024, girth:1.00},
    howitz: {curve:0.048, len:0.37, h0:0.090, h1:0.066, thick:0.030, girth:1.16}
  },
  unescape, escape, Math, Date, JSON, console
};
vm.createContext(ctx);
vm.runInContext(read('45-meta.js') + '\n' + read('47-career2.js'), ctx);
const M = ctx;

let fails = 0;
function ok(name, cond, extra){
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   ' + extra : ''));
  if(!cond) fails++;
}

M.loadSave();

/* ---------------- migration ---------------- */
ok('a fresh save gets the new fields', M.SAVE.kit === 'home' && M.SAVE.pro === false &&
   M.SAVE.story === 0 && M.SAVE.season === null && M.SAVE.mode === 'exhibition');

store.ts_save_v1 = JSON.stringify({v:1, coins:500, sticks:[M.mintStick('twig','common')],
  skaters:[M.mintSkater('grinder','common'), M.mintSkater('pest','common')],
  line:[], teams:['sandlot'], team:'sandlot', friends:[]});
M.SAVE = null; M.loadSave();
ok('an old save without them is filled in, not wiped',
   M.SAVE.coins === 500 && M.SAVE.kit === 'home' && M.SAVE.mode === 'exhibition' && M.SAVE.story === 0);

/* ---------------- jerseys ---------------- */
M.SAVE.teams = ['sandlot'];
ok('the three starter kits are free', M.ownedKits().length === 3);
ok('a team kit is locked until you buy the team', M.kitOwned(M.kitOf('bulldog')) === false);
M.SAVE.teams.push('bulldog');
ok('buying the team hands you its kit, free', M.kitOwned(M.kitOf('bulldog')) === true);
ok('and it costs nothing extra', M.kitOf('bulldog').cost === undefined);
ok('every team in the ladder has a kit',
   M.TEAMS.filter(t => t.k !== 'sandlot').every(t => M.KITS.some(k => k.team === t.k)));
ok('the away side never wears your kit',
   M.KITS.every(k => M.awayKitFor(k).k !== k.k));
ok('and never anything you could confuse with it',
   M.KITS.every(k => M.kitDistance(M.awayKitFor(k).jersey, k.jersey) > 120),
   M.KITS.map(k => k.n + '->' + M.awayKitFor(k).n + ' ' + Math.round(M.kitDistance(M.awayKitFor(k).jersey, k.jersey))).join('; '));

/* ---------------- custom sticks ---------------- */
M.SAVE.coins = 20000;
const before = M.SAVE.sticks.length;
const c = M.buyCustomStick('howitz', 'epic', 0xffc43d, 0x15191f, 'The Hammer');
ok('a custom stick is built and added', !!c && M.SAVE.sticks.length === before + 1);
ok('it costs what the grade says', M.SAVE.coins === 20000 - M.customCost('epic'), 'coins=' + M.SAVE.coins);
ok('you get the grade you paid for, no gamble', c.r === 'epic');
ok('it carries its own look', !!c.look && c.look.shaft === 0xffc43d && c.look.tape === 0x15191f);
ok('the look keeps the shape it was built from', c.look.curve === M.STICK_LOOKS.howitz.curve);
ok('it takes the name you gave it', c.n === 'The Hammer');
ok('and you are holding it', M.SAVE.stick === c.u);
ok('its stats match the blueprint at that grade',
   Math.abs(c.pw - M.mintStick('howitz', 'epic').pw) < 1e-9);

M.SAVE.coins = 10;
ok('you cannot build one you cannot afford', M.buyCustomStick('birch', 'legend', 1, 2, 'x') === null);
ok('and nothing was taken', M.SAVE.coins === 10);

const nasty = M.mintCustomStick('birch', 'rare', 1, 2, '<script>alert(1)</script>');
ok('a name cannot smuggle markup in', nasty.n.indexOf('<') === -1 && nasty.n.indexOf('>') === -1, nasty.n);

/* ---------------- pro mode ---------------- */
M.SAVE.pro = false; M.SAVE.coins = 0; M.SAVE.team = 'sandlot';
ctx.G.score = [2, 1];
const plain = M.matchReward().total;
M.SAVE.pro = true; M.SAVE.coins = 0;
ctx.G.score = [2, 1];
const pro = M.matchReward().total;
ok('pro mode pays 1.8x', Math.abs(pro - Math.round(plain * 1.8)) <= 1, plain + ' -> ' + pro);
ok('pro periods are longer than normal', M.PRO.periodLen > 60);
ok('pro cuts the aim assist right down', M.PRO.aimAssist < 0.5);
M.SAVE.pro = false;

/* ---------------- franchise ---------------- */
M.SAVE.season = M.newSeason('bulldog');
let s = M.SAVE.season;
ok('a season plays everyone home and away', s.games.length === (M.LEAGUE.length - 1) * 2, s.games.length + ' games');
ok('you are never scheduled against yourself', s.games.every(g => g.opp !== 'bulldog'));
ok('each rival appears exactly twice',
   M.LEAGUE.filter(t => t.k !== 'bulldog').every(t => s.games.filter(g => g.opp === t.k).length === 2));
ok('half the games are at home', s.games.filter(g => g.home).length === s.games.length / 2);
ok('the table starts empty', s.table.every(r => r.w === 0 && r.l === 0 && r.d === 0));
ok('the fixture list is not in a fixed order',
   s.games.map(g => g.opp).join(',') !== M.LEAGUE.filter(t => t.k !== 'bulldog').map(t => t.k).join(','));

const firstOpp = M.nextFixture().opp;
M.recordSeasonGame(4, 1);
let me = M.SAVE.season.table.find(r => r.k === 'bulldog');
let them = M.SAVE.season.table.find(r => r.k === firstOpp);
ok('a win is recorded for you', me.w === 1 && me.gf === 4 && me.ga === 1);
ok('and the loss for them', them.l === 1 && them.gf === 1 && them.ga === 4);
ok('the season moves on a game', M.SAVE.season.game === 1);
ok('and the next fixture is a different opponent or leg',
   M.nextFixture() && M.nextFixture() !== s.games[0]);

// play the rest out and make sure it closes cleanly
let guard = 0;
while(!M.SAVE.season.done && guard++ < 200) M.recordSeasonGame(2, 2);
ok('a full season finishes', M.SAVE.season.done === true, guard + ' games recorded');
ok('a champion is named', !!M.SAVE.season.champion && M.LEAGUE.some(t => t.k === M.SAVE.season.champion));
ok('every club played the same number of games',
   (function(){
     const counts = M.SAVE.season.table.map(r => r.w + r.l + r.d);
     return Math.max.apply(null, counts) - Math.min.apply(null, counts) <= 2;
   })(), M.SAVE.season.table.map(r => r.w + r.l + r.d).join(','));
ok('goals for across the table equal goals against',
   M.SAVE.season.table.reduce((a, r) => a + r.gf, 0) === M.SAVE.season.table.reduce((a, r) => a + r.ga, 0));
ok('recording past the end is refused', M.recordSeasonGame(9, 0) === null);

/* ---------------- story ---------------- */
M.SAVE.story = 0; M.SAVE.coins = 0;
ok('chapter one just wants a win', M.STORY[0].test(1, 0) === true && M.STORY[0].test(0, 1) === false);
let r1 = M.finishStoryChapter(0, 3);
ok('losing does not advance the story', r1.passed === false && M.SAVE.story === 0);
ok('and pays no bonus', M.SAVE.coins === 0);
r1 = M.finishStoryChapter(2, 0);
ok('winning advances it', r1.passed === true && M.SAVE.story === 1);
ok('and pays the chapter bonus', M.SAVE.coins === M.STORY[0].pay, 'coins=' + M.SAVE.coins);

ok('chapter two wants a two-goal win',
   M.STORY[1].test(3, 1) === true && M.STORY[1].test(2, 1) === false);
ok('the shutout chapter wants a clean sheet',
   M.STORY[4].test(1, 0) === true && M.STORY[4].test(5, 1) === false);
ok('the last chapter wants three clear',
   M.STORY[6].test(4, 1) === true && M.STORY[6].test(3, 1) === false);
ok('one chapter is on roller', M.STORY.some(c => c.surface === 'roller'));
ok('every chapter states its goal and pays something',
   M.STORY.every(c => c.goal && c.title && c.brief && c.pay > 0));
ok('the bonuses climb', M.STORY.every((c, i) => i === 0 || c.pay > M.STORY[i - 1].pay));

M.SAVE.story = M.STORY.length;
ok('a finished story reports done', M.storyDone() === true);
ok('and asks for nothing more', M.finishStoryChapter(9, 0) === null);

console.log(fails ? '\n' + fails + ' FAILED' : '\nall good');
process.exit(fails ? 1 : 0);
