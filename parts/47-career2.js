
/* =========================================================================
   8.7  KITS, CUSTOM STICKS, PRO MODE, FRANCHISE, STORY

   Still no real money anywhere. Coins come from playing; jerseys come free
   with the team you bought. Everything here hangs off the same SAVE object
   and the same localStorage key.
   ========================================================================= */

/* ---------------- jerseys ----------------
   A kit is what the team wears. The three starters are free; every travel
   team you buy hands you its own kit at no extra cost. */
var KITS = [
  {k:'home',  n:'Sandlot Blue', free:true,  jersey:0x2f7fe0, trim:0x14365f, helmet:0x1b4a85, glove:0x17406f},
  {k:'away',  n:'Road Red',     free:true,  jersey:0xe04a33, trim:0x6d1f14, helmet:0x8d2b1c, glove:0x7a2416},
  {k:'white', n:'Classic White',free:true,  jersey:0xe9eef5, trim:0x24324a, helmet:0xdfe6ee, glove:0x2a3a52},
  {k:'ironwrk', n:'Ironworks Gold', team:'ironwrk', jersey:0xd4a02a, trim:0x4a3410, helmet:0x8c6612, glove:0x5c4314},
  {k:'bulldog', n:'Bulldog Rust',   team:'bulldog', jersey:0xc2542c, trim:0x4e1f0e, helmet:0x7d3317, glove:0x5e2712},
  {k:'nstar',   n:'North Star Green', team:'nstar', jersey:0x3ec98a, trim:0x14503a, helmet:0x1f6e4f, glove:0x18563d},
  {k:'overtm',  n:'Overtime Violet',  team:'overtm', jersey:0xc08cff, trim:0x442a66, helmet:0x6b45a0, glove:0x53357d}
];
function kitOf(k){ for(var i=0;i<KITS.length;i++) if(KITS[i].k === k) return KITS[i]; return KITS[0]; }
function kitOwned(kit){
  if(kit.free) return true;
  return !kit.team || SAVE.teams.indexOf(kit.team) !== -1;
}
function ownedKits(){ return KITS.filter(kitOwned); }

/* "Not the same kit" is not enough: Bulldog Rust against Road Red put two
   near-identical sides on the ice. Pick the kit furthest from yours in colour. */
function rgbOf(hex){ return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]; }
function kitDistance(a, b){
  var x = rgbOf(a), y = rgbOf(b);
  var dr = x[0] - y[0], dg = x[1] - y[1], db = x[2] - y[2];
  return Math.sqrt(dr*dr + dg*dg + db*db);
}
function awayKitFor(homeKit){
  var best = null, bd = -1;
  for(var i = 0; i < KITS.length; i++){
    if(KITS[i].k === homeKit.k) continue;
    var d = kitDistance(KITS[i].jersey, homeKit.jersey);
    if(d > bd){ bd = d; best = KITS[i]; }
  }
  return best || KITS[1];
}

function applyKits(){
  if(!MATS) return;
  var home = kitOf(SAVE.kit), away = awayKitFor(home);
  [[0, home], [1, away]].forEach(function(p){
    var mt = MATS.teams[p[0]], kit = p[1];
    mt.jersey.color.setHex(kit.jersey);
    mt.trim.color.setHex(kit.trim);
    mt.helmet.color.setHex(kit.helmet);
    mt.glove.color.setHex(kit.glove);
  });
}

/* ---------------- custom sticks ----------------
   You pick the shape (which decides the stats), then paint it. The rarity you
   pay for is the rarity you get - no gamble, which is the point of paying for
   it rather than pulling a pack. */
var PAINTS = [
  {n:'Bone',    c:0xe9eef5}, {n:'Charcoal', c:0x1b222c}, {n:'Blood',  c:0xa32a1c},
  {n:'Ice',     c:0x5ad8ff}, {n:'Forest',   c:0x2e7d53}, {n:'Gold',   c:0xffc43d},
  {n:'Violet',  c:0xa06ce0}, {n:'Rust',     c:0xc2542c}, {n:'Navy',   c:0x1d3a6b},
  {n:'Mint',    c:0x7fe0c0}, {n:'Hot Pink', c:0xf05a9b}, {n:'Sand',   c:0xd9b887}
];
var TAPES = [
  {n:'Black',   c:0x15191f}, {n:'White',    c:0xf2f6fa}, {n:'Red',     c:0x9c2a1c},
  {n:'Blue',    c:0x1f4f8f}, {n:'Gold',     c:0xb3842a}, {n:'Green',   c:0x2e7d53},
  {n:'Orange',  c:0xd2691e}, {n:'Purple',   c:0x6b45a0}, {n:'Pink',    c:0xd4588f},
  {n:'Teal',    c:0x1f7f87}, {n:'Camo',     c:0x55613c}, {n:'Sky',     c:0x5ad8ff},
  {n:'Maroon',  c:0x5e1b22}, {n:'Sand',     c:0xcbb089}, {n:'Lime',    c:0x9ad428},
  {n:'Slate',   c:0x4a5869}, {n:'Copper',   c:0xa65e2e}, {n:'Mint',    c:0x7fe0c0}
];
var CUSTOM_PRICE = {rare: 1500, epic: 4500, legend: 14000};

function customCost(rk){ return CUSTOM_PRICE[rk] || CUSTOM_PRICE.rare; }

/* A custom stick is an ordinary stick card that also carries its own look.
   buildStick() reads look straight off the card when one is there. */
function mintCustomStick(blueprint, rk, paintHex, tapeHex, name){
  var c = mintStick(blueprint, rk);
  c.custom = true;
  c.n = (name || '').replace(/[~|<>]/g, '').slice(0, 18) || c.n;
  var base = STICK_LOOKS[blueprint] || STICK_LOOKS.twig;
  c.look = {
    shaft: paintHex, grip: 0x1b222c, tape: tapeHex,
    curve: base.curve, len: base.len, h0: base.h0, h1: base.h1,
    thick: base.thick, girth: base.girth, lie: base.lie
  };
  return c;
}

function buyCustomStick(blueprint, rk, paintHex, tapeHex, name){
  var cost = customCost(rk);
  if(SAVE.coins < cost) return null;
  SAVE.coins -= cost;
  var c = mintCustomStick(blueprint, rk, paintHex, tapeHex, name);
  SAVE.sticks.push(c);
  SAVE.stick = c.u;                       // you paid for it, you are holding it
  saveNow();
  return c;
}

/* ---------------- pro mode ----------------
   Not just "the CPU is better": the help comes off. */
var PRO = {
  payMult: 1.8,
  periodLen: 90,
  aimAssist: 0.25,      // fraction of the usual aim assist you keep
  goalieBoost: 1.22,
  oppAcc: 1.10
};
function proOn(){ return !!SAVE.pro; }

/* ---------------- franchise ----------------
   A season against the whole league, with a table and a final. */
var LEAGUE = [
  {k:'sandlot', n:'Sandlot',     str:0.86},
  {k:'ironwrk', n:'Ironworks',   str:0.94},
  {k:'bulldog', n:'Bulldogs',    str:1.00},
  {k:'nstar',   n:'North Star',  str:1.07},
  {k:'overtm',  n:'Overtime AC', str:1.14},
  {k:'harbour', n:'Harbour Rats',str:0.90},
  {k:'millers', n:'Millers',     str:0.98},
  {k:'cinders', n:'Cinder Kings',str:1.04}
];
function leagueOf(k){ for(var i=0;i<LEAGUE.length;i++) if(LEAGUE[i].k === k) return LEAGUE[i]; return LEAGUE[0]; }

function newSeason(teamKey){
  var opponents = LEAGUE.filter(function(t){ return t.k !== teamKey; });
  var games = [];
  // home and away against everyone else, then shuffled so it is not a pattern
  for(var leg = 0; leg < 2; leg++){
    for(var i = 0; i < opponents.length; i++) games.push({opp: opponents[i].k, home: leg === 0, played: false, gf: 0, ga: 0});
  }
  for(var j = games.length - 1; j > 0; j--){
    var r = Math.floor(Math.random() * (j + 1));
    var tmp = games[j]; games[j] = games[r]; games[r] = tmp;
  }
  return {
    team: teamKey, game: 0, games: games,
    table: LEAGUE.map(function(t){ return {k: t.k, w: 0, l: 0, d: 0, gf: 0, ga: 0}; }),
    done: false, champion: null
  };
}
function row(season, k){
  for(var i = 0; i < season.table.length; i++) if(season.table[i].k === k) return season.table[i];
  return null;
}
function pts(r){ return r.w * 2 + r.d; }
function standings(season){
  return season.table.slice().sort(function(a, b){
    return pts(b) - pts(a) || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;
  });
}
function nextFixture(){
  var s = SAVE.season;
  if(!s || s.done || s.game >= s.games.length) return null;
  return s.games[s.game];
}

/* Everyone else's results are simulated from team strength, so the table
   moves while you play your own games. */
function simOtherGames(skipA, skipB){
  var s = SAVE.season, i, j;
  var teams = LEAGUE.filter(function(t){ return t.k !== skipA && t.k !== skipB; });
  for(i = 0; i < teams.length; i += 2){
    var a = teams[i], b = teams[i + 1];
    if(!b) break;
    var ga = Math.max(0, Math.round(2.6 * a.str + (Math.random() - 0.5) * 3));
    var gb = Math.max(0, Math.round(2.6 * b.str + (Math.random() - 0.5) * 3));
    var ra = row(s, a.k), rb = row(s, b.k);
    if(!ra || !rb) continue;
    ra.gf += ga; ra.ga += gb; rb.gf += gb; rb.ga += ga;
    if(ga > gb){ ra.w++; rb.l++; } else if(gb > ga){ rb.w++; ra.l++; } else { ra.d++; rb.d++; }
  }
}

function recordSeasonGame(myGoals, theirGoals){
  var s = SAVE.season;
  if(!s || s.done) return null;
  var fx = s.games[s.game];
  if(!fx) return null;
  fx.played = true; fx.gf = myGoals; fx.ga = theirGoals;
  var me = row(s, s.team), them = row(s, fx.opp);
  if(me && them){
    me.gf += myGoals; me.ga += theirGoals;
    them.gf += theirGoals; them.ga += myGoals;
    if(myGoals > theirGoals){ me.w++; them.l++; }
    else if(theirGoals > myGoals){ them.w++; me.l++; }
    else { me.d++; them.d++; }
  }
  simOtherGames(s.team, fx.opp);
  s.game++;
  if(s.game >= s.games.length){
    s.done = true;
    s.champion = standings(s)[0].k;
    SAVE.coins += s.champion === s.team ? 25000 : 4000;
  }
  saveNow();
  return fx;
}

/* ---------------- story ----------------
   Chapters with a condition each. They are checked against the final score of
   a normal game, so the story never needs its own game loop. */
var STORY = [
  {k:'c1', title:'Beer league',      brief:'You signed up on a Tuesday with borrowed gear. Just win one.',
   goal:'Win a game', surface:'ice', diff:0, test:function(a,b){ return a > b; }, pay:400},
  {k:'c2', title:'The regulars',     brief:'They have been playing together for nine years. Beat them by two.',
   goal:'Win by two or more', surface:'ice', diff:0, test:function(a,b){ return a - b >= 2; }, pay:700},
  {k:'c3', title:'Summer wheels',    brief:'Rink closes for the summer, so everyone moves to the roller court.',
   goal:'Win on roller', surface:'roller', diff:1, test:function(a,b){ return a > b; }, pay:900},
  {k:'c4', title:'Scouted',          brief:'Someone from the travel side is in the stands. Put on a show.',
   goal:'Win scoring at least four', surface:'ice', diff:1, test:function(a,b){ return a > b && a >= 4; }, pay:1400},
  {k:'c5', title:'The shutout',      brief:'Their line has not been held scoreless all year.',
   goal:'Win without conceding', surface:'ice', diff:1, test:function(a,b){ return a > b && b === 0; }, pay:2200},
  {k:'c6', title:'All-Star night',   brief:'Best of the league, and they are not being polite about it.',
   goal:'Beat the All-Star side', surface:'ice', diff:2, test:function(a,b){ return a > b; }, pay:4000},
  {k:'c7', title:'Top shelf',        brief:'Last one. Win it by three and the name goes on the wall.',
   goal:'Win by three or more', surface:'ice', diff:2, test:function(a,b){ return a - b >= 3; }, pay:9000}
];
function storyChapter(i){ return STORY[i] || null; }
function storyDone(){ return (SAVE.story || 0) >= STORY.length; }

function finishStoryChapter(a, b){
  var i = SAVE.story || 0;
  var ch = STORY[i];
  if(!ch) return null;
  var won = ch.test(a, b);
  var signed = null;
  if(won){
    SAVE.story = i + 1;
    SAVE.coins += ch.pay;
    if(SAVE.story >= STORY.length) signed = grantStoryPlayer();
    saveNow();
  }
  return {chapter: ch, passed: won, index: i, pay: ch.pay, signed: signed};
}

/* ---------------- save migration ----------------
   Old saves predate every field above, so fill them in rather than wiping. */
function migrateCareer2(){
  if(!SAVE) return;
  if(!SAVE.kit || !kitOf(SAVE.kit)) SAVE.kit = 'home';
  if(!kitOwned(kitOf(SAVE.kit))) SAVE.kit = 'home';
  if(typeof SAVE.pro !== 'boolean') SAVE.pro = false;
  if(typeof SAVE.story !== 'number') SAVE.story = 0;
  if(SAVE.season && (!SAVE.season.games || !SAVE.season.table)) SAVE.season = null;
  if(SAVE.season === undefined) SAVE.season = null;
  if(typeof SAVE.rev !== 'number') SAVE.rev = 0;
  if(typeof SAVE.updated !== 'number') SAVE.updated = 0;
  SAVE.mode = SAVE.mode || 'exhibition';   // exhibition | franchise | story | manager
  if(!tacticOf(SAVE.tactic) || !SAVE.tactic) SAVE.tactic = 'balance';
}

/* =========================================================================
   8.9  MANAGER MODE
   You do not play. You pick who dresses and how they play, and the game is
   decided by your cards against theirs. Same season, same table.
   ========================================================================= */
var TACTICS = [
  {k:'defend',  n:'Sit back',  atk:-0.20, def:0.24, d:'Clog the middle, take the counter when it comes.'},
  {k:'balance', n:'Balanced',  atk:0,     def:0,    d:'Play it straight down the middle.'},
  {k:'attack',  n:'Push up',   atk:0.26,  def:-0.22, d:'Forecheck hard and live with the gaps behind.'}
];
function tacticOf(k){ for(var i=0;i<TACTICS.length;i++) if(TACTICS[i].k === k) return TACTICS[i]; return TACTICS[1]; }

/* Your dressed line and the stick in your hands, on the same 0-99 scale the
   cards are shown in. */
function squadRating(){
  var ln = lineCards(5), st = equippedStick(), atk = 0, def = 0;
  for(var i = 0; i < ln.length; i++){
    var c = ln[i];
    atk += rate(c.sp) * 0.32 + rate(c.sh) * 0.46 + rate(c.dg) * 0.22;
    def += rate(c.df) * 0.68 + rate(c.sp) * 0.32;
  }
  atk /= ln.length; def /= ln.length;
  atk *= (st.pw + st.ac) / 2;
  return {atk: Math.round(atk), def: Math.round(def)};
}

/* Poisson, so a 4-0 is possible and a 1-1 is common. Capped at both ends:
   an uncapped expectation against a weak side produced 11-3, which is not a
   hockey score. */
function sampleGoals(expected){
  var e = Math.max(0.15, Math.min(5.2, expected));
  var g = 0, L = Math.exp(-e), p = 1;
  do { g++; p *= Math.random(); } while(p > L && g < 14);
  return Math.min(9, g - 1);
}

function simManagerGame(tacticKey){
  var fx = nextFixture();
  if(!fx) return null;
  var t = tacticOf(tacticKey), me = squadRating();
  var oppR = leagueOf(fx.opp).str * 62;
  var myAtk = me.atk * (1 + t.atk) * (fx.home ? 1.06 : 0.95);
  var myDef = me.def * (1 + t.def);
  var mine  = sampleGoals(3.0 * myAtk / Math.max(18, oppR));
  var yours = sampleGoals(3.0 * oppR / Math.max(18, myDef));
  var opp = leagueOf(fx.opp);
  recordSeasonGame(mine, yours);
  var base = mine > yours ? 90 : (mine === yours ? 35 : 18);
  var paid = Math.round(base * teamOf(SAVE.team).pay * (proOn() ? PRO.payMult : 1));
  SAVE.coins += paid;
  saveNow();
  return {opp: opp, home: fx.home, mine: mine, yours: yours, paid: paid, tactic: t,
          rating: me, oppRating: Math.round(oppR)};
}
