(function(){
'use strict';
var ENGINE_KEY='ips-v7',SHADOW_KEY='ips-peg-meta-v1',api=null;
function read(key){try{var r=localStorage.getItem(key);return r?JSON.parse(r):null;}catch(e){return null;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
function hydrate(){var engine=read(ENGINE_KEY),shadow=read(SHADOW_KEY);if(!engine||!shadow||!shadow.pegMeta)return;engine.pegMeta=shadow.pegMeta;write(ENGINE_KEY,engine);}
function saveShadow(){if(!api||!api.snapshot)return;var s=api.snapshot();if(!s||!s.pegMeta)return;write(SHADOW_KEY,{pegMeta:s.pegMeta,updatedAt:Date.now()});}
hydrate();
function boot(){api=window.__ipsAPI;if(!api||!api.snapshot)return false;saveShadow();document.addEventListener('ips:pegUpgrade',saveShadow);document.addEventListener('ips:pegMove',saveShadow);document.addEventListener('ips:pegSell',saveShadow);document.addEventListener('ips:pegPlace',saveShadow);document.addEventListener('ips:upgrade',function(e){if(e&&e.detail&&e.detail.kind==='board')setTimeout(saveShadow,0);});window.addEventListener('pagehide',saveShadow);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')saveShadow();});return true;}
var tries=0,t=setInterval(function(){tries++;if(boot()||tries>160)clearInterval(t);},100);
})();
