
/* =========================================================================
   8.8  SCREENS FOR MODES, JERSEYS, CUSTOM STICKS, SEASON AND STORY
   ========================================================================= */

var META_OVS2 = ['ovModes','ovJersey','ovCustom','ovSeason','ovStory','ovManager'];
function closeMeta2(){ META_OVS2.forEach(function(id){ el(id).classList.remove('on'); }); }
function showMeta2(id){
  closeMenus();
  closeMeta();
  closeMeta2();
  el(id).classList.add('on');
  paintWallet();
}

function hex(n){ return '#' + ('000000' + n.toString(16)).slice(-6); }

/* =========================================================================
   modes
   ========================================================================= */
var MODES = [
  {k:'exhibition', n:'Exhibition', col:'#2f7fe0',
   d:'One game, your settings, coins as usual. Nothing is tracked.'},
  {k:'franchise',  n:'Franchise',  col:'#3ec98a',
   d:'A full season: home and away against seven rivals, a live table, and a cheque for whoever finishes top.'},
  {k:'story',      n:'Story',      col:'#c08cff',
   d:'Seven chapters. Each one asks for something specific — win by two, keep a clean sheet, beat the All-Stars.'},
  {k:'manager',    n:'Manager',    col:'#ffc43d',
   d:'You do not skate. Dress the line, pick the tactics, and your cards decide it against theirs.'}
];

function paintModes(){
  var h = '';
  for(var i = 0; i < MODES.length; i++){
    var m = MODES[i], cur = SAVE.mode === m.k;
    h += '<div class="modecard' + (cur ? ' cur' : '') + '" style="--mc:' + m.col + '">' +
         '<div class="pw"><div class="mn">' + esc(m.n) + '</div><div class="md">' + esc(m.d) + '</div></div>' +
         '<button class="buy" data-m="' + m.k + '">' + (cur ? 'Open' : 'Pick') + '</button></div>';
  }
  el('modeList').innerHTML = h;
  el('swPro').setAttribute('aria-pressed', proOn() ? 'true' : 'false');
}

function pickMode(k){
  SAVE.mode = k;
  saveNow();
  paintModes();
  if(k === 'franchise'){ showMeta2('ovSeason'); paintSeason(); }
  else if(k === 'story'){ showMeta2('ovStory'); paintStory(); }
  else if(k === 'manager'){ showMeta2('ovManager'); paintManager(); }
}

/* =========================================================================
   jerseys
   ========================================================================= */
function paintKits(){
  var h = '';
  for(var i = 0; i < KITS.length; i++){
    var k = KITS[i], owned = kitOwned(k), cur = SAVE.kit === k.k;
    h += '<div class="kit' + (cur ? ' on' : '') + (owned ? '' : ' locked') + '" data-kit="' + k.k + '">' +
         '<div class="swatch"><i style="background:' + hex(k.jersey) + '"></i>' +
         '<i style="background:' + hex(k.trim) + '"></i>' +
         '<i style="background:' + hex(k.helmet) + '"></i></div>' +
         '<div class="kn">' + esc(k.n) + '</div>' +
         '<div class="kl">' + (owned ? (cur ? 'Wearing it' : 'Yours') :
            'Comes with ' + esc(teamOf(k.team).n)) + '</div></div>';
  }
  el('kitList').innerHTML = h;
}

function pickKit(k){
  var kit = kitOf(k);
  if(!kitOwned(kit)) return;
  SAVE.kit = k;
  saveNow();
  applyKits();
  if(world && skaters.length){ createTeams(); resetPositions(); }
  paintKits();
}

/* =========================================================================
   custom stick
   ========================================================================= */
var cust = {shape:'birch', paint:PAINTS[5].c, tape:TAPES[0].c, grade:'rare'};

function paintCustom(){
  var i, h = '';
  for(i = 0; i < STICKS.length; i++){
    h += '<button class="chip wide' + (cust.shape === STICKS[i].k ? ' on' : '') +
         '" data-shape="' + STICKS[i].k + '">' + esc(STICKS[i].n) + '</button>';
  }
  el('custShape').innerHTML = h;

  h = '';
  for(i = 0; i < PAINTS.length; i++){
    h += '<button class="chip' + (cust.paint === PAINTS[i].c ? ' on' : '') + '" data-paint="' + PAINTS[i].c +
         '" title="' + esc(PAINTS[i].n) + '" style="background:' + hex(PAINTS[i].c) + '"></button>';
  }
  el('custPaint').innerHTML = h;

  h = '';
  for(i = 0; i < TAPES.length; i++){
    h += '<button class="chip' + (cust.tape === TAPES[i].c ? ' on' : '') + '" data-tape="' + TAPES[i].c +
         '" title="' + esc(TAPES[i].n) + '" style="background:' + hex(TAPES[i].c) + '"></button>';
  }
  el('custTape').innerHTML = h;

  h = '';
  ['rare','epic','legend'].forEach(function(g){
    h += '<button class="chip wide' + (cust.grade === g ? ' on' : '') + '" data-grade="' + g + '">' +
         rarOf(g).n + ' · ' + customCost(g).toLocaleString() + '</button>';
  });
  el('custGrade').innerHTML = h;

  // show what you would actually get before you pay for it
  var preview = mintCustomStick(cust.shape, cust.grade, cust.paint, cust.tape, el('custName').value);
  el('custPreview').innerHTML = '<b>' + esc(preview.n) + '</b> &middot; ' + rarOf(cust.grade).n + '<br>' +
    'PWR ' + pct(preview.pw) + ' &middot; AIM ' + pct(preview.ac) + ' &middot; PASS ' + pct(preview.ps) +
    '<br><span style="color:var(--muted)">' + esc(preview.d) + '</span>';
  el('btnCustBuy').textContent = 'Build it · ' + customCost(cust.grade).toLocaleString();
  el('btnCustBuy').disabled = SAVE.coins < customCost(cust.grade);
  paintWallet();
}

/* =========================================================================
   season
   ========================================================================= */
/* The table is the same whether you are playing the games or managing them. */
function standingsHTML(s){
  var rows = standings(s).map(function(r, i){
    var t = leagueOf(r.k);
    return '<tr' + (r.k === s.team ? ' class="me"' : '') + '><td>' + (i + 1) + '. ' + esc(t.n) + '</td>' +
      '<td>' + r.w + '</td><td>' + r.l + '</td><td>' + r.d + '</td>' +
      '<td>' + (r.gf - r.ga > 0 ? '+' : '') + (r.gf - r.ga) + '</td><td>' + pts(r) + '</td></tr>';
  }).join('');
  return '<table class="tbl"><tr><th>Club</th><th>W</th><th>L</th><th>D</th><th>GD</th><th>Pts</th></tr>' +
    rows + '</table>';
}

function seasonHTML(s, verb){
  var fx = nextFixture(), head = '';
  if(s.done){
    head = '<div class="fixture"><div class="fx">' + esc(leagueOf(s.champion).n) + ' win the league</div>' +
      '<div class="fs">' + (s.champion === s.team ? 'That is you. 25,000 in the bank.' : 'Next year.') +
      '</div></div>';
  } else if(fx){
    head = '<div class="fixture"><div class="fx">' + (fx.home ? 'vs ' : 'at ') + esc(leagueOf(fx.opp).n) + '</div>' +
      '<div class="fs">Game ' + (s.game + 1) + ' of ' + s.games.length + ' · ' + verb + ' as ' +
      esc(leagueOf(s.team).n) + '</div></div>';
  }
  return head + standingsHTML(s);
}

function noSeasonHTML(what){
  return '<p class="sub">No season running. Start one and you will ' + what + ' every other club ' +
    'home and away, with the table moving around you.</p>';
}

function paintSeason(){
  var s = SAVE.season;
  if(!s){
    el('seasonBody').innerHTML = noSeasonHTML('play');
    el('btnSeasonPlay').style.display = 'none';
    el('btnSeasonNew').textContent = 'Start a season';
    return;
  }
  el('seasonBody').innerHTML = seasonHTML(s, 'playing');
  el('btnSeasonPlay').style.display = (s.done || !nextFixture()) ? 'none' : '';
  el('btnSeasonNew').textContent = s.done ? 'Start a season' : 'Scrap it, start again';
}

/* ---------------- manager ---------------- */
function paintManager(){
  var s = SAVE.season, r = squadRating(), i, h = '';
  for(i = 0; i < TACTICS.length; i++){
    h += '<button class="chip wide' + (SAVE.tactic === TACTICS[i].k ? ' on' : '') +
         '" data-tac="' + TACTICS[i].k + '" title="' + esc(TACTICS[i].d) + '">' + esc(TACTICS[i].n) + '</button>';
  }
  el('mgrTactic').innerHTML = h;

  var squad = '<div class="fixture"><div class="fx">Your squad · ATK ' + r.atk + ' · DEF ' + r.def + '</div>' +
    '<div class="fs">' + esc(lineCards(5).map(function(c){ return c.who; }).join(', ')) +
    '<br>Carrying ' + esc(equippedStick().n) + '. Change any of it in My Team.</div></div>';

  if(!s){
    el('mgrBody').innerHTML = squad + noSeasonHTML('manage against');
    el('btnMgrSim').style.display = 'none';
    el('btnMgrNew').textContent = 'Start a season';
  } else {
    el('mgrBody').innerHTML = squad + seasonHTML(s, 'managing');
    el('btnMgrSim').style.display = (s.done || !nextFixture()) ? 'none' : '';
    el('btnMgrNew').textContent = s.done ? 'Start a season' : 'Scrap it, start again';
  }
  paintWallet();
}

function runManagerGame(){
  var res = simManagerGame(SAVE.tactic);
  if(!res){ paintManager(); return; }
  var won = res.mine > res.yours, drew = res.mine === res.yours;
  el('mgrResult').innerHTML =
    '<b style="color:' + (won ? 'var(--green)' : (drew ? 'var(--amber)' : 'var(--away)')) + '">' +
    (res.home ? '' : 'at ') + esc(res.opp.n) + ' ' + res.mine + ' · ' + res.yours + '</b> &mdash; ' +
    (won ? 'win' : (drew ? 'draw' : 'loss')) + ', +' + res.paid.toLocaleString() + ' coins.<br>' +
    '<span style="color:var(--muted)">' + esc(res.tactic.n) + ' · your ' + res.rating.atk +
    ' attack against their ' + res.oppRating + '.</span>';
  paintManager();
}

function startSeason(){
  SAVE.season = newSeason(SAVE.team && leagueOf(SAVE.team).k === SAVE.team ? SAVE.team : 'sandlot');
  SAVE.mode = 'franchise';
  saveNow();
  paintSeason();
}

/* =========================================================================
   story
   ========================================================================= */
function paintStory(){
  var at = SAVE.story || 0, h = '';
  for(var i = 0; i < STORY.length; i++){
    var c = STORY[i];
    var cls = i < at ? ' done' : (i === at ? ' now' : '');
    h += '<div class="chapter' + cls + '"><div class="pw">' +
      '<div class="cn">' + (i + 1) + '. ' + esc(c.title) + '</div>' +
      '<div class="cd">' + esc(i <= at ? c.brief : 'Locked') +
      (i <= at ? '<br><b style="color:var(--amber)">' + esc(c.goal) + '</b> · +' + c.pay.toLocaleString() : '') +
      '</div></div>' + (i < at ? '<div class="tick">✓</div>' : '') + '</div>';
  }
  el('storyBody').innerHTML = h;
  if(storyDone()){
    el('storySub').textContent = 'All seven done. The name is on the wall.';
    el('btnStoryPlay').style.display = 'none';
  } else {
    var ch = storyChapter(at);
    el('storySub').textContent = 'Chapter ' + (at + 1) + ': ' + ch.goal + ', on ' +
      (ch.surface === 'roller' ? 'the roller court' : 'ice') + '.';
    el('btnStoryPlay').style.display = '';
    el('btnStoryPlay').textContent = 'Play chapter ' + (at + 1);
  }
}

function playStoryChapter(){
  var ch = storyChapter(SAVE.story || 0);
  if(!ch) return;
  SAVE.mode = 'story';
  G.surface = ch.surface;
  G.diff = ch.diff;
  G.humans = 1;
  oppOverride = null;
  saveNow();
  closeMeta2();
  buildWorld();
  startGame();
}

function playSeasonGame(){
  var fx = nextFixture();
  if(!fx) return;
  SAVE.mode = 'franchise';
  G.humans = 1;
  oppOverride = null;
  // a stronger club is a harder night
  var str = leagueOf(fx.opp).str;
  G.diff = str >= 1.06 ? 2 : (str >= 0.95 ? 1 : 0);
  saveNow();
  closeMeta2();
  startGame();
}

/* =========================================================================
   wiring
   ========================================================================= */
function meta2Delegate(id, attr, fn){
  el(id).addEventListener('click', function(e){
    var b = e.target.closest('[' + attr + ']');
    if(!b || b.disabled) return;
    sfx.on();
    fn(b.getAttribute(attr), b);
  });
}

meta2Delegate('modeList', 'data-m', function(k){ pickMode(k); });
meta2Delegate('kitList', 'data-kit', function(k){ pickKit(k); });
meta2Delegate('custShape', 'data-shape', function(v){ cust.shape = v; paintCustom(); });
meta2Delegate('custPaint', 'data-paint', function(v){ cust.paint = parseInt(v, 10); paintCustom(); });
meta2Delegate('custTape', 'data-tape', function(v){ cust.tape = parseInt(v, 10); paintCustom(); });
meta2Delegate('custGrade', 'data-grade', function(v){ cust.grade = v; paintCustom(); });

el('btnModes').addEventListener('click', function(){ sfx.on(); showMeta2('ovModes'); paintModes(); });
el('btnJersey').addEventListener('click', function(){ sfx.on(); showMeta2('ovJersey'); paintKits(); });
el('btnCustom').addEventListener('click', function(){ sfx.on(); showMeta2('ovCustom'); paintCustom(); });

el('btnModesBack').addEventListener('click', function(){ sfx.on(); closeMeta2(); openMenu(); });
el('btnJerseyBack').addEventListener('click', function(){ sfx.on(); closeMeta2(); openMenu(); });
el('btnCustBack').addEventListener('click', function(){ sfx.on(); closeMeta2(); openMenu(); });
el('btnSeasonBack').addEventListener('click', function(){ sfx.on(); closeMeta2(); openMenu(); });
el('btnStoryBack').addEventListener('click', function(){ sfx.on(); closeMeta2(); openMenu(); });
el('btnMgrBack').addEventListener('click', function(){ sfx.on(); closeMeta2(); openMenu(); });
el('btnMgrSim').addEventListener('click', function(){ sfx.on(); runManagerGame(); });
el('btnMgrNew').addEventListener('click', function(){
  sfx.on();
  startSeason();
  SAVE.mode = 'manager'; saveNow();
  el('mgrResult').innerHTML = '';
  paintManager();
});
el('btnMgrSquad').addEventListener('click', function(){
  sfx.on(); closeMeta2(); sellMode = false;
  el('btnSell').textContent = 'Sell spares';
  showMeta('ovTeam'); paintTeam();
});
meta2Delegate('mgrTactic', 'data-tac', function(k){ SAVE.tactic = k; saveNow(); paintManager(); });

el('swPro').addEventListener('click', function(){
  sfx.on();
  SAVE.pro = !SAVE.pro;
  saveNow();
  el('swPro').setAttribute('aria-pressed', proOn() ? 'true' : 'false');
});

el('custName').addEventListener('input', paintCustom);
el('btnCustBuy').addEventListener('click', function(){
  sfx.on();
  var c = buyCustomStick(cust.shape, cust.grade, cust.paint, cust.tape, el('custName').value);
  el('custNote').textContent = c
    ? 'Built, and you are holding it. Swap back in My Team any time.'
    : 'Not enough coins for that grade.';
  if(c) paintCustom();
});

el('btnSeasonPlay').addEventListener('click', function(){ sfx.on(); playSeasonGame(); });
el('btnSeasonNew').addEventListener('click', function(){ sfx.on(); startSeason(); });
el('btnStoryPlay').addEventListener('click', function(){ sfx.on(); playStoryChapter(); });
el('btnStoryReset').addEventListener('click', function(){
  sfx.on();
  SAVE.story = 0; saveNow(); paintStory();
});
