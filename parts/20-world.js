
/* =========================================================================
   5. RENDERER, CAMERA, ARENA
   ========================================================================= */
var renderer, scene, camera, world = null, crowdMesh = null, jumboCtx = null, jumboTex = null;
var camShake = 0, crowdBob = 0;

function initGL(){
  renderer = new T.WebGLRenderer({canvas: el('gl'), antialias: !touchOn, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(touchOn ? 1.75 : 2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  if(T.sRGBEncoding) renderer.outputEncoding = T.sRGBEncoding;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(46, 2, 0.5, 400);
  camera.position.set(0, 26, 42);
  camera.lookAt(0, 0, 0);
  resize();
  addEventListener('resize', resize);
}
function resize(){
  var w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}

/* ---- rounded rectangle path shared by surface texture and boards ---- */
function roundRectPath(ctx2, x, y, w, h, r){
  ctx2.beginPath();
  ctx2.moveTo(x + r, y);
  ctx2.lineTo(x + w - r, y); ctx2.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx2.lineTo(x + w, y + h - r); ctx2.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx2.lineTo(x + r, y + h); ctx2.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx2.lineTo(x, y + r); ctx2.quadraticCurveTo(x, y, x + r, y);
  ctx2.closePath();
}
function rinkShape(inset){
  var hx = HX - inset, hz = HZ - inset, r = Math.max(0.4, CORNER - inset);
  var s = new T.Shape();
  s.moveTo(-hx + r, -hz);
  s.lineTo(hx - r, -hz); s.absarc(hx - r, -hz + r, r, -Math.PI/2, 0, false);
  s.lineTo(hx, hz - r);  s.absarc(hx - r, hz - r, r, 0, Math.PI/2, false);
  s.lineTo(-hx + r, hz); s.absarc(-hx + r, hz - r, r, Math.PI/2, Math.PI, false);
  s.lineTo(-hx, -hz + r);s.absarc(-hx + r, -hz + r, r, Math.PI, Math.PI*1.5, false);
  return s;
}

/* ---- the painted surface, drawn to a canvas then used as a texture ---- */
function surfaceTexture(cfg){
  var PU = 34;                               // pixels per world unit
  var cw = Math.round(HX*2*PU), ch = Math.round(HZ*2*PU);
  var c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  var g = c.getContext('2d');
  var X = function(x){ return (x + HX) * PU; };
  var Z = function(z){ return (z + HZ) * PU; };

  g.fillStyle = '#070b11'; g.fillRect(0, 0, cw, ch);

  // playing surface
  roundRectPath(g, 0, 0, cw, ch, CORNER * PU);
  g.save(); g.clip();
  g.fillStyle = cfg.floor; g.fillRect(0, 0, cw, ch);

  if(cfg.tile){                              // roller: modular tile court
    g.strokeStyle = cfg.tile; g.lineWidth = 2;
    for(var tx = 0; tx <= cw; tx += PU){ g.beginPath(); g.moveTo(tx, 0); g.lineTo(tx, ch); g.stroke(); }
    for(var tz = 0; tz <= ch; tz += PU){ g.beginPath(); g.moveTo(0, tz); g.lineTo(cw, tz); g.stroke(); }
  } else {                                   // ice: faint resurfacer sheen
    var sh = g.createLinearGradient(0, 0, 0, ch);
    sh.addColorStop(0, 'rgba(255,255,255,0.55)');
    sh.addColorStop(0.5, 'rgba(214,230,245,0.25)');
    sh.addColorStop(1, 'rgba(255,255,255,0.5)');
    g.fillStyle = sh; g.fillRect(0, 0, cw, ch);
  }

  // centre crest
  g.save();
  g.globalAlpha = cfg.tile ? 0.16 : 0.1;
  g.translate(X(0), Z(0));
  g.fillStyle = cfg.blue;
  g.beginPath(); g.arc(0, 0, 3.6*PU, 0, Math.PI*2); g.fill();
  g.globalAlpha = cfg.tile ? 0.3 : 0.22;
  g.fillStyle = '#ffffff';
  g.font = 'bold ' + (3.2*PU) + 'px Bebas Neue, Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SA', 0, 0.2*PU);
  g.restore();

  // goal lines
  g.strokeStyle = cfg.red; g.lineWidth = 0.14*PU;
  [-GOAL_X, GOAL_X].forEach(function(gx){
    g.beginPath(); g.moveTo(X(gx), 0); g.lineTo(X(gx), ch); g.stroke();
  });
  // blue lines
  g.strokeStyle = cfg.blue; g.lineWidth = 0.42*PU;
  [-BLUE_X, BLUE_X].forEach(function(bx){
    g.beginPath(); g.moveTo(X(bx), 0); g.lineTo(X(bx), ch); g.stroke();
  });
  // centre line
  g.strokeStyle = cfg.red; g.lineWidth = 0.42*PU;
  g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(0), ch); g.stroke();

  // circles and dots
  function circle(x, z, r, col, w){
    g.strokeStyle = col; g.lineWidth = (w || 0.1)*PU;
    g.beginPath(); g.arc(X(x), Z(z), r*PU, 0, Math.PI*2); g.stroke();
  }
  function dot(x, z, r, col){
    g.fillStyle = col; g.beginPath(); g.arc(X(x), Z(z), r*PU, 0, Math.PI*2); g.fill();
  }
  circle(0, 0, 4.5, cfg.blue, 0.1); dot(0, 0, 0.3, cfg.blue);
  [-DOT_X, DOT_X].forEach(function(dx){
    [-DOT_Z, DOT_Z].forEach(function(dz){
      circle(dx, dz, 4.5, cfg.red, 0.1);
      dot(dx, dz, 0.32, cfg.red);
      g.strokeStyle = cfg.red; g.lineWidth = 0.1*PU;
      [-1, 1].forEach(function(sx){
        [-1, 1].forEach(function(sz){
          g.beginPath();
          g.moveTo(X(dx + sx*0.9), Z(dz + sz*1.4));
          g.lineTo(X(dx + sx*0.9), Z(dz + sz*2.2));
          g.stroke();
        });
      });
    });
  });
  [-5, 5].forEach(function(dx){ [-DOT_Z, DOT_Z].forEach(function(dz){ dot(dx, dz, 0.3, cfg.red); }); });

  // creases
  [-1, 1].forEach(function(side){
    var gx = side * GOAL_X;
    g.beginPath();
    g.arc(X(gx), Z(0), 1.9*PU, side > 0 ? Math.PI/2 : -Math.PI/2, side > 0 ? Math.PI*1.5 : Math.PI/2, false);
    g.closePath();
    g.fillStyle = cfg.crease; g.fill();
    g.strokeStyle = cfg.red; g.lineWidth = 0.09*PU; g.stroke();
  });

  g.restore();

  var tex = new T.CanvasTexture(c);
  if(T.sRGBEncoding) tex.encoding = T.sRGBEncoding;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function nettingTexture(){
  var c = document.createElement('canvas'); c.width = 128; c.height = 128;
  var g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(245,250,255,0.85)'; g.lineWidth = 2.5;
  for(var i = 0; i <= 128; i += 11){
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  var t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}

function adTexture(cfg){
  var c = document.createElement('canvas'); c.width = 1024; c.height = 96;
  var g = c.getContext('2d');
  g.fillStyle = cfg.glass ? '#f6f9fc' : '#22303f';
  g.fillRect(0, 0, 1024, 96);
  var ads = ['TOP SHELF', 'RINK SIDE', 'COLD OPEN', 'BAR DOWN', 'BLUE LINE', 'FACE OFF'];
  var cols = ['#2f6fd0', '#ce382a', '#13263d', '#1f7a53', '#8a4ad6', '#b8681a'];
  for(var i = 0; i < 6; i++){
    var x = i * 170.6;
    g.fillStyle = cols[i % cols.length];
    g.fillRect(x + 4, 10, 162, 76);
    g.fillStyle = '#ffffff';
    g.font = 'bold 26px Barlow, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ads[i], x + 85, 50);
  }
  var t = new T.CanvasTexture(c);
  if(T.sRGBEncoding) t.encoding = T.sRGBEncoding;
  t.wrapS = T.RepeatWrapping; t.repeat.set(3, 1);
  return t;
}

function clearWorld(){
  if(!world) return;
  world.traverse(function(o){
    if(o.geometry) o.geometry.dispose();
    if(o.material){
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function(m){
        if(m.userData && m.userData.keep) return;       // shared player materials live on
        if(m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
  scene.remove(world);
  world = null; crowdMesh = null; puckMesh = null; markerMesh = null;
  rings.p1 = null; rings.p2 = null;
}

function buildWorld(){
  var cfg = S();
  clearWorld();
  world = new T.Group();
  scene.add(world);
  scene.fog = new T.FogExp2(cfg.fog, cfg.fogD);
  scene.background = new T.Color(cfg.fog);

  /* ---- surface ---- */
  var surfGeo = new T.PlaneGeometry(HX*2, HZ*2);
  surfGeo.rotateX(-Math.PI/2);
  var surfMat = new T.MeshStandardMaterial({
    map: surfaceTexture(cfg),
    roughness: cfg.glass ? 0.18 : 0.78,
    metalness: cfg.glass ? 0.12 : 0.02
  });
  var surf = new T.Mesh(surfGeo, surfMat);
  surf.receiveShadow = true;
  world.add(surf);

  /* ---- arena floor under and around everything ---- */
  var floorGeo = new T.PlaneGeometry(HX*4, HZ*6);
  floorGeo.rotateX(-Math.PI/2);
  var floor = new T.Mesh(floorGeo, new T.MeshStandardMaterial({color: 0x0a1119, roughness: 0.95}));
  floor.position.y = -0.06;
  world.add(floor);

  /* ---- boards + glass ---- */
  var ringShape = rinkShape(0);
  ringShape.holes.push(makeHole(0.42));
  function makeHole(t){
    var pts = rinkShape(t).getPoints(96);
    var p = new T.Path();
    p.moveTo(pts[pts.length-1].x, pts[pts.length-1].y);
    for(var i = pts.length - 2; i >= 0; i--) p.lineTo(pts[i].x, pts[i].y);
    p.closePath();
    return p;
  }
  var boardGeo = new T.ExtrudeGeometry(ringShape, {depth: 1.12, bevelEnabled: false, curveSegments: 24});
  boardGeo.rotateX(-Math.PI/2);
  var boards = new T.Mesh(boardGeo, [
    new T.MeshStandardMaterial({color: cfg.board, roughness: 0.55}),
    new T.MeshStandardMaterial({color: cfg.boardTrim, roughness: 0.6})
  ]);
  boards.castShadow = false; boards.receiveShadow = true;
  world.add(boards);

  // ad band just outside the boards
  var adMat = new T.MeshStandardMaterial({map: adTexture(cfg), roughness: 0.7, side: T.DoubleSide});
  var adPts = rinkShape(-0.05).getPoints(96);
  for(var a = 0; a < adPts.length - 1; a++){
    var p0 = adPts[a], p1 = adPts[a+1];
    var len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if(len < 0.01) continue;
    var panel = new T.Mesh(new T.PlaneGeometry(len, 0.72), adMat);
    panel.position.set((p0.x + p1.x)/2, 0.42, -(p0.y + p1.y)/2);
    panel.rotation.y = Math.atan2(-(p1.y - p0.y), (p1.x - p0.x));
    world.add(panel);
  }

  if(cfg.glass){
    var glassGeo = new T.ExtrudeGeometry(rinkShape(-0.06), {depth: 2.0, bevelEnabled: false, curveSegments: 24});
    glassGeo.rotateX(-Math.PI/2);
    var glassShell = new T.Mesh(glassGeo, new T.MeshStandardMaterial({
      color: 0xbfe2f5, transparent: true, opacity: 0.10, roughness: 0.05, metalness: 0.0, side: T.DoubleSide
    }));
    glassShell.position.y = 1.12;
    world.add(glassShell);
  } else {
    var fenceTex = nettingTexture();
    fenceTex.repeat.set(26, 3);
    var fenceGeo = new T.ExtrudeGeometry(rinkShape(-0.06), {depth: 1.7, bevelEnabled: false, curveSegments: 24});
    fenceGeo.rotateX(-Math.PI/2);
    var fence = new T.Mesh(fenceGeo, new T.MeshBasicMaterial({
      map: fenceTex, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false
    }));
    fence.position.y = 1.12;
    world.add(fence);
  }

  /* ---- nets ---- */
  var netTex = nettingTexture(); netTex.repeat.set(5, 3);
  var netMat = new T.MeshBasicMaterial({map: netTex, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false});
  var frameMat = new T.MeshStandardMaterial({color: 0xd8372a, roughness: 0.4, metalness: 0.3});
  [-1, 1].forEach(function(side){
    var g = new T.Group();
    var gx = side * GOAL_X;
    var post = new T.CylinderGeometry(0.075, 0.075, BAR, 10);
    [-MOUTH, MOUTH].forEach(function(pz){
      var m = new T.Mesh(post, frameMat);
      m.position.set(gx, BAR/2, pz); m.castShadow = true; g.add(m);
    });
    var barGeo = new T.CylinderGeometry(0.075, 0.075, MOUTH*2, 10);
    barGeo.rotateX(Math.PI/2);
    var bar = new T.Mesh(barGeo, frameMat);
    bar.position.set(gx, BAR, 0); bar.castShadow = true; g.add(bar);
    // netting: back, two sides, roof
    var back = new T.Mesh(new T.PlaneGeometry(MOUTH*2, BAR), netMat);
    back.position.set(gx + side*NET_D, BAR/2, 0);
    back.rotation.y = Math.PI/2;
    g.add(back);
    [-MOUTH, MOUTH].forEach(function(pz){
      var sidePane = new T.Mesh(new T.PlaneGeometry(NET_D, BAR), netMat);
      sidePane.position.set(gx + side*NET_D/2, BAR/2, pz);
      g.add(sidePane);
    });
    var roof = new T.Mesh(new T.PlaneGeometry(NET_D, MOUTH*2), netMat);
    roof.rotation.x = -Math.PI/2;
    roof.position.set(gx + side*NET_D/2, BAR, 0);
    g.add(roof);
    world.add(g);
  });

  /* ---- stands + crowd ---- */
  buildStands(cfg);

  /* ---- jumbotron ---- */
  buildJumbo();

  /* ---- lights ---- */
  var hemi = new T.HemisphereLight(cfg.amb, 0x0a1018, cfg.ambI);
  world.add(hemi);
  var key = new T.DirectionalLight(0xffffff, cfg.dirI);
  key.position.set(16, 40, 20);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 10; key.shadow.camera.far = 90;
  key.shadow.camera.left = -36; key.shadow.camera.right = 36;
  key.shadow.camera.top = 26; key.shadow.camera.bottom = -26;
  key.shadow.bias = -0.0012;
  world.add(key);
  var fill = new T.DirectionalLight(0xbdd6f2, 0.3);
  fill.position.set(-20, 26, -24);
  world.add(fill);

  // light rigs overhead
  var rigMat = new T.MeshBasicMaterial({color: 0xfdf6e3});
  [-18, 0, 18].forEach(function(lx){
    [-9, 9].forEach(function(lz){
      var lamp = new T.Mesh(new T.BoxGeometry(5.5, 0.35, 2.4), rigMat);
      lamp.position.set(lx, 20, lz);
      world.add(lamp);
    });
  });
}

function buildStands(cfg){
  var rows = cfg.rows, seatW = 0.78, rowD = 1.2, rise = 0.5, gap = 3.4;
  var deckMat = new T.MeshStandardMaterial({color: 0x121b26, roughness: 0.9});
  var total = 0;
  var slots = [];

  // long sides
  [-1, 1].forEach(function(sz){
    for(var r = 0; r < rows; r++){
      var z = sz * (HZ + gap + r*rowD);
      var y = 0.5 + r*rise;
      var count = Math.floor((HX*2 - 4) / seatW);
      for(var i = 0; i < count; i++){
        slots.push([-HX + 2 + i*seatW + (r%2)*0.3, y + 0.42, z]);
      }
      var deck = new T.Mesh(new T.BoxGeometry(HX*2 + 6, 0.4, rowD), deckMat);
      deck.position.set(0, y, z);
      world.add(deck);
    }
  });
  // ends
  [-1, 1].forEach(function(sx){
    for(var r = 0; r < rows; r++){
      var x = sx * (HX + gap + r*rowD);
      var y = 0.5 + r*rise;
      var count = Math.floor((HZ*2 - 2) / seatW);
      for(var i = 0; i < count; i++){
        slots.push([x, y + 0.42, -HZ + 1 + i*seatW + (r%2)*0.3]);
      }
      var deck = new T.Mesh(new T.BoxGeometry(rowD, 0.4, HZ*2 + 4), deckMat);
      deck.position.set(x, y, 0);
      world.add(deck);
    }
  });

  total = slots.length;
  var geo = new T.BoxGeometry(0.42, 0.56, 0.42);
  var mat = new T.MeshLambertMaterial();
  crowdMesh = new T.InstancedMesh(geo, mat, total);
  crowdMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  var dummy = new T.Object3D(), col = new T.Color();
  var palette = [0x1d2a3a, 0x24303f, 0x2f6fd0, 0xd9402f, 0x2a3344, 0x3a4657, 0xe8e2d4, 0x1b2430];
  crowdMesh.userData.base = [];
  for(var i = 0; i < total; i++){
    var p = slots[i];
    dummy.position.set(p[0], p[1], p[2]);
    dummy.rotation.y = (Math.random() - 0.5) * 0.5;
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(i, dummy.matrix);
    col.setHex(palette[(Math.random() * palette.length) | 0]);
    col.offsetHSL(0, 0, (Math.random() - 0.5) * 0.12);
    crowdMesh.setColorAt(i, col);
    crowdMesh.userData.base.push(p);
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
  if(crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
  world.add(crowdMesh);
}

function bobCrowd(t, amp){
  if(!crowdMesh) return;
  var base = crowdMesh.userData.base, dummy = new T.Object3D();
  var n = base.length;
  for(var i = 0; i < n; i += 1){
    var p = base[i];
    dummy.position.set(p[0], p[1] + Math.abs(Math.sin(t*5 + i*0.7)) * amp, p[2]);
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(i, dummy.matrix);
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
}

function buildJumbo(){
  var g = new T.Group();
  var c = document.createElement('canvas'); c.width = 512; c.height = 256;
  jumboCtx = c.getContext('2d');
  jumboTex = new T.CanvasTexture(c);
  if(T.sRGBEncoding) jumboTex.encoding = T.sRGBEncoding;
  var screenMat = new T.MeshBasicMaterial({map: jumboTex});
  var bodyMat = new T.MeshStandardMaterial({color: 0x0b1017, roughness: 0.8});
  var box = new T.Mesh(new T.BoxGeometry(9.2, 4.6, 7.2), bodyMat);
  g.add(box);
  [[0, 0, 3.65, 0], [0, 0, -3.65, Math.PI], [4.65, 0, 0, Math.PI/2], [-4.65, 0, 0, -Math.PI/2]].forEach(function(s){
    var w = Math.abs(s[0]) > 0 ? 6.8 : 8.8;
    var pane = new T.Mesh(new T.PlaneGeometry(w, 4.0), screenMat);
    pane.position.set(s[0], s[1], s[2]);
    pane.rotation.y = s[3];
    g.add(pane);
  });
  var truss = new T.MeshStandardMaterial({color: 0x1a2430, roughness: 0.8});
  [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]].forEach(function(p){
    var cable = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 9, 6), truss);
    cable.position.set(p[0], 6.8, p[1]);
    g.add(cable);
  });
  g.position.set(0, 13.6, 0);
  g.scale.setScalar(0.88);
  world.add(g);
  paintJumbo();
}

function paintJumbo(){
  if(!jumboCtx) return;
  var g = jumboCtx;
  g.fillStyle = '#04070c'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#0d1824'; g.fillRect(8, 8, 496, 240);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#9ec6f7'; g.font = '34px Bebas Neue, Impact, sans-serif';
  g.fillText('HOME', 112, 54);
  g.fillStyle = '#f3a99e';
  g.fillText(G.humans === 2 ? 'AWAY' : 'CPU', 400, 54);
  g.fillStyle = '#ffffff'; g.font = '108px Bebas Neue, Impact, sans-serif';
  g.fillText(String(G.score[0]), 112, 140);
  g.fillText(String(G.score[1]), 400, 140);
  g.fillStyle = '#ffc43d'; g.font = '62px Bebas Neue, Impact, sans-serif';
  var m = Math.floor(Math.max(0, G.clock)/60), s = Math.floor(Math.max(0, G.clock)%60);
  g.fillText(m + ':' + (s < 10 ? '0' : '') + s, 256, 120);
  g.fillStyle = '#8ea3b9'; g.font = '28px Bebas Neue, Impact, sans-serif';
  g.fillText(G.ot ? 'OVERTIME' : (['1ST','2ND','3RD'][G.period-1] + ' PERIOD'), 256, 186);
  g.strokeStyle = '#1d2b3c'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(256, 36); g.lineTo(256, 96); g.stroke();
  jumboTex.needsUpdate = true;
}
