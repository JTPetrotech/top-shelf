/*
 * Tests for the dangle move. dangle() and carryLat() live inside 40-game.js,
 * which needs three.js and a built world, so this lifts just those two
 * functions out by name and runs them against stubs. Run:
 *
 *     node test/dangle.test.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const PARTS = path.join(__dirname, '..', 'parts');
const game = fs.readFileSync(path.join(PARTS, '40-game.js'), 'utf8');
const core = fs.readFileSync(path.join(PARTS, '10-core.js'), 'utf8');

function grab(src, name){
  const start = src.indexOf('function ' + name + '(');
  if(start < 0) throw new Error('cannot find ' + name);
  let depth = 0, i = src.indexOf('{', start);
  const from = i;
  for(; i < src.length; i++){
    if(src[i] === '{') depth++;
    else if(src[i] === '}'){ depth--; if(depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

// the two tuning constants come straight out of core, so the test tracks them
const consts = core.match(/var DANGLE_T = [\d.]+, DANGLE_COOL = [\d.]+;/)[0];
const kick = parseFloat(core.match(/passBase:17, dangleKick:([\d.]+)/)[1]);

const ctx = {
  Math, console,
  carrier: null,
  G: {tut: null},
  S: () => ({dangleKick: kick}),
  sfx: {pass(){}},
  tutEvent(){},
  angNorm(a){ while(a > Math.PI) a -= Math.PI*2; while(a < -Math.PI) a += Math.PI*2; return a; }
};
vm.createContext(ctx);
vm.runInContext(consts + '\n' + grab(game, 'dangle') + '\n' + grab(game, 'carryLat'), ctx);

let fails = 0;
function ok(name, cond, extra){
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   ' + extra : ''));
  if(!cond) fails++;
}
function skater(over){
  return Object.assign({x:0, z:0, vx:0, vz:0, face:0, carrySide:1,
                        dangleT:0, dangleCool:0, stun:0}, over || {});
}

/* ---- who may dangle ---- */
let s = skater();
ctx.carrier = null;
ok('cannot dangle without the puck', ctx.dangle(s, 0, 0) === false);

ctx.carrier = s;
ok('can dangle with the puck', ctx.dangle(s, 0, 0) === true);
ok('a plain dangle flips you to the backhand', s.carrySide === -1, 'side=' + s.carrySide);
ok('it is on a timer', Math.abs(s.dangleT - ctx.DANGLE_T) < 1e-9);
ok('there is no cooldown to wait out', ctx.DANGLE_COOL === 0);
ok('so it fires again straight away', ctx.dangle(s, 0, 0) === true);
ok('and that flips back to the forehand', s.carrySide === 1);

// back to back to back, no gate anywhere
var sides = [];
for(var rep = 0; rep < 6; rep++){ ctx.dangle(s, 0, 0); sides.push(s.carrySide); }
ok('it keeps alternating however fast you go', sides.join(',') === '-1,1,-1,1,-1,1', sides.join(','));

s = skater({stun: 0.4}); ctx.carrier = s;
ok('a knocked-down player cannot dangle', ctx.dangle(s, 0, 0) === false);

/* ---- direction ---- */
s = skater({face: 0, carrySide: 1}); ctx.carrier = s;
ctx.dangle(s, 0, -1);                      // push toward local -z
ok('flicking one way puts the puck on that side', s.carrySide === -1, 'side=' + s.carrySide);

s = skater({face: 0, carrySide: -1}); ctx.carrier = s;
ctx.dangle(s, 0, -1);
ok('flicking toward the side you are already on goes back the other way',
   s.carrySide === 1, 'side=' + s.carrySide);

// facing must be respected, not just world axes
s = skater({face: Math.PI/2, carrySide: 1}); ctx.carrier = s;
ctx.dangle(s, -1, 0);                      // world -x is local +z when facing +z
ok('direction is read against your heading, not the rink', s.carrySide === -1, 'side=' + s.carrySide);

/* ---- the kick ---- */
s = skater({face: 0, carrySide: 1}); ctx.carrier = s;
ctx.dangle(s, 0, 0);
ok('the burst goes the way you are facing',
   Math.abs(s.vx - kick) < 1e-9 && Math.abs(s.vz) < 1e-9, 'vx=' + s.vx.toFixed(2));

s = skater({face: Math.PI, carrySide: 1, vx: 1}); ctx.carrier = s;
ctx.dangle(s, 0, 0);
ok('and it adds to the speed you already had', s.vx < 0 && Math.abs(s.vx - (1 - kick)) < 1e-6,
   'vx=' + s.vx.toFixed(2));

/* ---- where the puck actually sits ---- */
s = skater({carrySide: 1, dangleT: 0});
ok('forehand carry is out to one side', Math.abs(ctx.carryLat(s) - 0.45) < 1e-9);
s.carrySide = -1;
ok('backhand carry mirrors it', Math.abs(ctx.carryLat(s) + 0.45) < 1e-9);

// mid-sweep it should be somewhere between, never parked at either extreme
s = skater({carrySide: -1, dangleT: ctx.DANGLE_T * 0.5});
const mid = ctx.carryLat(s);
ok('mid-dangle the puck is crossing, not teleported', mid > -0.45 && mid < 0.45,
   'lat=' + mid.toFixed(3));

let maxAbs = 0;
for(let t = ctx.DANGLE_T; t >= 0; t -= 0.01){
  maxAbs = Math.max(maxAbs, Math.abs(ctx.carryLat(skater({carrySide: -1, dangleT: t}))));
}
ok('the puck never swings further out than arm\u2019s reach', maxAbs < 0.80, 'max=' + maxAbs.toFixed(3));

console.log(fails ? '\n' + fails + ' FAILED' : '\nall good');
process.exit(fails ? 1 : 0);
