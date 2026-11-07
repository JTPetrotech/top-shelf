
/* =========================================================================
   9. CAMERA, HUD, MENUS, LOOP
   ========================================================================= */
var camCur = {x:0, y:20, z:34, lx:0, ly:0, lz:0};
var orbit = 0.6;
var CAM_NAMES = ['Broadcast', 'Overhead', 'Low'];

function cycleCam(){
  G.camMode = (G.camMode + 1) % 3;
  el('camBtn').textContent = CAM_NAMES[G.camMode];
}

function updateCamera(dt){
  var tx, ty, tz, lx, ly, lz;
  if(G.phase === 'menu' || G.phase === 'boot'){
    orbit += dt * 0.07;
    tx = Math.cos(orbit) * 52; tz = Math.sin(orbit) * 52; ty = 24;
    lx = 0; ly = 1.5; lz = 0;
  } else {
    var fx = puck.x, fz = puck.z;
    if(carrier){ fx = carrier.x; fz = carrier.z; }
    if(G.phase === 'tutorial' && control.p1 && carrier !== control.p1){
      fx = control.p1.x * 0.6 + puck.x * 0.4;       // keep the drill and the player both in shot
      fz = control.p1.z * 0.6 + puck.z * 0.4;
    }
    if(G.camMode === 0){                      // broadcast: high and back, over the near seats
      tx = fx * 0.55; ty = 21.5; tz = 41 + Math.abs(fz) * 0.12;
      lx = fx * 0.80; ly = 1.2; lz = fz * 0.22;
    } else if(G.camMode === 1){                // overhead
      tx = fx * 0.35; ty = 38; tz = 20;
      lx = fx * 0.55; ly = 0; lz = fz * 0.1;
    } else {                                   // low, tight on the play
      tx = fx * 0.85; ty = 13.5; tz = 30 + Math.abs(fz) * 0.18;
      lx = fx; ly = 1.1; lz = fz * 0.4;
    }
  }
  var k = 1 - Math.exp(-(G.phase === 'menu' ? 2.0 : 3.4) * dt);
  camCur.x += (tx - camCur.x) * k;
  camCur.y += (ty - camCur.y) * k;
  camCur.z += (tz - camCur.z) * k;
  camCur.lx += (lx - camCur.lx) * k;
  camCur.ly += (ly - camCur.ly) * k;
  camCur.lz += (lz - camCur.lz) * k;

  var sh = G.shake;
  camera.position.set(
    camCur.x + (sh > 0 ? (Math.random()-0.5) * sh * 1.6 : 0),
    camCur.y + (sh > 0 ? (Math.random()-0.5) * sh * 1.2 : 0),
    camCur.z
  );
  camera.lookAt(camCur.lx, camCur.ly, camCur.lz);
  if(G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.2);
}

/* ---- control rings under the human skaters ---- */
var rings = {p1:null, p2:null};
function ringFor(color){
  var m = new T.Mesh(new T.RingGeometry(0.80, 1.02, 26),
    new T.MeshBasicMaterial({color: color, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false}));
  m.rotation.x = -Math.PI/2;
  m.position.y = 0.025;
  return m;
}
function updateRings(){
  var slots = ['p1','p2'], cols = [0xffc43d, 0x5ad8ff];
  for(var i = 0; i < 2; i++){
    var k = slots[i], s = control[k];
    if(!rings[k]){ rings[k] = ringFor(cols[i]); }
    if(rings[k].parent !== world){ world.add(rings[k]); }
    if(!s || G.phase === 'menu' || G.phase === 'over'){ rings[k].visible = false; continue; }
    rings[k].visible = true;
    rings[k].position.set(s.x, 0.025, s.z);
    var c = s.charging ? s.charge : 0;
    var sc = 1 + c * 0.55;
    rings[k].scale.set(sc, sc, sc);
    rings[k].material.color.setHex(c > 0.02 ? (c > 0.75 ? 0xff5a2a : 0xff9b2a) : cols[i]);
  }
}

/* ---- HUD ---- */
var toastT = 0;
function toast(text, dur, color){
  var t = el('toast');
  t.textContent = text;
  t.style.color = color || '#ffffff';
  t.classList.add('on');
  toastT = dur || 1.0;
}
function paintBug(){
  el('scoreH').textContent = G.score[0];
  el('scoreA').textContent = G.score[1];
  el('tagH').textContent = G.humans === 2 ? 'P1' : 'YOU';
  el('tagA').textContent = G.humans === 2 ? 'P2' : 'CPU';
  el('period').textContent = G.ot ? 'OT' : ['1st','2nd','3rd'][G.period-1];
  var m = Math.floor(Math.max(0, G.clock)/60), s = Math.floor(Math.max(0, G.clock)%60);
  el('clock').textContent = m + ':' + (s < 10 ? '0' : '') + s;
}
function showPads(on){
  var p = el('pads');
  if(on && touchOn){
    p.classList.add('on');
    if(G.humans === 2) p.classList.add('two'); else p.classList.remove('two');
  } else p.classList.remove('on');
}
function closeMenus(){
  ['ovBoot','ovMenu','ovPause','ovBreak','ovOver'].forEach(function(id){ el(id).classList.remove('on'); });
}

function keyCardHTML(){
  if(touchOn && lastDevice === 'touch'){
    return G.humans === 2
      ? '<div><b>Player 1</b>Left half: stick, shoot, pass</div><div><b class="p2">Player 2</b>Right half: stick, shoot, pass</div>'
      : '<div><b>Move</b>Drag anywhere on the left</div><div><b>Shoot / Pass</b>Buttons on the right</div>';
  }
  if(padCount > 0){
    return G.humans === 2
      ? '<div><b>Player 1</b>Pad 1: stick, A shoot, X pass</div><div><b class="p2">Player 2</b>Pad 2: stick, A shoot, X pass</div>'
      : '<div><b>Move</b>Left stick</div><div><b>Shoot / Pass</b>A (hold to load) / X</div>';
  }
  return G.humans === 2
    ? '<div><b>Player 1</b>W A S D &middot; Space shoot &middot; Q pass</div><div><b class="p2">Player 2</b>Arrows &middot; Enter shoot &middot; / pass</div>'
    : '<div><b>Skate</b>W A S D or arrows</div><div><b>Shoot</b>Space, hold to load</div><div><b>Pass</b>Q</div><div><b>Camera / Pause</b>C / P</div>';
}

function openMenu(){
  G.phase = 'menu';
  closeMenus();
  el('ovMenu').classList.add('on');
  el('bug').classList.remove('on');
  el('coach').classList.remove('on');
  el('pauseBtn').classList.remove('on');
  el('camBtn').classList.remove('on');
  showPads(false);
  el('keyCard').innerHTML = keyCardHTML();
  el('rowDiff').style.display = G.humans === 2 ? 'none' : '';
  if(!world) buildWorld();
  if(!skaters.length) createTeams();
  resetPositions();
}

function startGame(){
  G.score = [0, 0]; G.period = 1; G.clock = PERIOD_LEN; G.ot = false; G.tut = null;
  buildWorld();
  createTeams();
  closeMenus();
  el('bug').classList.add('on');
  el('pauseBtn').classList.add('on');
  el('camBtn').classList.add('on');
  el('camBtn').textContent = CAM_NAMES[G.camMode];
  showPads(true);
  paintBug(); paintJumbo();
  faceoff('Face-off');
}

function togglePause(){
  if(G.phase === 'play' || G.phase === 'faceoff' || G.phase === 'celebrate'){
    G.prePause = G.phase; G.phase = 'pause';
    el('ovPause').classList.add('on');
    showPads(false);
  } else if(G.phase === 'pause'){
    G.phase = G.prePause || 'play';
    el('ovPause').classList.remove('on');
    showPads(true);
  }
}

/* ---- menu wiring ---- */
function seg(id, cb){
  var box = el(id);
  box.addEventListener('click', function(e){
    var b = e.target.closest('button');
    if(!b) return;
    sfx.on();
    var list = box.querySelectorAll('button');
    for(var i = 0; i < list.length; i++) list[i].setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-pressed', 'true');
    cb(b.getAttribute('data-v'));
  });
}
seg('segSurface', function(v){ G.surface = v; buildWorld(); createTeams(); resetPositions(); });
seg('segPlayers', function(v){
  G.humans = parseInt(v, 10);
  el('rowDiff').style.display = G.humans === 2 ? 'none' : '';
  el('keyCard').innerHTML = keyCardHTML();
  createTeams();
});
seg('segDiff', function(v){ G.diff = parseInt(v, 10); });
el('btnPlay').addEventListener('click', function(){ sfx.on(); startGame(); });
el('btnTut').addEventListener('click', function(){ sfx.on(); startTutorial(); });
el('btnResume').addEventListener('click', function(){ sfx.on(); togglePause(); });
el('btnQuit').addEventListener('click', function(){ sfx.on(); openMenu(); });
el('btnAgain').addEventListener('click', function(){ sfx.on(); startGame(); });
el('btnMenu2').addEventListener('click', function(){ sfx.on(); openMenu(); });
el('coachSkip').addEventListener('click', function(){
  sfx.on();
  G.tut = null;
  if(markerMesh) markerMesh.visible = false;
  goalies[1].hidden = false;
  try { localStorage.setItem('sa_tut', '1'); } catch(e){}
  el('coach').classList.remove('on');
  openMenu();
});
el('pauseBtn').addEventListener('click', function(){ sfx.on(); togglePause(); });
el('camBtn').addEventListener('click', function(){ sfx.on(); cycleCam(); });

/* ---- control assignment ---- */
function assignControl(){
  var pairs = [['p1', 0]];
  if(G.humans === 2) pairs.push(['p2', 1]);
  else control.p2 = null;
  for(var i = 0; i < pairs.length; i++){
    var slot = pairs[i][0], team = pairs[i][1], cur = control[slot];
    if(carrier && carrier.team === team){ control[slot] = carrier; continue; }
    var n = nearestToPuck(team);
    if(!cur){ control[slot] = n; continue; }
    if(n && n !== cur && dist(n.x, n.z, puck.x, puck.z) < dist(cur.x, cur.z, puck.x, puck.z) - 2.5){
      control[slot] = n;
    }
  }
  updateCtrlTags();
}

function applyHumanInput(){
  var slots = ['p1','p2'];
  for(var i = 0; i < 2; i++){
    var slot = slots[i], s = control[slot];
    if(!s) continue;
    var inp = IN[slot];
    s.ix = inp.mx; s.iz = inp.mz; s.il = inp.len;
    if(carrier === s){
      if(inp.shoot && !s.charging && s.shootCool <= 0){ s.charging = true; s.charge = 0; }
      if(!inp.shoot && s.charging) shoot(s, Math.max(0.2, s.charge));
      if(inp.pass) passTo(s);
    } else {
      s.charging = false; s.charge = 0;
    }
  }
}

/* ---- main loop ---- */
var last = performance.now(), simT = 0, tickAcc = 0;
function frame(now){
  var dt = (now - last) / 1000;
  last = now;
  if(dt > 0.05) dt = 0.05;
  if(dt < 0) dt = 0;
  simT += dt;

  gatherInput();

  var live = (G.phase === 'play' || G.phase === 'faceoff' || G.phase === 'celebrate' ||
              G.phase === 'tutorial' || G.phase === 'menu');

  if(live){
    assignControl();
    var moving = (G.phase === 'play' || G.phase === 'tutorial' || G.phase === 'menu');
    var aiAll = (G.phase === 'menu');
    if(G.phase === 'play' || G.phase === 'tutorial') applyHumanInput();
    else for(var z = 0; z < skaters.length; z++){ if(skaters[z].ctrlBy){ skaters[z].il = 0; skaters[z].charging = false; } }

    for(var i = 0; i < skaters.length; i++){
      var s = skaters[i];
      var frozen = (G.phase === 'tutorial' && s.team === 1 && G.tutFreezeOpp);
      if((aiAll || !s.ctrlBy) && moving && !frozen) aiThink(s, simT, dt);
      else if(!moving){ s.ix = 0; s.iz = 0; s.il = 0; }
      stepSkater(s, dt);
    }
    skaterContacts();
    if(moving) stepPuck(dt);
    for(var g = 0; g < 2; g++) stepGoalie(goalies[g], dt);

    if(G.phase === 'play'){
      G.clock -= dt;
      tickAcc += dt;
      if(tickAcc > 0.2){ tickAcc = 0; paintBug(); paintJumbo(); }
      if(G.clock <= 0){ G.clock = 0; paintBug(); endPeriod(); }
    } else if(G.phase === 'faceoff'){
      G.faceoffT -= dt;
      if(G.faceoffT <= 0){ G.phase = 'play'; sfx.whistle(); }
    } else if(G.phase === 'celebrate'){
      G.faceoffT -= dt;
      if(G.faceoffT <= 0){
        if(G.clock <= 0) endPeriod();
        else faceoff('Face-off');
      }
    } else if(G.phase === 'tutorial' && G.tut){
      updateTutorial(dt);
    }
  }

  updateRings();

  if(markerMesh && markerMesh.visible){
    markerMesh.rotation.y += dt * 1.6;
    var p = 1 + Math.sin(simT * 4) * 0.08;
    markerMesh.scale.set(p, 1, p);
  }

  if(crowdBob > 0){
    crowdBob -= dt;
    bobCrowd(simT, 0.26);
  }

  if(toastT > 0){
    toastT -= dt;
    if(toastT <= 0) el('toast').classList.remove('on');
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ---- boot ---- */
var booted = false;
function boot(){
  if(booted) return;
  booted = true;
  initGL();
  G.surface = 'ice';
  buildWorld();
  createTeams();
  resetPositions();
  paintBug();
  var seen = false;
  try { seen = localStorage.getItem('sa_tut') === '1'; } catch(e){}
  requestAnimationFrame(frame);
  setTimeout(function(){
    if(seen) openMenu();
    else startTutorial();
  }, 350);
}

if(document.fonts && document.fonts.ready){
  document.fonts.ready.then(function(){ setTimeout(boot, 30); });
} else {
  setTimeout(boot, 60);
}
setTimeout(boot, 2500);          // never wait on fonts forever
})();
