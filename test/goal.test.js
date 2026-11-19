/*
 * Tests for the goal rule. isGoal() lives in 40-game.js; this lifts it out with
 * the rink constants from 10-core.js and checks the cases that matter.
 *
 *     node test/goal.test.js
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
  for(; i < src.length; i++){
    if(src[i] === '{') depth++;
    else if(src[i] === '}'){ depth--; if(depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

const consts = core.match(/var GOAL_X = [^;]+;/)[0];
const ctx = {Math, console};
vm.createContext(ctx);
vm.runInContext(consts + '\n' + grab(game, 'isGoal'), ctx);
const {isGoal, GOAL_X, MOUTH, BAR} = ctx;

let fails = 0;
function ok(name, cond, extra){
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   ' + extra : ''));
  if(!cond) fails++;
}
console.log('  rink: GOAL_X=' + GOAL_X + ' MOUTH=' + MOUTH + ' BAR=' + BAR + '\n');

const R = GOAL_X, L = -GOAL_X;

/* ---- the goals that should count ---- */
ok('a shot crossing the right line through the mouth scores',
   isGoal(1, R - 0.3, R + 0.2, 0, 0.2) === true);
ok('the same at the left end',
   isGoal(-1, L + 0.3, L - 0.2, 0, 0.2) === true);
ok('one just inside the post scores',
   isGoal(1, R - 0.2, R + 0.1, MOUTH - 0.1, 0.2) === true);
ok('a raised one under the bar scores',
   isGoal(1, R - 0.2, R + 0.1, 0, BAR - 0.2) === true);

/* ---- the whole point of the fix ---- */
ok('hitting the BACK of the net from behind does not score',
   isGoal(1, R + 1.2, R + 0.6, 0, 0.2) === false);
ok('nor does drifting toward the line from behind the net',
   isGoal(1, R + 0.9, R + 0.5, 0, 0.2) === false);
ok('nor at the other end',
   isGoal(-1, L - 1.2, L - 0.6, 0, 0.2) === false);
ok('a puck already sitting in the net does not score again',
   isGoal(1, R + 0.4, R + 0.4, 0, 0.2) === false);

/* ---- everything else that is not a goal ---- */
ok('a puck still on the ice is not a goal',
   isGoal(1, R - 1.0, R - 0.4, 0, 0.2) === false);
ok('wide of the post is not a goal',
   isGoal(1, R - 0.3, R + 0.2, MOUTH + 0.5, 0.2) === false);
ok('over the bar is not a goal',
   isGoal(1, R - 0.3, R + 0.2, 0, BAR + 0.4) === false);
ok('well behind the net is out of range entirely',
   isGoal(1, R - 0.3, R + 3.0, 0, 0.2) === false);
ok('the far goal does not score on the near line',
   isGoal(-1, R - 0.3, R + 0.2, 0, 0.2) === false);

/* ---- a shot swept across the line frame by frame scores exactly once ---- */
let scored = 0, x = R - 2.0, px;
for(let step = 0; step < 40; step++){
  px = x; x += 0.25;
  if(isGoal(1, px, x, 0, 0.2)) scored++;
}
ok('a puck shot through the net scores once, not once per frame', scored === 1, 'scored=' + scored);

console.log(fails ? '\n' + fails + ' FAILED' : '\nall good');
process.exit(fails ? 1 : 0);
