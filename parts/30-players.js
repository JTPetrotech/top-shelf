
/* =========================================================================
   6. PLAYER MODELS
   Everything is built facing +X; root.rotation.y = -face puts them on heading.
   ========================================================================= */
var MATS = null;
function makeMats(){
  if(MATS) return;
  var M = function(c, r, m){ return new T.MeshStandardMaterial({color: c, roughness: r === undefined ? 0.7 : r, metalness: m || 0}); };
  MATS = {
    skin: M(0xd3a079, 0.85),
    pants: M(0x141b25, 0.9),
    sock: M(0x1a2330, 0.9),
    shaft: M(0xc9a06a, 0.65),
    blade: M(0x0d1116, 0.6),
    steel: M(0xd2dbe6, 0.3, 0.75),
    wheel: M(0x1d2733, 0.55),
    visor: new T.MeshStandardMaterial({color: 0xbfe2f5, transparent: true, opacity: 0.45, roughness: 0.1}),
    white: M(0xeef3f9, 0.7),
    teams: [
      {jersey: M(0x2f7fe0, 0.62), trim: M(0x14365f, 0.7), helmet: M(0x1b4a85, 0.5), glove: M(0x17406f, 0.7)},
      {jersey: M(0xe04a33, 0.62), trim: M(0x6d1f14, 0.7), helmet: M(0x8d2b1c, 0.5), glove: M(0x7a2416, 0.7)}
    ]
  };
  var mark = function(o){
    for(var k in o){ if(o[k] && o[k].isMaterial) o[k].userData.keep = true; }
  };
  mark(MATS); mark(MATS.teams[0]); mark(MATS.teams[1]);
}

function numberTexture(n, team){
  var c = document.createElement('canvas'); c.width = 128; c.height = 128;
  var g = c.getContext('2d');
  g.fillStyle = team === 0 ? '#2f7fe0' : '#e04a33';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff';
  g.font = 'bold 86px Bebas Neue, Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), 64, 70);
  var t = new T.CanvasTexture(c);
  if(T.sRGBEncoding) t.encoding = T.sRGBEncoding;
  return t;
}

function skateFoot(roller){
  var g = new T.Group();
  var boot = new T.Mesh(new T.BoxGeometry(0.30, 0.16, 0.17), MATS.blade);
  boot.position.y = 0.10; boot.castShadow = true;
  g.add(boot);
  if(roller){
    for(var i = 0; i < 4; i++){
      var w = new T.Mesh(new T.CylinderGeometry(0.055, 0.055, 0.05, 10), MATS.wheel);
      w.rotation.x = Math.PI/2;
      w.position.set(-0.105 + i*0.07, 0.055, 0);
      g.add(w);
    }
  } else {
    var holder = new T.Mesh(new T.BoxGeometry(0.26, 0.05, 0.03), MATS.blade);
    holder.position.y = 0.035; g.add(holder);
    var steel = new T.Mesh(new T.BoxGeometry(0.33, 0.035, 0.018), MATS.steel);
    steel.position.y = 0.012; g.add(steel);
  }
  return g;
}

function buildLeg(team, roller){
  var leg = new T.Group();                      // pivots at the hip
  var thigh = new T.Mesh(new T.CylinderGeometry(0.115, 0.095, 0.40, 8), MATS.pants);
  thigh.position.y = -0.20; thigh.castShadow = true; leg.add(thigh);
  var shin = new T.Mesh(new T.CylinderGeometry(0.085, 0.07, 0.36, 8), MATS.sock);
  shin.position.y = -0.56; shin.castShadow = true; leg.add(shin);
  var foot = skateFoot(roller);
  foot.position.y = -0.76;
  leg.add(foot);
  leg.userData.foot = foot;
  void team;
  return leg;
}

function buildArm(team){
  var arm = new T.Group();                      // pivots at the shoulder
  var sleeve = new T.Mesh(new T.CylinderGeometry(0.095, 0.08, 0.34, 8), MATS.teams[team].jersey);
  sleeve.position.y = -0.17; sleeve.castShadow = true; arm.add(sleeve);
  var fore = new T.Mesh(new T.CylinderGeometry(0.075, 0.065, 0.30, 8), MATS.teams[team].trim);
  fore.position.y = -0.47; arm.add(fore);
  var glove = new T.Mesh(new T.BoxGeometry(0.17, 0.19, 0.15), MATS.teams[team].glove);
  glove.position.y = -0.68; glove.castShadow = true; arm.add(glove);
  return arm;
}

function buildStick(){
  var g = new T.Group();
  var shaft = new T.Mesh(new T.BoxGeometry(1.26, 0.045, 0.06), MATS.shaft);
  shaft.position.set(0.63, 0, 0);
  shaft.castShadow = true;
  g.add(shaft);
  var blade = new T.Mesh(new T.BoxGeometry(0.32, 0.075, 0.055), MATS.blade);
  blade.position.set(1.33, -0.02, 0.02);
  blade.rotation.y = 0.25;
  g.add(blade);
  g.userData.blade = blade;
  return g;
}

function buildSkater(team, num, roller){
  makeMats();
  var mt = MATS.teams[team];
  var root = new T.Group();
  var lean = new T.Group();
  root.add(lean);

  var hips = new T.Mesh(new T.CylinderGeometry(0.26, 0.23, 0.30, 10), MATS.pants);
  hips.position.y = 0.92; hips.castShadow = true; lean.add(hips);

  var torso = new T.Mesh(new T.CylinderGeometry(0.30, 0.27, 0.56, 10), mt.jersey);
  torso.position.y = 1.32; torso.castShadow = true; lean.add(torso);

  var stripe = new T.Mesh(new T.CylinderGeometry(0.305, 0.295, 0.09, 10), mt.trim);
  stripe.position.y = 1.08; lean.add(stripe);

  var shoulders = new T.Mesh(new T.SphereGeometry(0.33, 12, 10), mt.jersey);
  shoulders.scale.set(1.18, 0.62, 0.9);
  shoulders.position.y = 1.58; shoulders.castShadow = true; lean.add(shoulders);

  var neck = new T.Mesh(new T.CylinderGeometry(0.075, 0.09, 0.1, 8), MATS.skin);
  neck.position.y = 1.70; lean.add(neck);

  var head = new T.Mesh(new T.SphereGeometry(0.145, 12, 12), MATS.skin);
  head.position.y = 1.83; head.castShadow = true; lean.add(head);

  var helmet = new T.Mesh(new T.SphereGeometry(0.175, 14, 12, 0, Math.PI*2, 0, Math.PI*0.62), mt.helmet);
  helmet.position.y = 1.845; helmet.castShadow = true; lean.add(helmet);

  var visor = new T.Mesh(new T.BoxGeometry(0.07, 0.11, 0.26), MATS.visor);
  visor.position.set(0.13, 1.82, 0); lean.add(visor);

  var plate = new T.Mesh(new T.PlaneGeometry(0.34, 0.34), new T.MeshStandardMaterial({map: numberTexture(num, team), roughness: 0.7}));
  plate.position.set(-0.285, 1.36, 0);
  plate.rotation.y = -Math.PI/2;
  lean.add(plate);

  var armL = buildArm(team), armR = buildArm(team);
  armL.position.set(0.02, 1.56, -0.34);
  armR.position.set(0.02, 1.56, 0.34);
  armL.rotation.x = 0.22; armR.rotation.x = -0.22;
  lean.add(armL); lean.add(armR);

  var legL = buildLeg(team, roller), legR = buildLeg(team, roller);
  legL.position.set(0, 0.86, -0.15);
  legR.position.set(0, 0.86, 0.15);
  lean.add(legL); lean.add(legR);

  var stick = buildStick();
  stick.position.set(0.18, 0.92, 0.38);
  stick.rotation.z = -0.52;
  stick.rotation.y = 0.18;
  lean.add(stick);

  root.userData = {lean: lean, legL: legL, legR: legR, armL: armL, armR: armR,
                   stick: stick, torso: torso, head: head, phase: Math.random()*6.28};
  return root;
}

function buildGoalie(team, roller){
  makeMats();
  var mt = MATS.teams[team];
  var root = new T.Group();
  var lean = new T.Group();
  root.add(lean);

  var pads = new T.Mesh(new T.BoxGeometry(0.30, 0.86, 1.00), MATS.white);
  pads.position.set(0.06, 0.44, 0); pads.castShadow = true; lean.add(pads);

  var padTrim = new T.Mesh(new T.BoxGeometry(0.32, 0.12, 1.02), mt.trim);
  padTrim.position.set(0.06, 0.70, 0); lean.add(padTrim);

  var body = new T.Mesh(new T.CylinderGeometry(0.36, 0.33, 0.62, 10), mt.jersey);
  body.position.y = 1.18; body.castShadow = true; lean.add(body);

  var chest = new T.Mesh(new T.SphereGeometry(0.4, 12, 10), mt.jersey);
  chest.scale.set(0.95, 0.72, 1.3);
  chest.position.y = 1.40; chest.castShadow = true; lean.add(chest);

  var head = new T.Mesh(new T.SphereGeometry(0.16, 12, 12), MATS.white);
  head.position.y = 1.72; head.castShadow = true; lean.add(head);
  var cage = new T.Mesh(new T.BoxGeometry(0.05, 0.14, 0.2), MATS.blade);
  cage.position.set(0.15, 1.70, 0); lean.add(cage);

  var glove = new T.Mesh(new T.BoxGeometry(0.26, 0.30, 0.26), mt.glove);
  glove.position.set(0.12, 1.26, -0.52); glove.castShadow = true; lean.add(glove);

  var blocker = new T.Mesh(new T.BoxGeometry(0.16, 0.34, 0.30), MATS.white);
  blocker.position.set(0.14, 1.16, 0.52); blocker.castShadow = true; lean.add(blocker);

  var gstick = new T.Mesh(new T.BoxGeometry(0.9, 0.06, 0.1), MATS.shaft);
  gstick.position.set(0.42, 0.34, 0.46);
  gstick.rotation.z = -0.1;
  lean.add(gstick);

  var paddle = new T.Mesh(new T.BoxGeometry(0.5, 0.3, 0.05), MATS.blade);
  paddle.position.set(0.72, 0.18, 0.46);
  lean.add(paddle);

  var feet = skateFoot(roller);
  feet.position.set(0, 0.0, -0.3); lean.add(feet);
  var feet2 = skateFoot(roller);
  feet2.position.set(0, 0.0, 0.3); lean.add(feet2);

  root.userData = {lean: lean, glove: glove, blocker: blocker};
  return root;
}

/* ---- per-frame animation ---- */
function animateSkater(s, dt){
  var u = s.model.userData;
  var sp = Math.sqrt(s.vx*s.vx + s.vz*s.vz);
  u.phase += dt * (2.2 + sp * 1.25);
  var stride = Math.sin(u.phase);
  var amp = Math.min(1, sp / 7) * 0.62;

  if(s.stun > 0){
    // knocked down: fold over and drag
    var k = Math.min(1, s.stun * 3.2);
    u.lean.rotation.z = -1.25 * k;
    u.lean.rotation.x = 0.4 * k;
    u.legL.rotation.z = 0.5; u.legR.rotation.z = -0.3;
    return;
  }

  u.legL.rotation.z = stride * amp;
  u.legR.rotation.z = -stride * amp;
  u.legL.rotation.x = -Math.abs(stride) * amp * 0.5;
  u.legR.rotation.x = Math.abs(stride) * amp * 0.5;

  u.armL.rotation.z = -stride * amp * 0.55;
  u.armR.rotation.z = stride * amp * 0.35;

  var leanF = -0.12 - Math.min(0.3, sp * 0.028);
  u.lean.rotation.z += (leanF - u.lean.rotation.z) * Math.min(1, dt * 8);
  var carve = Math.max(-0.35, Math.min(0.35, s.turnRate * 0.5));
  u.lean.rotation.x += (carve - u.lean.rotation.x) * Math.min(1, dt * 7);

  // stick: wind up while loading, snap through on release, reach for the disc otherwise
  var targetZ = -0.52, targetY = 0.18;
  if(s.charging){
    targetZ = -0.52 - s.charge * 1.45;
    targetY = 0.18 + s.charge * 0.55;
  } else if(s.followT > 0){
    targetZ = 0.35;
    targetY = -0.45;
  } else if(carrier === s){
    targetZ = -0.42;
    targetY = 0.05 + Math.sin(u.phase * 0.8) * 0.12;
  }
  u.stick.rotation.z += (targetZ - u.stick.rotation.z) * Math.min(1, dt * (s.followT > 0 ? 26 : 11));
  u.stick.rotation.y += (targetY - u.stick.rotation.y) * Math.min(1, dt * 11);
}

function animateGoalie(g, dt){
  var u = g.model.userData;
  var react = Math.min(1, Math.abs(g.vz) / 6);
  u.lean.rotation.z = -0.1 - react * 0.12;
  u.glove.position.y = 1.26 + Math.sin(performance.now() * 0.003) * 0.03;
  void dt;
}
