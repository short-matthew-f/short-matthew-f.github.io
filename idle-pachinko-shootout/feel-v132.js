(function(){
'use strict';
if(window.__ipsFeel132)return;
window.__ipsFeel132=true;

var api=null,lastWallet=null,lastSlot=null,lastShot=null,lastImpactAt=0;
var AMMO_COLORS={standard:'#e1bd73',gold:'#ffd957',fire:'#ff9a3d',concuss:'#ffe39a',shrapnel:'#d8c5a5',poison:'#7bd56a',pierce:'#7de3ed',boom:'#ff7348',chain:'#c89aff'};
var KIND_LABELS={normal:'GUNSHOT',fire:'INCENDIARY',pierce:'PIERCING',boom:'DYNAMITE',chain:'STORM ARC',concuss:'CONCUSSIVE',poison:'POISON CLOUD',shrapnel:'SHRAPNEL'};
var PEG_LABELS={fire:'TREMOR',split:'SPLIT',pierce:'PIERCE',boom:'DYNAMITE',chain:'STORM',pin:'FIRING PIN'};

function $(id){return document.getElementById(id);}
function q(sel,root){return(root||document).querySelector(sel);}
function qa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
function snap(){return api&&api.snapshot?api.snapshot():{};}
function removeLater(el,ms){setTimeout(function(){if(el&&el.parentNode)el.parentNode.removeChild(el);},ms||700);}
function pulse(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(function(){if(el)el.classList.remove(cls);},ms||300);}
function safeClass(v){return String(v||'normal').toLowerCase().replace(/[^a-z0-9_-]/g,'-');}
function colorForAmmo(ammo){return AMMO_COLORS[ammo]||AMMO_COLORS.standard;}
function colorForKind(kind,ammo){return AMMO_COLORS[kind]||colorForAmmo(ammo);}
function makeLayer(root,cls){if(!root)return null;var el=q('.'+cls,root);if(el)return el;el=document.createElement('div');el.className=cls;el.setAttribute('aria-hidden','true');root.appendChild(el);return el;}
function boardLayer(){return makeLayer(q('.board-wrap'),'board-feel-layer');}
function combatLayer(){return makeLayer($('combat'),'combat-feel-layer');}
function localPoint(el,root){if(!el||!root)return null;var a=el.getBoundingClientRect(),b=root.getBoundingClientRect();return{x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};}

function spawnAt(layer,target,cls,text,color,life){if(!layer||!target)return null;var p=localPoint(target,layer.parentNode),d;if(!p)return null;d=document.createElement('i');d.className=cls;d.style.left=p.x+'px';d.style.top=p.y+'px';if(color)d.style.setProperty('--feel-color',color);if(text)d.textContent=text;layer.appendChild(d);removeLater(d,life||700);return d;}
function fixedFloat(target,cls,text){if(!target)return;var r=target.getBoundingClientRect(),d=document.createElement('div');d.className=cls;d.style.left=(r.left+r.width/2)+'px';d.style.top=(r.top+4)+'px';d.textContent=text;document.body.appendChild(d);removeLater(d,900);}
function feelToast(title,text,kind){var host=$('feelToast');if(!host){host=document.createElement('div');host.id='feelToast';host.className='feel-toast';host.setAttribute('aria-live','polite');document.body.appendChild(host);}host.className='feel-toast '+(kind?'feel-toast-'+safeClass(kind):'');host.innerHTML='<b>'+title+'</b>'+(text?'<span>'+text+'</span>':'');pulse(host,'show',1500);}

function walletDelta(){if(!api)return;var s=snap(),next={xp:Number(s.xp||0),coins:Number(s.coins||0)},wallet=q('.wallet'),dx,dc,parts=[];if(!lastWallet){lastWallet=next;return;}dx=Math.round(next.xp-lastWallet.xp);dc=Math.round(next.coins-lastWallet.coins);lastWallet=next;if(dx)parts.push((dx>0?'+':'')+dx+' XP');if(dc)parts.push((dc>0?'+':'')+dc+' ●');if(!parts.length)return;pulse(wallet,'feel-wallet-change',420);fixedFloat(wallet,'feel-wallet-delta '+((dx<0||dc<0)?'spent':'earned'),parts.join(' · '));}
function queueWalletDelta(){setTimeout(walletDelta,0);}

function onLaunch(d){var cap=q('.launcher-cap'),queue=$('bulletQueue'),color=colorForAmmo(d.ammo);if(cap){cap.style.setProperty('--feel-color',color);pulse(cap,'feel-launch',190);}if(queue){queue.style.setProperty('--feel-color',color);pulse(queue,'feel-queue-kick',210);}var layer=boardLayer();if(layer&&cap)spawnAt(layer,cap,'feel-launch-ring','',color,430);}
function onPeg(d){var type=d.type||'normal',idx=d.index,node,layer=boardLayer(),color;if(type==='normal')return;if(type==='pin')idx=4;if(idx===undefined||idx===null)return;node=q('[data-hardware-index="'+idx+'"]');if(!node)return;color=colorForKind(type);node.style.setProperty('--feel-color',color);pulse(node,'feel-peg-hit',260);spawnAt(layer,node,'feel-peg-burst feel-'+safeClass(type),PEG_LABELS[type]||'',color,type==='boom'?780:580);}
function onSlot(d){var slots=qa('.slot-label'),el=slots[Number(d.slot)],layer=boardLayer(),color=colorForAmmo(d.ammo),high=Number(d.value)>=7;lastSlot={value:Number(d.value||0),crit:!!d.crit,ammo:d.ammo};if(!el)return;el.style.setProperty('--feel-color',color);pulse(el,high?'feel-slot-jackpot':'feel-slot-hit',high?520:330);spawnAt(layer,el,'feel-slot-pop '+(high?'high ':'')+(d.crit?'crit':''),'×'+d.value,color,high?780:520);if(high)pulse(q('.board-wrap'),'feel-board-payoff',360);}
function onShot(d){var combat=$('combat'),hero=$('heroUnit'),kind=d.kind||'normal',color=colorForKind(kind,d.ammo),strong=kind!=='normal'||d.crit||(lastSlot&&lastSlot.value>=7);lastShot={kind:kind,crit:!!d.crit,ammo:d.ammo,color:color};if(hero){hero.style.setProperty('--feel-color',color);pulse(hero,'feel-fired',180);}if(combat){combat.style.setProperty('--feel-color',color);pulse(combat,'feel-shot-'+safeClass(kind),kind==='boom'?360:220);}if(strong){var layer=combatLayer(),target=q('.enemy.focused')||q('.enemy');if(target)spawnAt(layer,target,'feel-shot-callout feel-'+safeClass(kind)+(d.crit?' crit':''),d.crit?'CRITICAL':(KIND_LABELS[kind]||'HIT'),color,d.crit?900:650);}}
function onEnemyHit(d){var now=performance.now(),kind=(lastShot&&lastShot.kind)||'normal',crit=!!d.crit,target,layer;if(now-lastImpactAt<32&&!crit)return;lastImpactAt=now;if(kind==='normal'&&!crit)return;target=q('.enemy.focused')||q('.enemy');layer=combatLayer();if(target)spawnAt(layer,target,'feel-impact feel-'+safeClass(kind)+(crit?' crit':''),'',(lastShot&&lastShot.color)||null,360);}
function onEnemyDeath(d){var combat=$('combat'),layer=combatLayer(),target=q('.enemy.focused')||q('.enemy'),boss=!!d.boss;if(combat)pulse(combat,boss?'feel-boss-down':'feel-kill',boss?700:260);if(target&&layer)spawnAt(layer,target,'feel-death-mark'+(boss?' boss':''),boss?'BOSS DOWN':'✦','',boss?1100:540);if(boss)feelToast('BOSS DOWN','Frontier loot incoming.','boss');}
function onHeroHit(d){var combat=$('combat'),layer=combatLayer(),v;if(!combat||!layer)return;pulse(combat,'feel-hero-damaged',260);v=document.createElement('i');v.className='feel-damage-vignette'+((d.mode==='cannon')?' cannon':'');layer.appendChild(v);removeLater(v,420);}
function onWaveClear(d){var badge=$('waveBadge'),layer=combatLayer(),b;if(badge)pulse(badge,'feel-wave-clear',620);if(layer){b=document.createElement('div');b.className='feel-wave-banner';b.innerHTML='<b>WAVE '+Number(d.wave||0)+' CLEARED</b><span>+● '+Number(d.bonus||0)+' clear bounty</span>';layer.appendChild(b);removeLater(b,1050);}queueWalletDelta();}
function upgradeName(d){var key=String(d.key||'').replace(/([A-Z])/g,' $1').replace(/^./,function(c){return c.toUpperCase();});if(d.kind==='hero')return key||'Gunslinger';if(d.kind==='board')return key==='Slot'?'Sharpen Slots':key;if(d.kind==='ammoUnlock')return key+' ammo';if(d.kind==='ammoQty')return key+' round';if(d.kind==='ammoRank')return key+' tuning';return key||'Upgrade';}
function onUpgrade(d){var sheet=$('sheet'),head=q('.sheet-head');if(sheet)pulse(sheet,'feel-sheet-confirm',420);if(head)spawnAt(makeLayer(sheet,'sheet-feel-layer'),head,'feel-upgrade-stamp','UPGRADED','',620);feelToast('UPGRADE LOCKED IN',upgradeName(d),'upgrade');queueWalletDelta();}
function onPegUpgrade(d){feelToast('PEG UPGRADED',(PEG_LABELS[d.type]||'PEG')+' · LV '+d.level,'peg');queueWalletDelta();}
function onLoot(d){var card=q('#lootModal .loot-card'),newCard=$('newLootCard');if(card)pulse(card,'feel-loot-reveal',720);if(newCard){newCard.style.setProperty('--feel-rarity',d.unique?'#fff0a6':'');pulse(newCard,d.unique?'feel-unique-loot':'feel-new-loot',900);}}
function onLootChoice(d){feelToast(d.equip?'GEAR EQUIPPED':'LOOT SOLD',d.equip?'Build updated.':'Bounty coins banked.','loot');queueWalletDelta();}
function onFocus(d){var el=d.id?q('[data-enemy-id="'+d.id+'"]'):null;if(el)pulse(el,'feel-focus-lock',360);}
function onMenu(){var sheet=$('sheet');if(sheet)pulse(sheet,'feel-sheet-open',260);setTimeout(walletDelta,0);}
function onContractClaim(){feelToast('BOUNTY PAID','Contract reward banked.','bounty');queueWalletDelta();}
function onAmmoLoad(d){var qEl=$('bulletQueue');if(qEl){qEl.style.setProperty('--feel-color',colorForAmmo(d.type));pulse(qEl,'feel-ammo-loaded',420);}feelToast('ROUND LOADED',String(d.type||'special').toUpperCase(),'ammo');}
function onRunStart(){feelToast('RIDE OUT','The cylinder is turning.','run');setTimeout(walletDelta,0);}
function campaignToastObserver(){var box=$('campaignToast');if(!box||!window.MutationObserver)return;new MutationObserver(function(){var title=q('b',box),text=title?title.textContent:'';box.classList.toggle('feel-blueprint',/BLUEPRINT|WORKSHOP|PEG FUNDED|BUILD ONLINE/.test(text));}).observe(box,{childList:true});}

function bind(){
  document.addEventListener('ips:ballLaunch',function(e){onLaunch(e.detail||{});});
  document.addEventListener('ips:peg',function(e){onPeg(e.detail||{});});
  document.addEventListener('ips:slot',function(e){onSlot(e.detail||{});});
  document.addEventListener('ips:shot',function(e){onShot(e.detail||{});});
  document.addEventListener('ips:enemyHit',function(e){onEnemyHit(e.detail||{});});
  document.addEventListener('ips:enemyDeath',function(e){onEnemyDeath(e.detail||{});queueWalletDelta();});
  document.addEventListener('ips:heroHit',function(e){onHeroHit(e.detail||{});});
  document.addEventListener('ips:heroDeath',function(){feelToast('THE WEST GOT YOU','Spend what you earned, then ride again.','death');queueWalletDelta();});
  document.addEventListener('ips:waveClear',function(e){onWaveClear(e.detail||{});});
  document.addEventListener('ips:upgrade',function(e){onUpgrade(e.detail||{});});
  document.addEventListener('ips:pegUpgrade',function(e){onPegUpgrade(e.detail||{});});
  document.addEventListener('ips:loot',function(e){onLoot(e.detail||{});});
  document.addEventListener('ips:lootChoice',function(e){onLootChoice(e.detail||{});});
  document.addEventListener('ips:focus',function(e){onFocus(e.detail||{});});
  document.addEventListener('ips:menu',onMenu);
  document.addEventListener('ips:contractClaim',onContractClaim);
  document.addEventListener('ips:ammoLoad',function(e){onAmmoLoad(e.detail||{});});
  document.addEventListener('ips:runStart',onRunStart);
  document.addEventListener('ips:pegSell',queueWalletDelta);
}
function boot(){api=window.__ipsAPI;if(!api||!api.snapshot)return false;lastWallet={xp:Number(snap().xp||0),coins:Number(snap().coins||0)};makeLayer(q('.board-wrap'),'board-feel-layer');makeLayer($('combat'),'combat-feel-layer');bind();campaignToastObserver();window.__ipsFeel={version:'1.13.2',wallet:function(){return lastWallet&&{xp:lastWallet.xp,coins:lastWallet.coins};}};return true;}
var tries=0,timer=setInterval(function(){tries++;if(boot()||tries>120)clearInterval(timer);},50);
})();
