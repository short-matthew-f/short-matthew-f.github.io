(function(){
'use strict';
if(window.__ipsOnboarding131)return;
window.__ipsOnboarding131=true;

var KEY='ips-onboarding-v1',CAMPAIGN_KEY='ips-campaign-v1',BLUEPRINT_KEY='ips-blueprints-v1',CONTRACT_KEY='ips-contracts-v1';
var TABS=['hero','board','ammo','gear','bounties'];
var LOCK_COPY={hero:'Finish the Quick Draw introduction.',board:'Make your first Gunslinger upgrade.',ammo:'Clear Wave 5 to reveal your first blueprint.',gear:'Find your first piece of gear.',bounties:'Complete your first frontier contract.'};
var api=null,state=null,pendingOpen=null;

function $(id){return document.getElementById(id);}
function q(sel,root){return (root||document).querySelector(sel);}
function qa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
function read(key,fallback){try{var r=localStorage.getItem(key);return r?JSON.parse(r):fallback;}catch(e){return fallback;}}
function write(key,v){try{localStorage.setItem(key,JSON.stringify(v));}catch(e){}}
function emit(name,detail){try{document.dispatchEvent(new CustomEvent('ips:'+name,{detail:detail||{}}));}catch(e){}}
function snap(){return api&&api.snapshot?api.snapshot():{};}
function toast(title,text){var b=$('campaignToast');if(!b)return;b.innerHTML='<b>'+title+'</b><span>'+text+'</span>';b.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){b.classList.remove('show');},3400);}
function blankState(){return{version:1,intro:false,migrated:false,unlocked:{hero:false,board:false,ammo:false,gear:false,bounties:false},opened:{},completed:{hero:false,board:false,ammo:false,gear:false,bounties:false},grants:{},waitBoard:false,ammoPhase:'research'};}
function hasGear(s){var g=(s&&s.gear)||{},k;for(k in g)if(g[k])return true;return false;}
function hasNonstandardAmmo(s){var a=(s&&s.ammoUnlock)||{},k;for(k in a)if(k!=='standard'&&Number(a[k]||0)>0)return true;return false;}
function hasProgress(s){var keys=['power','reload','mag','crit','hp','armor','regen','regenKill','slot','fire','split','pierce','boom','chain'],i;if(Number(s.highest||1)>1||Number(s.checkpoint||1)>1||hasGear(s)||hasNonstandardAmmo(s))return true;for(i=0;i<keys.length;i++)if(Number(s[keys[i]]||0)>0)return true;return false;}
function normalize(v){var b=blankState(),k;if(!v)return b;for(k in v)b[k]=v[k];b.unlocked=Object.assign(blankState().unlocked,v.unlocked||{});b.opened=v.opened||{};b.completed=Object.assign(blankState().completed,v.completed||{});b.grants=v.grants||{};return b;}
function loadState(){
  var raw=read(KEY,null),s=snap(),c=read(CAMPAIGN_KEY,{}),v;
  if(raw)return normalize(raw);
  v=blankState();
  if(hasProgress(s)){
    v.migrated=true;v.intro=true;
    TABS.forEach(function(t){v.unlocked[t]=true;v.completed[t]=true;});
    write(KEY,v);return v;
  }
  if(c.tutorialDone)v.intro=true;
  if(Number(s.power||0)+Number(s.reload||0)+Number(s.mag||0)+Number(s.crit||0)+Number(s.hp||0)+Number(s.armor||0)+Number(s.regen||0)+Number(s.regenKill||0)>0){v.unlocked.hero=true;v.completed.hero=true;}
  if(Number(s.slot||0)>0){v.unlocked.board=true;v.completed.board=true;}
  if(hasGear(s)){v.unlocked.gear=true;v.completed.gear=true;}
  if(hasNonstandardAmmo(s)){v.unlocked.ammo=true;v.completed.ammo=true;v.ammoPhase='done';}
  write(KEY,v);return v;
}
function save(){write(KEY,state);updateTabs();}
function button(tab){return q('.dock [data-sheet="'+tab+'"]');}
function updateTabs(){
  TABS.forEach(function(tab){var b=button(tab),locked=!state.unlocked[tab],isNew=state.unlocked[tab]&&!state.opened[tab];if(!b)return;b.classList.toggle('ips-locked',locked);b.classList.toggle('ips-new',isNew);b.classList.toggle('ips-guided',state.unlocked[tab]&&!state.completed[tab]);b.setAttribute('aria-disabled',locked?'true':'false');b.setAttribute('aria-label',locked?tab+' locked. '+LOCK_COPY[tab]:tab+(isNew?' new':''));if(locked)b.setAttribute('data-lock-copy',LOCK_COPY[tab]);else b.removeAttribute('data-lock-copy');});
}
function modalVisible(id){var el=$(id);return !!(el&&!el.classList.contains('hidden'));}
function blocked(){return modalVisible('tutorialModal')||modalVisible('lootModal')||modalVisible('returnModal')||modalVisible('resetConfirmModal');}
function safeOpen(tab,delay){pendingOpen=tab;setTimeout(function tryOpen(){if(!pendingOpen||pendingOpen!==tab)return;if(blocked()){setTimeout(tryOpen,250);return;}pendingOpen=null;if(api&&api.openSheet)api.openSheet(tab);},delay||450);}
function unlock(tab,message,autoOpen){if(state.unlocked[tab]){if(autoOpen&&!state.completed[tab])safeOpen(tab,250);return;}state.unlocked[tab]=true;state.opened[tab]=false;save();toast((tab==='hero'?'GUNSLINGER':tab.toUpperCase())+' UNLOCKED',message||'A new frontier system is ready.');emit('onboardingUnlock',{tab:tab});if(autoOpen)safeOpen(tab,650);}
function complete(tab,message){if(state.completed[tab])return;state.completed[tab]=true;save();if(message)toast('LESSON COMPLETE',message);emit('onboardingComplete',{tab:tab});}
function grantOnce(key,targetXp,targetCoins,label){
  if(state.grants[key])return false;
  var s=snap(),xp=Math.max(0,Number(targetXp||0)-Number(s.xp||0)),coins=Math.max(0,Number(targetCoins||0)-Number(s.coins||0));
  state.grants[key]={xp:xp,coins:coins,at:Date.now()};write(KEY,state);
  if((xp||coins)&&api&&api.grant){api.grant(xp,coins,label||'TRAIL LESSON');return true;}
  return false;
}
function clearDecorations(){qa('.ips-tutorial-target').forEach(function(el){el.classList.remove('ips-tutorial-target');});qa('.ips-tutorial-muted').forEach(function(el){el.classList.remove('ips-tutorial-muted');if(el.hasAttribute('data-ips-was-disabled')){el.disabled=el.getAttribute('data-ips-was-disabled')==='1';el.removeAttribute('data-ips-was-disabled');}});qa('.ips-tutorial-note').forEach(function(el){el.remove();});var sell=$('sellNew');if(sell&&sell.hasAttribute('data-ips-was-disabled')){sell.disabled=sell.getAttribute('data-ips-was-disabled')==='1';sell.removeAttribute('data-ips-was-disabled');}}
function note(target,title,text){if(!target)return;var card=target.closest('article')||target.parentNode,n=document.createElement('div');target.classList.add('ips-tutorial-target');n.className='ips-tutorial-note';n.innerHTML='<b>'+title+'</b><span>'+text+'</span>';if(card)card.insertBefore(n,card.firstChild);}
function muteOthers(selector,target){qa(selector,$('sheetContent')).forEach(function(el){if(el===target)return;el.classList.add('ips-tutorial-muted');if('disabled' in el){el.setAttribute('data-ips-was-disabled',el.disabled?'1':'0');el.disabled=true;}});}
function blueprintBought(){var b=read(BLUEPRINT_KEY,{});return !!(b.bought&&b.bought.fire);}
function readyContract(){var c=read(CONTRACT_KEY,{}),types=['waves','reloads','boss'],i,x;for(i=0;i<types.length;i++){x=c[types[i]];if(x&&Number(x.progress||0)>=Number(x.target||Infinity))return types[i];}return null;}

function decorate(tab){
  clearDecorations();if(state.completed[tab])return;
  var content=$('sheetContent'),target,s=snap(),card;
  if(!content)return;
  if(tab==='hero'){
    if(grantOnce('heroXp',40,0,'FIRST GUNSLINGER LESSON')){api.openSheet('hero');return;}
    target=q('[data-hero="power"]',content);muteOthers('[data-hero]',target);note(target,'START HERE','Buy High Caliber. XP permanently strengthens the Gunslinger.');
  }else if(tab==='board'){
    if(grantOnce('boardCoins',0,50,'FIRST BOARD LESSON')){api.openSheet('board');return;}
    target=q('[data-board="slot"]',content);muteOthers('[data-board]',target);note(target,'TUNE THE MACHINE','Buy Sharpen Slots. Bounty Coins improve the board that creates every shot.');
  }else if(tab==='gear'){
    card=q('.gear-slot:not(.empty)',content);if(card){card.classList.add('ips-tutorial-target','ips-gear-inspect');card.setAttribute('role','button');card.setAttribute('tabindex','0');note(card,'YOUR FIRST GEAR','Tap this item once. Gear stays with you between runs and shapes your build.');var inspect=function(){complete('gear','Gear is now available whenever you want to inspect your build.');clearDecorations();};card.onclick=inspect;card.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect();}};}
  }else if(tab==='ammo'){
    if(!blueprintBought()){
      state.ammoPhase='research';if(grantOnce('ammoResearch',0,250,'FIRST BLUEPRINT LESSON')){api.openSheet('ammo');return;}
      target=q('[data-blueprint-buy="fire"]',content);note(target,'RESEARCH FIRST','Research Incendiary Works. Blueprints reveal new build tools before you buy the actual hardware or rounds.');
    }else if(!((s.ammoUnlock||{}).fire)){
      state.ammoPhase='purchase';if(grantOnce('ammoPurchase',0,150,'FIRST AMMO LESSON')){api.openSheet('ammo');return;}
      target=q('[data-ammo-unlock="fire"]',content);note(target,'LOAD SOMETHING NEW','Unlock your first Incendiary round. Its property enters the board before any peg modifies it.');
    }else{state.ammoPhase='done';complete('ammo','Special ammunition is unlocked. Watch the cylinder and ball color to see it enter play.');}
    write(KEY,state);
  }else if(tab==='bounties'){
    target=q('[data-contract-claim]:not([disabled])',content);note(target,'COLLECT THE BOUNTY','Claim the contract you completed through normal play.');
  }
}

function guideFirstLoot(){
  if(state.completed.gear||state.unlocked.gear||hasGear(snap()))return;
  var equip=$('equipNew'),sell=$('sellNew'),card=equip&&equip.closest('.loot-card');if(!equip||!card)return;
  clearDecorations();
  equip.classList.add('ips-tutorial-target');
  if(sell){sell.setAttribute('data-ips-was-disabled',sell.disabled?'1':'0');sell.disabled=true;sell.classList.add('ips-tutorial-muted');}
  var n=document.createElement('div');n.className='ips-tutorial-note';n.innerHTML='<b>FIRST FIND</b><span>Equip this one. Your first piece of gear will unlock the Gear tab so you can see how persistent equipment shapes the build.</span>';card.insertBefore(n,card.querySelector('.loot-actions'));
}
function guardDeathShortcut(id,tab){var el=$(id);if(!el)return;el.addEventListener('click',function(e){if(state&&!state.unlocked[tab]){e.preventDefault();e.stopImmediatePropagation();toast('LOCKED',LOCK_COPY[tab]);}},true);}

function startHero(){state.intro=true;unlock('hero','Spend XP on one permanent Gunslinger upgrade.',true);}
function maybeBoardBeat(){if(state.waitBoard&&!state.completed.board){state.waitBoard=false;unlock('board','Now change the pachinko machine itself.',true);save();}}
function maybeAmmoUnlock(w){var s=snap();if(state.completed.ammo||state.unlocked.ammo)return;if(Number(w||0)>=5||Number(s.highest||1)>5)unlock('ammo','Your first ammunition blueprint is ready to research.',true);}
function maybeGearUnlock(){if(state.completed.gear||state.unlocked.gear)return;if(hasGear(snap()))unlock('gear','You found something worth keeping. See where it lives.',true);}
function maybeBountyUnlock(){if(state.completed.bounties||state.unlocked.bounties)return;if(readyContract())unlock('bounties','One of your frontier contracts is ready to pay.',true);}

function bind(){
  var dock=q('.dock');if(dock)dock.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('[data-sheet]'):null,tab;if(!b)return;tab=b.getAttribute('data-sheet');if(state&&!state.unlocked[tab]){e.preventDefault();e.stopImmediatePropagation();toast('LOCKED',LOCK_COPY[tab]);}},true);
  document.addEventListener('ips:introComplete',function(){startHero();});
  document.addEventListener('ips:menu',function(e){var tab=(e.detail||{}).name;if(TABS.indexOf(tab)<0)return;state.opened[tab]=true;save();setTimeout(function(){decorate(tab);},0);});
  document.addEventListener('ips:upgrade',function(e){var d=e.detail||{};if(d.kind==='hero'&&d.key==='power'&&!state.completed.hero){complete('hero','XP buys permanent Gunslinger power.');state.waitBoard=true;save();}if(d.kind==='board'&&d.key==='slot'&&!state.completed.board)complete('board','Board upgrades change every future shot.');if(d.kind==='ammoUnlock'&&d.key==='fire'&&!state.completed.ammo){state.ammoPhase='done';complete('ammo','Your cylinder can now carry specialty ammunition.');}});
  ['ips:reloadStart','ips:waveClear','ips:heroDeath'].forEach(function(name){document.addEventListener(name,maybeBoardBeat);});
  document.addEventListener('ips:waveClear',function(e){maybeAmmoUnlock(Number((e.detail||{}).wave||0));});
  document.addEventListener('ips:waveStart',function(){maybeGearUnlock();maybeAmmoUnlock(0);maybeBountyUnlock();});
  document.addEventListener('ips:loot',function(){setTimeout(guideFirstLoot,0);});
  document.addEventListener('ips:lootChoice',function(){clearDecorations();setTimeout(maybeGearUnlock,50);});
  document.addEventListener('ips:contractReady',function(){maybeBountyUnlock();});
  document.addEventListener('ips:contractClaim',function(){if(!state.completed.bounties)complete('bounties','Bounties turn normal play into extra progression rewards.');});
  document.addEventListener('ips:bountiesRendered',function(){if(!state.completed.bounties)decorate('bounties');});
  guardDeathShortcut('deathBoard','board');guardDeathShortcut('deathAmmo','ammo');
}
function boot(){
  api=window.__ipsAPI;if(!api||!api.snapshot)return false;
  state=loadState();bind();updateTabs();
  if(state.migrated)return true;
  if(state.intro&&!state.unlocked.hero)startHero();
  if(state.unlocked.hero&&!state.completed.hero)safeOpen('hero',700);
  maybeGearUnlock();maybeAmmoUnlock(0);maybeBountyUnlock();return true;
}
var tries=0,timer=setInterval(function(){tries++;if(boot()||tries>120)clearInterval(timer);},50);
})();
