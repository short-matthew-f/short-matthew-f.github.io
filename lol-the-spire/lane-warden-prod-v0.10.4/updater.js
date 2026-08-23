(() => {
  'use strict';
  const CURRENT_BUILD = 'P0-0.10.5';
  const hadControllerAtLoad = !!navigator.serviceWorker?.controller;
  let registration = null;
  let reloading = false;
  let latestAdvertised = CURRENT_BUILD;
  let swBuild = navigator.serviceWorker?.controller ? 'checking' : 'installing';

  const diag = () => {
    const el = document.getElementById('buildDiag');
    if (el) el.textContent = `APP ${CURRENT_BUILD} · LATEST ${latestAdvertised} · SW ${swBuild}`;
  };

  async function fetchLatest() {
    try {
      const r = await fetch(`./build.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      if (j?.build) latestAdvertised = j.build;
      diag();
      return j;
    } catch {
      return null;
    }
  }

  function askControllerBuild() {
    const c = navigator.serviceWorker?.controller;
    if (!c) { swBuild = 'none'; diag(); return; }
    const channel = new MessageChannel();
    const timer = setTimeout(() => { swBuild = 'unknown'; diag(); }, 1200);
    channel.port1.onmessage = e => {
      clearTimeout(timer);
      swBuild = e.data?.build || 'unknown';
      diag();
    };
    c.postMessage({ type: 'GET_BUILD' }, [channel.port2]);
  }

  async function checkForUpdate(reason) {
    if (!registration) return;
    const latest = await fetchLatest();
    if (!latest || latest.build === CURRENT_BUILD) {
      askControllerBuild();
      return;
    }
    document.documentElement.dataset.updateState = 'updating';
    const note = document.getElementById('updateNote');
    if (note) note.textContent = `Updating Lane Warden to ${latest.build}…`;
    try { await registration.update(); } catch {}
  }

  async function register() {
    if (!('serviceWorker' in navigator)) { swBuild = 'unsupported'; diag(); return; }
    try {
      registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
      askControllerBuild();
      await checkForUpdate('launch');
    } catch {
      swBuild = 'registration failed';
      diag();
    }
  }

  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    askControllerBuild();
    if (!hadControllerAtLoad || reloading) return;
    reloading = true;
    location.reload();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForUpdate('foreground');
  });
  window.addEventListener('pageshow', () => checkForUpdate('pageshow'));
  window.LW_UPDATE = { currentBuild: CURRENT_BUILD, check: checkForUpdate };
  diag();
  register();
})();
