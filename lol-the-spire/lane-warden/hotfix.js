(() => {
  'use strict';
  const E = window.LW_ENGINE;
  if (!E || typeof E.stepBattle !== 'function') return;
  const originalStep = E.stepBattle.bind(E);
  const isPortrait = () => {
    try {
      if (typeof matchMedia === 'function' && matchMedia('(orientation: portrait)').matches) return true;
    } catch {}
    const vv = window.visualViewport;
    if (vv && vv.height > vv.width) return true;
    return innerHeight > innerWidth;
  };
  E.stepBattle = function patchedStepBattle(state, dt) {
    if (isPortrait()) return state;
    return originalStep(state, dt);
  };
  const rotate = document.getElementById('rotate');
  if (rotate) rotate.textContent = 'Rotate to landscape · battle paused';
})();
