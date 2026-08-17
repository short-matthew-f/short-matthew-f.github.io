(function(){
'use strict';
/* v1.1.1 compatibility shim.
   v1.1's generated runtime calls enemyBadgesV11(), while the patcher installs
   the upgraded badge helper under the legacy enemyBadgesV10 name. Exposing
   this equivalent helper on the browser global fixes that symbol mismatch
   without changing save data or combat behavior. */
window.enemyBadgesV11=function(e){
  var role,roleLabel,trait='',affix='',h='';
  if(e.bossType==='deadeye'||e.bossType==='nevermore'||e.bossType==='train'||e.kind==='ghost')role='ranged';
  else if(e.bossType==='undertaker'||e.kind==='ghoul')role='hybrid';
  else role='melee';
  roleLabel=role==='ranged'?'RANGED':role==='hybrid'?'HYBRID':'MELEE';
  if(e.bossType==='undertaker')trait='BONE WARD';
  else if(e.bossType==='deadeye')trait='GRAVE TOLL';
  else if(e.bossType==='hank')trait='GRAVE REGEN';
  else if(e.bossType==='nevermore')trait='RAVEN VEIL';
  else if(e.bossType==='train')trait='BLACK IRON';
  else if(e.kind==='zombie')trait='DEATHLESS';
  else if(e.kind==='ghoul')trait='SKITTER';
  else if(e.kind==='ghost')trait='SPECTRAL';
  else if(e.kind==='troll')trait='REGEN';
  if(e.affix==='armored')affix='ARMORED';
  else if(e.affix==='quickdraw')affix='QUICKDRAW';
  else if(e.affix==='frenzied')affix='FRENZIED';
  else if(e.affix==='gravebound')affix='GRAVEBOUND';
  h+='<span class="enemy-badge role '+role+'">'+roleLabel+'</span>';
  if(trait)h+='<span class="enemy-badge '+(e.boss?'boss-mechanic':'trait')+'">'+trait+'</span>';
  if(affix)h+='<span class="enemy-badge affix">'+affix+'</span>';
  if(e.shield>0)h+='<span class="enemy-badge shield">WARD '+Math.ceil(e.shield)+'</span>';
  if(e.frenzy)h+='<span class="enemy-badge warn">ENRAGED</span>';
  return h;
};
})();
