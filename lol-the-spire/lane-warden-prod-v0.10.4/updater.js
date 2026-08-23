(() => {
  'use strict';
  const CURRENT_BUILD = 'P0-0.10.6';
  const hadControllerAtLoad = !!navigator.serviceWorker?.controller;
  let registration = null;
  let reloading = false;
  let latestAdvertised = CURRENT_BUILD;
  let swBuild = navigator.serviceWorker?.controller ? 'checking' : 'installing';
  let updateReady = false;

  const diag = () => {
    const el = document.getElementById('buildDiag');
    if (el) el.textContent = `APP ${CURRENT_BUILD} · LATEST ${latestAdvertised} · SW ${swBuild}`;
  };
  const note = text => { const el=document.getElementById('updateNote'); if(el) el.textContent=text||''; };
  const inActiveBattle = () => {
    const battle=document.getElementById('battle');
    return !!battle && !battle.hidden;
  };

  async function fetchLatest() {
    try {
      const r = await fetch(`./build.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      if (j?.build) latestAdvertised = j.build;
      diag();
      return j;
    } catch { return null; }
  }

  function askControllerBuild() {
    const c = navigator.serviceWorker?.controller;
    if (!c) { swBuild = 'none'; diag(); return; }
    const channel = new MessageChannel();
    const timer = setTimeout(() => { swBuild = 'unknown'; diag(); }, 1200);
    channel.port1.onmessage = e => { clearTimeout(timer); swBuild=e.data?.build||'unknown'; diag(); };
    c.postMessage({ type:'GET_BUILD' }, [channel.port2]);
  }

  async function checkForUpdate() {
    if (!registration) return;
    const latest = await fetchLatest();
    if (!latest || latest.build === CURRENT_BUILD) { askControllerBuild(); return; }
    note(`Updating Lane Warden to ${latest.build}…`);
    try { await registration.update(); } catch {}
  }

  function applyIfReady() {
    if (!updateReady || reloading || inActiveBattle()) return;
    reloading=true;
    location.reload();
  }

  async function register() {
    if (!('serviceWorker' in navigator)) { swBuild='unsupported'; diag(); return; }
    try {
      registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      await navigator.serviceWorker.ready;
      askControllerBuild();
      await checkForUpdate();
    } catch { swBuild='registration failed'; diag(); }
  }

  navigator.serviceWorker?.addEventListener('controllerchange',()=>{
    askControllerBuild();
    if (!hadControllerAtLoad) return;
    updateReady=true;
    if (inActiveBattle()) note(`Update ${latestAdvertised} ready · applies after battle`);
    else applyIfReady();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate()});
  window.addEventListener('pageshow',()=>checkForUpdate());
  window.LW_UPDATE={currentBuild:CURRENT_BUILD,check:checkForUpdate,applyIfReady};
  diag();
  register();
})();