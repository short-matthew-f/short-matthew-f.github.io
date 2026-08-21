(() => {
  'use strict';
  const canvas = document.getElementById('battlefield');
  if (!canvas) throw new Error('LW cancel remediation: battlefield canvas missing');
  const nativeAdd = canvas.addEventListener;
  let wrapped = false;

  canvas.addEventListener = function(type, listener, options) {
    if (type !== 'pointercancel' || wrapped) {
      return nativeAdd.call(this, type, listener, options);
    }
    wrapped = true;
    const safeCancelListener = function(event) {
      // The immutable v0.1.1 core routes pointercancel through pointerUp().
      // Force the cancelled gesture outside tap distance while preserving
      // pointerId so the core still performs its ordinary cleanup.
      const safeEvent = new Proxy(event, {
        get(target, prop) {
          if (prop === 'clientX' || prop === 'clientY') return -1000000;
          const value = Reflect.get(target, prop, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
      return listener.call(this, safeEvent);
    };
    const result = nativeAdd.call(this, type, safeCancelListener, options);
    delete canvas.addEventListener;
    window.__LW_CANCEL_REMEDIATION__ = {
      build: 'M0-0.1.6',
      coreBuild: 'M0-0.1.1',
      installed: true,
      strategy: 'cancel-cleanup-with-non-tap-coordinates'
    };
    return result;
  };
})();
