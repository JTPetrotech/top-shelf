
/* =========================================================================
   8.6  CAREER SCREENS
   ========================================================================= */

function pct(v){
  var d = Math.round((v - 1) * 100);
  return (d > 0 ? '+' : '') + d;
}
function rcVar(rk){ return rarOf(rk).c; }

function cardStats(c){
  return c.t === 'stick'
    ? '<span>PWR <b>' + pct(c.pw) + '</b></span><span>AIM <b>' + pct(c.ac) + '</b></span><span>PASS <b>' + pct(c.ps) + '</b></span>'
    : '<span>SPD <b>' + pct(c.sp) + '</b></span><span>SHOT <b>' + pct(c.sh) + '</b></span><span>CHK <b>' + pct(c.df) + '</b></span>';
}
function cardHTML(c, equipped, selectable){
  var r = rarOf(c.r);
  return '<div class="ci' + (equipped ? ' on' : '') + '" style="--rc:' + r.c + '" data-u="' + c.u + '"' +
    (selectable ? ' role="button" tabindex="0"' : '') + '>' +
    (equipped ? '<span class="eq">' + (c.t === 'stick' ? 'In hand' : 'Dressed') + '</span>' : '') +
    '<div class="rr">' + r.n + '</div>' +
    '<div class="nm">' + esc(c.n) + '</div>' +
    '<div class="who">' + esc(c.t === 'stick' ? c.d : (c.who + ' · ' + c.pos)) + '</div>' +
    '<div class="st">' + cardStats(c) + '</div>' +
    (c.t === 'skater' ? '<span class="num">' + c.num + '</span>' : '') +
    '</div>';
}
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---- wallet ---- */
function paintWallet(){
  var n = SAVE.coins.toLocaleString();
  ['walletN','shopN','travN'].forEach(function(id){ var e = el(id); if(e) e.textContent = n; });
  var rec = el('walletRec');
  if(rec) rec.textContent = SAVE.wins + '-' + SAVE.losses + '-' + SAVE.draws + ' · ' + teamOf(SAVE.team).n;
}

/* ---- overlay plumbing ---- */
var META_OVS = ['ovShop','ovReveal','ovTeam','ovTravel','ovFriends'];
function closeMeta(){ META_OVS.forEach(function(id){ el(id).classList.remove('on'); }); }
function showMeta(id){
  closeMenus();
  closeMeta();
  el(id).classList.add('on');
  paintWallet();
}
function backToMenu(){ closeMeta(); openMenu(); }

/* =========================================================================
   shop
   ========================================================================= */
function paintShop(){
  var h = '';
  for(var i = 0; i < PACKS.length; i++){
    var p = PACKS[i], can = SAVE.coins >= p.cost;
    h += '<div class="pk"><div class="pw"><div class="pn">' + esc(p.n) + '</div>' +
         '<div class="pd">' + esc(p.d) + '</div></div>' +
         '<button class="buy" data-k="' + p.k + '"' + (can ? '' : ' disabled') + '>' +
         p.cost.toLocaleString() + '</button></div>';
  }
  el('shopList').innerHTML = h;
  var o = '<b>Odds per card.</b> ';
  o += RAR.map(function(r){ return r.n + ' ' + r.w + '%'; }).join(' · ');
  o += '. Pro and Gold packs shift those up. Coins come from playing the CPU — ' +
       'a win is worth more than a loss, goals and shutouts add, and your travel team multiplies the lot.';
  el('shopOdds').innerHTML = o;
  paintWallet();
}

var lastPack = null;
function buyPack(k){
  var p = null;
  for(var i = 0; i < PACKS.length; i++) if(PACKS[i].k === k) p = PACKS[i];
  if(!p || SAVE.coins < p.cost) return;
  SAVE.coins -= p.cost;
  lastPack = p;
  var got = openPack(p);
  paintWallet();
  showReveal(p, got);
}

function showReveal(p, cards){
  el('revTitle').textContent = p.n;
  var h = '';
  for(var i = 0; i < cards.length; i++){
    var c = cards[i], r = rarOf(c.r);
    h += '<div class="rv ' + c.r + '" style="--rc:' + r.c + ';animation-delay:' + (i * 0.26) + 's">' +
         '<div class="rr">' + r.n + '</div>' +
         '<div class="nm">' + esc(c.n) + '</div>' +
         '<div class="who">' + esc(c.t === 'stick' ? 'Stick' : (c.who + ' · ' + c.pos)) + '</div>' +
         '<div class="st">' + cardStats(c) + '</div></div>';
  }
  el('revCards').innerHTML = h;
  el('btnRevAgain').style.display = SAVE.coins >= p.cost ? '' : 'none';
  el('btnRevAgain').textContent = 'Open another (' + p.cost.toLocaleString() + ')';
  showMeta('ovReveal');
  var best = 0;
  for(var j = 0; j < cards.length; j++){
    for(var q = 0; q < RAR.length; q++) if(RAR[q].k === cards[j].r && q > best) best = q;
  }
  if(best >= 2) setTimeout(function(){ sfx.horn && sfx.horn(); }, 320);
}

/* =========================================================================
   my team
   ========================================================================= */
function paintTeam(){
  var i, h = '', st = equippedStick();
  for(i = 0; i < SAVE.sticks.length; i++) h += cardHTML(SAVE.sticks[i], SAVE.sticks[i].u === st.u, true);
  el('stickList').innerHTML = h;

  h = '';
  for(i = 0; i < SAVE.skaters.length; i++){
    h += cardHTML(SAVE.skaters[i], SAVE.line.indexOf(SAVE.skaters[i].u) !== -1, true);
  }
  el('skaterList').innerHTML = h;

  var ln = lineCards();
  el('teamSub').textContent = 'Carrying ' + st.n + '. Dressing ' + ln[0].who + ' and ' + ln[1].who +
    '. You skate as whichever one is closest to the puck.';
  el('sellNote').textContent = '';
  paintWallet();
}

function equipStick(u){
  var c = findCard(u);
  if(!c || c.t !== 'stick') return;
  SAVE.stick = u; saveNow(); sfx.on(); paintTeam();
}
function toggleDress(u){
  var c = findCard(u);
  if(!c || c.t !== 'skater') return;
  var at = SAVE.line.indexOf(u);
  if(at !== -1){
    if(SAVE.line.length <= 1) return;               // never dress fewer than one
    SAVE.line.splice(at, 1);
  } else {
    if(SAVE.line.length >= 2) SAVE.line.shift();    // oldest pick drops out
    SAVE.line.push(u);
  }
  repairSave(); saveNow(); sfx.on(); paintTeam();
}

var sellMode = false;
function toggleSell(){
  sellMode = !sellMode;
  el('btnSell').textContent = sellMode ? 'Done selling' : 'Sell spares';
  el('sellNote').textContent = sellMode
    ? 'Tap any card you are not using to sell it. Commons 20, Rares 70, Epics 220, Legendaries 700.'
    : '';
}

/* =========================================================================
   travel teams
   ========================================================================= */
function paintTravel(){
  var h = '';
  for(var i = 0; i < TEAMS.length; i++){
    var t = TEAMS[i];
    var owned = SAVE.teams.indexOf(t.k) !== -1;
    var cur = SAVE.team === t.k;
    h += '<div class="tm' + (cur ? ' cur' : '') + '" style="--tc:' + t.col + '">' +
         '<div class="pw"><div class="pn" style="font-family:var(--display);font-size:23px;line-height:1">' + esc(t.n) + '</div>' +
         '<div class="pd" style="font-size:11.5px;color:var(--muted);margin-top:3px">' + esc(t.d) + '</div>' +
         '<div class="mult">Pays &times;' + t.pay.toFixed(2) + (t.tier ? ' · opponents skate harder' : '') + '</div></div>' +
         '<button class="buy" data-t="' + t.k + '"' +
           (cur ? ' disabled' : '') + '>' +
           (cur ? 'Current' : (owned ? 'Suit up' : t.cost.toLocaleString())) + '</button></div>';
  }
  el('travList').innerHTML = h;
  paintWallet();
}
function pickTeam(k){
  var t = teamOf(k);
  var owned = SAVE.teams.indexOf(k) !== -1;
  if(!owned){
    if(SAVE.coins < t.cost) return;
    SAVE.coins -= t.cost;
    SAVE.teams.push(k);
  }
  SAVE.team = k;
  saveNow(); sfx.on(); paintTravel();
}

/* =========================================================================
   friends
   ========================================================================= */
function paintFriends(){
  el('myCode').textContent = myCode();
  el('handleIn').value = SAVE.handle || '';
  var h = '';
  for(var i = 0; i < SAVE.friends.length; i++){
    var f = SAVE.friends[i];
    h += '<div class="fr"><div class="pw"><div class="fn">' + esc(f.handle) + '</div>' +
         '<div class="fd">' + esc(teamOf(f.team).n) + ' · ' + esc(f.line[0].who) + ', ' + esc(f.line[1].who) + '</div></div>' +
         '<button class="mini hot" data-f="' + i + '">Play</button>' +
         '<button class="mini" data-x="' + i + '">Drop</button></div>';
  }
  el('friendList').innerHTML = h || '<p class="note2">No codes yet. Send yours to someone and paste theirs back.</p>';
  paintWallet();
}
function playFriend(i){
  var f = SAVE.friends[i];
  if(!f) return;
  oppOverride = f;
  G.humans = 1;
  closeMeta();
  startGame();
}

/* =========================================================================
   wiring
   ========================================================================= */
function metaDelegate(id, attr, fn){
  el(id).addEventListener('click', function(e){
    var b = e.target.closest('[' + attr + ']');
    if(!b || b.disabled) return;
    sfx.on();
    fn(b.getAttribute(attr), b);
  });
}

metaDelegate('shopList', 'data-k', function(k){ buyPack(k); paintShop(); });
metaDelegate('travList', 'data-t', function(k){ pickTeam(k); });
metaDelegate('friendList', 'data-f', function(i){ playFriend(parseInt(i, 10)); });
metaDelegate('friendList', 'data-x', function(i){
  SAVE.friends.splice(parseInt(i, 10), 1); saveNow(); paintFriends();
});
metaDelegate('stickList', 'data-u', function(u){
  if(sellMode){
    var got = sellCard(u);
    el('sellNote').textContent = got < 0 ? 'That one is in your hands — equip another first.'
                                         : 'Sold for ' + got + '.';
    paintTeam();
    el('btnSell').textContent = 'Done selling';
    return;
  }
  equipStick(u);
});
metaDelegate('skaterList', 'data-u', function(u){
  if(sellMode){
    var got = sellCard(u);
    el('sellNote').textContent = got < 0 ? 'That one is dressed — bench them first.'
                                         : 'Sold for ' + got + '.';
    paintTeam();
    el('btnSell').textContent = 'Done selling';
    return;
  }
  toggleDress(u);
});

el('btnShop').addEventListener('click', function(){ sfx.on(); showMeta('ovShop'); paintShop(); });
el('btnTeam').addEventListener('click', function(){ sfx.on(); sellMode = false; el('btnSell').textContent = 'Sell spares'; showMeta('ovTeam'); paintTeam(); });
el('btnTravel').addEventListener('click', function(){ sfx.on(); showMeta('ovTravel'); paintTravel(); });
el('btnFriends').addEventListener('click', function(){ sfx.on(); showMeta('ovFriends'); paintFriends(); });

el('btnShopBack').addEventListener('click', function(){ sfx.on(); backToMenu(); });
el('btnTeamBack').addEventListener('click', function(){ sfx.on(); backToMenu(); });
el('btnTravBack').addEventListener('click', function(){ sfx.on(); backToMenu(); });
el('btnFriendBack').addEventListener('click', function(){ sfx.on(); backToMenu(); });
el('btnSell').addEventListener('click', function(){ sfx.on(); toggleSell(); });
el('btnRevDone').addEventListener('click', function(){ sfx.on(); showMeta('ovShop'); paintShop(); });
el('btnRevAgain').addEventListener('click', function(){ sfx.on(); if(lastPack) buyPack(lastPack.k); });

el('btnHandle').addEventListener('click', function(){
  sfx.on();
  SAVE.handle = (el('handleIn').value || '').replace(/[~|]/g, '').slice(0, 12);
  saveNow(); paintFriends();
  el('friendNote').textContent = SAVE.handle ? 'Saved. Your code now says ' + SAVE.handle + '.' : 'Name cleared.';
});
el('btnAddFriend').addEventListener('click', function(){
  sfx.on();
  var res = addFriend(el('codeIn').value);
  el('friendNote').textContent = res.ok
    ? (res.updated ? 'Updated ' + res.friend.handle + "'s squad." : 'Added ' + res.friend.handle + '.')
    : res.why;
  if(res.ok){ el('codeIn').value = ''; paintFriends(); }
});
el('codeIn').addEventListener('keydown', function(e){ if(e.key === 'Enter') el('btnAddFriend').click(); });
el('myCode').addEventListener('click', function(){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(myCode()).then(function(){
      el('friendNote').textContent = 'Code copied.';
    }, function(){});
  }
});
