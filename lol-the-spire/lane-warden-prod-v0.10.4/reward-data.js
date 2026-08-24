(() => {
'use strict';
const units=[
 {id:'sapper',name:'Breach Sappers',cost:2,tags:['siege','breach'],role:'Sunder-support assault crew',power:1.18,durability:.82,rewardTrait:'sapper'},
 {id:'drummer',name:'Pulse Drummers',cost:1,tags:['support','pulse'],role:'Turns pulse timing into pressure',power:.82,durability:.82,rewardTrait:'drummer'},
 {id:'wardrunner',name:'Wardrunners',cost:1,tags:['swift','rotation'],role:'Keeps Commander rotations fluid',power:1.00,durability:.76,rewardTrait:'wardrunner'},
 {id:'lantern-guard',name:'Lantern Guard',cost:2,tags:['armored','sustain'],role:'Stabilizes a lane through repeated pulses',power:.90,durability:1.48,rewardTrait:'lantern-guard'}
];
const towers=[
 {id:'beacon',name:'Junction Beacon',cost:2,role:'Supports Commander rotation and Presence',effect:'amplify',power:.12,rewardTrait:'beacon'},
 {id:'pulsebell',name:'Pulse Bell',cost:2,role:'Converts timed pulses into battle gold',effect:'swarm',power:.34,rewardTrait:'pulsebell'},
 {id:'bastionloom',name:'Bastion Loom',cost:2,role:'Repairs the Bastion on allied pulses',effect:'defense',power:.30,rewardTrait:'bastionloom'},
 {id:'harpoon',name:'Harpoon Coil',cost:3,role:'Suppresses Guard recovery while pressing it',effect:'slow',power:.22,rewardTrait:'harpoon'}
];
const catalog={
 unit:[
  {id:'unit-sapper',contentId:'sapper',name:'Breach Sappers',quality:'uncommon',tags:['siege','sunder','breach'],thesis:['siege'],description:'Unlock Breach Sappers. Sunder gains extra objective damage in a lane containing them.'},
  {id:'unit-drummer',contentId:'drummer',name:'Pulse Drummers',quality:'common',tags:['pulse','timing'],thesis:['pulse'],description:'Unlock Pulse Drummers. Their lane gains a small front shove whenever an allied pulse begins.'},
  {id:'unit-wardrunner',contentId:'wardrunner',name:'Wardrunners',quality:'common',tags:['rotation','commander'],thesis:['rotation'],description:'Unlock Wardrunners. Walking to or from a lane containing them is faster.'},
  {id:'unit-lantern-guard',contentId:'lantern-guard',name:'Lantern Guard',quality:'uncommon',tags:['bastion','sustain'],thesis:['hold'],description:'Unlock Lantern Guard. Their lane repairs its Bastion slightly on each allied pulse.'}
 ],
 tower:[
  {id:'tower-beacon',contentId:'beacon',name:'Junction Beacon',quality:'common',tags:['rotation','presence'],thesis:['rotation'],description:'Unlock Junction Beacon. Walking to or from its lane is faster.'},
  {id:'tower-pulsebell',contentId:'pulsebell',name:'Pulse Bell',quality:'common',tags:['pulse','gold'],thesis:['pulse'],description:'Unlock Pulse Bell. Allied pulses in its lane generate bonus battle gold.'},
  {id:'tower-bastionloom',contentId:'bastionloom',name:'Bastion Loom',quality:'uncommon',tags:['bastion','repair'],thesis:['hold'],description:'Unlock Bastion Loom. Each allied pulse repairs its lane’s Bastion.'},
  {id:'tower-harpoon',contentId:'harpoon',name:'Harpoon Coil',quality:'uncommon',tags:['guard','breach'],thesis:['siege'],description:'Unlock Harpoon Coil. Guard regeneration is suppressed while its lane is in breach range.'}
 ],
 commander:[
  {id:'cmd-rally-standard',name:'Rally Standard',quality:'common',tags:['rally','pulse'],thesis:['pulse'],description:'Rally also queues one reinforced pulse in the Warden’s lane.'},
  {id:'cmd-sunder-echo',name:'Sunder Echo',quality:'uncommon',tags:['sunder','breach'],thesis:['siege'],description:'Sunder deals additional Guard or exposed-Gate damage.'},
  {id:'cmd-waypoint-reserve',name:'Waypoint Reserve',quality:'common',tags:['waypoint','read'],thesis:['rotation'],description:'Waypoint restores 1.5s of protected tactical-read reserve.'},
  {id:'cmd-conscript-draft',name:'Deep Conscript',quality:'uncommon',tags:['conscript','pulse'],thesis:['pulse'],description:'Conscript reinforces the next three pulses instead of the next two.'},
  {id:'cmd-field-triage',name:'Field Triage',quality:'rare',tags:['walk','sustain'],thesis:['rotation','hold'],description:'Completing a normal walk restores 20% Commander health.'}
 ],
 relic:[
  {id:'relic-broadside-ledger',name:'Broadside Ledger',quality:'uncommon',tags:['reward','offers'],thesis:['tower'],description:'Future standard Growth components show +1 offer.'},
  {id:'relic-quartermaster-token',name:'Quartermaster’s Token',quality:'uncommon',tags:['reward','reroll'],thesis:['rotation'],description:'The first component reroll in each future packet is free.'},
  {id:'relic-lucky-ash',name:'Lucky Ash',quality:'uncommon',tags:['reward','bonus'],thesis:['pulse'],description:'Future normal packets gain +20 percentage points Bonus-component chance.'},
  {id:'relic-salvagers-seal',name:'Salvager’s Seal',quality:'common',tags:['reward','salvage'],thesis:['hold'],description:'Skipping future reward components yields 50% more Salvage.'},
  {id:'relic-junction-spurs',name:'Junction Spurs',quality:'common',tags:['commander','rotation'],thesis:['rotation'],description:'Normal Commander walking is 20% faster.'},
  {id:'relic-pulse-prism',name:'Pulse Prism',quality:'uncommon',tags:['pulse','conscript'],thesis:['pulse'],description:'Every third allied pulse in the Commander’s lane is automatically reinforced.'},
  {id:'relic-gatebite-sigil',name:'Gatebite Sigil',quality:'uncommon',tags:['guard','gate','breach'],thesis:['siege'],description:'The first Guard broken each battle immediately damages the Gate.'},
  {id:'relic-bastion-oath',name:'Bastion Oath',quality:'common',tags:['bastion','recovery'],thesis:['hold'],description:'Once per battle, the first Bastion to fall below 35% repairs 20%.'},
  {id:'relic-misers-cog',name:'Miser’s Cog',quality:'rare',tags:['tower','gold'],thesis:['tower'],description:'The first lane-structure purchase each battle costs 8g less.'},
  {id:'relic-reclamation-clock',name:'Reclamation Clock',quality:'rare',tags:['reclamation','tempo'],thesis:['siege','hold'],description:'Reclamation begins 15 seconds later.'}
 ],
 upgrade:[
  {id:'upgrade-ram-hook',name:'Siege Ram · Hooked Yoke',quality:'common',tags:['ram','sunder','breach'],thesis:['siege'],target:{kind:'unit',id:'ram'},forge:{cost:120,preview:'Sunder gains +4 exposed-Gate damage while a Ram is deployed in the lane.'},description:'If a Siege Ram is deployed, Sunder hits an exposed Gate harder.'},
  {id:'upgrade-pylon-relay',name:'War Pylon · Relay Sigil',quality:'uncommon',tags:['pylon','waypoint','rally'],thesis:['rotation'],target:{kind:'tower',id:'pylon'},forge:{cost:150,preview:'Waypointing into a War Pylon lane immediately grants 4 seconds of Rally.'},description:'Waypointing into a War Pylon lane grants a short Rally effect.'},
  {id:'upgrade-frost-condenser',name:'Frost Coil · Condenser',quality:'common',tags:['frost','overcharge'],thesis:['tower','hold'],target:{kind:'tower',id:'frost'},forge:{cost:120,preview:'Each Frost Coil Overcharge permanently cuts that lane’s enemy pressure by 5% for the battle.'},description:'Overcharging a Frost Coil also suppresses that lane’s enemy pressure.'},
  {id:'upgrade-slingline-drums',name:'Slingline · Cadence Drums',quality:'common',tags:['slingline','pulse'],thesis:['pulse'],target:{kind:'unit',id:'slingline'},forge:{cost:120,preview:'Every third allied pulse with Slinglines adds an immediate +1.8% front shove.'},description:'Every third pulse in a lane with Slinglines gains a small front shove.'},
  {id:'upgrade-bulwark-entrench',name:'Bulwark · Entrench Kit',quality:'uncommon',tags:['bulwark','bastion','reinforce'],thesis:['hold'],target:{kind:'unit',id:'bulwark'},forge:{cost:150,preview:'Buying Reinforce with a Bulwark in lane also repairs 8% Bastion integrity.'},description:'Buying Reinforce in a lane with a Bulwark also repairs its Bastion.'}
 ],
 capacity:[
  {id:'capacity-muster-license',name:'Muster License',quality:'common',tags:['unit','capacity'],thesis:['siege','pulse'],capacity:{unit:1,tower:0},description:'Permanent this run: +1 Unit point.'},
  {id:'capacity-mason-seal',name:'Mason’s Seal',quality:'common',tags:['tower','capacity'],thesis:['tower','hold'],capacity:{unit:0,tower:1},description:'Permanent this run: +1 Tower point.'},
  {id:'capacity-field-commission',name:'Field Commission',quality:'rare',tags:['unit','tower','capacity'],thesis:['rotation'],capacity:{unit:1,tower:1},description:'Permanent this run: +1 Unit point and +1 Tower point.'}
 ],
 logistics:[
  {id:'log-component-reroll',name:'Component Reroll Credit',quality:'common',tags:['reroll','component'],thesis:['rotation'],repeatable:true,logistics:{component:1},description:'Bank one component reroll for a future reward packet.'},
  {id:'log-category-reroll',name:'Category Reroll Credit',quality:'uncommon',tags:['reroll','category'],thesis:['tower'],repeatable:true,logistics:{category:1},description:'Bank one category reroll for a future random-category component.'},
  {id:'log-packet-reroll',name:'Packet Reroll Credit',quality:'rare',tags:['reroll','packet'],thesis:['pulse'],repeatable:true,logistics:{packet:1},description:'Bank one rare packet reroll for a future unresolved packet.'},
  {id:'log-scout-dossier',name:'Scout Dossier',quality:'common',tags:['forecast','route'],thesis:['hold'],repeatable:true,logistics:{reveal:1},description:'Reveal one random reward category on a future reachable node.'},
  {id:'log-breach-chit',name:'Breach Salvage Chit',quality:'common',tags:['skip','salvage'],thesis:['siege'],repeatable:true,logistics:{nextSkipBonus:20},description:'The next skipped reward component grants +20 Salvage.'}
 ]
};
window.LW_REWARD_DATA=Object.freeze({version:'P2-0.18.0',units,towers,catalog});
})();
