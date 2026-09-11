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
  },

  // =========================================================================
  // WORLD 2 — two wells. Charges 2, stackLimit 1: the charges CANNOT be
  // stacked, so a turn bigger than one charge can make has to be split across
  // two separated wells. The single-charge sweep on each level is a thin
  // sliver (1-3% of the board) — the pair is the readable solution.
  // =========================================================================

  // design: introduce cooperation — the climb needs roughly twice the bend one
  // charge gives, so the first well starts the turn and the second, further
  // along, finishes it. Tolerance 64 on both wells; one charge alone wins from
  // only ~3% of the board (3 tiny slivers).
  {
    id: 'w2-1',
    name: 'Both Hands',
    phase: 2,
    optional: false,
    bounds: BOUNDS,
    charges: 2,
    stackLimit: 1,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 140, y: 1090, vx: 90, vy: -115 },
    target: { x: 716, y: 614, r: 28 },
    fixtures: [],
    radio: [
      { when: 'start', text: 'Two charges this run, and they will not stack. Set them apart: the first starts the turn, the second finishes it.', once: true },
      { when: 'fail', text: 'Both charges, Pilot. One will never bend you that far.', once: false }
    ],
    hint: null,
    solution: [{ x: 490, y: 790, charges: 1 }, { x: 620, y: 720, charges: 1 }]
  },

  // design: develop — same handover, mirrored: a fast dive from the top right
  // that has to be walked back across the board. Tolerance 64.
  {
    id: 'w2-2',
    name: 'Handover',
    phase: 2,
    optional: false,
    bounds: BOUNDS,
    charges: 2,
    stackLimit: 1,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 760, y: 1080, vx: -60, vy: -125 },
    target: { x: 280, y: 542, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 426, y: 889, charges: 1 }, { x: 484, y: 763, charges: 1 }]
  },

  // design: combine — a flat, fast entry from the left where both wells sit
  // BEHIND the ship's shoulder; the turn is built early and coasted out.
  {
    id: 'w2-3',
    name: 'Relay',
    phase: 2,
    optional: false,
    bounds: BOUNDS,
    charges: 2,
    stackLimit: 1,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 110, y: 620, vx: 135, vy: -40 },
    target: { x: 593, y: 268, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 277, y: 402, charges: 1 }, { x: 392, y: 422, charges: 1 }]
  },

  // design: optional challenge — the hardest turn in the world (one charge
  // wins from well under 1% of the board, in two slivers) so both wells have
  // to be right. minTolerance 45: deliberately tighter than the phase floor.
  {
    id: 'w2-4',
    name: 'Scissors',
    phase: 2,
    optional: true,
    minTolerance: 45,
    bounds: BOUNDS,
    charges: 2,
    stackLimit: 1,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 790, y: 150, vx: -95, vy: 110 },
    target: { x: 607, y: 760, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 795, y: 418, charges: 1 }, { x: 709, y: 368, charges: 1 }]
  },

  // =========================================================================
  // WORLD 3 — stacking. stackLimit 3: tapping a well again deepens it. Verified
  // with `node gravity-well/tools/hotzone.js w3-1 --step 12 --ascii`: the
  // 1-charge sweep has ZERO winning cells, the 3-charge sweep has 140 across 2
  // regions. One charge cannot do this level from anywhere on the board.
  // =========================================================================

  // design: introduce stacking — the turn is beyond any single charge (1-charge
  // sweep: no winning region at all), but a 3-stack in the same place carries
  // it. Tolerance 48 against a floor of 45; the physics puts a hard ceiling on
  // how forgiving a "one charge is not enough" level can be, so this is as wide
  // as the idea gets.
  {
    id: 'w3-1',
    name: 'Deep Charge',
    phase: 3,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 8,
    showBodyPreview: true,
    ship: { x: 240, y: 940, vx: 150, vy: -115 },
    target: { x: 538, y: 459, r: 28 },
    fixtures: [],
    radio: [
      { when: 'start', text: 'Tap a charge again to deepen it. One will not turn you this far — put all three in the same place.', once: true },
      { when: 'fail', text: 'Stack them, Pilot. Three shallow charges spread thin will not do it.', once: false }
    ],
    hint: null,
    solution: [{ x: 398, y: 716, charges: 3 }]
  },

  // design: develop — same "one deep well" idea from the opposite corner and
  // with a longer coast, so the stack has to sit much further from the target.
  {
    id: 'w3-2',
    name: 'Second Tap',
    phase: 3,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 8,
    showBodyPreview: true,
    ship: { x: 800, y: 1070, vx: -120, vy: -140 },
    target: { x: 228, y: 612, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 462, y: 1072, charges: 3 }]
  },

  // design: combine — stacking plus World 2's handover. Four charges: a 3-stack
  // does the heavy turn, a single charge downrange trims the approach. Drop
  // either well and the run fails.
  {
    id: 'w3-3',
    name: 'Deep and Wide',
    phase: 3,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 8,
    showBodyPreview: true,
    ship: { x: 150, y: 220, vx: 130, vy: 120 },
    target: { x: 780, y: 420, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 481, y: 376, charges: 3 }, { x: 326, y: 128, charges: 1 }]
  },

  // design: optional challenge — four charges split 2/2 across the board, a
  // long flat entry hauled all the way to the far low corner. Concentrated
  // power in two places instead of one.
  {
    id: 'w3-4',
    name: 'Overdraft',
    phase: 3,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 8,
    showBodyPreview: true,
    ship: { x: 830, y: 420, vx: -175, vy: 60 },
    target: { x: 132, y: 900, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 770, y: 693, charges: 2 }, { x: 292, y: 779, charges: 2 }]
  },

  // =========================================================================
  // WORLD 4 — static obstacles. Rock is inert, lethal and permanent: it kills
  // the empty-board run outright, and it cuts the hot zone down to the arcs
  // that clear it. Preview drops to 6 s.
  // =========================================================================

  // design: introduce rock — a shelf off the left wall sits square across the
  // climb (empty board fails 'obstacle'). A 3-stack out to the right swings the
  // ship around the shelf's open end and up to the target. Tolerance 72.
  {
    id: 'w4-1',
    name: 'The Shelf',
    phase: 4,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 6,
    showBodyPreview: true,
    ship: { x: 250, y: 1090, vx: 35, vy: -125 },
    target: { x: 536, y: 454, r: 28 },
    fixtures: [
      { type: 'obstacle', id: 'shelf', shape: 'rect', x: 0, y: 520, w: 430, h: 44 }
    ],
    radio: [
      { when: 'start', text: 'Rock ahead. It does not move and it does not care. Shape a path around the open end.', once: true },
      { when: 'fail', text: 'You clipped it. Pull harder, or start the turn earlier.', once: false }
    ],
    hint: null,
    solution: [{ x: 700, y: 760, charges: 3 }]
  },

  // design: develop — the same rock idea closed into a gate. Under-pull and you
  // hit the left slab, over-pull and you hit the right one; the target beyond
  // pins which side of the gap you cross. Tolerance 56.
  {
    id: 'w4-2',
    name: 'The Needle',
    phase: 4,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 6,
    showBodyPreview: true,
    ship: { x: 300, y: 1100, vx: 10, vy: -120 },
    target: { x: 497, y: 395, r: 28 },
    fixtures: [
      { type: 'obstacle', id: 'gateL', shape: 'rect', x: 0, y: 600, w: 360, h: 44 },
      { type: 'obstacle', id: 'gateR', shape: 'rect', x: 540, y: 600, w: 360, h: 44 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 680, y: 700, charges: 3 }]
  },

  // design: combine — gate plus a boulder past it, solved with World 2's pair:
  // two 2-stacks stacked in depth off to the right lift the ship through the
  // gap and then hold it inside the boulder. Generous (tolerance 120) because
  // three pieces of rock is already a lot to read at 6 s of preview.
  {
    id: 'w4-3',
    name: 'Threadwork',
    phase: 4,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 6,
    showBodyPreview: true,
    ship: { x: 300, y: 1120, vx: 10, vy: -120 },
    target: { x: 516, y: 396, r: 28 },
    fixtures: [
      { type: 'obstacle', id: 'gateL', shape: 'rect', x: 0, y: 640, w: 360, h: 44 },
      { type: 'obstacle', id: 'gateR', shape: 'rect', x: 540, y: 640, w: 360, h: 44 },
      { type: 'obstacle', id: 'peak', shape: 'circle', x: 700, y: 340, r: 95 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 783, y: 799, charges: 2 }, { x: 759, y: 701, charges: 2 }]
  },

  // design: optional challenge — the shelf from w4-1 again, but the target is
  // tucked back over the shelf, so the ship has to round the end and then be
  // hauled back left. Two wells, tolerance 48.
  {
    id: 'w4-4',
    name: 'Back of the Shelf',
    phase: 4,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 6,
    showBodyPreview: true,
    ship: { x: 250, y: 1090, vx: 35, vy: -125 },
    target: { x: 468, y: 324, r: 28 },
    fixtures: [
      { type: 'obstacle', id: 'shelf', shape: 'rect', x: 0, y: 520, w: 430, h: 44 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 399, y: 456, charges: 2 }, { x: 625, y: 899, charges: 2 }]
  },

  // =========================================================================
  // WORLD 5 — asteroids. Inert movers: gravity does not touch them, but they
  // are lethal and they are somewhere else every second. A path crossing is not
  // a collision — the arrival times are. Preview 5 s, body previews on so the
  // time markers line up.
  // =========================================================================

  // design: introduce timing — a single rock sweeps right-to-left across the
  // climb and the empty board dies on it at t=3.7. One deep well out to the
  // LEFT bends the ship early so it crosses the lane well behind the rock.
  // Tolerance 80.
  {
    id: 'w5-1',
    name: 'Crossing',
    phase: 5,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 300, y: 1120, vx: 15, vy: -130 },
    target: { x: 324, y: 444, r: 28 },
    fixtures: [
      { type: 'asteroid', id: 'rock', x: 800, y: 620, r: 38, vx: -110, vy: 0 }
    ],
    radio: [
      { when: 'start', text: 'Rock in the lane, and it is moving. Crossing its track is fine — arriving at the same moment is not.', once: true },
      { when: 'fail', text: 'Check the tick marks: yours and its. Cross behind it, not through it.', once: false }
    ],
    hint: null,
    solution: [{ x: 115, y: 476, charges: 3 }]
  },

  // design: develop — two lanes running opposite ways, so the gap that opens in
  // one closes in the other. Two 2-stacks in depth on the right shoulder.
  {
    id: 'w5-2',
    name: 'Two Lanes',
    phase: 5,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 220, y: 1120, vx: 50, vy: -125 },
    target: { x: 756, y: 564, r: 28 },
    fixtures: [
      { type: 'asteroid', id: 'low', x: 30, y: 780, r: 34, vx: 120, vy: 0 },
      { type: 'asteroid', id: 'high', x: 880, y: 430, r: 30, vx: -70, vy: 0 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 593, y: 838, charges: 2 }, { x: 586, y: 942, charges: 2 }]
  },

  // design: combine — World 4's rock plus a moving one. The ledge on the right
  // forbids the wide outside line, so the ship has to go up the inside and the
  // timing on the sweeping rock is the whole problem. Tolerance 72.
  {
    id: 'w5-3',
    name: 'Traffic',
    phase: 5,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 150, y: 1100, vx: 75, vy: -115 },
    target: { x: 540, y: 372, r: 28 },
    fixtures: [
      { type: 'obstacle', id: 'ledge', shape: 'rect', x: 400, y: 900, w: 500, h: 40 },
      { type: 'asteroid', id: 'rock', x: 880, y: 520, r: 36, vx: -70, vy: 0 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 144, y: 590, charges: 2 }, { x: 618, y: 472, charges: 2 }]
  },

  // design: optional challenge — a patrolling rock that comes back. It runs a
  // fixed line across the middle at 99 u/s and loops, so the window repeats;
  // pick the pass you can actually reach.
  {
    id: 'w5-4',
    name: 'Sweeper',
    phase: 5,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 760, y: 1110, vx: -70, vy: -130 },
    target: { x: 708, y: 420, r: 28 },
    fixtures: [
      { type: 'asteroid', id: 'sweep', r: 40, speed: 99, loop: true,
        path: [{ x: 150, y: 640 }, { x: 820, y: 640 }] }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 763, y: 754, charges: 2 }, { x: 669, y: 611, charges: 2 }]
  }
];
