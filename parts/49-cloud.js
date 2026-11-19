
/* =========================================================================
   8.95  CLOUD SAVE

   Offline first, cloud optional. localStorage is still the real save: the
   game works with no network and no account exactly as it always did. Signing
   in adds a copy in Firestore so the same career follows you to another
   device.

   Nothing here runs, and the Firebase SDK is never fetched, until the config
   below is filled in AND you choose to sign in. An unconfigured build is
   byte-for-byte as offline as before.

   This uses the same Firebase project as Side Pot, so one account covers both
   games. Top Shelf keeps its own collection so neither game can tread on the
   other's document.
   ========================================================================= */

/* Paste the web app config from the Firebase console here:
   Project settings -> Your apps -> Web app. These values are meant to be
   public - they name the project, they do not grant access. What protects the
   data is the Firestore rules, which are in the README. */
var CLOUD_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};
function cloudConfigured(){ return !!(CLOUD_CONFIG.apiKey && CLOUD_CONFIG.projectId); }

var FB_SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
var COLLECTION = 'topshelf';

var fb = null;            // the loaded SDK modules
var fbApp = null, fbAuth = null, fbDb = null;
var cloudUser = null;     // {uid, email, name} or null
var cloudTimer = null, cloudPending = false, cloudState = 'off';

function cloudStatus(){ return cloudState; }

async function cloudLoadSDK(){
  if(fb) return fb;
  var core = await import(FB_SDK + 'firebase-app.js');
  var authMod = await import(FB_SDK + 'firebase-auth.js');
  var store = await import(FB_SDK + 'firebase-firestore.js');
  fb = {core: core, authMod: authMod, store: store};
  return fb;
}

async function cloudInit(){
  if(!cloudConfigured()) return false;
  if(fbApp) return true;
  cloudState = 'loading';
  await cloudLoadSDK();
  fbApp = fb.core.initializeApp(CLOUD_CONFIG);
  fbAuth = fb.authMod.getAuth(fbApp);
  fbDb = fb.store.getFirestore(fbApp);
  try { await fb.authMod.setPersistence(fbAuth, fb.authMod.browserLocalPersistence); } catch(e){}
  cloudState = 'ready';
  return true;
}

/* These strings go straight onto the sign-in screen, so they say what to do. */
function cloudError(err){
  var code = (err && err.code) || '';
  var map = {
    'auth/invalid-email': 'That does not look like an email address.',
    'auth/missing-password': 'Enter a password.',
    'auth/weak-password': 'Use at least 6 characters.',
    'auth/email-already-in-use': 'There is already an account with that email. Sign in instead.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email. Create one instead.',
    'auth/too-many-requests': 'Too many tries. Wait a minute.',
    'auth/network-request-failed': 'Could not reach the server. Check your connection.',
    'auth/operation-not-allowed': 'Email sign-in is not switched on for this Firebase project yet.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      'The Firebase settings in this build are not valid. Check the config against the console.',
    'auth/invalid-api-key':
      'The Firebase settings in this build are not valid. Check the config against the console.',
    'auth/unauthorized-domain':
      'This address is not on the Firebase project allow-list. Add it under Authentication, Settings.',
    'permission-denied': 'Your account cannot write here yet. Check the Firestore rules in the README.'
  };
  // Never show raw SDK text: strip the 'Firebase: Error (code).' wrapper
  var raw = (err && err.message) || '';
  if(!map[code] && /^Firebase:/.test(raw)) raw = 'Could not sign in. Check the email and password, and that the project is set up.';
  var e = new Error(map[code] || raw || 'Something went wrong.');
  e.code = code;
  return e;
}

function cloudWatch(cb){
  if(!fbAuth) return;
  fb.authMod.onAuthStateChanged(fbAuth, function(u){
    cloudUser = u ? {uid: u.uid, email: u.email, name: u.displayName || ''} : null;
    cb(cloudUser);
  });
}

async function cloudSignUp(email, pw, name){
  try {
    var cred = await fb.authMod.createUserWithEmailAndPassword(fbAuth, String(email).trim(), pw);
    if(name) await fb.authMod.updateProfile(cred.user, {displayName: name});
    return {uid: cred.user.uid, email: cred.user.email, name: name || ''};
  } catch(err){ throw cloudError(err); }
}
async function cloudSignIn(email, pw){
  try {
    var cred = await fb.authMod.signInWithEmailAndPassword(fbAuth, String(email).trim(), pw);
    return {uid: cred.user.uid, email: cred.user.email, name: cred.user.displayName || ''};
  } catch(err){ throw cloudError(err); }
}
async function cloudSignOut(){
  cloudFlush();
  if(fbAuth) await fb.authMod.signOut(fbAuth);
}
async function cloudResetPassword(email){
  try { await fb.authMod.sendPasswordResetEmail(fbAuth, String(email).trim()); }
  catch(err){ throw cloudError(err); }
}

/* ---------------- the save itself ---------------- */
function cloudDoc(uid){ return fb.store.doc(fbDb, COLLECTION, uid); }

async function cloudFetch(uid){
  var snap = await fb.store.getDoc(cloudDoc(uid));
  return snap.exists() ? snap.data() : null;
}

/* Writes are debounced: a career changes on every goal, and one round trip per
   goal would be slow and pointless. */
function cloudPush(){
  if(!fbDb || !cloudUser) return;
  cloudPending = true;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(cloudFlush, 2000);
}

function cloudFlush(){
  clearTimeout(cloudTimer);
  cloudTimer = null;
  if(!cloudPending || !fbDb || !cloudUser) return;
  cloudPending = false;
  SAVE.rev = (SAVE.rev || 0) + 1;
  SAVE.updated = Date.now();
  var body = JSON.parse(JSON.stringify(SAVE));
  fb.store.setDoc(cloudDoc(cloudUser.uid), body).then(function(){
    cloudState = 'synced';
    paintCloud && paintCloud();
  }, function(){
    // Offline or refused. localStorage still holds everything and the next
    // change retries; a failed sync must never interrupt a game.
    cloudState = 'offline';
    paintCloud && paintCloud();
  });
}

/* A last-chance write when the tab goes away. */
if(typeof window !== 'undefined') window.addEventListener('pagehide', function(){ cloudFlush(); });

/* ---------------- choosing between two saves ----------------
   Taking "the newest" silently can throw away an evening. When both sides
   have real progress we describe each and let the player pick. */
function saveSummary(s){
  if(!s) return 'nothing yet';
  var bits = [];
  bits.push((s.coins || 0).toLocaleString() + ' coins');
  bits.push((s.wins || 0) + '-' + (s.losses || 0) + '-' + (s.draws || 0));
  var cards = (s.skaters ? s.skaters.length : 0) + (s.sticks ? s.sticks.length : 0);
  bits.push(cards + ' cards');
  if(s.story) bits.push('story ' + s.story + '/7');
  return bits.join(' · ');
}
function saveWeight(s){
  if(!s) return -1;
  return (s.coins || 0) + (s.wins || 0) * 500 + (s.story || 0) * 2000 +
         ((s.skaters ? s.skaters.length : 0) + (s.sticks ? s.sticks.length : 0)) * 300;
}

function adoptSave(s){
  SAVE = s;
  repairSave();
  migrateCareer2();
  saveNow();
  applyKits();
  if(world && skaters.length){ createTeams(); resetPositions(); }
  paintWallet();
}

/* =========================================================================
   the account screen
   ========================================================================= */
function cloudShow(id){
  closeMenus(); closeMeta(); closeMeta2();
  el(id).classList.add('on');
}

function setRow(id, on){ var e = el(id); if(e) e.style.display = on ? '' : 'none'; }
function setBtn(id, on){ var e = el(id); if(e) e.style.display = on ? '' : 'none'; }

function paintCloud(){
  var configured = cloudConfigured();
  var signedIn = !!cloudUser;

  setRow('cloudNameRow', configured && !signedIn);
  setRow('cloudEmailRow', configured && !signedIn);
  setRow('cloudPwRow', configured && !signedIn);
  setBtn('btnCloudIn', configured && !signedIn);
  setBtn('btnCloudUp', configured && !signedIn);
  setBtn('btnCloudForgot', configured && !signedIn);
  setBtn('btnCloudOut', signedIn);

  if(!configured){
    el('cloudSub').textContent = 'Cloud save is not switched on for this build.';
    el('cloudBody').innerHTML =
      '<div class="odds">Everything is saved on this device and nothing leaves it. ' +
      'To make a career follow you between devices, a free Firebase project has to be ' +
      'wired in once &mdash; the steps are in the README, and it is the same project ' +
      'Side Pot uses, so one account would cover both games.<br><br>' +
      '<b>Right now:</b> ' + esc(saveSummary(SAVE)) + ', on this device only.</div>';
    return;
  }

  if(signedIn){
    var state = {synced:'Saved to your account.', offline:'Could not reach the server &mdash; still saved on this device.',
                 ready:'Signed in.', loading:'Connecting\u2026'}[cloudStatus()] || 'Signed in.';
    el('cloudSub').textContent = 'Signed in as ' + (cloudUser.name || cloudUser.email) + '.';
    el('cloudBody').innerHTML = '<div class="odds"><b>' + state + '</b><br>' +
      esc(saveSummary(SAVE)) + '<br><span style="color:var(--muted)">' +
      'This career now lives on your account. Sign in on another device and it will be there.</span></div>';
  } else {
    el('cloudSub').textContent = 'Sign in and your career follows you to any device.';
    el('cloudBody').innerHTML = '<div class="odds">On this device: <b>' + esc(saveSummary(SAVE)) + '</b><br>' +
      '<span style="color:var(--muted)">The same account works for Side Pot.</span></div>';
  }
}

function cloudSay(msg, bad){
  var n = el('cloudNote');
  n.textContent = msg || '';
  n.style.color = bad ? 'var(--away)' : 'var(--muted)';
}

/* After signing in: if the account has a different career, let the player choose. */
async function cloudAfterAuth(){
  if(!cloudUser) return;
  cloudSay('Checking your account\u2026');
  var remote = null;
  try { remote = await cloudFetch(cloudUser.uid); }
  catch(e){ cloudSay('Signed in, but could not read the account yet.', true); paintCloud(); return; }

  if(!remote){                      // first time on this account
    cloudPending = true; cloudFlush();
    cloudSay('Account set up. This career is now saved to it.');
    paintCloud();
    return;
  }

  var here = saveWeight(SAVE), there = saveWeight(remote);
  if(here <= 0 || here === there){  // nothing to lose, take the account's
    adoptSave(remote);
    cloudSay('Career loaded from your account.');
    paintCloud();
    return;
  }

  pendingRemote = remote;
  el('mergeBody').innerHTML =
    '<div class="fixture"><div class="fx">On your account</div><div class="fs">' +
      esc(saveSummary(remote)) + '</div></div>' +
    '<div class="fixture"><div class="fx">On this device</div><div class="fs">' +
      esc(saveSummary(SAVE)) + '</div></div>';
  cloudShow('ovMerge');
}

var pendingRemote = null;

/* ---------------- wiring ---------------- */
el('btnCloud').addEventListener('click', async function(){
  sfx.on();
  cloudShow('ovCloud');
  cloudSay('');
  paintCloud();
  if(cloudConfigured() && !fbApp){
    try {
      await cloudInit();
      cloudWatch(function(){ paintCloud(); });
      paintCloud();
    } catch(e){ cloudSay('Could not load the sign-in service. Are you online?', true); }
  }
});

el('btnCloudBack').addEventListener('click', function(){ sfx.on(); closeMeta2(); openMenu(); });

el('btnCloudIn').addEventListener('click', async function(){
  sfx.on();
  cloudSay('Signing in\u2026');
  try {
    await cloudInit();
    await cloudSignIn(el('cloudEmail').value, el('cloudPw').value);
    el('cloudPw').value = '';
    await cloudAfterAuth();
  } catch(e){ cloudSay(e.message, true); }
});

el('btnCloudUp').addEventListener('click', async function(){
  sfx.on();
  cloudSay('Creating your account\u2026');
  try {
    await cloudInit();
    await cloudSignUp(el('cloudEmail').value, el('cloudPw').value, el('cloudName').value);
    el('cloudPw').value = '';
    await cloudAfterAuth();
  } catch(e){ cloudSay(e.message, true); }
});

el('btnCloudOut').addEventListener('click', async function(){
  sfx.on();
  try { await cloudSignOut(); cloudSay('Signed out. The career stays on this device.'); }
  catch(e){ cloudSay(e.message, true); }
  paintCloud();
});

el('btnCloudForgot').addEventListener('click', async function(){
  sfx.on();
  try {
    await cloudInit();
    await cloudResetPassword(el('cloudEmail').value);
    cloudSay('Check your email for a reset link.');
  } catch(e){ cloudSay(e.message, true); }
});

el('btnKeepCloud').addEventListener('click', function(){
  sfx.on();
  if(pendingRemote) adoptSave(pendingRemote);
  pendingRemote = null;
  cloudShow('ovCloud'); cloudSay('Using the career from your account.'); paintCloud();
});

el('btnKeepLocal').addEventListener('click', function(){
  sfx.on();
  pendingRemote = null;
  cloudPending = true; cloudFlush();
  cloudShow('ovCloud'); cloudSay('Kept this device, and pushed it to your account.'); paintCloud();
});
