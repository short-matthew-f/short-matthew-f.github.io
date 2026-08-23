(() => {
  'use strict';
  window.LW_DATA = Object.freeze({
    version: 'P0-0.10.6',
    commander: {
      id: 'warden', name: 'The Warden', presence: 1.16,
      abilities: [
        { id:'rally', name:'Rally', cooldown:12, description:'For 6s, allied lane pressure gains +35%.' },
        { id:'sunder', name:'Sunder', cooldown:16, description:'Deal a heavy burst to the current lane Bastion, Guard, or exposed Gate.' },
        { id:'waypoint', name:'Waypoint', cooldown:8, description:'Move the Warden directly to the chosen lane.' },
        { id:'conscript', name:'Conscript', cooldown:18, description:'Add a temporary allied squad to the current lane.' }
      ],
      lastStand: 'Bulwark Detonation'
    },
    units: [
      { id:'ironjack', name:'Ironjack', role:'frontline', power:1.05, durability:1.35 },
      { id:'slingline', name:'Slingline', role:'ranged', power:1.22, durability:.72 },
      { id:'bulwark', name:'Bulwark', role:'defender', power:.78, durability:1.62 },
      { id:'zealot', name:'Zealot', role:'pressure', power:1.34, durability:.66 },
      { id:'ram', name:'Siege Ram', role:'siege', power:1.58, durability:1.05 }
    ],
    towers: [
      { id:'bolt', name:'Bolt Tower', power:.72 },
      { id:'frost', name:'Frost Coil', power:.5 },
      { id:'scatter', name:'Scattergun', power:.82 },
      { id:'pylon', name:'War Pylon', power:.62 }
    ],
    nodes: [
      { id:'A1-B1', kind:'battle', name:'Outer Approach', subtitle:'Two-lane teaching battle', x:16, y:55 },
      { id:'A1-F1', kind:'forge', name:'Ruined Forge', subtitle:'Build shaping — P2', x:42, y:34, placeholder:true },
      { id:'A1-B2', kind:'battle', name:'Split Causeway', subtitle:'Second battle — P2', x:66, y:58, placeholder:true },
      { id:'A1-GK', kind:'gatekeeper', name:'Gatekeeper', subtitle:'Act-end pressure — P2/P3', x:87, y:35, placeholder:true }
    ]
  });
})();
