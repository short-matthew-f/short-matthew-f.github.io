(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.LW_R02_CONFIG=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const BUILD='M1-0.4.2';
  const FIXTURE='R-02-STRUCTURAL';
  const PARAM_REV='R02-C';
  const DESIGN_BASELINE='1.7';

  // R02-C freezes the successful R02-B pressure revision and isolates REFORM-001.
  // Combat pacing is intentionally unchanged from R02-B.
  const PARAMS=Object.freeze({
    fixedDt:1/60,
    playerPulse:20,
    enemyInitial:Object.freeze({north:1,mid:5,south:10}),
    enemyCadence:Object.freeze({north:18,mid:18,south:22}),
    guardHp:6200,
    guardRegen:11.5,
    gateHp:30000,
    bastionHp:14000,
    coreHp:13000,
    presenceRadius:13,
    presenceDamage:1.25,
    fullGold:5,
    remoteGold:2,
    waypointCooldown:48,
    rallyCooldown:22,
    rallySeconds:7,
    rallyDamage:1.32,
    commanderHp:440,
    commanderDamage:19,
    commanderRange:7.5,
    commanderCadence:.78,
    reformSeconds:9,
    reformLockSeconds:2,
    rivalHp:520,
    rivalDamage:18,
    rivalRange:6.5,
    rivalCadence:.86,
    rivalSpeed:4.25,
    rivalReformSeconds:12,
    rivalDecisionCadence:20,
    rivalInfluenceRadius:14,
    rivalInfluenceDamage:1.18,
    rivalAbsenceWeight:5,
    rivalGuardDamageWeight:11,
    rivalBastionDamageWeight:8,
    rivalBreachWeight:18,
    rivalHoldMargin:4,
    rivalReformRecheckSeconds:1,
    rivalReformCampActorPenalty:6,
    rivalReformCommanderPenalty:10,
    rivalReformCampX:28,
    junctionXs:Object.freeze([-18,16]),
    initialGold:60,
    interventionCost:60,
    interventionCooldown:20,
    overdriveSeconds:18,
    overdriveMultiplier:1.75,
    recoveryInterval:5,
    guardPositions:Object.freeze({north:1,mid:2,south:1})
  });

  const ENEMY=Object.freeze({
    raider:Object.freeze({hp:105,damage:11,range:2,speed:3.55,cadence:.85,role:'melee',structure:1}),
    bowhand:Object.freeze({hp:68,damage:10,range:7.5,speed:3.1,cadence:1,role:'ranged',structure:.65}),
    rammer:Object.freeze({hp:185,damage:14,range:2.2,speed:2.35,cadence:.8,role:'siege',structure:1.85}),
    outrider:Object.freeze({hp:86,damage:12,range:2.2,speed:4.5,cadence:.74,role:'melee',structure:.8})
  });

  function enemyRecipe(laneId,pulseIndex){
    if(laneId==='north') return pulseIndex===0?['raider','raider','bowhand']:['raider','raider','bowhand','bowhand'];
    if(laneId==='mid') return pulseIndex===0?['outrider','raider','outrider']:['raider','outrider','bowhand'];
    return pulseIndex===0?['raider','raider','rammer']:['raider','raider','rammer','bowhand'];
  }

  return {BUILD,FIXTURE,PARAM_REV,DESIGN_BASELINE,PARAMS,ENEMY,enemyRecipe};
});
