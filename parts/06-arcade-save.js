/* ---------- Arcade account ----------
   Signed in on the Arcade, your progress here is kept in your account, so it
   follows you about and comes back after you sign out and in again. The work
   is in the Arcade's account/sync.js; this only names what to keep. Opened
   off a memory stick, or anywhere the Arcade is not, the import just fails
   and the game is exactly what it was. It sits first so that a save the
   game chokes on cannot stop it from swapping that save out. */
try { import('/account/sync.js').then(function(m){ m.syncGame('top-shelf', ['ts_save_v1', 'sa_tut']); }).catch(function(){}); } catch(e) {}

/* Top Shelf's own Account screen is for a separate cloud save that was never
   switched on; the Arcade account does that job now. So its Account button
   opens the Arcade's sign-in instead, when the Arcade is there to open. */
document.addEventListener('click', function(e){
  var b = e.target && e.target.closest && e.target.closest('#btnCloud');
  if(b && window.ArcadeAccount){ e.preventDefault(); e.stopImmediatePropagation(); window.ArcadeAccount.open(); }
}, true);
