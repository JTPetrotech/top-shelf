/* ---------- Arcade account ----------
   Signed in on the Arcade, your progress here is kept in your account, so it
   follows you about and comes back after you sign out and in again. The work
   is in the Arcade's account/sync.js; this only names what to keep. Opened
   off a memory stick, or anywhere the Arcade is not, the import just fails
   and the game is exactly what it was. It sits first so that a save the
   game chokes on cannot stop it from swapping that save out. */
try { import('/account/sync.js').then(function(m){ m.syncGame('top-shelf', ['ts_save_v1', 'sa_tut']); }).catch(function(){}); } catch(e) {}
