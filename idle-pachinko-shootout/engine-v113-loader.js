(function(){
'use strict';
var VERSION='1.11.3';
function fail(msg){
  var b=document.getElementById('bootError');
  if(b){b.className='boot-error';b.textContent='Game v'+VERSION+' startup error: '+msg;}
  throw new Error(msg);
}
function replaceFunction(src,name,code){
  var needle='function '+name+'(',start=src.indexOf(needle),brace,i,ch,quote=null,esc=false,depth=0;
  if(start<0)fail('patch target missing: '+name);
  brace=src.indexOf('{',start);
  if(brace<0)fail('patch brace missing: '+name);
  for(i=brace;i<src.length;i++){
    ch=src[i];
    if(quote){
      if(esc){esc=false;continue;}
      if(ch==='\\'){esc=true;continue;}
      if(ch===quote)quote=null;
      continue;
    }
    if(ch==='\''||ch==='"'){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0)return src.slice(0,start)+code+src.slice(i+1);
    }
  }
  fail('patch function did not close: '+name);
}
function mustReplace(src,oldText,newText,label){
  if(src.indexOf(oldText)<0)fail('patch target missing: '+label);
  return src.replace(oldText,newText);
}
function patch(src){
  src=mustReplace(src,
    "var defaults={xp:0,coins:0,checkpoint:1,highest:1,power:0,reload:0,mag:0,crit:0,hp:0,slot:0,",
    "var defaults={xp:0,coins:0,checkpoint:1,highest:1,power:0,reload:0,mag:0,crit:0,hp:0,armor:0,regen:0,regenKill:0,slot:0,pegMeta:{fire:{},split:{},pierce:{},boom:{},chain:{}},",
    'hero sustain and peg metadata defaults');

  src=replaceFunction(src,'stats',"function stats(){var g=gearBonuses();return{maxHp:100+save.hp*15+Math.round(g.hp),power:7*Math.pow(1.09,save.power)*(1+g.power),reload:Math.max(1800,6200*Math.pow(.92,save.reload)*(1-g.reload)),mag:5+save.mag,crit:Math.min(.65,.06+save.crit*.02+g.crit),slot:Math.pow(1.08,save.slot)*(1+g.slot),armor:Number(save.armor||0)*10,regenPct:Number(save.regen||0)*.01,regenKill:Number(save.regenKill||0)*2};}");

  src=replaceFunction(src,'newGame',"function newGame(){var a=stats();syncCylinder();G={wave:save.checkpoint,hp:a.maxHp,max:a.maxHp,armor:a.armor,armorMax:a.armor,nextRegen:performance.now()+5000,enemies:[],state:'fire',mag:a.mag,launched:0,resolved:0,next:performance.now()+400,rs:0,re:0,kills:0,runXp:0,runCoins:0,focusId:null,lastCompletedWave:0,emptySince:0,clouds:[]};B=[];buildPegs();syncPegMeta();spawnWave();$('deathModal').classList.add('hidden');$('lootModal').classList.add('hidden');pendingLoot=null;emit('runStart',{wave:G.wave,armor:G.armor,armorMax:G.armorMax});}");

  src=replaceFunction(src,'spawnWave',"function spawnWave(){var n=G.wave%10===0?1:(G.wave<3?1:(G.wave<6?2:3)),i,a=stats();G.enemies=[];G.clouds=[];clearPoisonCloudFx();for(i=0;i<n;i++)G.enemies.push(makeEnemy(G.wave,i,n));G.state='fire';G.focusId=null;G.armor=a.armor;G.armorMax=a.armor;G.nextRegen=performance.now()+5000;syncCylinder();G.mag=a.mag;G.launched=0;G.resolved=0;G.next=performance.now()+450;G.emptySince=0;renderEnemies();hud();queue();emit('waveStart',{wave:G.wave,boss:G.wave%10===0,armor:G.armor,armorMax:G.armorMax});}");

  var pegHelpers="function pegBase(type){return{fire:90,split:120,pierce:150,boom:190,chain:240}[type]||100;}function pegLabel(type){return{fire:'Fire Peg',split:'Splitter Peg',pierce:'Piercing Peg',boom:'Dynamite Peg',chain:'Storm Peg'}[type]||'Peg';}function ensurePegStores(){var types=['fire','split','pierce','boom','chain'],i,t;if(!save.pegMeta)save.pegMeta={};for(i=0;i<types.length;i++){t=types[i];if(!save.pegMeta[t]||typeof save.pegMeta[t]!=='object')save.pegMeta[t]={};}}function pegMetaEntry(type,index,seedCost){ensurePegStores();var key=String(index),m=save.pegMeta[type][key],arr=save.placements[type]||[],order=Math.max(0,arr.indexOf(index));if(!m){m={level:0,invested:Number(seedCost||cost(pegBase(type),order,1.7))};save.pegMeta[type][key]=m;}if(typeof m.level!=='number')m.level=0;if(typeof m.invested!=='number')m.invested=Number(seedCost||cost(pegBase(type),order,1.7));return m;}function syncPegMeta(){ensurePegStores();var types=['fire','split','pierce','boom','chain'],i,j,t,arr,keep,key;for(i=0;i<types.length;i++){t=types[i];arr=save.placements[t]||[];keep={};for(j=0;j<arr.length;j++){key=String(arr[j]);keep[key]=1;pegMetaEntry(t,arr[j]);}for(key in save.pegMeta[t])if(!keep[key])delete save.pegMeta[t][key];}}function pegLevel(type,index){return Math.max(0,Math.min(3,Number(pegMetaEntry(type,index).level||0)));}function pegUpgradeCost(type,index){var m=pegMetaEntry(type,index);if(Number(m.level||0)>=3)return 0;return Math.round(pegBase(type)*1.15*Math.pow(1.7,Number(m.level||0)));}function pegEffectText(type,level){level=Math.max(0,Math.min(3,Number(level||0)));if(type==='fire')return'Burn tick damage '+(100+level*20)+'%';if(type==='split'){var factors=[60,52,44,36];return(2+level)+' balls · '+factors[level]+'% each';}if(type==='pierce')return'Pierce retention '+(65+level*8)+'%';if(type==='boom')return'Splash '+(50+level*10)+'% / '+(25+level*5)+'%';if(type==='chain')return'First jump '+(55+level*8)+'% · retention '+(62+level*6)+'%';return'';}function pegManageInfo(type,index){var arr=save.placements[type]||[];if(arr.indexOf(index)<0)return null;var m=pegMetaEntry(type,index),level=pegLevel(type,index),up=pegUpgradeCost(type,index);return{type:type,index:index,name:pegLabel(type),level:level,maxLevel:3,upgradeCost:up,invested:Math.round(Number(m.invested||0)),sellValue:Math.floor(Number(m.invested||0)*.5),effect:pegEffectText(type,level),nextEffect:level<3?pegEffectText(type,level+1):'MAX LEVEL'};}function upgradePeg(type,index){var info=pegManageInfo(type,index),m,n;if(!info||info.level>=3)return{ok:false,reason:'max'};n=info.upgradeCost;if(Number(save.coins||0)<n)return{ok:false,reason:'coins',need:n-Number(save.coins||0)};m=pegMetaEntry(type,index);save.coins-=n;m.level=Number(m.level||0)+1;m.invested=Number(m.invested||0)+n;persist();emit('pegUpgrade',{type:type,index:index,level:m.level,cost:n});return{ok:true,info:pegManageInfo(type,index)};}function pegOccupied(index,exceptType,exceptIndex){var types=['fire','split','pierce','boom','chain'],i,t,arr;for(i=0;i<types.length;i++){t=types[i];arr=save.placements[t]||[];if(t===exceptType&&Number(exceptIndex)===Number(index))continue;if(arr.indexOf(index)>=0)return true;}return false;}function movePegManaged(type,fromIndex,toIndex){var arr=save.placements[type]||[],pos=arr.indexOf(fromIndex),m;if(pos<0)return{ok:false,reason:'missing'};if(fromIndex===toIndex)return{ok:true,info:pegManageInfo(type,fromIndex)};if(toIndex<0||toIndex>=P.length)return{ok:false,reason:'range'};if(pegOccupied(toIndex,type,fromIndex))return{ok:false,reason:'occupied'};m=pegMetaEntry(type,fromIndex);arr[pos]=toIndex;delete save.pegMeta[type][String(fromIndex)];save.pegMeta[type][String(toIndex)]=m;buildPegs();persist();emit('pegMove',{type:type,from:fromIndex,to:toIndex});return{ok:true,info:pegManageInfo(type,toIndex)};}function sellPegManaged(type,index){var arr=save.placements[type]||[],pos=arr.indexOf(index),info;if(pos<0)return{ok:false,reason:'missing'};info=pegManageInfo(type,index);arr.splice(pos,1);if(save.pegMeta&&save.pegMeta[type])delete save.pegMeta[type][String(index)];save[type]=Math.max(0,Number(save[type]||0)-1);save.coins+=info.sellValue;buildPegs();syncPegMeta();persist();emit('pegSell',{type:type,index:index,value:info.sellValue});return{ok:true,value:info.sellValue};}"
  var placementNeedle='function placementUsed(type)';
  if(src.indexOf(placementNeedle)<0)fail('patch target missing: peg helpers');
  src=src.replace(placementNeedle,pegHelpers+placementNeedle);

  src=replaceFunction(src,'launch',"function launch(src,type){if(B.length>40)return;var a=stats(),ammo=src?src.ammo:(type||'standard'),b={x:src?src.x:C.width/2+rnd(-12,12),y:src?src.y:24,vx:src?-src.vx:rnd(-22,22),vy:src?-90:rnd(8,28),r:5.5,tags:src?src.tags.slice():[],mult:src?src.mult*.6:ammoMult(ammo),depth:src?src.depth+1:0,hit:{},life:18,done:false,p:a.power,ammo:ammo,trail:[],pegHits:src?Number(src.pegHits||0):0,firePegHits:src?Number(src.firePegHits||0):0,fireUpgrade:src?Number(src.fireUpgrade||0):0,pierceLevel:src?Number(src.pierceLevel||0):0,boomLevel:src?Number(src.boomLevel||0):0,chainLevel:src?Number(src.chainLevel||0):0};if(!src)tag(b,(AMMO[ammo]||AMMO.standard).tag);B.push(b);if(!src)emit('ballLaunch',{ammo:ammo});}");

  src=replaceFunction(src,'pegEffect',"function pegEffect(b,p,index){var c,q,level=pegLevel(p.t,index),copies,factor,baseMult;if(p.t==='n'){emit('peg',{type:'normal'});return;}addBoardFx(p.x,p.y,p.t);emit('peg',{type:p.t,index:index,level:level});if(p.t==='fire'){tag(b,'fire');b.firePegHits=Number(b.firePegHits||0)+1;b.fireUpgrade=Number(b.fireUpgrade||0)+level;}if(p.t==='pierce'){tag(b,'pierce');b.pierceLevel=Math.max(Number(b.pierceLevel||0),level);}if(p.t==='boom'){tag(b,'boom');b.boomLevel=Math.max(Number(b.boomLevel||0),level);}if(p.t==='chain'){tag(b,'chain');b.chainLevel=Math.max(Number(b.chainLevel||0),level);}if(p.t==='split'&&b.depth<2&&!has(b.tags,'split-lock')){tag(b,'split-lock');copies=1+level;factor=[.60,.52,.44,.36][level]||.36;baseMult=b.mult;b.mult=baseMult*factor;b.vx=-Math.abs(b.vx||55)-55;b.depth++;for(q=0;q<copies&&B.length<40;q++){c={x:b.x+(q+1),y:b.y,vx:Math.abs(b.vx||55)+55+q*24,vy:b.vy-(q%2)*18,r:b.r,tags:b.tags.slice(),mult:baseMult*factor,depth:b.depth,hit:{},life:b.life,done:false,p:b.p,ammo:b.ammo,trail:[],pegHits:Number(b.pegHits||0),firePegHits:Number(b.firePegHits||0),fireUpgrade:Number(b.fireUpgrade||0),pierceLevel:Number(b.pierceLevel||0),boomLevel:Number(b.boomLevel||0),chainLevel:Number(b.chainLevel||0)};if(q%2)c.vx*=-1;B.push(c);}}}");

  src=mustReplace(src,'pegEffect(b,p);','pegEffect(b,p,j);','peg effect index');

  src=replaceFunction(src,'resolveBall',"function resolveBall(b){if(b.done)return;b.done=true;var slot=clamp(Math.floor(b.x/(C.width/9)),0,8),v=SLOTS[slot],d=b.p*v*b.mult*stats().slot,crit=Math.random()<stats().crit,mods={fireUpgrade:Number(b.fireUpgrade||0),pierceLevel:Number(b.pierceLevel||0),boomLevel:Number(b.boomLevel||0),chainLevel:Number(b.chainLevel||0)};if(crit)d*=2;emit('slot',{slot:slot,value:v,crit:crit,ammo:b.ammo});shoot(d,b.tags,crit,b.ammo,Number(b.pegHits||0),Number(b.firePegHits||0),mods);G.resolved++;queue();}");

  src=replaceFunction(src,'applyBurn',"function applyBurn(e,damage,ticks,scale){var fx=ensureEffects(e),now=performance.now();fx.burns.push({ticks:Math.max(1,Number(ticks||3)),next:now+650,damage:damage*.13*Math.max(1,Number(scale||1))});e.burned=true;}");

  src=replaceFunction(src,'hit',"function hit(e,d,crit,gold,label,tags,burnTicks,burnScale){if(!e||e.hp<=0)return;tags=tags||[];var before=e.hp,mod=1,note=label||'',absorbed,remaining,statusDamage;if((e.kind==='ghost'||e.bossType==='nevermore')&&!hasSpecial(tags)){mod*=e.bossType==='nevermore'?.5:.55;if(!note)note='PHASED';}if((e.kind==='ghost'||e.bossType==='nevermore')&&has(tags,'chain')){mod*=e.bossType==='nevermore'?1.45:1.35;note='ARC WEAK';}if((e.kind==='troll'||e.bossType==='hank')&&has(tags,'fire')){mod*=e.bossType==='hank'?1.35:1.25;e.burned=true;note='SEARED';}if(has(tags,'fire'))e.burned=true;if(e.affix==='armored'&&!has(tags,'boom')){mod*=.78;if(!note)note='PLATED';}if(e.bossType==='train'){if(has(tags,'boom')){mod*=1.45;note='BREACH';}else{mod*=.68;if(!note)note='BLACK IRON';}}flashEnemy(e.id);d*=mod;if(e.shield>0){if(has(tags,'boom')||(e.bossType==='nevermore'&&has(tags,'chain')))d*=1.5;absorbed=Math.min(e.shield,d);e.shield-=absorbed;remaining=d-absorbed;pop(Math.round(absorbed),crit,'WARD');if(remaining<=0){renderEnemies();return;}d=remaining;}statusDamage=d;e.hp-=d;if(e.hp>0&&has(tags,'fire')&&!has(tags,'status'))applyBurn(e,statusDamage,burnTicks,burnScale);if(e.hp>0&&has(tags,'concuss')&&!has(tags,'status'))applyConcussion(e);pop(Math.round(d),crit,note);emit('enemyHit',{damage:d,crit:crit,label:note,kind:e.kind});if(e.bossType==='undertaker'&&!e.frenzy&&e.hp>0&&e.hp<=e.max*.5){e.frenzy=true;e.dmg*=1.25;pop('UNDERTAKER ENRAGED',false,'PHASE');}if(e.bossType==='hank'&&!e.frenzy&&e.hp>0&&e.hp<=e.max*.45){e.frenzy=true;e.dmg*=1.3;pop('HANK GOES WILD',false,'PHASE');}if(before>0&&e.hp<=0){if(e.kind==='zombie'&&!e.revived&&!has(tags,'fire')){e.revived=true;e.hp=e.max*.22;pop('BACK FROM DUST',false,'DEATHLESS');renderEnemies();return;}if(e.affix==='gravebound'&&!e.revived&&!has(tags,'fire')){e.revived=true;e.hp=e.max*.32;pop('GRAVEBOUND RISES',false,'AFFIX');renderEnemies();return;}rewardKill(e,gold);}renderEnemies();if(!living().length)setTimeout(doneWave,360);}");

  src=replaceFunction(src,'shoot',"function shoot(raw,tags,crit,ammo,pegHits,firePegHits,mods){var a=combatTargets(),i,x,primary=raw,kind='normal',shrapnelBonus=1,fireTicks=3,fireScale=1,ret=.65,splashA=.5,splashB=.25,firstJump=.55,jumpRet=.62;mods=mods||{};if(!a.length)return;if(has(tags,'shrapnel')){shrapnelBonus=1+.10*Math.max(0,Number(pegHits||0));raw*=shrapnelBonus;primary=raw;kind='shrapnel';if(pegHits)pop('+'+Math.round((shrapnelBonus-1)*100)+'% SHRAPNEL',false,pegHits+' PEGS');}if(has(tags,'concuss'))kind='concuss';if(has(tags,'poison'))kind='poison';if(has(tags,'chain')){primary*=.78;kind='chain';firstJump=Math.min(.9,.55+.08*Number(mods.chainLevel||0));jumpRet=Math.min(.9,.62+.06*Number(mods.chainLevel||0));}if(has(tags,'fire')){primary*=.72;kind='fire';fireTicks=3+Math.max(0,Number(firePegHits||0)-(ammo==='fire'?0:1));fireScale=1+.20*Number(mods.fireUpgrade||0);}if(has(tags,'boom')){kind='boom';splashA=Math.min(.9,.5+.10*Number(mods.boomLevel||0));splashB=Math.min(.65,.25+.05*Number(mods.boomLevel||0));}if(has(tags,'pierce')){kind='pierce';ret=Math.min(.9,.65+.08*Number(mods.pierceLevel||0));}lineFx(a[0].id,kind,crit);emit('shot',{kind:kind,crit:crit,ammo:ammo,pegHits:pegHits||0,firePegHits:firePegHits||0,burnTicks:fireTicks,pegMods:mods});if(has(tags,'poison'))createPoisonCloud(a[0],raw);hit(a[0],primary,crit,has(tags,'gold'),'',tags,fireTicks,fireScale);if(has(tags,'pierce')){x=raw*ret;for(i=1;i<Math.min(4,a.length);i++){hit(a[i],x,false,false,'PIERCE',tags,fireTicks,fireScale);x*=ret;}}if(has(tags,'boom'))for(i=1;i<Math.min(3,a.length);i++)hit(a[i],raw*(i===1?splashA:splashB),false,false,'BOOM',tags,fireTicks,fireScale);if(has(tags,'chain')){x=raw*firstJump;for(i=1;i<Math.min(4,a.length);i++){hit(a[i],x,false,false,'CHAIN',tags,fireTicks,fireScale);x*=jumpRet;}}if(has(tags,'fire')&&has(tags,'boom'))pop('INCENDIARY BLAST',false,'COMBO');if(has(tags,'pierce')&&has(tags,'chain'))pop('RAIL ARC',false,'COMBO');}");

  src=replaceFunction(src,'rewardKill',"function rewardKill(e,gold){deathFx(e.id);var gb=gearBonuses(),x=Math.round(e.reward*.75),c=Math.round(e.reward*(gold?2:1)*(1+gb.coin)),heal=Math.max(0,Number(save.regenKill||0)*2);save.xp+=x;save.coins+=c;G.runXp+=x;G.runCoins+=c;G.kills++;if(heal&&G.hp>0){G.hp=Math.min(G.max,G.hp+heal);emit('heroHeal',{amount:heal,source:'kill',hp:G.hp,max:G.max});}persist();emit('enemyDeath',{kind:e.kind,boss:e.boss,gold:gold});if(gold)pop('2× BOUNTY',false,'GOLD');}");

  var helpers="function updateHeroRegen(now){if(!G||G.state==='dead'||!Number(save.regen||0))return;if(!G.nextRegen)G.nextRegen=now+5000;while(now>=G.nextRegen){var heal=100*.01*Number(save.regen||0);if(G.hp>0&&G.hp<G.max){G.hp=Math.min(G.max,G.hp+heal);emit('heroHeal',{amount:heal,source:'regen',hp:G.hp,max:G.max});}G.nextRegen+=5000;}}function heroTakeDamage(raw,label,mode){if(!G||G.state==='dead')return;var taken=Math.max(0,raw*(1-gearBonuses().dr)),absorbed=Math.min(Number(G.armor||0),taken),hpDamage=taken-absorbed;if(absorbed>0)G.armor=Math.max(0,G.armor-absorbed);G.hp-=hpDamage;emit('heroHit',{damage:hpDamage,rawDamage:taken,armorAbsorbed:absorbed,armor:G.armor,armorMax:G.armorMax,mode:mode});if(hpDamage>0)pop('-'+Math.round(hpDamage)+' HP',false,label);else if(absorbed>0)pop('BLOCK '+Math.round(absorbed),false,'ARMOR');killHero();}"
  var killNeedle='function killHero(';
  if(src.indexOf(killNeedle)<0)fail('patch target missing: hero damage helpers');
  src=src.replace(killNeedle,helpers+killNeedle);

  src=replaceFunction(src,'enemyHitHero',"function enemyHitHero(e,mult,label,mode){if(!e||e.hp<=0||G.state==='dead')return;enemyAttackFx(e,mode);heroTakeDamage(e.dmg*mult,label,mode);}");

  src=replaceFunction(src,'bossReload',"function bossReload(){var a=living(),i,e,healed;for(i=0;i<a.length;i++){e=a[i];if(e.bossType==='deadeye'&&e.hp>0){e.toll++;if(e.toll%2===0&&e.summonCount<3&&living().length<3){G.enemies.push(makeSummon(G.wave));e.summonCount++;pop('GRAVE TOLL',false,'SUMMON');emit('bossEffect',{type:'summon'});}}if(e.bossType==='hank'&&e.hp>0&&e.hp<e.max){if(e.burned)pop('HANK REGEN BLOCKED',false,'FIRE');else{healed=Math.min(e.max-e.hp,e.max*.055);e.hp+=healed;if(healed>0)pop('+'+Math.round(healed),false,'GRAVE REGEN');}e.burned=false;}if(e.bossType==='nevermore'&&e.hp>0){e.toll++;if(e.toll%2===0&&e.shield<=0&&e.summonCount<2){e.shield=e.max*.12;e.shieldMax=Math.max(e.shieldMax,e.shield);e.summonCount++;pop('RAVEN VEIL',false,'WARD');}}if(e.bossType==='train'&&e.hp>0){e.toll++;if(e.toll%3===0)heroTakeDamage(Math.max(6,G.max*.075),'CANNON','cannon');}}}");

  src=replaceFunction(src,'frame',"function frame(now){var dt=Math.min(.033,(now-last)/1000),ammo;last=now;if(G&&G.state!=='dead'&&G.state!=='loot'){physics(dt);updateStatusEffects(now);updateHeroRegen(now);updateEnemyMotion(dt,now);if((G.state==='fire'||G.state==='reload')&&!living().length){if(!G.emptySince)G.emptySince=now;if(now-G.emptySince>700){G.emptySince=0;B=[];doneWave();}}else G.emptySince=0;if(G.state==='fire'&&now>=G.next&&G.launched<G.mag){ammo=save.cylinder[G.launched]||'standard';launch(null,ammo);G.launched++;G.next=now+650;queue();}if(G.state==='fire'&&G.launched>=G.mag&&G.resolved>=G.mag&&!B.length&&living().length){G.state='reload';G.rs=now;G.re=now+stats().reload;emit('reloadStart',{duration:stats().reload});}if(G.state==='reload'&&now>=G.re)reloadDone();positionEnemies();}draw();hud();requestAnimationFrame(frame);}");

  src=mustReplace(src,
    "var HERO=[['power','High Caliber','+9% base bullet damage',40],['crit','Deadeye','+2% critical chance',50],['reload','Quick Hands','8% faster reload',55],['mag','Deep Pockets','+1 cylinder chamber',100],['hp','Grit','+15 maximum HP',60]],PEGS=",
    "var HERO=[['power','High Caliber','+9% base bullet damage',40],['crit','Deadeye','+2% critical chance',50],['reload','Quick Hands','8% faster reload',55],['mag','Deep Pockets','+1 cylinder chamber',100],['hp','Grit','+15 maximum HP',60],['armor','Armor Plating','+10 armor, replenished each wave',75],['regen','Regeneration','+1% base HP every 5 seconds',100],['regenKill','Regen on Kill','+2 HP on every kill',90]],PEGS=",
    'hero upgrade list');

  src=mustReplace(src,
    "save.coins-=n;save[k]++;buildPegs();persist();emit('upgrade',{kind:'board',key:k});openSheet('board');",
    "save.coins-=n;save[k]++;buildPegs();if(k!=='slot'&&save.placements[k]&&save.placements[k].length)pegMetaEntry(k,save.placements[k][save.placements[k].length-1],n);syncPegMeta();persist();emit('upgrade',{kind:'board',key:k});openSheet('board');",
    'peg purchase investment');

  src=src.replace('Tap PLACE, then tap the peg on the live board.','Buy pegs here. Tap a placed special peg on the board to upgrade, move, or sell.');

  src=mustReplace(src,
    "hp:G.hp,state:G.state,enemies:living().length",
    "hp:G.hp,armor:G.armor,armorMax:G.armorMax,state:G.state,enemies:living().length",
    'debug armor state');

  src=mustReplace(src,
    "window.__ipsAPI={snapshot:function(){return clone(save);},grant:function(xp,coins,label){save.xp=Math.max(0,Number(save.xp||0)+Number(xp||0));save.coins=Math.max(0,Number(save.coins||0)+Number(coins||0));persist();if(label)pop(label,false,'REWARD');},openSheet:openSheet,version:'1.7'};",
    "window.__ipsAPI={snapshot:function(){syncPegMeta();return clone(save);},grant:function(xp,coins,label){save.xp=Math.max(0,Number(save.xp||0)+Number(xp||0));save.coins=Math.max(0,Number(save.coins||0)+Number(coins||0));persist();if(label)pop(label,false,'REWARD');},openSheet:openSheet,getPegInfo:function(type,index){return clone(pegManageInfo(type,Number(index)));},upgradePeg:function(type,index){return clone(upgradePeg(type,Number(index)));},movePeg:function(type,fromIndex,toIndex){return clone(movePegManaged(type,Number(fromIndex),Number(toIndex)));},sellPeg:function(type,index){return clone(sellPegManaged(type,Number(index)));},version:'1.11.3'};",
    'peg management api');
  return src;
}
fetch('engine-v17.js?v=20260817-113')
  .then(function(r){if(!r.ok)throw new Error('engine source HTTP '+r.status);return r.text();})
  .then(function(src){var out=patch(src);(new Function(out+'\n//# sourceURL=engine-v113-runtime.js'))();})
  .catch(function(err){fail(err&&err.message?err.message:String(err));});
})();
