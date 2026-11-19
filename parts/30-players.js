
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

/* A profile spun around Y. Hockey gear is mostly tapered tubes, and a lathe
   gives a continuous silhouette where stacked cylinders gave stair steps. */
function lathe(profile, seg, mat){
  var pts = [];
  for(var i = 0; i < profile.length; i++) pts.push(new T.Vector2(profile[i][0], profile[i][1]));
  var m = new T.Mesh(new T.LatheGeometry(pts, seg || 16), mat);
  m.castShadow = true;
  return m;
}

function skateFoot(roller){
  var g = new T.Group();

  // boot: narrow at the toe, built up at the heel, with an ankle cuff above it
  var boot = new T.Mesh(new T.BoxGeometry(0.33, 0.13, 0.155), MATS.blade);
  boot.position.set(0.015, 0.095, 0); boot.castShadow = true; g.add(boot);

  var toe = new T.Mesh(new T.BoxGeometry(0.09, 0.09, 0.125), MATS.blade);
  toe.position.set(0.175, 0.075, 0); g.add(toe);

  var cuff = new T.Mesh(new T.BoxGeometry(0.17, 0.12, 0.17), MATS.blade);
  cuff.position.set(-0.035, 0.185, 0); cuff.castShadow = true; g.add(cuff);

  var tongue = new T.Mesh(new T.BoxGeometry(0.055, 0.13, 0.12), MATS.white);
  tongue.position.set(0.075, 0.185, 0); tongue.rotation.z = 0.22; g.add(tongue);

  if(roller){
    var chassis = new T.Mesh(new T.BoxGeometry(0.30, 0.035, 0.05), MATS.steel);
    chassis.position.y = 0.045; g.add(chassis);
    for(var i = 0; i < 4; i++){
      var w = new T.Mesh(new T.CylinderGeometry(0.052, 0.052, 0.045, 12), MATS.wheel);
      w.rotation.x = Math.PI / 2;
      w.position.set(-0.105 + i * 0.07, 0.052, 0);
      g.add(w);
    }
  } else {
    var holderF = new T.Mesh(new T.BoxGeometry(0.035, 0.055, 0.028), MATS.blade);
    holderF.position.set(0.12, 0.045, 0); g.add(holderF);
    var holderB = new T.Mesh(new T.BoxGeometry(0.035, 0.055, 0.028), MATS.blade);
    holderB.position.set(-0.10, 0.045, 0); g.add(holderB);
    var steel = new T.Mesh(new T.BoxGeometry(0.345, 0.028, 0.016), MATS.steel);
    steel.position.y = 0.014; g.add(steel);
  }
  return g;
}

function buildLeg(team, roller){
  var leg = new T.Group();                      // pivots at the hip
  var sockMat = MATS.teams[team].trim;

  // thigh, bulked out by the pant
  var thigh = lathe([[0.02,0],[0.135,-0.03],[0.145,-0.16],[0.125,-0.30],[0.10,-0.38],[0.02,-0.40]], 12, MATS.pants);
  leg.add(thigh);

  var knee = new T.Mesh(new T.SphereGeometry(0.098, 10, 8), sockMat);
  knee.position.y = -0.42; knee.castShadow = true; leg.add(knee);

  // shin pad: a hockey shin is a slab down the front, not a tube
  var shin = lathe([[0.02,-0.44],[0.098,-0.47],[0.095,-0.62],[0.082,-0.74],[0.02,-0.76]], 12, sockMat);
  leg.add(shin);
  var guard = new T.Mesh(new T.BoxGeometry(0.085, 0.27, 0.15), sockMat);
  guard.position.set(0.055, -0.59, 0); guard.castShadow = true; leg.add(guard);

  var foot = skateFoot(roller);
  foot.position.y = -0.78;
  leg.add(foot);
  leg.userData.foot = foot;
  return leg;
}

function buildArm(team){
  var arm = new T.Group();                      // pivots at the shoulder
  var mt = MATS.teams[team];

  var cap = new T.Mesh(new T.SphereGeometry(0.107, 12, 10), mt.jersey);
  cap.scale.set(1, 0.90, 0.84); cap.position.y = 0.012; cap.castShadow = true; arm.add(cap);

  var sleeve = lathe([[0.02,0],[0.105,-0.02],[0.10,-0.14],[0.088,-0.28],[0.02,-0.30]], 12, mt.jersey);
  arm.add(sleeve);

  var elbow = new T.Mesh(new T.SphereGeometry(0.076, 10, 8), mt.jersey);
  elbow.position.y = -0.32; elbow.castShadow = true; arm.add(elbow);

  // the forearm hangs slightly forward, the way it does on a stick
  var fore = new T.Group();
  fore.position.y = -0.34;
  fore.rotation.z = -0.30;
  arm.add(fore);

  var cuff = lathe([[0.02,0],[0.082,-0.02],[0.075,-0.14],[0.068,-0.24],[0.02,-0.26]], 12, mt.trim);
  fore.add(cuff);

  // hockey gloves are big blunt blocks with a flared cuff
  var glove = new T.Mesh(new T.BoxGeometry(0.165, 0.20, 0.155), mt.glove);
  glove.position.y = -0.37; glove.castShadow = true; fore.add(glove);
  var gcuff = new T.Mesh(new T.BoxGeometry(0.145, 0.085, 0.145), mt.trim);
  gcuff.position.y = -0.265; fore.add(gcuff);
  var thumb = new T.Mesh(new T.BoxGeometry(0.07, 0.11, 0.065), mt.glove);
  thumb.position.set(0.085, -0.345, 0.03); fore.add(thumb);

  arm.userData.fore = fore;
  return arm;
}

/* ---- how each stick in the collection actually looks on the ice ----
   curve is how far the toe sweeps off the heel line, in metres; len is blade
   length; lie is the shaft angle the blade has to cancel to sit flat. */
var STICK_LOOKS = {
  twig:    {shaft:0xb98752, grip:0x232a34, tape:0x15191f, curve:0.028, len:0.32, h0:0.082, h1:0.060, thick:0.024, girth:1.00, wear:true},
  birch:   {shaft:0xd9b887,   grip:0x1d2530, tape:0x15191f, curve:0.038, len:0.34, h0:0.082, h1:0.060, thick:0.024, girth:1.00},
  sling:   {shaft:0x2f7fe0,   grip:0x11263d, tape:0x15191f, curve:0.082, len:0.32, h0:0.078, h1:0.056, thick:0.021, girth:0.92},
  surgeon: {shaft:0xeef3f9,   grip:0x9fb3c8, tape:0x1d2530, curve:0.030, len:0.37, h0:0.076, h1:0.062, thick:0.022, girth:0.95},
  howitz:  {shaft:0x1b222c,   grip:0x0b0e13, tape:0x15191f, curve:0.048, len:0.37, h0:0.090, h1:0.066, thick:0.030, girth:1.16},
  feather: {shaft:0x3ec98a,   grip:0x124631, tape:0x15191f, curve:0.044, len:0.30, h0:0.072, h1:0.054, thick:0.019, girth:0.84},
  barbrk:  {shaft:0xffc43d,   grip:0x4a3410, tape:0x15191f, curve:0.066, len:0.35, h0:0.084, h1:0.060, thick:0.026, girth:1.05}
};
function stickLook(k){
  var L = STICK_LOOKS[k] || STICK_LOOKS.twig;
  return L;
}

/* A blade is a quad swept along a curved centreline: it gets longer, thinner and
   taller-at-the-heel the way a real one does, and the face turns with the curve. */
function bladeGeometry(len, curve, hHeel, hToe, thick){
  var N = 12, pos = [], idx = [], i, k;
  for(i = 0; i <= N; i++){
    var t = i / N;
    var x = t * len;
    var z = curve * t * t;                       // most of the bend lives out at the toe
    var h = hHeel + (hToe - hHeel) * t;
    var slope = (2 * curve * t) / len;           // dz/dx along the centreline
    var inv = 1 / Math.sqrt(1 + slope * slope);
    var nx = -slope * inv * thick * 0.5, nz = inv * thick * 0.5;
    pos.push(x - nx, -h * 0.5, z - nz);
    pos.push(x - nx,  h * 0.5, z - nz);
    pos.push(x + nx,  h * 0.5, z + nz);
    pos.push(x + nx, -h * 0.5, z + nz);
  }
  for(i = 0; i < N; i++){
    var a = i * 4, b = (i + 1) * 4;
    for(k = 0; k < 4; k++){
      var k2 = (k + 1) % 4;
      idx.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  idx.push(0, 1, 2, 0, 2, 3);                    // heel cap
  var e = N * 4;
  idx.push(e, e + 2, e + 1, e, e + 3, e + 2);    // toe cap
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

var stickMatCache = {};
function stickMat(hex, rough){
  var key = hex + '|' + rough;
  if(!stickMatCache[key]){
    var m = new T.MeshStandardMaterial({color: hex, roughness: rough, side: T.DoubleSide});
    m.userData.keep = true;                      // survives a surface rebuild
    stickMatCache[key] = m;
  }
  return stickMatCache[key];
}

function buildStick(key){
  var L = stickLook(key);
  var g = new T.Group();
  var gz = L.girth === undefined ? 1 : L.girth;
  var SHAFT_LEN = 1.20, SH_Y = 0.048 * gz, SH_Z = 0.068 * gz;

  var shaftMat = stickMat(L.shaft, L.wear ? 0.85 : 0.5);
  var gripMat  = stickMat(L.grip, 0.95);
  var tapeMat  = stickMat(L.tape, 0.9);

  // butt knob - the ball of tape every player builds up at the top
  var knob = new T.Mesh(new T.BoxGeometry(0.055, SH_Y * 1.7, SH_Z * 1.5), gripMat);
  knob.position.set(0.012, 0, 0);
  g.add(knob);

  // grip tape down the top third
  var grip = new T.Mesh(new T.BoxGeometry(0.34, SH_Y * 1.12, SH_Z * 1.1), gripMat);
  grip.position.set(0.22, 0, 0);
  g.add(grip);

  // shaft, then a short taper into the heel
  var shaft = new T.Mesh(new T.BoxGeometry(SHAFT_LEN - 0.18, SH_Y, SH_Z), shaftMat);
  shaft.position.set(0.09 + (SHAFT_LEN - 0.18) / 2, 0, 0);
  shaft.castShadow = true;
  g.add(shaft);

  var taper = new T.Mesh(new T.BoxGeometry(0.17, SH_Y * 0.82, SH_Z * 0.80), shaftMat);
  taper.position.set(SHAFT_LEN - 0.04, 0, 0);
  taper.castShadow = true;
  g.add(taper);

  /* The blade hangs off the end of the shaft and cancels the shaft's lie, so it
     lies flat on the ice at rest, lifts on the backswing and digs in through the
     follow-through - all of that falls out of the stick's own rotation. */
  var bg = new T.Group();
  bg.position.set(SHAFT_LEN + 0.03, 0, 0);
  bg.rotation.z = L.lie === undefined ? 0.52 : L.lie;
  g.add(bg);

  var heel = new T.Mesh(new T.BoxGeometry(0.07, L.h0 * 1.05, L.thick * 1.25), tapeMat);
  heel.position.set(0.0, -0.004, 0);
  bg.add(heel);

  var blade = new T.Mesh(bladeGeometry(L.len, L.curve, L.h0, L.h1, L.thick), tapeMat);
  blade.position.set(0.03, -0.004, 0);
  blade.castShadow = true;
  bg.add(blade);

  // tape wrap over the heel half, slightly proud of the blade
  var wrap = new T.Mesh(bladeGeometry(L.len * 0.52, L.curve * 0.27, L.h0 * 1.04, L.h0 * 0.99, L.thick * 1.3), tapeMat);
  wrap.position.set(0.03, -0.004, 0);
  bg.add(wrap);

  g.userData.blade = bg;
  return g;
}

function buildSkater(team, num, roller, stickKey){
  makeMats();
  var mt = MATS.teams[team];
  var root = new T.Group();
  var lean = new T.Group();
  root.add(lean);

  // pants: wide at the hip, cut off above the knee
  var pants = lathe([[0.02,0.74],[0.19,0.75],[0.25,0.82],[0.275,0.93],[0.265,1.02],[0.225,1.07],[0.02,1.08]], 16, MATS.pants);
  pants.scale.set(0.95, 1, 1.06);
  lean.add(pants);

  var belt = new T.Mesh(new T.CylinderGeometry(0.235, 0.245, 0.055, 16), mt.trim);
  belt.position.y = 1.055; belt.scale.set(0.95, 1, 1.06); lean.add(belt);

  /* Jersey as one lathe from hem to collar. It stays fairly narrow up top on its
     own - the square shoulders come from the pads underneath it. */
  var torso = lathe([
    [0.02,0.96],[0.245,0.97],[0.258,1.06],[0.272,1.18],[0.284,1.30],
    [0.298,1.40],[0.315,1.48],[0.303,1.55],[0.242,1.60],[0.135,1.655],[0.02,1.665]
  ], 18, mt.jersey);
  torso.scale.set(0.82, 1, 1.12);
  lean.add(torso);

  var hem = new T.Mesh(new T.CylinderGeometry(0.252, 0.252, 0.07, 16), mt.trim);
  hem.position.y = 1.00; hem.scale.set(0.82, 1, 1.12); lean.add(hem);

  var collar = new T.Mesh(new T.CylinderGeometry(0.125, 0.145, 0.07, 12), mt.trim);
  collar.position.y = 1.655; lean.add(collar);

  var neck = new T.Mesh(new T.CylinderGeometry(0.072, 0.082, 0.10, 10), MATS.skin);
  neck.position.y = 1.72; lean.add(neck);

  var head = new T.Mesh(new T.SphereGeometry(0.138, 14, 12), MATS.skin);
  head.scale.set(1.0, 1.06, 0.92);
  head.position.y = 1.845; head.castShadow = true; lean.add(head);

  var jaw = new T.Mesh(new T.BoxGeometry(0.11, 0.085, 0.145), MATS.skin);
  jaw.position.set(0.055, 1.775, 0); lean.add(jaw);

  // helmet: a fuller dome than a half sphere, with ear covers
  var helmet = new T.Mesh(new T.SphereGeometry(0.168, 16, 14, 0, Math.PI*2, 0, Math.PI*0.70), mt.helmet);
  helmet.position.y = 1.862; helmet.castShadow = true; lean.add(helmet);
  var brim = new T.Mesh(new T.BoxGeometry(0.085, 0.035, 0.235), mt.helmet);
  brim.position.set(0.115, 1.885, 0); lean.add(brim);
  var earL = new T.Mesh(new T.BoxGeometry(0.115, 0.10, 0.045), mt.helmet);
  earL.position.set(-0.01, 1.795, -0.155); lean.add(earL);
  var earR = earL.clone(); earR.position.z = 0.155; lean.add(earR);

  // cage: five thin bars read as a cage from any distance a player is ever seen at
  var cage = new T.Group();
  cage.position.set(0.138, 1.80, 0);
  lean.add(cage);
  for(var cb = 0; cb < 3; cb++){
    var bar = new T.Mesh(new T.BoxGeometry(0.018, 0.016, 0.215), MATS.steel);
    bar.position.set(0.004 - cb * 0.006, 0.055 - cb * 0.052, 0);
    cage.add(bar);
  }
  for(var cv = 0; cv < 2; cv++){
    var vb = new T.Mesh(new T.BoxGeometry(0.016, 0.145, 0.016), MATS.steel);
    vb.position.set(0, -0.005, -0.055 + cv * 0.11);
    cage.add(vb);
  }

  var plate = new T.Mesh(new T.PlaneGeometry(0.30, 0.30),
    new T.MeshStandardMaterial({map: numberTexture(num, team), roughness: 0.7}));
  plate.position.set(-0.232, 1.33, 0);
  plate.rotation.y = -Math.PI/2;
  lean.add(plate);

  var armL = buildArm(team), armR = buildArm(team);
  armL.position.set(0.01, 1.465, -0.308);
  armR.position.set(0.01, 1.465, 0.308);
  armL.rotation.x = 0.20; armR.rotation.x = -0.20;
  lean.add(armL); lean.add(armR);

  var legL = buildLeg(team, roller), legR = buildLeg(team, roller);
  legL.position.set(0, 0.88, -0.145);
  legR.position.set(0, 0.88, 0.145);
  lean.add(legL); lean.add(legR);

  var stick = buildStick(stickKey);
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

  /* Two separate leg pads, not one slab. A goalie's stance reads from the gap
     between the pads and the knee rolls across them. */
  for(var p = 0; p < 2; p++){
    var side = p === 0 ? -1 : 1;
    var pad = new T.Mesh(new T.BoxGeometry(0.30, 0.88, 0.34), MATS.white);
    pad.position.set(0.05, 0.47, side * 0.27); pad.castShadow = true; lean.add(pad);
    for(var rl = 0; rl < 3; rl++){
      var roll = new T.Mesh(new T.BoxGeometry(0.325, 0.075, 0.345), mt.trim);
      roll.position.set(0.05, 0.22 + rl * 0.26, side * 0.27);
      lean.add(roll);
    }
    var toe = new T.Mesh(new T.BoxGeometry(0.30, 0.10, 0.30), mt.trim);
    toe.position.set(0.05, 0.06, side * 0.27); lean.add(toe);
  }

  var pants = lathe([[0.02,0.86],[0.26,0.88],[0.31,0.98],[0.30,1.08],[0.24,1.13],[0.02,1.14]], 14, MATS.pants);
  pants.scale.set(0.9, 1, 1.08);
  lean.add(pants);

  // chest protector: narrow at the waist, big square shoulders
  var body = lathe([
    [0.02,1.10],[0.26,1.12],[0.29,1.22],[0.31,1.33],[0.345,1.44],
    [0.36,1.52],[0.33,1.58],[0.24,1.63],[0.13,1.665],[0.02,1.675]
  ], 16, mt.jersey);
  body.scale.set(0.84, 1, 1.26);
  body.castShadow = true;
  lean.add(body);

  var chestTrim = new T.Mesh(new T.CylinderGeometry(0.312, 0.30, 0.08, 16), mt.trim);
  chestTrim.position.y = 1.27; chestTrim.scale.set(0.84, 1, 1.26); lean.add(chestTrim);

  var neck = new T.Mesh(new T.CylinderGeometry(0.085, 0.10, 0.09, 10), MATS.skin);
  neck.position.y = 1.70; lean.add(neck);

  // mask, with a real cage rather than one dark block
  var mask = new T.Mesh(new T.SphereGeometry(0.163, 14, 12), MATS.white);
  mask.scale.set(1.02, 1.06, 0.95);
  mask.position.y = 1.82; mask.castShadow = true; lean.add(mask);
  var crown = new T.Mesh(new T.SphereGeometry(0.168, 14, 12, 0, Math.PI*2, 0, Math.PI*0.42), mt.helmet);
  crown.position.y = 1.825; lean.add(crown);
  var gcage = new T.Group();
  gcage.position.set(0.128, 1.79, 0);
  lean.add(gcage);
  for(var cb = 0; cb < 4; cb++){
    var bar = new T.Mesh(new T.BoxGeometry(0.018, 0.015, 0.20), MATS.steel);
    bar.position.set(0.006 - cb * 0.005, 0.075 - cb * 0.05, 0);
    gcage.add(bar);
  }
  for(var cv = 0; cv < 3; cv++){
    var vb = new T.Mesh(new T.BoxGeometry(0.016, 0.20, 0.015), MATS.steel);
    vb.position.set(0, 0.0, -0.07 + cv * 0.07);
    gcage.add(vb);
  }

  // catching glove: a trapper with a cuff, not a cube
  var glove = new T.Group();
  glove.position.set(0.12, 1.26, -0.52);
  lean.add(glove);
  var trap = new T.Mesh(new T.BoxGeometry(0.16, 0.32, 0.30), mt.glove);
  trap.castShadow = true; glove.add(trap);
  var pocket = new T.Mesh(new T.BoxGeometry(0.10, 0.22, 0.20), MATS.white);
  pocket.position.set(0.10, 0.03, 0.02); glove.add(pocket);
  var gcuff = new T.Mesh(new T.BoxGeometry(0.15, 0.13, 0.26), mt.trim);
  gcuff.position.y = -0.21; glove.add(gcuff);

  // blocker: a flat board on the back of the hand
  var blocker = new T.Group();
  blocker.position.set(0.14, 1.16, 0.52);
  lean.add(blocker);
  var board = new T.Mesh(new T.BoxGeometry(0.075, 0.40, 0.30), MATS.white);
  board.castShadow = true; blocker.add(board);
  var bTrim = new T.Mesh(new T.BoxGeometry(0.085, 0.07, 0.31), mt.trim);
  bTrim.position.y = 0.155; blocker.add(bTrim);
  var bHand = new T.Mesh(new T.BoxGeometry(0.13, 0.17, 0.16), mt.glove);
  bHand.position.set(-0.09, -0.05, 0); blocker.add(bHand);

  var gstick = new T.Mesh(new T.BoxGeometry(0.62, 0.055, 0.085), stickMat(0xd9b887, 0.55));
  gstick.position.set(0.30, 0.52, 0.46);
  gstick.rotation.z = -0.34;
  gstick.castShadow = true;
  lean.add(gstick);

  var paddle = new T.Mesh(new T.BoxGeometry(0.46, 0.26, 0.052), stickMat(0x15191f, 0.9));
  paddle.position.set(0.60, 0.26, 0.46);
  paddle.rotation.z = -0.34;
  paddle.castShadow = true;
  lean.add(paddle);

  var gblade = new T.Mesh(bladeGeometry(0.40, 0.030, 0.095, 0.072, 0.030), stickMat(0x15191f, 0.9));
  gblade.position.set(0.70, 0.055, 0.46);
  gblade.rotation.y = 0.12;
  gblade.castShadow = true;
  lean.add(gblade);

  var feet = skateFoot(roller);
  feet.position.set(0, 0.0, -0.30); lean.add(feet);
  var feet2 = skateFoot(roller);
  feet2.position.set(0, 0.0, 0.30); lean.add(feet2);

  root.userData = {lean: lean, glove: glove, blocker: blocker};
  return root;
}

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
  if(s.slapT > 0){
    // stick goes right up over the shoulder, then comes through
    var w = 1 - s.slapT / SLAP_WIND;
    targetZ = -0.52 - (1 - w) * 2.15;
    targetY = 0.18 + (1 - w) * 0.78;
  } else if(s.charging){
    targetZ = -0.52 - s.charge * 1.45;
    targetY = 0.18 + s.charge * 0.55;
  } else if(s.followT > 0){
    targetZ = 0.35;
    targetY = -0.45;
  } else if(carrier === s){
    targetZ = -0.42;
    targetY = 0.05 + Math.sin(u.phase * 0.8) * 0.12;
    // carrying on the backhand means reaching the blade across the body
    if(s.carrySide < 0) targetY += 0.62;
  }
  u.stick.rotation.z += (targetZ - u.stick.rotation.z) * Math.min(1, dt * (s.followT > 0 ? 26 : 11));
  u.stick.rotation.y += (targetY - u.stick.rotation.y) * Math.min(1, dt * (s.dangleT > 0 ? 24 : 11));
}

function animateGoalie(g, dt){
  var u = g.model.userData;
  var react = Math.min(1, Math.abs(g.vz) / 6);
  u.lean.rotation.z = -0.1 - react * 0.12;
  u.glove.position.y = 1.26 + Math.sin(performance.now() * 0.003) * 0.03;
  void dt;
}
