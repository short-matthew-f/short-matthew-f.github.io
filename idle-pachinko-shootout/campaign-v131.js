(function(){
'use strict';
if(window.__ipsCampaign131)return;
window.__ipsCampaign131=true;

var META_KEY='ips-campaign-v1',CONTRACT_KEY='ips-contracts-v1',COMBAT_KEY='ips-combat-telemetry-v1';
var STAGES=[
  {name:'DUSTWATER GULCH',boss:'THE UNDERTAKER',className:'stage-dustwater'},
  {name:'BOOT HILL MIDNIGHT',boss:'MADAME DEAD-EYE',className:'stage-boothill'},
  {name:'BONE ORCHARD',boss:'BIG HANK',className:'stage-orchard'},
  {name:'CINDER JUNCTION',boss:'SHERIFF NEVERMORE',className:'stage-cinder'},
  {name:'HOLLOW MESA',boss:'THE LAST TRAIN',className:'stage-hollow'}
];
var api=null,currentWave=1,waveStarted=Date.now(),waveDamage=0,reloadCount=0;

function $(id){return document.getElementById(id);}
function read(key,fallback){try{var r=localStorage.getItem(key);return r?JSON.parse(r):fallback;}catch(e){return fallback;}}
function write(key,v){try{localStorage.setItem(key,JSON.stringify(v));}catch(e){}}
function emit(name,detail){try{document.dispatchEvent(new CustomEvent('ips:'+name,{detail:detail||{}}));}catch(e){}}
function meta(){var m=read(META_KEY,{});m.tutorialDone=!!m.tutorialDone;m.stageIntros=m.stageIntros||{};m.stageCaches=m.stageCaches||{};m.guaranteedGear=!!m.guaranteedGear;return m;}
function saveMeta(m){write(META_KEY,m);}
function snapshot(){return api&&api.snapshot?api.snapshot():{};}
function stageIndex(w){return Math.floor((Math.max(1,w)-1)/10)%STAGES.length;}
function showToast(title,text){var box=$('campaignToast');if(!box)return;box.innerHTML='<b>'+title+'</b><span>'+text+'</span>';box.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(function(){box.classList.remove('show');},3600);}

function applyStage(w){
  var combat=$('combat'),s=STAGES[stageIndex(w)],i,sign,r,boss;
  if(!combat)return;
  for(i=0;i<STAGES.length;i++)combat.classList.remove(STAGES[i].className);
  combat.classList.add(s.className);
  sign=document.querySelector('.town-sign');if(sign)sign.textContent=s.name;
  r=$('regionBadge');if(r)r.textContent='REGION '+(stageIndex(w)+1)+' · '+s.name;
  boss=$('bossBadge');if(boss&&w%10===0)boss.textContent='BOSS · '+s.boss;
}
function stageIntro(w){
  if(w%10!==1||w===1)return;
  var idx=stageIndex(w),m=meta(),key=String(idx);
  if(m.stageIntros[key])return;
  m.stageIntros[key]=1;saveMeta(m);
  showToast('NEW REGION',STAGES[idx].name+' · Boss: '+STAGES[idx].boss);
}
function stageCache(w){
  if(w<=1||(w-1)%10!==0)return;
  var cleared=Math.floor((w-1)/10),m=meta(),key=String(cleared),xp,coins;
  if(m.stageCaches[key])return;
  m.stageCaches[key]=1;saveMeta(m);
  xp=75+cleared*55;coins=110+cleared*85;
  if(api)api.grant(xp,coins,'STAGE CACHE');
  showToast('FRONTIER SECURED','Stage '+cleared+' cache: +'+xp+' XP · +'+coins+' coins');
}
function hasGear(s){var k,g=(s&&s.gear)||{};for(k in g)if(g[k])return true;return false;}
function maybeGuaranteeGear(w){
  if(w!==4||!api||!api.triggerLoot)return;
  var m=meta(),s=snapshot();
  if(m.guaranteedGear||hasGear(s))return;
  setTimeout(function(){
    var nowMeta=meta(),nowSnap=snapshot();
    if(nowMeta.guaranteedGear||hasGear(nowSnap))return;
    if(api.triggerLoot('enemy')){nowMeta.guaranteedGear=true;saveMeta(nowMeta);emit('firstGearDrop',{wave:w});}
  },700);
}

function contracts(){
  var c=read(CONTRACT_KEY,null),s,h;
  if(c){c.waves=c.waves||{progress:0,target:6,tier:1};c.reloads=c.reloads||{progress:0,target:10,tier:1};c.boss=c.boss||{progress:0,target:1,tier:1};return c;}
  s=snapshot();h=Number(s.highest||1);
  c={waves:{progress:0,target:6,tier:1},reloads:{progress:0,target:10,tier:1},boss:{progress:0,target:1,tier:1},lastHighest:h};
  write(CONTRACT_KEY,c);return c;
}
function contractReward(type,tier){var s=snapshot(),scale=1+Math.floor(Number(s.highest||1)/10)*.35;if(type==='waves')return{xp:Math.round((45+tier*15)*scale),coins:Math.round((65+tier*20)*scale)};if(type==='reloads')return{xp:Math.round((35+tier*12)*scale),coins:Math.round((55+tier*18)*scale)};return{xp:Math.round((90+tier*30)*scale),coins:Math.round((130+tier*40)*scale)};}
function contractName(type){return type==='waves'?'TRAILBLAZER':type==='reloads'?'KEEP IT HOT':'BOSS HUNTER';}
function contractDesc(type,c){return type==='waves'?'Clear '+c.target+' waves.':type==='reloads'?'Complete '+c.target+' reload cycles.':'Reach '+c.target+' boss loot screen.';}
function contractReady(type,c){return !!(c[type]&&c[type].progress>=c[type].target);}
function emitReady(type,c){var x=c[type];if(!x||x.progress<x.target||x.readyNotified)return;x.readyNotified=true;write(CONTRACT_KEY,c);emit('contractReady',{type:type,name:contractName(type),progress:x.progress,target:x.target});}
function checkReadyContracts(){var c=contracts(),types=['waves','reloads','boss'],i;for(i=0;i<types.length;i++)if(contractReady(types[i],c)){emitReady(types[i],c);break;}}
function addContract(type,n){var c=contracts(),x=c[type],wasReady;if(!x)return;wasReady=x.progress>=x.target;x.progress+=n;write(CONTRACT_KEY,c);if(!wasReady&&x.progress>=x.target)emitReady(type,c);if(document.getElementById('sheetTitle')&&document.getElementById('sheetTitle').textContent==='Bounties')renderBounties();}
function renderBounties(){
  var title=$('sheetTitle'),content=$('sheetContent');if(!title||!content)return;
  var c=contracts(),s=snapshot(),types=['waves','reloads','boss'],h='<div class="balance-card"><span>Repeatable frontier contracts</span><b>Highest Wave '+Number(s.highest||1)+'</b></div><div class="contract-grid">',i,t,x,r,pct,ready,claims;
  for(i=0;i<types.length;i++){
    t=types[i];x=c[t];r=contractReward(t,x.tier);pct=Math.min(100,Math.round(x.progress/x.target*100));ready=x.progress>=x.target;
    h+='<article class="contract-card '+(ready?'ready':'')+'" data-contract="'+t+'"><div class="contract-kicker">TIER '+x.tier+'</div><h3>'+contractName(t)+'</h3><p>'+contractDesc(t,x)+'</p><div class="contract-progress"><i style="width:'+pct+'%"></i></div><small>'+Math.min(x.progress,x.target)+' / '+x.target+'</small><div class="contract-reward">✦ '+r.xp+' · ● '+r.coins+'</div><button data-contract-claim="'+t+'" '+(ready?'':'disabled')+'>'+(ready?'CLAIM CONTRACT':'IN PROGRESS')+'</button></article>';
  }
  h+='</div><div class="info-card"><h3>Campaign</h3><p>Five authored regions · checkpoints every five waves · bosses every ten. Offline patrols never clear bosses or claim contracts.</p></div>';
  title.textContent='Bounties';content.innerHTML=h;
  claims=document.querySelectorAll('[data-contract-claim]');for(i=0;i<claims.length;i++)claims[i].onclick=function(){claimContract(this.getAttribute('data-contract-claim'));};
  emit('bountiesRendered',{});
}
function claimContract(type){
  var c=contracts(),x=c[type],r;if(!x||x.progress<x.target)return;
  r=contractReward(type,x.tier);if(api)api.grant(r.xp,r.coins,'CONTRACT PAID');
  x.progress=0;x.tier++;x.readyNotified=false;
  if(type==='waves')x.target=Math.min(12,6+Math.floor(x.tier/2));
  if(type==='reloads')x.target=Math.min(24,10+x.tier*2);
  if(type==='boss')x.target=1;
  write(CONTRACT_KEY,c);renderBounties();showToast('BOUNTY PAID','+'+r.xp+' XP · +'+r.coins+' coins');emit('contractClaim',{type:type,tier:x.tier-1,reward:r});
}

function recordWave(w){
  var t=read(COMBAT_KEY,{waves:[],totalDamage:0}),duration=Date.now()-waveStarted;
  t.waves.push({wave:w,ms:duration,damage:Math.round(waveDamage),reloads:reloadCount,endedAt:Date.now()});if(t.waves.length>30)t.waves=t.waves.slice(-30);t.totalDamage=Number(t.totalDamage||0)+waveDamage;write(COMBAT_KEY,t);
  waveStarted=Date.now();waveDamage=0;reloadCount=0;
}
function observeDamageFeed(){
  var el=$('damageFeed');if(!el)return;
  new MutationObserver(function(ms){var i,j,n,txt,v;for(i=0;i<ms.length;i++)for(j=0;j<ms[i].addedNodes.length;j++){n=ms[i].addedNodes[j];txt=(n.textContent||'').trim();if(/^\d+$/.test(txt)){v=Number(txt);waveDamage+=v;}}}).observe(el,{childList:true});
}
function enhanceTelemetry(){
  var btn=$('devButton');if(!btn)return;
  btn.addEventListener('click',function(){setTimeout(function(){var root=$('telemetryContent');if(!root||root.querySelector('.combat-telemetry'))return;var t=read(COMBAT_KEY,{waves:[]}),arr=t.waves||[],last=arr.slice(-5),sumD=0,sumMs=0,i,dps,box;for(i=0;i<last.length;i++){sumD+=Number(last[i].damage||0);sumMs+=Number(last[i].ms||0);}dps=sumMs>0?sumD/(sumMs/1000):0;box=document.createElement('div');box.className='telemetry-section combat-telemetry';box.innerHTML='<h3>Observed combat output</h3><p><b>'+dps.toFixed(1)+' damage/sec</b> across the last '+last.length+' completed waves.</p><pre>'+last.map(function(x){return'Wave '+x.wave+' · '+(x.ms/1000).toFixed(1)+'s · '+x.damage+' dmg · '+x.reloads+' reloads';}).join('\n')+'</pre><small>Measurement only. Enemy scaling remains authored.</small>';root.appendChild(box);},40);});
}

function finishIntro(m){var modal=$('tutorialModal');if(modal)modal.classList.add('hidden');m.tutorialDone=true;saveMeta(m);emit('introComplete',{skipped:false});}
function tutorial(){
  var m=meta(),modal=$('tutorialModal'),ret=$('returnModal');
  if(!modal)return;
  if(m.tutorialDone){emit('introComplete',{restored:true});return;}
  if(ret&&!ret.classList.contains('hidden')){setTimeout(tutorial,800);return;}
  var steps=[
    ['THE BOARD IS YOUR GUN','Rounds fall automatically. Every peg can change the shot; the slot at the bottom sets its power.'],
    ['BUILD THE CYLINDER','XP improves the Gunslinger. Bounty Coins improve the board and unlock ammunition. Special rounds and special pegs stack.'],
    ['DEATH IS PROGRESS','Enemies advance during reloads. When they finally put you down, you keep your resources and restart from the latest secured checkpoint.']
  ],i=0;
  function show(){var k=$('tutorialKicker'),t=$('tutorialTitle'),p=$('tutorialText'),n=$('tutorialNext');if(k)k.textContent='QUICK DRAW '+(i+1)+' / '+steps.length;if(t)t.textContent=steps[i][0];if(p)p.textContent=steps[i][1];if(n)n.textContent=i===steps.length-1?'RIDE':'NEXT';}
  modal.classList.remove('hidden');show();
  $('tutorialNext').onclick=function(){i++;if(i>=steps.length)finishIntro(m);else show();};
  $('tutorialSkip').onclick=function(){modal.classList.add('hidden');m.tutorialDone=true;saveMeta(m);emit('introComplete',{skipped:true});};
}

function bindEvents(){
  document.addEventListener('ips:runStart',function(e){var w=Number((e.detail||{}).wave||1);currentWave=w;waveStarted=Date.now();applyStage(w);});
  document.addEventListener('ips:waveStart',function(e){var w=Number((e.detail||{}).wave||1);currentWave=w;waveStarted=Date.now();waveDamage=0;reloadCount=0;applyStage(w);stageCache(w);stageIntro(w);maybeGuaranteeGear(w);});
  document.addEventListener('ips:waveClear',function(e){var w=Number((e.detail||{}).wave||currentWave);recordWave(w);addContract('waves',1);});
  document.addEventListener('ips:reloadStart',function(){reloadCount++;addContract('reloads',1);});
  document.addEventListener('ips:loot',function(e){var d=e.detail||{};if(d.source==='boss')addContract('boss',1);});
  document.addEventListener('ips:menu',function(e){if((e.detail||{}).name==='bounties')setTimeout(renderBounties,0);});
}
function boot(){
  api=window.__ipsAPI;if(!api||!api.snapshot)return false;
  bindEvents();observeDamageFeed();enhanceTelemetry();
  var dbg=window.__ipsDebug&&window.__ipsDebug.state?window.__ipsDebug.state():null,s=snapshot();currentWave=Number((dbg&&dbg.wave)||s.checkpoint||1);applyStage(currentWave);checkReadyContracts();
  setTimeout(tutorial,500);return true;
}
var tries=0,timer=setInterval(function(){tries++;if(boot()||tries>120)clearInterval(timer);},50);
})();
