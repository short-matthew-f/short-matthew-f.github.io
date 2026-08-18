(function(){
'use strict';
var spendMode=false,bar=null,booted=false,timer=null;
function $(id){return document.getElementById(id);}
function state(){try{return window.__ipsDebug&&window.__ipsDebug.state?window.__ipsDebug.state():null;}catch(e){return null;}}
function isDead(){var s=state();return !!(s&&s.state==='dead');}
function hideDeath(){var m=$('deathModal');if(m)m.classList.add('hidden');}
function showDeath(){var m=$('deathModal');if(m&&isDead())m.classList.remove('hidden');}
function ensureAmmoButton(){var board=$('deathBoard'),ride=$('rideAgain'),actions=board&&board.parentNode;if(!board||!ride||!actions)return null;var ammo=$('deathAmmo');if(!ammo){ammo=document.createElement('button');ammo.id='deathAmmo';ammo.className='secondary';ammo.type='button';actions.insertBefore(ammo,ride);}return ammo;}
function ensureBar(){if(bar&&bar.isConnected)return bar;var combat=$('combat');if(!combat)return null;bar=document.createElement('div');bar.id='deathSpendBar';bar.className='death-spend-bar hidden';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Death spending controls');bar.innerHTML='<span>SPEND BEFORE THE NEXT RIDE</span><button type="button" data-death-sheet="board">BOARD + PEGS</button><button type="button" data-death-sheet="ammo">AMMO + ROUNDS</button><button type="button" data-death-done>DONE</button>';combat.appendChild(bar);bar.addEventListener('click',function(ev){var b=ev.target.closest('button');if(!b)return;if(b.hasAttribute('data-death-done')){leaveSpend();return;}var name=b.getAttribute('data-death-sheet');if(name)openSpend(name);});return bar;}
function setSpend(on){spendMode=!!on;document.body.classList.toggle('ips-death-spending',spendMode);var b=ensureBar();if(b)b.classList.toggle('hidden',!spendMode);if(spendMode)hideDeath();}
function cancelBoardInteraction(){var banner=$('placementBanner');if(banner&&!banner.classList.contains('hidden')){var c=$('cancelPlacement');if(c)c.click();}}
function openSheet(name){var api=window.__ipsAPI;if(!api||!api.openSheet)return;hideDeath();api.openSheet(name);}
function openSpend(name){if(!isDead())return;setSpend(true);cancelBoardInteraction();openSheet(name==='ammo'?'ammo':'board');}
function leaveSpend(){if(!spendMode)return;cancelBoardInteraction();setSpend(false);var sheet=$('sheet');if(sheet&&sheet.classList.contains('open')){var c=$('closeSheet');if(c)c.click();}else showDeath();}
function openHero(){if(!isDead())return;setSpend(false);hideDeath();openSheet('hero');}
function wire(){var hero=$('deathHero'),board=$('deathBoard'),ammo=ensureAmmoButton();if(!hero||!board||!ammo)return false;hero.textContent='UPGRADE HERO · ✦ XP';board.textContent='BOARD + PEGS · ●';ammo.textContent='AMMO + ROUNDS · ●';hero.onclick=openHero;board.onclick=function(){openSpend('board');};ammo.onclick=function(){openSpend('ammo');};ensureBar();return true;}
function guard(){var modal=$('deathModal');if(!modal)return;if(spendMode){if(!isDead()){setSpend(false);return;}if(!modal.classList.contains('hidden'))modal.classList.add('hidden');}}
function boot(){if(booted)return true;if(!window.__ipsAPI||!window.__ipsDebug)return false;if(!wire())return false;booted=true;var modal=$('deathModal');if(modal)new MutationObserver(guard).observe(modal,{attributes:true,attributeFilter:['class']});document.addEventListener('ips:runStart',function(){setSpend(false);});document.addEventListener('ips:heroDeath',function(){if(!spendMode){var b=ensureBar();if(b)b.classList.add('hidden');}});timer=setInterval(function(){if(spendMode)guard();},180);return true;}
var tries=0,poll=setInterval(function(){tries++;if(boot()||tries>160)clearInterval(poll);},100);
})();
