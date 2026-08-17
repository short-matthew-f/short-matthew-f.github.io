(function(){
'use strict';
function pulse(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(function(){el.classList.remove(cls);},ms||260);}
function slotHit(d){var slots=document.querySelectorAll('.slot-label'),el=slots[Number(d.slot)];if(el)pulse(el,Number(d.value)>=7?'slot-hit-big':'slot-hit',320);}
function shake(d){var combat=document.getElementById('combat');if(!combat)return;if(d&&d.kind==='boom')pulse(combat,'combat-shake-heavy',260);else if(d&&d.crit)pulse(combat,'combat-shake',180);}
function walletPulse(){var w=document.querySelector('.wallet');pulse(w,'wallet-pulse',340);}
document.addEventListener('ips:slot',function(e){slotHit(e.detail||{});});
document.addEventListener('ips:shot',function(e){shake(e.detail||{});});
document.addEventListener('ips:heroHit',function(e){var c=document.getElementById('combat');pulse(c,(e.detail&&e.detail.mode==='cannon')?'combat-shake-heavy':'combat-shake',220);});
document.addEventListener('ips:waveClear',function(){pulse(document.getElementById('waveBadge'),'wave-clear-pulse',520);walletPulse();});
document.addEventListener('ips:enemyDeath',function(e){if(e.detail&&e.detail.boss)pulse(document.getElementById('combat'),'boss-kill-flash',650);});
document.addEventListener('ips:upgrade',walletPulse);
document.addEventListener('ips:lootChoice',walletPulse);
})();
