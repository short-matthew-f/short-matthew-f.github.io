// Gravity Well — levels.js
// PLACEHOLDER — replaced by stage 3.
// Two minimal levels in the SPEC.md level format so the stage-2 UI has
// something to load, render and smoke-test against.

export const LEVELS = [
  {
    id: 'p1-01',
    name: 'First Light',
    phase: 1,
    bounds: { w: 900, h: 1200 },
    charges: 3,
    stackLimit: 3,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 300, y: 1100, vx: 0, vy: -160 },
    target: { x: 620, y: 300, r: 28 },
    fixtures: [],
    radio: [
      { when: 'start', text: 'Engine is cold and staying that way. Place a charge beside the ship’s path — beside it, not in front — and let the field do the turning.', once: true },
      { when: 'firstWell', text: 'Good. Watch the dotted line: that is where you are going, not where you are aiming.', once: true },
      { when: 'win', text: 'Docked clean. That is the whole game, Pilot.', once: true },
      { when: 'fail', text: 'Noted. Move the charge and run it again — the field is deterministic, so nothing here is luck.', once: false }
    ],
    hint: { well: { x: 360, y: 960, charges: 1 } },
    solution: [{ x: 360, y: 960, charges: 1 }]
  },
  {
    id: 'p4-01',
    name: 'The Gate',
    phase: 4,
    bounds: { w: 900, h: 1200 },
    charges: 4,
    stackLimit: 3,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 140, y: 1090, vx: 20, vy: -160 },
    target: { x: 760, y: 180, r: 28 },
    fixtures: [
      { type: 'obstacle', id: 'wall-l', shape: 'rect', x: 0, y: 600, w: 330, h: 46 },
      { type: 'obstacle', id: 'wall-r', shape: 'rect', x: 520, y: 600, w: 380, h: 46 }
    ],
    radio: [
      { when: 'start', text: 'Debris line across the corridor. There is one gap. Shape a field that threads it — you do not get to steer once you are moving.', once: true },
      { when: 'win', text: 'Through the gap and home. Nicely shaped.', once: true }
    ],
    hint: null,
    solution: [{ x: 220, y: 860, charges: 2 }]
  }
];
