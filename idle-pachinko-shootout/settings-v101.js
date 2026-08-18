(function(){
'use strict';
var ENGINE_KEY='ips-v7',PEG_SHADOW_KEY='ips-peg-meta-v1',pegApi=null;
function readJson(key){try{var r=localStorage.getItem(key);return r?JSON.parse(r):null;}catch(e){return null;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
function hydratePegShadow(){var engine=readJson(ENGINE_KEY),shadow=readJson(PEG_SHADOW_KEY);if(!engine||!shadow||!shadow.pegMeta)return;engine.pegMeta=shadow.pegMeta;writeJson(ENGINE_KEY,engine);}
hydratePegShadow();
var bootRedirected=false;
function installBootRedirect(){
  function redirect(){
    if(bootRedirected||window.__ipsBooted)return;
    var old=document.querySelector('script[src^="engine-v117-loader.js"]'),s;
    if(!old||!old.parentNode)return;
    bootRedirected=true;
    s=document.createElement('script');
    s.src='engine-v119-loader.js?v=20260818-119';
    s.defer=true;
    old.parentNode.insertBefore(s,old);
    old.parentNode.removeChild(old);
  }
  var mo=new MutationObserver(function(){redirect();if(bootRedirected)mo.disconnect();});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  redirect();
  setTimeout(function(){
    if(!window.__ipsBooted&&!bootRedirected){
      var s=document.createElement('script');
      bootRedirected=true;
      s.src='engine-v119-loader.js?v=20260818-119-fallback';
      document.head.appendChild(s);
    }
  },1200);
}
installBootRedirect();
function savePegShadow(){if(!pegApi||!pegApi.snapshot)return;var s=pegApi.snapshot();if(s&&s.pegMeta)writeJson(PEG_SHADOW_KEY,{pegMeta:s.pegMeta,updatedAt:Date.now()});}
function bindPegPersistence(){pegApi=window.__ipsAPI;if(!pegApi||!pegApi.snapshot)return false;savePegShadow();document.addEventListener('ips:pegUpgrade',savePegShadow);document.addEventListener('ips:pegMove',savePegShadow);document.addEventListener('ips:pegSell',savePegShadow);document.addEventListener('ips:pegPlace',savePegShadow);document.addEventListener('ips:upgrade',function(e){if(e&&e.detail&&e.detail.kind==='board')setTimeout(savePegShadow,0);});window.addEventListener('pagehide',savePegShadow);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')savePegShadow();});return true;}
var persistTries=0,persistTimer=setInterval(function(){persistTries++;if(bindPegPersistence()||persistTries>160)clearInterval(persistTimer);},100);
var RESET_KEYS=[
  'idle-pachinko-shootout-v01',
  'idle-pachinko-shootout-v0.1',
  'ips-v1','ips-v2','ips-v3','ips-v4','ips-v5','ips-v6','ips-v7','ips-v8','ips-v9','ips-v10',
  'ips-idle-v1','ips-telemetry-v1','ips-campaign-v1','ips-contracts-v1','ips-combat-telemetry-v1','ips-blueprints-v1','ips-loot-v1','ips-peg-meta-v1'
];
function $(id){return document.getElementById(id);}
function open(id){var el=$(id);if(el)el.classList.remove('hidden');}
function close(id){var el=$(id);if(el)el.classList.add('hidden');}
function resetInputState(){var input=$('resetConfirmInput'),button=$('confirmGameReset');if(input)input.value='';if(button){button.disabled=true;button.textContent='PERMANENTLY RESET GAME';}}
function removeGameData(){var i;for(i=0;i<RESET_KEYS.length;i++){try{localStorage.removeItem(RESET_KEYS[i]);}catch(e){}}
  try{var remove=[],k;for(i=0;i<localStorage.length;i++){k=localStorage.key(i)||'';if(/^ips-(v\d+|idle-|telemetry-|campaign-|contracts-|combat-telemetry-|blueprints-|loot-|peg-)/.test(k)||/^idle-pachinko-shootout/.test(k))remove.push(k);}for(i=0;i<remove.length;i++)localStorage.removeItem(remove[i]);}catch(e){}
}
function markVersion(){document.title='Idle Pachinko Shootout — v1.11.9';var brand=document.querySelector('.brand small');if(brand)brand.textContent=' v1.11.9';var meta=document.querySelector('#settingsModal .settings-meta');if(meta){var bs=meta.querySelectorAll('b');if(bs.length)bs[0].textContent='v1.11.9';}}
function bind(){markVersion();var settings=$('settingsButton'),closeSettings=$('closeSettings'),reset=$('resetGameButton'),cancel=$('cancelGameReset'),input=$('resetConfirmInput'),confirm=$('confirmGameReset');if(settings)settings.onclick=function(){markVersion();open('settingsModal');};if(closeSettings)closeSettings.onclick=function(){close('settingsModal');};if(reset)reset.onclick=function(){resetInputState();open('resetConfirmModal');setTimeout(function(){if(input)input.focus();},60);};if(cancel)cancel.onclick=function(){close('resetConfirmModal');resetInputState();};if(input)input.addEventListener('input',function(){if(confirm)confirm.disabled=this.value!=='RESET';});if(confirm)confirm.onclick=function(){if(!input||input.value!=='RESET')return;confirm.disabled=true;confirm.textContent='RESETTING…';removeGameData();location.reload();};var settingsModal=$('settingsModal');if(settingsModal)settingsModal.addEventListener('click',function(e){if(e.target===settingsModal)close('settingsModal');});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();