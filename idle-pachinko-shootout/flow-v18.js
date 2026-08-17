(function(){
'use strict';
function $(id){return document.getElementById(id);}function visible(id){var e=$(id);return !!(e&&!e.classList.contains('hidden'));}
var gameplayBlocks=['lootModal','deathModal','returnModal','tutorialModal','resetConfirmModal'];
function syncBlocked(){var blocked=false,i;for(i=0;i<gameplayBlocks.length;i++)if(visible(gameplayBlocks[i])){blocked=true;break;}document.body.classList.toggle('reward-blocked',blocked);if(blocked){var toast=$('campaignToast');if(toast)toast.classList.remove('show');}}
function note(msg){var card=document.querySelector('#lootModal .loot-card');if(!card)return;var n=card.querySelector('.loot-watchdog-note');if(!n){n=document.createElement('div');n.className='loot-watchdog-note';card.appendChild(n);}n.textContent=msg;}
function clearNote(){var n=document.querySelector('.loot-watchdog-note');if(n)n.remove();}
function bindLootWatchdog(){var modal=$('lootModal'),equip=$('equipNew'),sell=$('sellNew');if(!modal||!equip||!sell)return;function clicked(){clearNote();setTimeout(function(){if(!visible('lootModal'))return;equip.disabled=true;sell.disabled=true;note('RESOLVING LOOT…');setTimeout(function(){if(!visible('lootModal'))return;equip.disabled=false;sell.disabled=false;note('Loot did not resolve. Tap your choice again.');},1100);},0);}equip.addEventListener('click',clicked);sell.addEventListener('click',clicked);new MutationObserver(function(){syncBlocked();if(!visible('lootModal'))clearNote();}).observe(modal,{attributes:true,attributeFilter:['class']});}
function observeBlocks(){gameplayBlocks.forEach(function(id){var e=$(id);if(e)new MutationObserver(syncBlocked).observe(e,{attributes:true,attributeFilter:['class']});});document.addEventListener('ips:loot',function(){var toast=$('campaignToast');if(toast)toast.classList.remove('show');syncBlocked();});document.addEventListener('ips:lootChoice',function(){setTimeout(syncBlocked,0);});syncBlocked();}
function boot(){observeBlocks();bindLootWatchdog();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
