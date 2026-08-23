(() => {
  'use strict';
  window.LW_DATA = Object.freeze({
    version: 'P1-0.11.1',
    deployment: { unitCapacity: 6, towerCapacity: 4 },
    encounter: {
      id: 'A1-B1',
      name: 'Outer Approach',
      reclamationTrigger: 180,
      artilleryCadence: 14,
      artilleryTelegraph: 4,
      guardRebuildCadence: 28
    },
    commander: {
      id: 'warden', name: 'The Warden', presence: 1.16, maxHealth: 100, reformTime: 12, walkTime: 7,
      abilities: [
        { id:'rally', name:'Rally', cooldown:12, description:'For 6s, allied pressure in the Warden’s lane gains +35%.' },
        { id:'sunder', name:'Sunder', cooldown:16, description:'Burst the current lane objective; once its Guard is broken, Sunder strikes the exposed Gate.' },
        { id:'waypoint', name:'Waypoint', cooldown:24, description:'Relocate instantly to a chosen lane, bypassing junction travel.' },
        { id:'conscript', name:'Conscript', cooldown:18, description:'Strengthen the next two pulses using only unit types already committed to this lane.' }
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
      { id:'frost', name:'Frost Coil', cost:2, role:'Slows pressure and buys rotation time', effect:'slow', power:.24 },
      { id:'scatter', name:'Scattergun', cost:3, role:'Swarm-control defense', effect:'swarm', power:.5 },
      { id:'pylon', name:'War Pylon', cost:2, role:'Buffs friendly waves passing its zone', effect:'amplify', power:.18 }
    ],
    nodes: [
      { id:'A1-B1', kind:'battle', name:'Outer Approach', subtitle:'Two-lane teaching battle', x:16, y:55 },
      { id:'A1-F1', kind:'forge', name:'Ruined Forge', subtitle:'Build shaping — P2', x:42, y:34, placeholder:true },
      { id:'A1-B2', kind:'battle', name:'Split Causeway', subtitle:'Second battle — P2', x:66, y:58, placeholder:true },
      { id:'A1-GK', kind:'gatekeeper', name:'Gatekeeper', subtitle:'Act-end pressure — P2/P3', x:87, y:35, placeholder:true }
    ]
  });
})();