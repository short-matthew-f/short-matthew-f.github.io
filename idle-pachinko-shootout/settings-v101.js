(function(){
'use strict';
var ENGINE_KEY='ips-v7',PEG_LEDGER_KEY='ips-peg-state-v2',OLD_PEG_KEY='ips-peg-meta-v1',pegApi=null,lastPegSig='';
var PEG_TYPES=['fire','split','pierce','boom','chain'];
function readJson(key){try{var r=localStorage.getItem(key);return r?JSON.parse(r):null;}catch(e){return null;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
function clone(v){return JSON.parse(JSON.stringify(v||{}));}
function activeMeta(snapshot,ledger){var out={},p=(snapshot&&snapshot.placements)||{},runtime=(snapshot&&snapshot.pegMeta)||{},saved=(ledger&&ledger.pegMeta)||{},i,j,t,arr,key,a,b;for(i=0;i<PEG_TYPES.length;i++){t=PEG_TYPES[i];out[t]={};arr=p[t]||[];for(j=0;j<arr.length;j++){key=String(arr[j]);a=(runtime[t]&&runtime[t][key])||{};b=(saved[t]&&saved[t][key])||{};out[t][key]={level:Math.max(Number(a.level||0),Number(b.level||0)),invested:Math.max(Number(a.invested||0),Number(b.invested||0))};}}return out;}
function hydratePegLedger(){var engine=readJson(ENGINE_KEY),ledger=readJson(PEG_LEDGER_KEY)||readJson(OLD_PEG_KEY);if(!engine||!ledger||!ledger.pegMeta)return;engine.pegMeta=activeMeta(engine,ledger);writeJson(ENGINE_KEY,engine);}
hydratePegLedger();
var bootRedirected=false;
function installBootRedirect(){
  function redirect(){
    if(bootRedirected||window.__ipsBooted)return;
    var old=document.querySelector('script[src^="engine-v117-loader.js"]'),n;
    if(!old||!old.parentNode)return;
    bootRedirected=true;
    n=document.createElement('script');
    n.src='engine-v120-loader.js?v=20260818-120';
    n.defer=true;
    old.parentNode.insertBefore(n,old);
    old.parentNode.removeChild(old);
  }
  var mo=new MutationObserver(function(){redirect();if(bootRedirected)mo.disconnect();});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  redirect();
  setTimeout(function(){if(!window.__ipsBooted&&!bootRedirected){var n=document.createElement('script');bootRedirected=true;n.src='engine-v120-loader.js?v=20260818-120-fallback';document.head.appendChild(n);}},1200);
}
function installBoardAssets(){
  if(!document.querySelector('link[href^="board-v120.css"]')){var l=document.createElement('link');l.rel='stylesheet';l.href='board-v120.css?v=20260818-2';document.head.appendChild(l);}
  if(!document.querySelector('script[src^="board-v120.js"]')){var s=document.createElement('script');s.src='board-v120.js?v=20260818-2';document.head.appendChild(s);}
}
installBootRedirect();
installBoardAssets();
function capturePegLedger(force){if(!pegApi||!pegApi.snapshot)return;var s=pegApi.snapshot(),old=readJson(PEG_LEDGER_KEY)||readJson(OLD_PEG_KEY)||{},meta=activeMeta(s,old),sig=JSON.stringify([s.placements||{},meta]);if(!force&&sig===lastPegSig)return;lastPegSig=sig;writeJson(PEG_LEDGER_KEY,{pegMeta:meta,placements:clone(s.placements||{}),updatedAt:Date.now()});var engine=readJson(ENGINE_KEY);if(engine){engine.pegMeta=meta;writeJson(ENGINE_KEY,engine);}}
function wrapApiMethod(name){var original;if(!pegApi||!pegApi[name]||pegApi[name].__ipsPegPersistWrapped)return;original=pegApi[name];pegApi[name]=function(){var result=original.apply(pegApi,arguments);capturePegLedger(true);return result;};pegApi[name].__ipsPegPersistWrapped=true;}
function bindPegPersistence(){pegApi=window.__ipsAPI;if(!pegApi||!pegApi.snapshot)return false;wrapApiMethod('upgradePeg');wrapApiMethod('movePeg');wrapApiMethod('sellPeg');capturePegLedger(true);document.addEventListener('ips:pegUpgrade',function(){capturePegLedger(true);});document.addEventListener('ips:pegMove',function(){capturePegLedger(true);});document.addEventListener('ips:pegSell',function(){capturePegLedger(true);});document.addEventListener('ips:pegPlace',function(){capturePegLedger(true);});document.addEventListener('ips:upgrade',function(e){if(e&&e.detail&&e.detail.kind==='board')setTimeout(function(){capturePegLedger(true);},0);});window.addEventListener('pagehide',function(){capturePegLedger(true);});document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')capturePegLedger(true);});setInterval(function(){capturePegLedger(false);},900);return true;}
var persistTries=0,persistTimer=setInterval(function(){persistTries++;if(bindPegPersistence()||persistTries>160)clearInterval(persistTimer);},100);
var RESET_KEYS=['idle-pachinko-shootout-v01','idle-pachinko-shootout-v0.1','ips-v1','ips-v2','ips-v3','ips-v4','ips-v5','ips-v6','ips-v7','ips-v8','ips-v9','ips-v10','ips-idle-v1','ips-telemetry-v1','ips-campaign-v1','ips-contracts-v1','ips-combat-telemetry-v1','ips-blueprints-v1','ips-loot-v1','ips-peg-meta-v1','ips-peg-state-v2'];
function $(id){return document.getElementById(id);}
function open(id){var el=$(id);if(el)el.classList.remove('hidden');}
function close(id){var el=$(id);if(el)el.classList.add('hidden');}
function resetInputState(){var input=$('resetConfirmInput'),button=$('confirmGameReset');if(input)input.value='';if(button){button.disabled=true;button.textContent='PERMANENTLY RESET GAME';}}
function removeGameData(){var i;for(i=0;i<RESET_KEYS.length;i++){try{localStorage.removeItem(RESET_KEYS[i]);}catch(e){}}try{var remove=[],k;for(i=0;i<localStorage.length;i++){k=localStorage.key(i)||'';if(/^ips-(v\d+|idle-|telemetry-|campaign-|contracts-|combat-telemetry-|blueprints-|loot-|peg-)/.test(k)||/^idle-pachinko-shootout/.test(k))remove.push(k);}for(i=0;i<remove.length;i++)localStorage.removeItem(remove[i]);}catch(e){}}
function markVersion(){document.title='Idle Pachinko Shootout — v1.12';var brand=document.querySelector('.brand small');if(brand)brand.textContent=' v1.12';var meta=document.querySelector('#settingsModal .settings-meta');if(meta){var bs=meta.querySelectorAll('b');if(bs.length)bs[0].textContent='v1.12';}}
function bind(){markVersion();var settings=$('settingsButton'),closeSettings=$('closeSettings'),reset=$('resetGameButton'),cancel=$('cancelGameReset'),input=$('resetConfirmInput'),confirm=$('confirmGameReset');if(settings)settings.onclick=function(){markVersion();open('settingsModal');};if(closeSettings)closeSettings.onclick=function(){close('settingsModal');};if(reset)reset.onclick=function(){resetInputState();open('resetConfirmModal');setTimeout(function(){if(input)input.focus();},60);};if(cancel)cancel.onclick=function(){close('resetConfirmModal');resetInputState();};if(input)input.addEventListener('input',function(){if(confirm)confirm.disabled=this.value!=='RESET';});if(confirm)confirm.onclick=function(){if(!input||input.value!=='RESET')return;confirm.disabled=true;confirm.textContent='RESETTING…';removeGameData();location.reload();};var settingsModal=$('settingsModal');if(settingsModal)settingsModal.addEventListener('click',function(e){if(e.target===settingsModal)close('settingsModal');});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
