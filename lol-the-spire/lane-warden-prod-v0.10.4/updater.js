(() => {
  'use strict';
  const CURRENT_BUILD='P1-0.11.0';
  const hadControllerAtLoad=!!navigator.serviceWorker?.controller;
  let registration=null,reloading=false,latestAdvertised=CURRENT_BUILD,swBuild=navigator.serviceWorker?.controller?'checking':'installing',updateReady=false;
  const diag=()=>{const el=document.getElementById('buildDiag');if(el)el.textContent=`APP ${CURRENT_BUILD} · LATEST ${latestAdvertised} · SW ${swBuild}`};
  const note=text=>{const el=document.getElementById('updateNote');if(el)el.textContent=text||''};
  const inActiveBattle=()=>{const el=document.getElementById('battle');return!!el&&!el.hidden};
  async function fetchLatest(){try{const r=await fetch(`./build.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;const j=await r.json();if(j?.build)latestAdvertised=j.build;diag();return j}catch{return null}}
  function askControllerBuild(){const c=navigator.serviceWorker?.controller;if(!c){swBuild='none';diag();return}const ch=new MessageChannel(),timer=setTimeout(()=>{swBuild='unknown';diag()},1200);ch.port1.onmessage=e=>{clearTimeout(timer);swBuild=e.data?.build||'unknown';diag()};c.postMessage({type:'GET_BUILD'},[ch.port2])}
  function armInstalling(worker){if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'){registration?.waiting?.postMessage({type:'SKIP_WAITING'});note(`Lane Warden ${latestAdvertised} installed…`)}})}
  async function checkForUpdate(){if(!registration)return;const latest=await fetchLatest();try{await registration.update()}catch{}if(registration.installing)armInstalling(registration.installing);if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});if(!latest||latest.build===CURRENT_BUILD)askControllerBuild();else note(`Updating Lane Warden to ${latest.build}…`)}
  function applyIfReady(){if(!updateReady||reloading||inActiveBattle())return;reloading=true;location.reload()}
  async function register(){if(!('serviceWorker'in navigator)){swBuild='unsupported';diag();return}try{registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});registration.addEventListener('updatefound',()=>armInstalling(registration.installing));await navigator.serviceWorker.ready;askControllerBuild();await checkForUpdate()}catch{swBuild='registration failed';diag()}}
  navigator.serviceWorker?.addEventListener('controllerchange',()=>{askControllerBuild();if(!hadControllerAtLoad)return;updateReady=true;if(inActiveBattle())note(`Update ${latestAdvertised} ready · applies after battle`);else applyIfReady()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate()});window.addEventListener('pageshow',()=>checkForUpdate());window.LW_UPDATE={currentBuild:CURRENT_BUILD,check:checkForUpdate,applyIfReady};diag();register();
})();