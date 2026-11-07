
/* =========================================================================
   7. TEAMS, PHYSICS, AI
   ========================================================================= */
var markerMesh = null;
function clamp(v, a, b){ return v < a ? a : (v > b ? b : v); }
function angNorm(a){ while(a > Math.PI) a -= Math.PI*2; while(a < -Math.PI) a += Math.PI*2; return a; }
function dist(ax, az, bx, bz){ return Math.sqrt((ax-bx)*(ax-bx) + (az-bz)*(az-bz)); }
function localToWorld(s, lx, lz){
  var c = Math.cos(s.face), n = Math.sin(s.face);
  return {x: s.x + lx*c - lz*n, z: s.z + lx*n + lz*c};
}

var puckMesh = null, control = {p1:null, p2:null};

function createTeams(){
  var roller = (G.surface === 'roller');
  for(var i = 0; i < skaters.length; i++) world.remove(skaters[i].model);
  for(var j = 0; j < goalies.length; j++) world.remove(goalies[j].model);
  skaters = []; goalies = []; carrier = null;

  var roster = [
    {team:0, num:9,  slot:-1},
    {team:0, num:21, slot:1},
    {team:1, num:4,  slot:-1},
    {team:1, num:17, slot:1}
  ];
  for(var r = 0; r < roster.length; r++){
    var d = roster[r];
    var s = {
      team: d.team, num: d.num, slot: d.slot, ctrlBy: null,
      x: 0, z: 0, vx: 0, vz: 0, face: d.team === 0 ? 0 : Math.PI,
      ix: 0, iz: 0, il: 0, turnRate: 0,
      stun: 0, charge: 0, charging: false, shootCool: 0, followT: 0,
      jitter: Math.random() * 6.28, think: 0,
      model: buildSkater(d.team, d.num, roller)
    };
    world.add(s.model);
    skaters.push(s);
  }
  for(var t = 0; t < 2; t++){
    var g = {team: t, x: (t === 0 ? -GOAL_X + 0.9 : GOAL_X - 0.9), z: 0, vz: 0,
             model: buildGoalie(t, roller), hidden: false};
    g.model.rotation.y = t === 0 ? 0 : Math.PI;
    world.add(g.model);
    goalies.push(g);
  }

  // puck / ball
  if(puckMesh){ world.remove(puckMesh); }
  var geo = roller ? new T.SphereGeometry(PUCK_R * 1.15, 14, 12)
                   : new T.CylinderGeometry(PUCK_R, PUCK_R, 0.1, 18);
  var mat = new T.MeshStandardMaterial({color: roller ? 0xff7a1a : 0x15191f, roughness: roller ? 0.55 : 0.85});
  puckMesh = new T.Mesh(geo, mat);
  puckMesh.castShadow = true;
  world.add(puckMesh);

  control.p1 = skaters[0];
  control.p2 = G.humans === 2 ? skaters[2] : null;
  updateCtrlTags();
}

function updateCtrlTags(){
  for(var i = 0; i < skaters.length; i++) skaters[i].ctrlBy = null;
  if(control.p1) control.p1.ctrlBy = 'p1';
  if(control.p2) control.p2.ctrlBy = 'p2';
}

function resetPositions(dropTo){
  var pos = [[-6, -3.5], [-10, 4.5], [6, 3.5], [10, -4.5]];
  for(var i = 0; i < skaters.length; i++){
    var s = skaters[i];
    s.x = pos[i][0]; s.z = pos[i][1];
    s.vx = 0; s.vz = 0; s.ix = 0; s.iz = 0; s.il = 0;
    s.face = s.team === 0 ? 0 : Math.PI;
    s.stun = 0; s.charge = 0; s.charging = false; s.shootCool = 0; s.followT = 0;
  }
  goalies[0].z = 0; goalies[0].vz = 0; goalies[1].z = 0; goalies[1].vz = 0;
  puck.x = dropTo ? dropTo[0] : 0; puck.z = dropTo ? dropTo[1] : 0;
  puck.y = PUCK_R; puck.vx = 0; puck.vy = 0; puck.vz = 0;
  carrier = null; puckCool = 0;
}

function faceoff(text, time){
  resetPositions();
  G.phase = 'faceoff';
  G.faceoffT = time === undefined ? 1.6 : time;
  if(text) toast(text, 1.4);
}

/* ---- boundary: rounded rectangle ---- */
function confine(o, r, bounceK){
  var ix = HX - CORNER, iz = HZ - CORNER;
  var cx = clamp(o.x, -ix, ix), cz = clamp(o.z, -iz, iz);
  var dx = o.x - cx, dz = o.z - cz;
  var d = Math.sqrt(dx*dx + dz*dz);
  var lim = CORNER - r;
  if(d > lim){
    var nx = d > 0 ? dx/d : 1, nz = d > 0 ? dz/d : 0;
    o.x = cx + nx*lim; o.z = cz + nz*lim;
    if(bounceK !== undefined){
      var vn = o.vx*nx + o.vz*nz;
      if(vn > 0){
        o.vx -= (1 + bounceK) * vn * nx;
        o.vz -= (1 + bounceK) * vn * nz;
        if(vn > 3) sfx.board(vn);
      }
    } else {
      var vn2 = o.vx*nx + o.vz*nz;
      if(vn2 > 0){ o.vx -= vn2*nx*1.25; o.vz -= vn2*nz*1.25; }
    }
    return true;
  }
  return false;
}

/* ---- keep skaters out of the nets ---- */
function netCollide(o, r){
  for(var i = 0; i < 2; i++){
    var side = i === 0 ? -1 : 1;
    var x0 = side === 1 ? GOAL_X - 0.15 : -GOAL_X - NET_D - 0.15;
    var x1 = side === 1 ? GOAL_X + NET_D + 0.15 : -GOAL_X + 0.15;
    var halfZ = MOUTH + 0.15;
    if(o.x + r > x0 && o.x - r < x1 && Math.abs(o.z) < halfZ + r){
      // push out the nearest face
      var toLeft = Math.abs((o.x - r) - x1), toRight = Math.abs(x0 - (o.x + r));
      var toZ = (halfZ + r) - Math.abs(o.z);
      if(toZ < Math.min(toLeft, toRight)){
        o.z = (o.z >= 0 ? 1 : -1) * (halfZ + r);
        o.vz *= -0.2;
      } else if(toLeft < toRight){
        o.x = x1 + r; o.vx *= -0.2;
      } else {
        o.x = x0 - r; o.vx *= -0.2;
      }
    }
  }
}

function stepSkater(s, dt){
  var cfg = S(), d = D();
  var ai = !s.ctrlBy;
  var acc = cfg.acc * (ai ? d.acc : 1);
  var max = cfg.max * (ai ? d.max : 1);
  if(carrier === s) max *= 0.95;
  if(s.stun > 0){ acc *= 0.12; s.stun -= dt; }

  s.vx += s.ix * s.il * acc * dt;
  s.vz += s.iz * s.il * acc * dt;
  var sp = Math.sqrt(s.vx*s.vx + s.vz*s.vz);
  if(sp > max){ s.vx *= max/sp; s.vz *= max/sp; sp = max; }
  var k = Math.exp(-cfg.drag * dt);
  s.vx *= k; s.vz *= k;
  s.x += s.vx * dt; s.z += s.vz * dt;

  var want = s.face;
  if(s.il > 0.2) want = Math.atan2(s.iz, s.ix);
  else if(sp > 0.7) want = Math.atan2(s.vz, s.vx);
  var diff = angNorm(want - s.face);
  var step = clamp(diff, -cfg.turn * dt, cfg.turn * dt);
  s.face += step;
  s.turnRate = dt > 0 ? step / dt : 0;

  confine(s, SK_R);
  netCollide(s, SK_R);

  if(s.shootCool > 0) s.shootCool -= dt;
  if(s.followT > 0) s.followT -= dt;

  s.model.position.set(s.x, 0, s.z);
  s.model.rotation.y = -s.face;
  animateSkater(s, dt);
}

function skaterContacts(){
  for(var i = 0; i < skaters.length; i++){
    for(var j = i+1; j < skaters.length; j++){
      var a = skaters[i], b = skaters[j];
      var dx = b.x - a.x, dz = b.z - a.z;
      var d = Math.sqrt(dx*dx + dz*dz);
      if(d > SK_R*2 || d < 0.0001) continue;
      var nx = dx/d, nz = dz/d, push = (SK_R*2 - d)/2 + 0.01;
      a.x -= nx*push; a.z -= nz*push; b.x += nx*push; b.z += nz*push;
      var sa = Math.sqrt(a.vx*a.vx + a.vz*a.vz), sb = Math.sqrt(b.vx*b.vx + b.vz*b.vz);
      var fast = sa > sb ? a : b, slow = sa > sb ? b : a;
      var diff = Math.abs(sa - sb);
      if(a.team !== b.team){
        if(carrier === slow && diff > 2.2){
          carrier = null;
          puck.vx = fast.vx * 0.9 + nx * 3;
          puck.vz = fast.vz * 0.9 + nz * 3;
          puck.vy = 1.2;
          puckCool = 0.18;
          slow.stun = 0.55; G.shake = Math.max(G.shake, 0.5);
          sfx.hit();
          if(G.tut) tutEvent('check');
        } else if(diff > 4.5){
          slow.stun = 0.4; sfx.hit(); G.shake = Math.max(G.shake, 0.3);
        }
        var avx = a.vx, avz = a.vz;
        a.vx = b.vx * 0.6; a.vz = b.vz * 0.6;
        b.vx = avx * 0.6; b.vz = avz * 0.6;
      } else {
        a.vx -= nx * 0.6; a.vz -= nz * 0.6;
        b.vx += nx * 0.6; b.vz += nz * 0.6;
      }
    }
  }
}

/* ---- shooting and passing ---- */
function shoot(s, power){
  var cfg = S(), gx = s.team === 0 ? GOAL_X : -GOAL_X;
  var a = s.face;
  if(!s.ctrlBy){
    a += (Math.random() - 0.5) * D().err * 2 * (1 - power * 0.35);
  } else {
    var toNet = Math.atan2((Math.random() - 0.5) * (MOUTH * 1.3) - s.z, gx - s.x);
    var dd = angNorm(toNet - a);
    if(Math.abs(dd) < 0.42) a += dd * 0.6;          // light aim assist toward the mouth
  }
  var blade = localToWorld(s, 1.15, 0.45);
  puck.x = blade.x; puck.z = blade.z; puck.y = PUCK_R + 0.02;
  var sp = cfg.shotBase + cfg.shotAdd * power;
  puck.vx = Math.cos(a) * sp + s.vx * 0.35;
  puck.vz = Math.sin(a) * sp + s.vz * 0.35;
  puck.vy = power > 0.5 ? (power - 0.5) * 7.5 : 0;
  carrier = null; puckCool = 0.22;
  s.charging = false; s.charge = 0; s.shootCool = 0.3; s.followT = 0.28;
  sfx.stick(power);
  if(G.tut) tutEvent('shot');
}

function mateOf(s){
  for(var i = 0; i < skaters.length; i++) if(skaters[i].team === s.team && skaters[i] !== s) return skaters[i];
  return null;
}

function passTo(s){
  if(carrier !== s) return;
  var m = mateOf(s);
  if(!m) return;
  var tx = m.x + m.vx * 0.35, tz = m.z + m.vz * 0.35;
  var a = Math.atan2(tz - s.z, tx - s.x);
  var d = dist(s.x, s.z, tx, tz);
  var sp = clamp(d * 1.5, S().passBase * 0.6, S().passBase * 1.6);
  var blade = localToWorld(s, 1.15, 0.45);
  puck.x = blade.x; puck.z = blade.z; puck.y = PUCK_R;
  puck.vx = Math.cos(a) * sp; puck.vz = Math.sin(a) * sp; puck.vy = 0;
  carrier = null; puckCool = 0.14;
  s.charging = false; s.charge = 0; s.followT = 0.2;
  sfx.pass();
  if(G.tut) tutEvent('pass', m);
}

/* ---- AI ---- */
function nearestToPuck(team){
  var best = null, bd = 1e9;
  for(var i = 0; i < skaters.length; i++){
    var s = skaters[i];
    if(s.team !== team) continue;
    var d = dist(s.x, s.z, puck.x, puck.z);
    if(d < bd){ bd = d; best = s; }
  }
  return best;
}
function steer(s, tx, tz, gain){
  var dx = tx - s.x, dz = tz - s.z;
  var d = Math.sqrt(dx*dx + dz*dz) || 1;
  s.ix = dx/d; s.iz = dz/d;
  s.il = clamp((gain === undefined ? 1 : gain) * (d / 2.5), 0, 1);
}
function aiThink(s, t, dt){
  var d = D();
  var dir = s.team === 0 ? 1 : -1;
  var oppX = dir * GOAL_X, ownX = -dir * GOAL_X;
  var wob = Math.sin(t * 0.8 + s.jitter) * 4.5;

  s.think -= dt;
  if(s.stun > 0){ s.il = 0; return; }

  if(carrier === s){
    var dn = dist(s.x, s.z, oppX, 0);
    var lane = Math.abs(s.z) < 8.5;
    if(dn < d.shootD && lane && s.shootCool <= 0){
      if(!s.charging && Math.random() < 0.08 * d.aggr){ s.charging = true; s.charge = 0; }
      if(s.charging && s.charge > 0.25 + Math.random() * 0.45){ shoot(s, s.charge); return; }
    }
    var m = mateOf(s);
    if(m && !m.stun && dist(m.x, m.z, oppX, 0) < dn - 6 && Math.random() < 0.012 * d.aggr){ passTo(s); return; }
    var far = Math.abs(s.x - oppX) > 14;
    steer(s, oppX - dir * 4.2, far ? s.slot * 6.5 : clamp(s.z * 0.5, -3, 3) + wob * 0.2);
  } else if(carrier && carrier.team === s.team){
    steer(s, oppX - dir * (8 + Math.abs(wob)), s.slot * 5.5 + wob * 0.5);
  } else {
    var chaser = nearestToPuck(s.team);
    if(s === chaser){
      var lead = carrier ? 0.12 : 0.28;
      steer(s, puck.x + puck.vx * lead, puck.z + puck.vz * lead);
      s.il = 1;
    } else {
      steer(s, ownX + dir * (7.5 + wob * 0.4), s.slot * 4.5);
    }
  }
}

/* ---- goalies ---- */
function stepGoalie(g, dt){
  var dir = g.team === 0 ? -1 : 1;                 // which way their net faces
  var own = dir * GOAL_X;
  var near = g.team === 0 ? (puck.x < 4) : (puck.x > -4);
  var skill = D().gk * (G.humans === 2 ? 0.92 : (g.team === 0 ? 0.9 : 1));
  var tz = 0;
  if(near){
    var aim = puck.z + puck.vz * 0.1;
    tz = clamp(aim * 0.82, -MOUTH - 0.35, MOUTH + 0.35);
  }
  g.vz += (tz - g.z) * 26 * skill * dt;
  g.vz *= Math.exp(-7 * dt);
  var vmax = 7 * skill;
  if(Math.abs(g.vz) > vmax) g.vz = vmax * (g.vz > 0 ? 1 : -1);
  g.z += g.vz * dt;
  g.z = clamp(g.z, -MOUTH - 0.5, MOUTH + 0.5);
  g.x = own - dir * (near ? 1.25 : 0.75);
  g.model.position.set(g.x, 0, g.z);
  g.model.visible = !g.hidden;
  animateGoalie(g, dt);
}

function goalieSave(g){
  if(g.hidden) return false;
  var dx = Math.abs(puck.x - g.x), dz = Math.abs(puck.z - g.z);
  var body = dx < 0.62 && dz < 0.95 && puck.y < 1.62;
  var pad  = dx < 0.80 && dz < 1.30 && puck.y < 0.52;
  var glove = dx < 0.70 && dz < 1.45 && puck.y > 0.9 && puck.y < 1.70;
  if(body || pad || glove){
    var dir = g.team === 0 ? 1 : -1;
    var sp = Math.max(5, Math.sqrt(puck.vx*puck.vx + puck.vz*puck.vz) * 0.45);
    var ang = (puck.z - g.z) * 0.5 + (Math.random() - 0.5) * 0.9;
    puck.x = g.x + dir * 0.95;
    puck.vx = dir * sp;
    puck.vz = ang * sp * 0.6;
    puck.vy = 1.5;
    puckCool = Math.max(puckCool, 0.12);
    sfx.save();
    toast('Save', 0.7);
    return true;
  }
  return false;
}

/* ---- puck ---- */
function stepPuck(dt){
  var cfg = S();
  if(puckCool > 0) puckCool -= dt;

  if(carrier){
    var s = carrier;
    if(s.charging) s.charge = Math.min(1, s.charge + dt / 0.6);
    var reach = s.charging ? 1.05 - s.charge * 0.25 : 1.18;
    var hold = localToWorld(s, reach, s.charging ? 0.62 : 0.45);
    puck.x = hold.x; puck.z = hold.z; puck.y = PUCK_R;
    puck.vx = s.vx; puck.vz = s.vz; puck.vy = 0;
  } else {
    puck.x += puck.vx * dt;
    puck.z += puck.vz * dt;
    puck.y += puck.vy * dt;
    puck.vy -= 24 * dt;
    if(puck.y < PUCK_R){
      puck.y = PUCK_R;
      if(puck.vy < -2.5){ puck.vy = -puck.vy * 0.3; } else puck.vy = 0;
    }
    var kk = Math.exp(-cfg.discDrag * dt);
    puck.vx *= kk; puck.vz *= kk;

    // posts, crossbar, goals
    for(var i = 0; i < 2; i++){
      var side = i === 0 ? -1 : 1;
      var line = side * GOAL_X;
      var crossed = side === 1 ? (puck.x > line) : (puck.x < line);
      if(!crossed) continue;
      var behind = Math.abs(puck.x - line) < 1.6;
      if(!behind) continue;
      if(Math.abs(puck.z) < MOUTH - 0.06 && puck.y < BAR - 0.05){
        goal(side === 1 ? 0 : 1);
        return;
      }
      if(Math.abs(puck.z) < MOUTH + 0.12 && Math.abs(Math.abs(puck.z) - MOUTH) < 0.14 && puck.y < BAR){
        puck.x = line - side * 0.26; puck.vx *= -0.55; sfx.post(); toast('Post', 0.6);
      } else if(Math.abs(puck.z) < MOUTH && Math.abs(puck.y - BAR) < 0.16){
        puck.x = line - side * 0.26; puck.vx *= -0.5; puck.vy = -1; sfx.post(); toast('Crossbar', 0.6);
      }
    }

    confine(puck, PUCK_R, cfg.bounce);

    for(var gi = 0; gi < 2; gi++) goalieSave(goalies[gi]);

    if(puckCool <= 0){
      var best = null, bd = 1e9;
      for(var si = 0; si < skaters.length; si++){
        var sk = skaters[si];
        if(sk.stun > 0) continue;
        var blade = localToWorld(sk, 0.95, 0.4);
        var d2 = dist(blade.x, blade.z, puck.x, puck.z);
        if(d2 < 0.85 && puck.y < 0.7 && d2 < bd){ bd = d2; best = sk; }
      }
      if(best){
        carrier = best; best.charge = 0; sfx.stick(0.12);
        if(G.tut) tutEvent('pickup', best);
      }
    }
  }

  puckMesh.position.set(puck.x, puck.y, puck.z);
  if(G.surface === 'roller'){
    puckMesh.rotation.z -= puck.vx * dt * 3;
    puckMesh.rotation.x += puck.vz * dt * 3;
  } else {
    puckMesh.rotation.y += dt * 4;
  }
}

/* ---- scoring and clock ---- */
function goal(team){
  if(G.phase === 'menu'){ resetPositions(); return; }   // attract-mode demo keeps no score
  G.score[team]++; G.lastGoalBy = team; G.shake = 1.0;
  crowdBob = 3.0;
  sfx.horn();
  paintBug(); paintJumbo();
  var lamp = team === 0 ? el('lampH') : el('lampA');
  lamp.classList.add('on');
  setTimeout(function(){ lamp.classList.remove('on'); }, 2800);
  toast('GOAL', 1.8, team === 0 ? '#9ec6f7' : '#f3a99e');
  if(G.tut){
    tutEvent('goal');
    resetPositions();
    if(G.tut.step && G.tut.i >= 3 && G.tut.step.def.enter) G.tut.step.def.enter(G.tut.step);
    return;
  }
  if(G.ot){ endGame(); return; }
  G.phase = 'celebrate';
  G.faceoffT = 2.0;
}

function endPeriod(){
  sfx.whistle();
  if(G.period < PERIODS){
    G.phase = 'break';
    el('breakTitle').textContent = 'End of the ' + ['1st','2nd','3rd'][G.period-1];
    el('breakScore').innerHTML = G.score[0] + ' &ndash; ' + G.score[1];
    el('breakNote').textContent = G.score[0] === G.score[1] ? 'All even. Back at it.'
      : (G.score[0] > G.score[1] ? 'Home is up. Keep the pressure on.' : 'Time to push back.');
    el('ovBreak').classList.add('on');
    setTimeout(function(){
      el('ovBreak').classList.remove('on');
      G.period++; G.clock = PERIOD_LEN; paintBug(); paintJumbo(); faceoff('Face-off');
    }, 2400);
  } else if(G.score[0] === G.score[1]){
    G.ot = true; G.clock = PERIOD_LEN; paintBug();
    G.phase = 'break';
    el('breakTitle').textContent = 'Overtime';
    el('breakScore').innerHTML = G.score[0] + ' &ndash; ' + G.score[1];
    el('breakNote').textContent = 'Next goal wins it.';
    el('ovBreak').classList.add('on');
    setTimeout(function(){ el('ovBreak').classList.remove('on'); faceoff('Sudden death'); }, 2100);
  } else endGame();
}

function endGame(){
  G.phase = 'over';
  var a = G.score[0], b = G.score[1];
  var p1Won = a > b;
  if(G.humans === 2){
    el('overTitle').textContent = a === b ? 'Draw' : (p1Won ? 'Player 1 wins' : 'Player 2 wins');
    el('overNote').textContent = a === b ? 'Nobody blinked.' : 'Winner picks the next surface.';
  } else {
    el('overTitle').textContent = a === b ? 'Draw' : (p1Won ? 'You win' : 'CPU wins');
    el('overNote').textContent = p1Won ? 'Three stars, all yours. Try All-Star next.'
      : (a === b ? 'Nobody blinked.' : 'They found the slot too often. Tighten up the back end.');
  }
  el('overScore').innerHTML = a + ' &ndash; ' + b;
  el('ovOver').classList.add('on');
  showPads(false);
  sfx.whistle();
}

/* =========================================================================
   8. TUTORIAL
   ========================================================================= */
function makeMarker(){
  var g = new T.Group();
  var green = 0x3ec98a;
  var ring = new T.Mesh(new T.RingGeometry(1.35, 1.95, 36),
    new T.MeshBasicMaterial({color: green, transparent: true, opacity: 0.95, side: T.DoubleSide, depthWrite: false}));
  ring.rotation.x = -Math.PI/2; ring.position.y = 0.05; ring.renderOrder = 8;
  g.add(ring);
  var disc = new T.Mesh(new T.CircleGeometry(1.35, 32),
    new T.MeshBasicMaterial({color: green, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false}));
  disc.rotation.x = -Math.PI/2; disc.position.y = 0.04; disc.renderOrder = 7;
  g.add(disc);
  var beacon = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 5.0, 14, 1, true),
    new T.MeshBasicMaterial({color: green, transparent: true, opacity: 0.32, side: T.DoubleSide, depthWrite: false}));
  beacon.position.y = 2.5; beacon.renderOrder = 8;
  g.add(beacon);
  g.visible = false;
  return g;
}

var TUT_STEPS = [
  {
    task: 'Skate to the marker',
    hint: function(){ return 'Move with ' + keyName('move') + '.'; },
    enter: function(t){ t.targets = [[-12, 6], [10, -6]]; t.idx = 0; placeMarker(t); },
    update: function(t){
      var s = control.p1;
      if(dist(s.x, s.z, t.targets[t.idx][0], t.targets[t.idx][1]) < 1.6){
        t.idx++; sfx.ping();
        if(t.idx >= t.targets.length) return true;
        placeMarker(t);
      }
      return false;
    }
  },
  {
    task: 'Pick up the puck',
    hint: function(){ return 'Skate over it. Your stick takes it automatically.'; },
    enter: function(t){ markerMesh.visible = false; puck.x = 8; puck.z = 4; puck.vx = 0; puck.vz = 0; carrier = null; t.got = false; },
    update: function(t){ return !!t.got; },
    event: function(t, kind, who){ if(kind === 'pickup' && who === control.p1) t.got = true; }
  },
  {
    task: 'Score on the empty net',
    hint: function(){ return 'Hold ' + keyName('shoot') + ' to load the shot, let go to fire. Aim with the stick.'; },
    enter: function(t){ goalies[1].hidden = true; t.scored = false; if(!carrier) { puck.x = control.p1.x + 1; puck.z = control.p1.z; } },
    update: function(t){ return !!t.scored; },
    event: function(t, kind){ if(kind === 'goal') t.scored = true; },
    exit: function(){ goalies[1].hidden = false; }
  },
  {
    task: 'Pass to your winger',
    hint: function(){ return 'Tap ' + keyName('pass') + ' while you have the puck.'; },
    enter: function(t){ t.done = false; resetPositions(); carrier = control.p1; },
    update: function(t){ return !!t.done; },
    event: function(t, kind){ if(kind === 'pass') t.done = true; }
  },
  {
    task: 'Knock the puck loose',
    hint: function(){ return 'Build up speed and skate straight through the carrier.'; },
    enter: function(t){
      t.done = false;
      resetPositions();
      carrier = skaters[2];
      skaters[2].x = 4; skaters[2].z = 0;
      control.p1.x = -4; control.p1.z = 0;
    },
    update: function(t){ return !!t.done; },
    event: function(t, kind){ if(kind === 'check') t.done = true; }
  }
];

function placeMarker(t){
  var p = t.targets[t.idx];
  if(!markerMesh) return;
  markerMesh.position.set(p[0], 0, p[1]);
  markerMesh.visible = true;
}

function keyName(action){
  if(lastDevice === 'touch'){
    return action === 'move' ? 'the stick on the left' : (action === 'shoot' ? 'SHOOT' : 'PASS');
  }
  if(lastDevice === 'pad'){
    return action === 'move' ? 'the left stick' : (action === 'shoot' ? 'A / right trigger' : 'X / right bumper');
  }
  return action === 'move' ? 'W A S D' : (action === 'shoot' ? 'Space' : 'Q');
}

function startTutorial(){
  G.phase = 'tutorial';
  G.humans = 1;
  G.score = [0, 0]; G.period = 1; G.clock = PERIOD_LEN; G.ot = false;
  buildWorld();
  createTeams();
  if(markerMesh) world.remove(markerMesh);
  markerMesh = makeMarker();
  world.add(markerMesh);
  resetPositions();
  // park everyone but you and one winger out of the way
  skaters[3].x = -22; skaters[3].z = -10;
  G.tut = {i: 0, step: null};
  enterTutStep(0);
  el('coach').classList.add('on');
  el('bug').classList.remove('on');
  showPads(true);
  closeMenus();
}

function enterTutStep(i){
  var def = TUT_STEPS[i];
  var t = {def: def};
  G.tut.i = i; G.tut.step = t;
  G.tutFreezeOpp = (i < 4);            // opponents stand down until the checking drill
  if(def.enter) def.enter(t);
  el('coachStep').textContent = 'Step ' + (i+1) + ' of ' + TUT_STEPS.length;
  el('coachTask').textContent = def.task;
  el('coachHint').innerHTML = def.hint().replace(/\b(W A S D|Space|Q|SHOOT|PASS)\b/g, '<k>$1</k>');
  el('coachBar').style.width = Math.round(i / TUT_STEPS.length * 100) + '%';
}

function tutEvent(kind, who){
  if(!G.tut || !G.tut.step) return;
  var def = G.tut.step.def;
  if(def.event) def.event(G.tut.step, kind, who);
}

function updateTutorial(dt){
  var t = G.tut.step;
  if(!t) return;
  if(t.def.update(t, dt)){
    if(t.def.exit) t.def.exit(t);
    sfx.ping();
    var next = G.tut.i + 1;
    if(next >= TUT_STEPS.length){
      el('coachBar').style.width = '100%';
      el('coachTask').textContent = 'Tutorial complete';
      el('coachHint').innerHTML = 'That is the whole game. Pick a surface and play.';
      el('coachStep').textContent = 'Done';
      markerMesh.visible = false;
      G.tut = null;
      setTimeout(function(){
        el('coach').classList.remove('on');
        try { localStorage.setItem('sa_tut', '1'); } catch(e){}
        openMenu();
      }, 2200);
      return;
    }
    enterTutStep(next);
  }
  void dt;
}
