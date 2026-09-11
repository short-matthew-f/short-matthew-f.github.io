// Gravity Well — campaign levels (stage 3).
//
// Twelve worlds, one new idea each, in the rhythm
//   introduce -> develop -> combine -> (optional) challenge
// as fixed by SPEC.md "Level design philosophy". A fixture type never appears
// before the world that owns it.
//
// Every level is authored against the tuned physics in sim.js (PHYSICS_VERSION
// 'gw-1'): the `solution` array is a real, tested win, and `node
// gravity-well/tools/hotzone.js <id> --ascii` shows the hot zone each level
// actually offers. The invariants the test suite enforces:
//   * the solution wins,
//   * zero wells FAILS (otherwise it is not a puzzle),
//   * every authored well has a tolerance disc at least as big as the phase
//     floor (60 in W1 down to 25 in W9-W12), so no level is pixel-hunting.
//
// Authoring notes live in the `// design:` comment above each level.
//
// All levels use the same 900x1200 portrait board so a phone never rescales
// between levels; the action sits inside the middle 80%.

// One line per world; the menu reads this for its group headings.
export const WORLDS = [
  { phase: 1, title: 'One Well', blurb: 'A charge beside your path bends it. Never in front.' },
  { phase: 2, title: 'Two Wells', blurb: 'Separate charges cooperate: one starts a turn, one finishes it.' },
  { phase: 3, title: 'Stacking', blurb: 'Tap a well again to deepen it. Power in one place, or control in two.' },
  { phase: 4, title: 'Static Obstacles', blurb: 'Rock does not move and does not care. Shape a path through it.' },
  { phase: 5, title: 'Asteroids', blurb: 'Crossing a path is not a collision. Arrival times are.' },
  { phase: 6, title: 'Drones', blurb: 'Your field pulls them too. Every placement moves more than the ship.' },
  { phase: 7, title: 'Redirection', blurb: 'Stop dodging. Move the obstacle, or feed it to a well.' },
  { phase: 8, title: 'Mixed Systems', blurb: 'Rock, drift and response in one problem.' },
  { phase: 9, title: 'Hunters', blurb: 'It closes on you, and it falls the same way you do.' },
  { phase: 10, title: 'Ore Runs', blurb: 'Get home. If the same field can post the ore, better.' },
  { phase: 11, title: 'Wormholes', blurb: 'Two mouths, one throat. You leave along the far mouth, facing out.' },
  { phase: 12, title: 'Expert Gauntlet', blurb: 'Everything at once. Optional, and it shows.' }
];

const BOUNDS = { w: 900, h: 1200 };

export const LEVELS = [
  // =========================================================================
  // WORLD 1 — one well. Charges 1, stackLimit 1, full preview.
  // The whole world is the side pull: a single charge placed BESIDE the flight
  // path bends it; placed in front it eats you.
  // =========================================================================

  // design: introduce the side pull — a far, weak charge to the right of a
  // slow climb curves the ship into the target. Hot zone is a wide blob
  // (tolerance 88 vs a floor of 60) so almost any tap "to the right, ahead"
  // works; the hint marks the middle of it.
  {
    id: 'w1-1',
    name: 'First Light',
    phase: 1,
    optional: false,
    bounds: BOUNDS,
    charges: 1,
    stackLimit: 1,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 170, y: 1080, vx: 55, vy: -80 },
    target: { x: 620, y: 530, r: 28 },
    fixtures: [],
    radio: [
      { when: 'start', text: 'Engine is dead, Pilot — you coast or you do not move. Drop a charge BESIDE your path and let the field turn you.', once: true },
      { when: 'fail', text: 'Beside the line, not on it. Put the charge out to the side, ahead of you, and run it again.', once: false }
    ],
    hint: { well: { x: 700, y: 760, charges: 1 } },
    solution: [{ x: 700, y: 760, charges: 1 }]
  },

  // design: develop — same side pull, mirrored and upside down (entry from the
  // top-left, slow, charge below the path). Different geometry, no new idea.
  {
    id: 'w1-2',
    name: 'Long Fall',
    phase: 1,
    optional: false,
    bounds: BOUNDS,
    charges: 1,
    stackLimit: 1,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 150, y: 170, vx: 55, vy: 42 },
    target: { x: 770, y: 745, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 640, y: 820, charges: 1 }]
  },

  // design: combine — a flat horizontal entry with the target well below the
  // line, so the charge has to sit low and late. Needs a bigger bend than the
  // first two, tolerance 72.
  {
    id: 'w1-3',
    name: 'Crosswind',
    phase: 1,
    optional: false,
    bounds: BOUNDS,
    charges: 1,
    stackLimit: 1,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 830, y: 600, vx: -95, vy: 0 },
    target: { x: 130, y: 690, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 400, y: 880, charges: 1 }]
  },

  // design: optional challenge — longest single-charge arc in the world, a
  // 9-second climb across the whole board. Same idea, no slack for a sloppy
  // guess (tolerance 72 against a floor of 60).
  {
    id: 'w1-4',
    name: 'The Long Way',
    phase: 1,
    optional: true,
    bounds: BOUNDS,
    charges: 1,
    stackLimit: 1,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 780, y: 1090, vx: -50, vy: -85 },
    target: { x: 185, y: 295, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 200, y: 760, charges: 1 }]
  }
];
