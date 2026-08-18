(function(){
'use strict';
if(window.__ipsDustwater1140)return;
window.__ipsDustwater1140=true;

var currentWave=1;
function $(id){return document.getElementById(id);}
function q(sel,root){return(root||document).querySelector(sel);}
function qa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
function safe(v){return String(v||'').toLowerCase();}
function pulse(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(function(){if(el)el.classList.remove(cls);},ms||500);}
function regionForWave(w){return Math.floor((Math.max(1,Number(w)||1)-1)/10)+1;}
function isDustwater(){return regionForWave(currentWave)===1;}
function familyFromName(name){var n=safe(name);if(/undertaker/.test(n))return'undertaker';if(/troll/.test(n))return'troll';if(/ghost|wraith|specter|gunner|gunhand/.test(n))return'ghost';if(/ghoul|hound|stalker/.test(n))return'ghoul';return'zombie';}
function familyLabel(k){return{zombie:'DEAD MAN',ghoul:'NIGHT FEEDER',ghost:'RESTLESS',troll:'GRAVE-BORN',undertaker:'BOSS · THE UNDERTAKER'}[k]||'OUTLAW';}

function installCombatScenery(){
  var combat=$('combat'),old=$('dustwaterIdentity'),d;
  if(!combat||old)return;
  d=document.createElement('div');d.id='dustwaterIdentity';d.className='dustwater-identity';d.setAttribute('aria-hidden','true');
  d.innerHTML='<div class="dw-sky-grain"></div><div class="dw-moon"></div><div class="dw-clouds dw-clouds-a"></div><div class="dw-clouds dw-clouds-b"></div><div class="dw-ridge dw-ridge-far"></div><div class="dw-ridge dw-ridge-near"></div><div class="dw-town"><i class="dw-building dw-saloon"></i><i class="dw-building dw-chapel"></i><i class="dw-building dw-water"></i><i class="dw-building dw-shack"></i></div><div class="dw-fence"></div><div class="dw-dust"></div><div class="dw-vignette"></div>';
  combat.insertBefore(d,combat.firstChild);
}
function installBoardPlate(){
  var wrap=q('.board-wrap'),plate;if(!wrap||q('.dustwater-board-plate',wrap))return;
  plate=document.createElement('div');plate.className='dustwater-board-plate';plate.setAttribute('aria-hidden','true');plate.innerHTML='<span>DUSTWATER ARSENAL</span><b>REPEATING SHOT BOARD · No. 06</b>';
  wrap.appendChild(plate);
}
function installHeroIdentity(){
  var hero=$('heroUnit'),art=q('.hero-art',hero),badge;if(!hero)return;
  hero.classList.add('dw-gunslinger');
  if(art&&!q('.dw-hero-aura',art)){badge=document.createElement('i');badge.className='dw-hero-aura';art.insertBefore(badge,art.firstChild);}
  if(!q('.dw-hero-title',hero)){badge=document.createElement('div');badge.className='dw-hero-title';badge.innerHTML='<span>THE LAST LIGHT IN DUSTWATER</span>';hero.appendChild(badge);}
}
function decorateEnemy(el){
  var nameEl=q('.enemy-name',el),name=(nameEl&&nameEl.textContent)||'',family=familyFromName(name),fig=q('.unit-figure',el),tag;
  el.classList.remove('dw-zombie','dw-ghoul','dw-ghost','dw-troll','dw-undertaker');el.classList.add('dw-enemy','dw-'+family);el.setAttribute('data-dw-family',family);
  if(fig&&!q('.dw-enemy-aura',fig)){tag=document.createElement('i');tag.className='dw-enemy-aura';fig.insertBefore(tag,fig.firstChild);}
  tag=q('.dw-family-tag',el);if(!tag){tag=document.createElement('small');tag.className='dw-family-tag';el.appendChild(tag);}tag.textContent=familyLabel(family);
  if(family==='undertaker'){el.classList.add('dw-boss');if(fig&&!q('.dw-undertaker-sigil',fig)){tag=document.createElement('i');tag.className='dw-undertaker-sigil';fig.appendChild(tag);}}
}
function refreshEnemies(){qa('#enemyLane .enemy').forEach(decorateEnemy);}
function applyRegion(){var app=$('app');if(!app)return;app.classList.toggle('region-dustwater',isDustwater());if(isDustwater()){installCombatScenery();installBoardPlate();installHeroIdentity();refreshEnemies();}}
function bossEntrance(){
  if(!isDustwater())return;var combat=$('combat'),box;if(!combat)return;
  box=document.createElement('div');box.className='dw-boss-card';box.innerHTML='<small>BOOT HILL WARRANT · WAVE 10</small><b>THE UNDERTAKER</b><span>HE BURIED THE TOWN. NOW HE WANTS YOU.</span>';
  document.body.appendChild(box);requestAnimationFrame(function(){box.classList.add('show');});setTimeout(function(){box.classList.add('leave');},1850);setTimeout(function(){if(box.parentNode)box.parentNode.removeChild(box);},2450);pulse(combat,'dw-boss-arrival',900);
}
function waveBeat(d){currentWave=Number(d.wave||currentWave||1);applyRegion();setTimeout(refreshEnemies,20);if(isDustwater()&&d.boss)bossEntrance();}
function onShot(d){if(!isDustwater())return;var hero=$('heroUnit');pulse(hero,d.crit?'dw-hero-crit':'dw-hero-fire',d.crit?300:180);}
function onEnemyDeath(d){if(!isDustwater())return;var combat=$('combat');if(d.boss)pulse(combat,'dw-undertaker-fall',900);else pulse(combat,'dw-kill-beat',150);}
function onHeroHit(){if(isDustwater())pulse($('heroUnit'),'dw-hero-stagger',250);}
function onReload(){if(isDustwater())pulse(q('.launcher-cap'),'dw-cylinder-turn',520);}
function onLoot(d){if(!isDustwater())return;if(d.source==='boss')pulse($('lootModal'),'dw-undertaker-loot',1000);}

function boot(){
  var wave=$('waveBadge'),m=((wave&&wave.textContent)||'').match(/(\d+)/);currentWave=m?Number(m[1]):1;
  applyRegion();refreshEnemies();
  document.addEventListener('ips:waveStart',function(e){waveBeat(e.detail||{});});
  document.addEventListener('ips:shot',function(e){onShot(e.detail||{});});
  document.addEventListener('ips:enemyDeath',function(e){onEnemyDeath(e.detail||{});});
  document.addEventListener('ips:heroHit',onHeroHit);
  document.addEventListener('ips:reloadStart',onReload);
  document.addEventListener('ips:loot',function(e){onLoot(e.detail||{});});
  var lane=$('enemyLane');if(lane&&window.MutationObserver)new MutationObserver(function(){if(isDustwater())refreshEnemies();}).observe(lane,{childList:true,subtree:true});
  window.__ipsDustwaterIdentity={version:'1.14.0',refresh:refreshEnemies,region:function(){return regionForWave(currentWave);}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,30);});else setTimeout(boot,30);
})();
