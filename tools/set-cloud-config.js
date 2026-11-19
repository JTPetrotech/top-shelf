#!/usr/bin/env node
/*
 * Pastes a Firebase web config into parts/49-cloud.js and rebuilds.
 *
 * You do not edit any JavaScript by hand. Copy the config block out of the
 * Firebase console (Project settings -> Your apps -> the web app -> Config),
 * then:
 *
 *   PowerShell:   Get-Clipboard | node tools/set-cloud-config.js
 *   from a file:  node tools/set-cloud-config.js path/to/pasted.txt
 *   check only:   node tools/set-cloud-config.js --show
 *   switch off:   node tools/set-cloud-config.js --clear
 *
 * It accepts whatever shape the console gives you - the whole
 * `const firebaseConfig = { ... };` block, a bare object, or plain JSON. It
 * only reads the six keys it needs and ignores the rest, so pasting the
 * surrounding snippet is fine.
 *
 * These values are not secrets. A Firebase web config names the project; it
 * grants nothing on its own. What protects the saves is the Firestore rules in
 * CLOUD_SETUP.md, which is why this script refuses to finish without pointing
 * you at them.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PART = path.join(ROOT, 'parts', '49-cloud.js');

const KEYS = ['apiKey', 'authDomain', 'projectId', 'storageBucket',
              'messagingSenderId', 'appId'];

const BLANK = { apiKey: '', authDomain: '', projectId: '',
                storageBucket: '', messagingSenderId: '', appId: '' };

/* ------------------------------------------------------------------ read -- */

function readPasted(arg){
  if(arg) return fs.readFileSync(arg, 'utf8');
  // No file given: take it from the pipe.
  if(process.stdin.isTTY){
    die('Nothing piped in and no file given.\n\n' +
        '  PowerShell:  Get-Clipboard | node tools/set-cloud-config.js\n' +
        '  or:          node tools/set-cloud-config.js pasted.txt');
  }
  return fs.readFileSync(0, 'utf8');
}

/* Pull "key: 'value'" or "key": "value" out of anything. Deliberately not a
   JSON parse - the console hands you JavaScript with unquoted keys, and a
   half-selected copy should still work if the six values are in there. */
function parse(text){
  const out = {};
  for(const k of KEYS){
    const m = text.match(new RegExp('["\']?' + k + '["\']?\\s*:\\s*["\']([^"\']*)["\']'));
    if(m) out[k] = m[1].trim();
  }
  return out;
}

/* ------------------------------------------------------------- validate -- */

function check(cfg){
  const missing = KEYS.filter(k => !cfg[k]);
  if(missing.length){
    die('These values were not in what you pasted: ' + missing.join(', ') +
        '\n\nCopy the whole config block from the Firebase console, including\n' +
        'the braces. If a value really is absent there, the web app may not be\n' +
        'registered yet - CLOUD_SETUP.md step 2.');
  }
  const warn = [];
  if(!/^AIza[\w-]{30,}$/.test(cfg.apiKey))
    warn.push('apiKey does not look like a Firebase key (they start "AIza").');
  if(!/\.(firebaseapp\.com|web\.app)$/.test(cfg.authDomain))
    warn.push('authDomain usually ends .firebaseapp.com - got "' + cfg.authDomain + '".');
  if(!/^[a-z0-9-]+$/.test(cfg.projectId))
    warn.push('projectId looks odd: "' + cfg.projectId + '".');
  if(!/^\d+$/.test(cfg.messagingSenderId))
    warn.push('messagingSenderId should be all digits.');
  if(!/^\d+:\d+:web:/.test(cfg.appId))
    warn.push('appId should look like 1:123...:web:abc... - this one may be an\n' +
              '  iOS or Android app rather than the web one.');
  return warn;
}

/* ---------------------------------------------------------------- write -- */

function currentBlock(src){
  const m = src.match(/var CLOUD_CONFIG = \{[\s\S]*?\n\};/);
  if(!m) die('Could not find the CLOUD_CONFIG block in parts/49-cloud.js.\n' +
             'If that file was edited by hand, set the six values there yourself.');
  return m[0];
}

function render(cfg){
  const lines = KEYS.map(function(k, i){
    return "  " + k + ": '" + cfg[k].replace(/'/g, "\\'") + "'" +
           (i < KEYS.length - 1 ? ',' : '');
  });
  return 'var CLOUD_CONFIG = {\n' + lines.join('\n') + '\n};';
}

function write(cfg){
  const src = fs.readFileSync(PART, 'utf8');
  fs.writeFileSync(PART, src.replace(currentBlock(src), render(cfg)));
}

function readCurrent(){
  return parse(currentBlock(fs.readFileSync(PART, 'utf8')));
}

/* ----------------------------------------------------------------- main -- */

function die(msg){ console.error('\n' + msg + '\n'); process.exit(1); }
function mask(v){ return v.length > 12 ? v.slice(0, 6) + '...' + v.slice(-4) : v; }

function show(){
  const cfg = readCurrent();
  const on = cfg.apiKey && cfg.projectId;
  console.log('\ncloud save: ' + (on ? 'ON' : 'off (the game is fully offline)'));
  if(on) for(const k of KEYS) console.log('  ' + k.padEnd(19) + mask(cfg[k] || ''));
  console.log('');
}

function build(){
  console.log('');
  console.log(execFileSync(process.execPath, ['build.js'], { cwd: ROOT, encoding: 'utf8' }).trim());
}

const arg = process.argv[2];

if(arg === '--show'){
  show();

} else if(arg === '--clear'){
  write(BLANK);
  console.log('\nCloud save switched off. The Firebase SDK is no longer referenced\n' +
              'and the page is back to zero external requests.');
  build();
  console.log('\nSaves already in Firestore are untouched; this only stops this\n' +
              'build reaching for them.\n');

} else {
  const cfg = parse(readPasted(arg));
  const warn = check(cfg);
  write(cfg);

  console.log('\nWired to Firebase project: ' + cfg.projectId);
  if(warn.length){
    console.log('\nWorth a look before you trust it:');
    for(const w of warn) console.log('  - ' + w);
  }
  build();
  console.log('\nTwo things still to do in the console, or sign-in will fail:');
  console.log('  1. Authentication -> Sign-in method -> enable Email/Password');
  console.log('  2. Firestore -> Rules -> paste the rules from CLOUD_SETUP.md');
  console.log('\nThen run the four test suites and commit. The config is safe to');
  console.log('commit - it names the project, it does not grant access to it.');
  console.log('\n  Get-ChildItem test/*.test.js | ForEach-Object { node $_.FullName }\n');
}
