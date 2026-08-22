(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.LW_R02_RULES=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const LANE_IDS=['north','mid','south'];
  const UNIT_CAP=8;
  const TOWER_CAP=6;

  const UNITS={
    ironjack:{id:'ironjack',name:'Ironjack',cost:1,role:'melee',tags:['armored'],hp:105,damage:13,range:2,speed:4,cadence:.82,structure:.42},
    slingline:{id:'slingline',name:'Slingline',cost:1,role:'ranged',tags:['swift'],hp:64,damage:11,range:8.5,speed:3.5,cadence:1,structure:.28},
    bulwark:{id:'bulwark',name:'Bulwark',cost:2,role:'melee',tags:['armored'],hp:195,damage:9,range:2,speed:2.65,cadence:.9,structure:.3},
    zealot:{id:'zealot',name:'Zealot',cost:2,role:'ranged',tags:['arcane'],hp:58,damage:25,range:6.5,speed:3.25,cadence:1.25,structure:.52},
    siegeRam:{id:'siegeRam',name:'Siege Ram',cost:3,role:'siege',tags:['siege'],hp:450,damage:10,range:2.4,speed:2,cadence:.72,structure:5}
  };
  const TOWERS={
    none:{id:'none',name:'Empty',cost:0},
    bolt:{id:'bolt',name:'Bolt Tower',cost:2,hp:600,damage:20,range:15,cadence:.75,role:'defense'},
    frost:{id:'frost',name:'Frost Coil',cost:2,hp:550,damage:8,range:14,cadence:.85,slow:.55,slowSeconds:1.8,role:'control'},
    pylon:{id:'pylon',name:'War Pylon',cost:2,hp:570,role:'support',buff:1.34,radius:16},
    scatter:{id:'scatter',name:'Scattergun',cost:3,hp:550,damage:8,range:11,cadence:.32,role:'defense'}
  };

  const blankUnits=()=>({ironjack:0,slingline:0,bulwark:0,zealot:0,siegeRam:0});
  const blankLane=()=>({units:blankUnits(),towers:{rear:'none',central:'none',forward:'none'}});
  const clone=v=>JSON.parse(JSON.stringify(v));
  const makeDeployment=()=>({north:blankLane(),mid:blankLane(),south:blankLane()});

  const PRESETS={
    siegeDelay:(()=>{const d=makeDeployment();d.north.units.ironjack=1;d.north.units.siegeRam=1;d.north.towers.rear='pylon';d.mid.units.ironjack=1;d.mid.units.slingline=1;d.mid.towers.central='bolt';d.south.units.bulwark=1;d.south.towers.rear='frost';return d;})(),
    balanced:(()=>{const d=makeDeployment();for(const l of LANE_IDS)d[l].units.ironjack=1;d.north.units.slingline=1;d.mid.units.slingline=1;d.south.units.slingline=1;d.mid.units.bulwark=1;d.north.towers.rear='bolt';d.mid.towers.central='frost';d.south.towers.rear='bolt';return d;})(),
    middleTemptation:(()=>{const d=makeDeployment();d.mid.units.ironjack=1;d.mid.units.zealot=1;d.mid.units.siegeRam=1;d.mid.towers.central='pylon';d.north.units.ironjack=1;d.north.towers.rear='frost';d.south.units.ironjack=1;d.south.towers.rear='bolt';return d;})(),
    wide:(()=>{const d=makeDeployment();for(const l of LANE_IDS){d[l].units.ironjack=1;d[l].units.slingline=1;d[l].towers.rear='pylon';}return d;})()
  };

  function unitPoints(d){return LANE_IDS.reduce((sum,l)=>sum+Object.entries(d[l].units).reduce((s,[id,n])=>s+(UNITS[id]?.cost||0)*n,0),0)}
  function towerPoints(d){return LANE_IDS.reduce((sum,l)=>sum+['rear','central','forward'].reduce((s,slot)=>s+(TOWERS[d[l].towers[slot]]?.cost||0),0),0)}
  function deploymentLegal(d){
    const unitTotal=unitPoints(d),towerTotal=towerPoints(d),hasUnit=LANE_IDS.some(l=>Object.values(d[l].units).some(n=>n>0));
    const errors=[unitTotal>UNIT_CAP?`Unit points ${unitTotal}/${UNIT_CAP}`:null,towerTotal>TOWER_CAP?`Tower points ${towerTotal}/${TOWER_CAP}`:null,!hasUnit?'At least one lane unit is required':null].filter(Boolean);
    return {legal:errors.length===0,unitTotal,towerTotal,hasUnit,errors};
  }
  function committedTypes(d,lane){return Object.entries(d[lane].units).filter(([,n])=>n>0).map(([id])=>id)}
  return {LANE_IDS,UNIT_CAP,TOWER_CAP,UNITS,TOWERS,PRESETS,blankLane,makeDeployment,clone,unitPoints,towerPoints,deploymentLegal,committedTypes};
});
