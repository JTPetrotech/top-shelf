
/* =========================================================================
   8.5  CAREER: COINS, PACKS, STICKS, SKATERS, TRAVEL TEAMS, FRIEND CODES

   Everything here is local. Coins are earned by winning and spent on packs;
   there is no real money anywhere in this file and never should be. Save
   data lives in localStorage under one key, so clearing site data wipes it.
   ========================================================================= */

var SAVE_KEY = 'ts_save_v1';

var RAR = [
  {k:'common', n:'Common',    c:'#8ea3b9', w:60,  mul:1.00, sell:20},
  {k:'rare',   n:'Rare',      c:'#5ad8ff', w:27,  mul:1.07, sell:70},
  {k:'epic',   n:'Epic',      c:'#c08cff', w:10,  mul:1.16, sell:220},
  {k:'legend', n:'Legendary', c:'#ffc43d', w:3,   mul:1.27, sell:700}
];
function rarOf(k){ for(var i=0;i<RAR.length;i++) if(RAR[i].k===k) return RAR[i]; return RAR[0]; }

/* ---- stick blueprints. pw = shot speed, ac = aim, ps = pass zip ---- */
var STICKS = [
  {k:'twig',    n:'The Twig',      pw:1.00, ac:1.00, ps:1.00, d:'Loaner from the bin by the door.'},
  {k:'birch',   n:'Birch 50',      pw:1.05, ac:1.03, ps:1.01, d:'Honest wood. Nothing fancy.'},
  {k:'sling',   n:'Slingshot',     pw:1.13, ac:0.97, ps:1.03, d:'Whippy. Loads fast, sprays wide.'},
  {k:'surgeon', n:'The Surgeon',   pw:1.02, ac:1.14, ps:1.06, d:'Picks corners. Will not blow anyone away.'},
  {k:'howitz',  n:'Howitzer',      pw:1.22, ac:0.92, ps:0.97, d:'Heavy as a fence post. Dents things.'},
  {k:'feather', n:'Featherweight', pw:1.06, ac:1.07, ps:1.12, d:'Barely there. Moves the puck quick.'},
  {k:'barbrk',  n:'Bar Breaker',   pw:1.17, ac:1.05, ps:1.00, d:'Rings iron for a living.'}
];

/* ---- skater blueprints. sp = skating, sh = shot, df = checking ---- */
var SKATER_CARDS = [
  {k:'grinder', n:'Grinder',    pos:'LW', sp:0.97, sh:0.95, df:1.18, d:'Lives in the corners.'},
  {k:'burner',  n:'Burner',     pos:'RW', sp:1.16, sh:1.00, df:0.90, d:'First to every loose puck.'},
  {k:'sniper',  n:'Sniper',     pos:'C',  sp:1.00, sh:1.18, df:0.88, d:'One look, one shot.'},
  {k:'anchor',  n:'Anchor',     pos:'D',  sp:0.92, sh:0.93, df:1.26, d:'Nobody gets through the middle.'},
  {k:'playmkr', n:'Playmaker',  pos:'C',  sp:1.05, sh:1.02, df:1.00, d:'Sees the pass before it opens.'},
  {k:'pest',    n:'Pest',       pos:'LW', sp:1.08, sh:0.94, df:1.12, d:'Insufferable. On your side, thankfully.'},
  {k:'twoway',  n:'Two-Way',    pos:'C',  sp:1.04, sh:1.05, df:1.08, d:'Does everything a little better.'},
  {k:'howitz2', n:'Blue Liner', pos:'D',  sp:0.95, sh:1.14, df:1.14, d:'Point shot you can hear outside.'}
];

var FIRST = ['Dale','Mick','Sven','Bobby','Ty','Ravi','Gus','Luc','Pete','Hal','Nils','Dom','Rory','Jo','Cal','Ira'];
var LAST  = ['Brennan','Kowalczyk','Lindholm','Ferraro','Okafor','Dube','Marchetti','Halloran','Vasko','Pike','Ostrom','Quinn','Bedard','Trahan'];

var PACKS = [
  {k:'tape',  n:'Tape Pack',  cost:150,  count:1, kind:'stick',  boost:0,
   d:'One stick. Mostly commons, but the bin surprises you.'},
  {k:'bench', n:'Bench Pack', cost:300,  count:1, kind:'skater', boost:0,
   d:'One skater card off the bench.'},
  {k:'pro',   n:'Pro Pack',   cost:800,  count:3, kind:'mix',    boost:1,
   d:'Three cards, sticks or skaters, with the odds tilted up.'},
  {k:'gold',  n:'Gold Pack',  cost:2000, count:3, kind:'mix',    boost:2, floor:'epic',
   d:'Three cards and at least one Epic, guaranteed.'}
];

var TEAMS = [
  {k:'sandlot', n:'Sandlot',     cost:0,    tier:0, pay:1.00, col:'#2f7fe0',
   d:'Your home rink. Whoever shows up, plays.'},
  {k:'ironwrk', n:'Ironworks',   cost:1200, tier:1, pay:1.55, col:'#d4a02a',
   d:'First travel team. Quicker games, better cheques.'},
  {k:'nstar',   n:'North Star',  cost:4000, tier:2, pay:2.30, col:'#3ec98a',
   d:'Regional circuit. Everyone out there can skate.'},
  {k:'overtm',  n:'Overtime AC', cost:9000, tier:3, pay:3.40, col:'#c08cff',
   d:'The real show. Pays like it, hurts like it.'}
];
function teamOf(k){ for(var i=0;i<TEAMS.length;i++) if(TEAMS[i].k===k) return TEAMS[i]; return TEAMS[0]; }

/* =========================================================================
   save data
   ========================================================================= */
var SAVE = null;
var uidSeq = 1;

function freshSave(){
  var s = {
    v: 1, coins: 400, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0,
    sticks: [], skaters: [], stick: null, line: [],
    teams: ['sandlot'], team: 'sandlot',
    handle: '', friends: [], opened: 0
  };
  var twig = mintStick('twig', 'common');
  s.sticks.push(twig); s.stick = twig.u;
  var a = mintSkater('grinder', 'common'), b = mintSkater('playmkr', 'common');
  s.skaters.push(a, b); s.line = [a.u, b.u];
  return s;
}

function uid(){ return 'x' + (Date.now().toString(36).slice(-5)) + (uidSeq++).toString(36) + Math.floor(Math.random()*1296).toString(36); }

function mintStick(k, rk){
  var b = null; for(var i=0;i<STICKS.length;i++) if(STICKS[i].k===k) b = STICKS[i];
  if(!b) b = STICKS[0];
  var r = rarOf(rk);
  return {u: uid(), t:'stick', k: b.k, n: b.n, r: r.k,
          pw: +(b.pw * r.mul).toFixed(3),
          ac: +(Math.min(1.34, b.ac * r.mul)).toFixed(3),
          ps: +(b.ps * r.mul).toFixed(3), d: b.d};
}

function mintSkater(k, rk){
  var b = null; for(var i=0;i<SKATER_CARDS.length;i++) if(SKATER_CARDS[i].k===k) b = SKATER_CARDS[i];
  if(!b) b = SKATER_CARDS[0];
  var r = rarOf(rk);
  var nm = FIRST[Math.floor(Math.random()*FIRST.length)] + ' ' + LAST[Math.floor(Math.random()*LAST.length)];
  return {u: uid(), t:'skater', k: b.k, n: b.n, who: nm, pos: b.pos, r: r.k,
          num: 2 + Math.floor(Math.random()*96),
          sp: +(Math.min(1.26, b.sp * r.mul)).toFixed(3),
          sh: +(b.sh * r.mul).toFixed(3),
          df: +(b.df * r.mul).toFixed(3), d: b.d};
}

function loadSave(){
  var raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch(e){}
  if(raw){
    try {
      var p = JSON.parse(raw);
      if(p && p.v === 1 && p.sticks && p.skaters){ SAVE = p; repairSave(); return; }
    } catch(e){}
  }
  SAVE = freshSave();
  saveNow();
}

/* a save edited by hand, or one that lost its equipped card, should not brick the game */
function repairSave(){
  if(!SAVE.sticks.length) SAVE.sticks.push(mintStick('twig','common'));
  if(!findCard(SAVE.stick)) SAVE.stick = SAVE.sticks[0].u;
  while(SAVE.skaters.length < 2) SAVE.skaters.push(mintSkater('grinder','common'));
  SAVE.line = (SAVE.line || []).filter(function(u){ var c = findCard(u); return c && c.t === 'skater'; });
  for(var i = 0; SAVE.line.length < 2 && i < SAVE.skaters.length; i++){
    if(SAVE.line.indexOf(SAVE.skaters[i].u) === -1) SAVE.line.push(SAVE.skaters[i].u);
  }
  SAVE.line = SAVE.line.slice(0, 2);
  if(!SAVE.teams || !SAVE.teams.length) SAVE.teams = ['sandlot'];
  if(SAVE.teams.indexOf(SAVE.team) === -1) SAVE.team = SAVE.teams[0];
  if(typeof SAVE.coins !== 'number' || SAVE.coins < 0) SAVE.coins = 0;
  if(!SAVE.friends) SAVE.friends = [];
}

function saveNow(){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch(e){}
}

function findCard(u){
  if(!u) return null;
  var i;
  for(i=0;i<SAVE.sticks.length;i++) if(SAVE.sticks[i].u === u) return SAVE.sticks[i];
  for(i=0;i<SAVE.skaters.length;i++) if(SAVE.skaters[i].u === u) return SAVE.skaters[i];
  return null;
}
function equippedStick(){ return findCard(SAVE.stick) || SAVE.sticks[0]; }
function lineCards(){
  var out = [];
  for(var i=0;i<SAVE.line.length;i++){ var c = findCard(SAVE.line[i]); if(c) out.push(c); }
  while(out.length < 2) out.push(SAVE.skaters[out.length] || mintSkater('grinder','common'));
  return out.slice(0,2);
}

/* =========================================================================
   pack opening
   ========================================================================= */
function rollRarity(boost){
  var w = [], i, total = 0;
  for(i=0;i<RAR.length;i++){
    var x = RAR[i].w;
    if(boost) x = x * Math.pow(i === 0 ? 0.55 : (i === 1 ? 1.15 : 2.1), boost);
    w.push(x); total += x;
  }
  var r = Math.random() * total;
  for(i=0;i<w.length;i++){ r -= w[i]; if(r <= 0) return RAR[i].k; }
  return 'common';
}

function openPack(p){
  var out = [], i;
  for(i = 0; i < p.count; i++){
    var kind = p.kind === 'mix' ? (Math.random() < 0.45 ? 'stick' : 'skater') : p.kind;
    var rk = rollRarity(p.boost);
    out.push(kind === 'stick'
      ? mintStick(STICKS[Math.floor(Math.random()*STICKS.length)].k, rk)
      : mintSkater(SKATER_CARDS[Math.floor(Math.random()*SKATER_CARDS.length)].k, rk));
  }
  // a guaranteed floor means one card gets bumped if nothing cleared the bar
  if(p.floor){
    var want = 0; for(i=0;i<RAR.length;i++) if(RAR[i].k === p.floor) want = i;
    var best = 0;
    for(i=0;i<out.length;i++){ var at = 0; for(var j=0;j<RAR.length;j++) if(RAR[j].k === out[i].r) at = j; if(at > best) best = at; }
    if(best < want){
      var pick = Math.floor(Math.random()*out.length), c = out[pick];
      out[pick] = c.t === 'stick' ? mintStick(c.k, p.floor) : mintSkater(c.k, p.floor);
    }
  }
  for(i=0;i<out.length;i++){
    if(out[i].t === 'stick') SAVE.sticks.push(out[i]); else SAVE.skaters.push(out[i]);
  }
  SAVE.opened += p.count;
  saveNow();
  return out;
}

function sellCard(u){
  var c = findCard(u);
  if(!c) return 0;
  if(c.u === SAVE.stick) return -1;                 // never sell what you are holding
  if(SAVE.line.indexOf(c.u) !== -1) return -1;
  if(c.t === 'stick' && SAVE.sticks.length <= 1) return -1;
  if(c.t === 'skater' && SAVE.skaters.length <= 2) return -1;
  var val = rarOf(c.r).sell;
  var list = c.t === 'stick' ? SAVE.sticks : SAVE.skaters;
  for(var i=0;i<list.length;i++) if(list[i].u === c.u){ list.splice(i,1); break; }
  SAVE.coins += val;
  saveNow();
  return val;
}

/* =========================================================================
   earnings
   ========================================================================= */
function matchReward(){
  // only against the CPU; two humans on one couch cannot farm each other
  if(G.humans === 2) return null;
  var a = G.score[0], b = G.score[1];
  var t = teamOf(SAVE.team);
  var base = a > b ? 120 : (a === b ? 45 : 25);
  var goals = a * 12;
  var shut = (a > b && b === 0) ? 60 : 0;
  var diffBonus = [0, 20, 45][G.diff] || 0;
  var total = Math.round((base + goals + shut + diffBonus) * t.pay);
  SAVE.coins += total;
  SAVE.gf += a; SAVE.ga += b;
  if(a > b) SAVE.wins++; else if(a === b) SAVE.draws++; else SAVE.losses++;
  saveNow();
  return {total: total, base: base, goals: goals, shut: shut, diff: diffBonus, mult: t.pay, team: t.n};
}

/* =========================================================================
   who you are playing against
   ========================================================================= */
var oppOverride = null;        // a friend's squad, or null for the house team

/* two humans on one couch skate identical gear - the couch decides it, not the collection */
var NEUT_NUM = [9, 21, 4, 17];
function neutralCard(i){
  return {u:'n'+i, t:'skater', k:'twoway', n:'Skater', who:'Skater', pos:'C', r:'common',
          num: NEUT_NUM[i], sp:1, sh:1, df:1, d:''};
}

function oppLine(){
  if(oppOverride && oppOverride.line && oppOverride.line.length === 2) return oppOverride.line;
  var tier = teamOf(SAVE.team).tier;
  var pool = SKATER_CARDS, rk = ['common','rare','epic','legend'][tier] || 'common';
  var a = mintSkater(pool[Math.floor(Math.random()*pool.length)].k, rk);
  var b = mintSkater(pool[Math.floor(Math.random()*pool.length)].k, rk);
  return [a, b];
}
function oppName(){
  if(oppOverride) return (oppOverride.handle || 'Friend').slice(0, 10).toUpperCase();
  return G.humans === 2 ? 'P2' : 'CPU';
}
function oppStickPower(){
  if(oppOverride && oppOverride.stick) return oppOverride.stick;
  var tier = teamOf(SAVE.team).tier;
  return {pw: 1 + tier * 0.05, ac: 1 + tier * 0.04, ps: 1};
}

/* =========================================================================
   friend codes - a squad squeezed into a string you can text someone
   ========================================================================= */
function b64enc(s){
  try { return btoa(unescape(encodeURIComponent(s))).replace(/=+$/, ''); }
  catch(e){ return ''; }
}
function b64dec(s){
  try { return decodeURIComponent(escape(atob(s))); }
  catch(e){ return ''; }
}
function packCard(c){
  return c.t === 'stick'
    ? ['S', c.k, c.r].join('~')
    : ['K', c.k, c.r, c.num, (c.who || '').replace(/[~|]/g, '')].join('~');
}
function unpackCard(s){
  var p = String(s).split('~');
  if(p[0] === 'S') return mintStick(p[1], p[2]);
  var c = mintSkater(p[1], p[2]);
  if(p[3]) c.num = Math.max(1, Math.min(99, parseInt(p[3], 10) || c.num));
  if(p[4]) c.who = p[4].slice(0, 22);
  return c;
}
function sum32(s){
  var h = 5381;
  for(var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(-5);
}

function myCode(){
  var ln = lineCards(), st = equippedStick();
  var body = [
    (SAVE.handle || 'Player').replace(/[~|]/g, '').slice(0, 12),
    SAVE.team,
    packCard(st),
    packCard(ln[0]),
    packCard(ln[1])
  ].join('|');
  return 'TS1-' + b64enc(body + '|' + sum32(body));
}
function readCode(code){
  code = String(code || '').trim().replace(/\s+/g, '');
  if(code.slice(0, 4).toUpperCase() !== 'TS1-') return null;
  var body = b64dec(code.slice(4));
  if(!body) return null;
  var p = body.split('|');
  if(p.length !== 6) return null;
  var given = p.pop();
  if(given !== sum32(p.join('|'))) return null;      // clipped or edited in transit
  var st, a, b;
  try { st = unpackCard(p[2]); a = unpackCard(p[3]); b = unpackCard(p[4]); }
  catch(e){ return null; }
  if(!st || !a || !b) return null;
  return {handle: p[0].slice(0, 12) || 'Friend', team: teamOf(p[1]).k,
          stick: {pw: st.pw, ac: st.ac, ps: st.ps}, line: [a, b], code: code};
}
function addFriend(code){
  var f = readCode(code);
  if(!f) return {ok: false, why: 'That code does not read as a Top Shelf squad.'};
  if(f.code === myCode()) return {ok: false, why: 'That is your own code.'};
  for(var i=0;i<SAVE.friends.length;i++){
    if(SAVE.friends[i].handle.toLowerCase() === f.handle.toLowerCase()){
      SAVE.friends[i] = f; saveNow();
      return {ok: true, updated: true, friend: f};
    }
  }
  SAVE.friends.push(f);
  saveNow();
  return {ok: true, friend: f};
}
