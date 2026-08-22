(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.LW_R01_CONFIG=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const BUILD='M0-0.2.4';
  const FIXTURE='R-01';
  const PARAM_REV='R01-C';

  // R01-C pacing is represented as equivalent objective durability so the proven v0.2.2 main runtime remains byte-identical.
  const PARAMS=Object.freeze({
    playerPulse:20,
    enemyPulseNorth:20,
    enemyPulseSouth:28,
    enemyNorthInitial:0.5,
    enemySouthInitial:10,
    guardHp:7666.666666666667,
    guardRegen:14,
    gateHp:25000,
    bastionHp:15000,
    coreHp:10833.333333333334,
    presenceRadius:13,
    presenceDamage:1.28,
    fullGold:5,
    remoteGold:2,
    waypointCooldown:45,
    rallyCooldown:22,
    rallySeconds:7,
    rallyDamage:1.32,
    commanderHp:420,
    commanderDamage:19,
    commanderRange:7.5,
    commanderCadence:.78,
    reformSeconds:9,
    junctionX:-18,
    initialGold:60,
    interventionCost:60,
    interventionCooldown:20,
    pushMode:'one-per-type',
    overdriveSeconds:18,
    overdriveMultiplier:1.8,
    siegeRamHp:450,
    siegeRamStructure:5,
    rammerHp:170,
    rammerDamage:14,
    rammerStructure:1.8,
    towerDurabilityScale:1.6666666666666667
  });

  const ENEMY=Object.freeze({
    raider:Object.freeze({hp:100,damage:11,range:2,speed:3.6,cadence:.85,role:'melee',structure:1}),
    bowhand:Object.freeze({hp:65,damage:10,range:7.5,speed:3.15,cadence:1.0,role:'ranged',structure:.65}),
    rammer:Object.freeze({hp:PARAMS.rammerHp,damage:PARAMS.rammerDamage,range:2.2,speed:2.35,cadence:.8,role:'siege',structure:PARAMS.rammerStructure})
  });

  // Twin Toll reference topology: faster balanced North lane; delayed slower siege South lane.
  function enemyRecipe(laneId,pulseIndex){
    if(laneId==='north'){
      return pulseIndex===0
        ? ['raider','raider','raider']
        : ['raider','raider','bowhand'];
    }
    return pulseIndex===0
      ? ['raider','raider']
      : ['raider','raider','rammer'];
  }

  return {BUILD,FIXTURE,PARAM_REV,PARAMS,ENEMY,enemyRecipe};
});
