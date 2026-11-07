(function(){
"use strict";
var T = window.THREE;
var el = function(id){ return document.getElementById(id); };

if(!T){
  el('bootNote').textContent = 'The 3D library did not load. Check the connection and reload.';
  return;
}

/* =========================================================================
   1. RINK + SURFACE CONFIG
   Gameplay is solved in 2D on the x/z plane; y is only used for lifted shots.
   ========================================================================= */
var HX = 30, HZ = 13, CORNER = 7;          // half length, half width, corner radius
var GOAL_X = 25, MOUTH = 2.0, BAR = 1.30, NET_D = 1.9;
var BLUE_X = 9, DOT_X = 17, DOT_Z = 6.5;
var SK_R = 0.72, PUCK_R = 0.22, GK_R = 0.95;

var SURF = {
  ice: {
    label:'Ice', disc:'puck', surfaceWord:'ice',
    acc:33, max:11.2, drag:1.25, turn:9.5,
    discDrag:0.30, bounce:0.70, shotBase:23, shotAdd:17, passBase:17,
    floor:'#eff4fa', tile:null, blue:'#2f6fd0', red:'#ce382a', crease:'rgba(47,111,208,0.16)',
    board:0xf3f7fb, boardTrim:0xd7e2ee, glass:true,
    amb:0x7f9ec6, ambI:0.55, dirI:1.05, fog:0x05080d, fogD:0.0085,
    rows:7
  },
  roller: {
    label:'Roller', disc:'ball', surfaceWord:'court',
    acc:42, max:10.3, drag:2.7, turn:14,
    discDrag:0.80, bounce:0.56, shotBase:20, shotAdd:14, passBase:15,
    floor:'#1d6a84', tile:'#185f76', blue:'#f2f6fa', red:'#e8513a', crease:'rgba(242,246,250,0.14)',
    board:0x2b3a4e, boardTrim:0x1b2838, glass:false,
    amb:0xffe6c2, ambI:0.72, dirI:0.95, fog:0x070a10, fogD:0.006,
    rows:4
  }
};

var DIFF = [
  {name:'Rookie',   acc:0.70, max:0.80, react:0.34, gk:0.62, err:0.26, shootD:17, aggr:0.55},
  {name:'Pro',      acc:0.86, max:0.92, react:0.18, gk:0.84, err:0.15, shootD:20, aggr:0.80},
  {name:'All-Star', acc:0.97, max:1.00, react:0.08, gk:0.99, err:0.08, shootD:23, aggr:1.00}
];

var PERIOD_LEN = 60, PERIODS = 3;

/* =========================================================================
   2. GAME STATE
   ========================================================================= */
var G = {
  phase:'boot',            // boot | menu | tutorial | faceoff | play | pause | break | over
  surface:'ice',
  humans:1,
  diff:1,
  score:[0,0],
  period:1, clock:PERIOD_LEN, ot:false,
  faceoffT:0, lastGoalBy:0, camMode:0,
  tut:null, shake:0
};
var S = function(){ return SURF[G.surface]; };
var D = function(){ return DIFF[G.diff]; };

var puck = {x:0, y:PUCK_R, z:0, vx:0, vy:0, vz:0};
var skaters = [], goalies = [], carrier = null, puckCool = 0;

/* =========================================================================
   3. AUDIO
   ========================================================================= */
var sfx = (function(){
  var ac = null, crowdGain = null, started = false;
  function on(){
    if(ac === null){
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e){ ac = false; }
    }
    if(!ac) return;
    if(ac.state === 'suspended') ac.resume();
    if(!started){ started = true; crowd(); }
  }
  function tone(f, dur, type, gain, slide){
    if(!ac) return;
    var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if(slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  function burst(dur, gain, freq, q){
    if(!ac) return;
    var n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for(var i=0;i<n;i++) d[i] = (Math.random()*2-1) * (1 - i/n);
    var s = ac.createBufferSource(); s.buffer = b;
    var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = q || 0.8;
    var g = ac.createGain(); g.gain.value = gain || 0.1;
    s.connect(f).connect(g).connect(ac.destination); s.start();
  }
  function crowd(){
    if(!ac) return;
    var n = Math.floor(ac.sampleRate * 3), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for(var i=0;i<n;i++) d[i] = (Math.random()*2-1) * 0.5;
    var s = ac.createBufferSource(); s.buffer = b; s.loop = true;
    var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
    crowdGain = ac.createGain(); crowdGain.gain.value = 0.018;
    s.connect(f).connect(crowdGain).connect(ac.destination); s.start();
  }
  function swell(peak, hold){
    if(!crowdGain || !ac) return;
    var t = ac.currentTime, g = crowdGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(peak, t + 0.18);
    g.linearRampToValueAtTime(0.018, t + hold);
  }
  return {
    on: on,
    stick: function(p){ tone(230 + p*200, 0.07, 'square', 0.085); burst(0.05, 0.07, 1900); },
    pass:  function(){ tone(320, 0.05, 'triangle', 0.06); },
    board: function(v){ burst(0.09, Math.min(0.14, 0.03 + v*0.012), 230, 1.4); },
    post:  function(){ tone(1400, 0.5, 'sine', 0.16, 900); },
    save:  function(){ burst(0.11, 0.1, 460); tone(160, 0.1, 'sine', 0.07); swell(0.07, 1.1); },
    hit:   function(){ burst(0.17, 0.15, 170, 1.2); tone(88, 0.14, 'sawtooth', 0.09, 58); },
    whistle:function(){ tone(1900, 0.26, 'sine', 0.08, 2150); },
    ping:  function(){ tone(880, 0.1, 'sine', 0.09, 1320); },
    horn:  function(){ tone(146, 1.2, 'sawtooth', 0.16); tone(220, 1.2, 'sawtooth', 0.1); swell(0.16, 3.0); }
  };
})();

/* =========================================================================
   4. INPUT - keyboard halves, two gamepads, split touch
   ========================================================================= */
var KEYS = Object.create(null);
var SCHEME = {
  p1: {up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', shoot:'Space', pass:'KeyQ'},
  p2: {up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', shoot:'Enter', pass:'Slash'}
};
var PADST = {p1:{mx:0, mz:0, shoot:false, pass:false}, p2:{mx:0, mz:0, shoot:false, pass:false}};
var touchIn = {p1:{mx:0, mz:0, shoot:false}, p2:{mx:0, mz:0, shoot:false}};
var IN = {p1:{mx:0, mz:0, len:0, shoot:false, pass:false}, p2:{mx:0, mz:0, len:0, shoot:false, pass:false}};
var passEdge = {p1:false, p2:false};
var lastDevice = 'key';
var padCount = 0;

addEventListener('keydown', function(e){
  var c = e.code;
  if(c === 'Space' || c.indexOf('Arrow') === 0 || c === 'Slash') e.preventDefault();
  if(KEYS[c]) return;
  KEYS[c] = true; lastDevice = 'key'; sfx.on();
  if(c === SCHEME.p1.pass) passEdge.p1 = true;
  if(c === SCHEME.p2.pass) passEdge.p2 = true;
  if(c === 'KeyP' || c === 'Escape') togglePause();
  if(c === 'KeyC') cycleCam();
});
addEventListener('keyup', function(e){ KEYS[e.code] = false; });
addEventListener('blur', function(){ for(var k in KEYS) KEYS[k] = false; });

function readPads(){
  var list = navigator.getGamepads ? navigator.getGamepads() : [];
  var slots = ['p1','p2'], n = 0, s;
  for(s=0;s<2;s++){ var ps = PADST[slots[s]]; ps.mx = 0; ps.mz = 0; ps.shoot = false; }
  for(var i=0;i<list.length && n<2;i++){
    var gp = list[i];
    if(!gp || !gp.connected) continue;
    var slot = PADST[slots[n]];
    var ax = gp.axes[0] || 0, az = gp.axes[1] || 0;
    if(Math.abs(ax) < 0.18) ax = 0;
    if(Math.abs(az) < 0.18) az = 0;
    if(gp.buttons[12] && gp.buttons[12].pressed) az = -1;
    if(gp.buttons[13] && gp.buttons[13].pressed) az = 1;
    if(gp.buttons[14] && gp.buttons[14].pressed) ax = -1;
    if(gp.buttons[15] && gp.buttons[15].pressed) ax = 1;
    slot.mx = ax; slot.mz = az;
    var shoot = (gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[7] && gp.buttons[7].value > 0.4);
    var pass  = (gp.buttons[2] && gp.buttons[2].pressed) || (gp.buttons[5] && gp.buttons[5].pressed);
    slot.shoot = !!shoot;
    if(pass && !slot.pass) passEdge[slots[n]] = true;
    slot.pass = !!pass;
    if(ax || az || shoot || pass) lastDevice = 'pad';
    n++;
  }
  padCount = n;
  return n;
}

function gatherInput(){
  readPads();
  var slots = ['p1','p2'];
  for(var i=0;i<2;i++){
    var k = slots[i], sc = SCHEME[k], o = IN[k];
    var mx = 0, mz = 0;
    if(KEYS[sc.left]) mx -= 1;
    if(KEYS[sc.right]) mx += 1;
    if(KEYS[sc.up]) mz -= 1;
    if(KEYS[sc.down]) mz += 1;
    var shoot = !!KEYS[sc.shoot];
    if(mx === 0 && mz === 0 && !shoot){
      if(PADST[k].mx || PADST[k].mz || PADST[k].shoot){
        mx = PADST[k].mx; mz = PADST[k].mz; shoot = PADST[k].shoot;
      } else if(touchIn[k].mx || touchIn[k].mz || touchIn[k].shoot){
        mx = touchIn[k].mx; mz = touchIn[k].mz; shoot = touchIn[k].shoot;
      }
    }
    var len = Math.sqrt(mx*mx + mz*mz);
    if(len > 1){ mx /= len; mz /= len; len = 1; }
    o.mx = mx; o.mz = mz; o.len = len; o.shoot = shoot;
    o.pass = passEdge[k]; passEdge[k] = false;
  }
}

/* touch sticks */
var touchOn = (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window);
function bindZone(zoneEl, stickEl, slot){
  var id = null, ox = 0, oy = 0;
  zoneEl.addEventListener('pointerdown', function(e){
    sfx.on(); lastDevice = 'touch'; id = e.pointerId;
    try { zoneEl.setPointerCapture(e.pointerId); } catch(err){}
    var r = zoneEl.getBoundingClientRect();
    ox = e.clientX - r.left; oy = e.clientY - r.top;
    stickEl.style.left = ox + 'px'; stickEl.style.top = oy + 'px';
    stickEl.firstElementChild.style.left = '50%'; stickEl.firstElementChild.style.top = '50%';
    stickEl.classList.add('live');
  });
  zoneEl.addEventListener('pointermove', function(e){
    if(e.pointerId !== id) return;
    var r = zoneEl.getBoundingClientRect();
    var dx = (e.clientX - r.left) - ox, dy = (e.clientY - r.top) - oy;
    var d = Math.sqrt(dx*dx + dy*dy), cap = 48, k = d > cap ? cap/d : 1;
    stickEl.firstElementChild.style.left = (62 + dx*k) + 'px';
    stickEl.firstElementChild.style.top = (62 + dy*k) + 'px';
    if(d > 5){ var n = Math.min(1, d/38); touchIn[slot].mx = (dx/d)*n; touchIn[slot].mz = (dy/d)*n; }
    else { touchIn[slot].mx = 0; touchIn[slot].mz = 0; }
  });
  function end(e){
    if(e.pointerId !== id) return;
    id = null; touchIn[slot].mx = 0; touchIn[slot].mz = 0; stickEl.classList.remove('live');
  }
  zoneEl.addEventListener('pointerup', end);
  zoneEl.addEventListener('pointercancel', end);
}
function bindBtn(btn, slot, kind){
  btn.addEventListener('pointerdown', function(e){
    e.preventDefault(); sfx.on(); lastDevice = 'touch';
    if(kind === 'shoot') touchIn[slot].shoot = true; else passEdge[slot] = true;
  });
  var ends = ['pointerup','pointercancel','pointerleave'];
  for(var i=0;i<ends.length;i++){
    btn.addEventListener(ends[i], function(){ if(kind === 'shoot') touchIn[slot].shoot = false; });
  }
}
bindZone(document.querySelector('.zone.p1'), el('st1'), 'p1');
bindZone(document.querySelector('.zone.p2'), el('st2'), 'p2');
bindBtn(el('p1Shoot'), 'p1', 'shoot'); bindBtn(el('p1Pass'), 'p1', 'pass');
bindBtn(el('p2Shoot'), 'p2', 'shoot'); bindBtn(el('p2Pass'), 'p2', 'pass');
if(touchOn){ el('rotate').classList.add('armed'); }
