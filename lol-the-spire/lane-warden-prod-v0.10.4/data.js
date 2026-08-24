(() => {
  'use strict';
  window.LW_DATA = Object.freeze({
    version: 'P2-0.18.0',
    deployment: { unitCapacity: 6, towerCapacity: 4 },
    encounter: {
      id: 'A1-B1',
      name: 'Outer Approach',
      reclamationTrigger: 210,
      artilleryCadence: 14,
      artilleryTelegraph: 4,
      guardRebuildCadence: 28
    },
    commander: {
      id: 'warden', name: 'The Warden', presence: 1.16, maxHealth: 100, reformTime: 12, walkTime: 7,
      abilities: [
        { id:'rally', name:'Rally', cooldown:12, description:'For 6s, nearby allied cohorts around the Warden fight harder.' },
        { id:'sunder', name:'Sunder', cooldown:16, description:'Strike a nearby enemy cohort, Guard, or exposed Gate from the Warden’s actual position.' },
        { id:'waypoint', name:'Waypoint', cooldown:24, description:'Relocate instantly to the chosen lane’s active friendly line.' },
        { id:'conscript', name:'Conscript', cooldown:18, description:'While the Warden is settled in a lane, reinforce that lane’s next two arriving cohorts.' }
      ],
      lastStand: 'Bulwark Detonation'
    },
    units: [
      { id:'ironjack', name:'Ironjack', cost:1, tags:['armored'], role:'frontline', power:1.05, durability:1.35 },
      { id:'slingline', name:'Slingline', cost:1, tags:['swift'], role:'ranged', power:1.22, durability:.72 },
      { id:'bulwark', name:'Bulwark', cost:2, tags:['armored'], role:'defender', power:.78, durability:1.62 },
      { id:'zealot', name:'Zealot', cost:2, tags:['arcane'], role:'pressure', power:1.34, durability:.66 },
      { id:'ram', name:'Siege Ram', cost:3, tags:['siege'], role:'siege', power:1.58, durability:1.05 }
    ],
    towers: [
      { id:'bolt', name:'Bolt Tower', cost:2, role:'Reliable single-target defense', effect:'defense', power:.42 },
      { id:'frost', name:'Frost Coil', cost:2, role:'Slows enemies moving through its local zone', effect:'slow', power:.24 },
      { id:'scatter', name:'Scattergun', cost:3, role:'Damages clustered enemy cohorts in its local zone', effect:'swarm', power:.5 },
      { id:'pylon', name:'War Pylon', cost:2, role:'Buffs friendly cohorts moving through its local zone', effect:'amplify', power:.18 }
    ],
    nodes: [
      { id:'A1-B1', kind:'battle', name:'Outer Approach', subtitle:'Easy Pool · concentration · SALVAGE + ?', x:12, y:60 },
      { id:'A1-B2', kind:'battle', name:'Split Causeway', subtitle:'Easy Pool · rotation · SALVAGE + ?', x:32, y:36 },
      { id:'A1-F1', kind:'forge', name:'Ruined Forge', subtitle:'Target one owned formation', x:52, y:63 },
      { id:'A1-B3', kind:'battle', name:'Third Front', subtitle:'Next P2 battle seam', x:71, y:31, placeholder:true },
      { id:'A1-GK', kind:'gatekeeper', name:'Gatekeeper', subtitle:'SALVAGE + RELIC + ACT GROWTH', x:90, y:55, placeholder:true }
    ]
  });
})();
