(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LW_RULES = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const UNIT_CAP = 6;
  const TOWER_CAP = 4;

  const UNITS = {
    ironjack: { id:'ironjack', name:'Ironjack', cost:1, role:'melee', tags:['armored'], hp:105, damage:13, range:2.0, speed:4.0, cadence:0.82, structure:0.42 },
    slingline: { id:'slingline', name:'Slingline', cost:1, role:'ranged', tags:['swift'], hp:64, damage:11, range:8.5, speed:3.5, cadence:1.0, structure:0.28 },
    bulwark: { id:'bulwark', name:'Bulwark', cost:2, role:'melee', tags:['armored'], hp:195, damage:9, range:2.0, speed:2.65, cadence:0.9, structure:0.30 },
    zealot: { id:'zealot', name:'Zealot', cost:2, role:'ranged', tags:['arcane'], hp:58, damage:25, range:6.5, speed:3.25, cadence:1.25, structure:0.52 },
    siegeRam: { id:'siegeRam', name:'Siege Ram', cost:3, role:'siege', tags:['siege'], hp:170, damage:10, range:2.4, speed:2.0, cadence:0.72, structure:3.15 }
  };

  const TOWERS = {
    none: { id:'none', name:'Empty', cost:0 },
    bolt: { id:'bolt', name:'Bolt Tower', cost:2, hp:360, damage:20, range:15, cadence:0.75, role:'defense' },
    frost: { id:'frost', name:'Frost Coil', cost:2, hp:330, damage:8, range:14, cadence:0.85, slow:0.55, slowSeconds:1.8, role:'control' },
    pylon: { id:'pylon', name:'War Pylon', cost:2, hp:340, role:'support', buff:1.34, radius:16 },
    scatter: { id:'scatter', name:'Scattergun', cost:3, hp:330, damage:8, range:11, cadence:0.32, role:'defense' }
  };

  function blankLane() {
    return { units:{ ironjack:0, slingline:0, bulwark:0, zealot:0, siegeRam:0 }, towers:{ rear:'none', forward:'none' } };
  }

  function cloneDeployment(d) { return JSON.parse(JSON.stringify(d)); }

  const PRESETS = {
    siegeDelay: {
      north: { units:{ ironjack:1, slingline:0, bulwark:0, zealot:0, siegeRam:1 }, towers:{ rear:'pylon', forward:'none' } },
      south: { units:{ ironjack:0, slingline:0, bulwark:1, zealot:0, siegeRam:0 }, towers:{ rear:'frost', forward:'none' } }
    },
    balanced: {
      north: { units:{ ironjack:2, slingline:1, bulwark:0, zealot:0, siegeRam:0 }, towers:{ rear:'bolt', forward:'none' } },
      south: { units:{ ironjack:2, slingline:1, bulwark:0, zealot:0, siegeRam:0 }, towers:{ rear:'bolt', forward:'none' } }
    },
    allIn: {
      north: { units:{ ironjack:1, slingline:0, bulwark:0, zealot:1, siegeRam:1 }, towers:{ rear:'none', forward:'none' } },
      south: { units:{ ironjack:0, slingline:0, bulwark:0, zealot:0, siegeRam:0 }, towers:{ rear:'frost', forward:'bolt' } }
    },
    thin: {
      north: { units:{ ironjack:1, slingline:1, bulwark:0, zealot:0, siegeRam:0 }, towers:{ rear:'pylon', forward:'none' } },
      south: { units:{ ironjack:1, slingline:1, bulwark:0, zealot:0, siegeRam:0 }, towers:{ rear:'pylon', forward:'none' } }
    }
  };

  function unitPoints(deployment) {
    return ['north','south'].reduce((sum,lane) => sum + Object.entries(deployment[lane].units).reduce((s,[id,n]) => s + (UNITS[id]?.cost || 0) * n, 0), 0);
  }

  function towerPoints(deployment) {
    return ['north','south'].reduce((sum,lane) => sum + ['rear','forward'].reduce((s,slot) => s + (TOWERS[deployment[lane].towers[slot]]?.cost || 0), 0), 0);
  }

  function deploymentLegal(deployment) {
    const unitTotal = unitPoints(deployment);
    const towerTotal = towerPoints(deployment);
    const hasUnit = ['north','south'].some(l => Object.values(deployment[l].units).some(n => n > 0));
    return {
      legal: unitTotal <= UNIT_CAP && towerTotal <= TOWER_CAP && hasUnit,
      unitTotal, towerTotal, hasUnit,
      errors: [unitTotal > UNIT_CAP ? `Unit points ${unitTotal}/${UNIT_CAP}` : null, towerTotal > TOWER_CAP ? `Tower points ${towerTotal}/${TOWER_CAP}` : null, !hasUnit ? 'At least one lane unit is required' : null].filter(Boolean)
    };
  }

  function committedTypes(deployment, laneId) {
    return Object.entries(deployment[laneId].units).filter(([,n]) => n > 0).map(([id]) => id);
  }

  function reinforcementLegal(deployment, laneId, unitIds) {
    const allowed = new Set(committedTypes(deployment, laneId));
    return unitIds.every(id => allowed.has(id));
  }

  function gateVulnerable(lanes) {
    return Object.values(lanes).some(l => l.guard && l.guard.broken === true);
  }

  function guardPressureState(dps, regen) {
    if (dps <= regen * 0.85) return 'below';
    if (dps < regen * 1.15) return 'near';
    return 'above';
  }

  return { UNIT_CAP, TOWER_CAP, UNITS, TOWERS, PRESETS, blankLane, cloneDeployment, unitPoints, towerPoints, deploymentLegal, committedTypes, reinforcementLegal, gateVulnerable, guardPressureState };
});
