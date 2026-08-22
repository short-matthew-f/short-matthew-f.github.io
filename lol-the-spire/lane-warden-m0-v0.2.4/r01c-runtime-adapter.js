(() => {
  'use strict';
  const R = window.LW_RULES, C = window.LW_R01_CONFIG;
  if (!R || !C) return;
  const scale = C.PARAMS.towerDurabilityScale || 1;
  if (scale !== 1) for (const t of Object.values(R.TOWERS)) t.hp *= scale;
  window.__LW_R01C_RUNTIME_ADAPTER__ = { build:C.BUILD, representation:'effective-durability', towerDurabilityScale:scale };
})();
