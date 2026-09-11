// Gravity Well — campaign levels (stage 3).
//
// Twelve worlds, one new idea each, in the rhythm
//   introduce -> develop -> combine -> (optional) challenge
// as fixed by SPEC.md "Level design philosophy". A fixture type never appears
// before the world that owns it.
//
// Every level is authored against the tuned physics in sim.js (PHYSICS_VERSION
// 'gw-2': G = 1.6e6, kill radius 18 + 8*sqrt(n), influence cut off at 360 units
// with a 90-unit taper). The `solution` array is a real, tested win, and `node
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
// between levels; the action sits inside the middle 80%. Every Introduce level
// keeps the whole flight inside the bounds rectangle; only w4-4 (optional)
// deliberately clips the top edge and comes back.
//
// Ship speeds sit in the 60-140 band the retuned field is comfortable with: at
// 120 u/s one charge at 150 units of offset swings the ship through ~75 degrees
// and a 3-stack through ~123, so the wells are placed FAR (200-350 units off the
// line) for a gentle arc and close only where a hairpin is wanted.

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
  // Under gw-2 a single charge is already a big lever: at 150 units offset it
  // swings a 120 u/s ship through most of a right angle, and its influence stops
  // dead at 360 units (the dashed ring). The world is learning where to stand it.
  // =========================================================================

  // design: introduce the side pull — a long coast from the bottom right, one
  // charge dropped off the LEFT shoulder near the end of the run. Widest hot
  // zone in the game (tolerance 150 against a floor of 60); the hint marks the
  // middle of it.
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
    ship: { x: 740, y: 1110, vx: -45, vy: -105 },
    target: { x: 384, y: 376, r: 28 },
    fixtures: [],
    radio: [
      { when: 'start', text: 'Engine is dead, Pilot — you coast or you do not move. Drop a charge BESIDE your path and let the field turn you.', once: true },
      { when: 'fail', text: 'Beside the line, not on it. The dashed ring is how far a charge reaches — keep your path inside it.', once: false }
    ],
    hint: { well: { x: 243, y: 343, charges: 1 } },
    solution: [{ x: 243, y: 343, charges: 1 }]
  },

  // design: develop — the same pull upside down: a slow fall from the top left
  // hooked round into the lower right. Tolerance 128.
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
    ship: { x: 150, y: 200, vx: 60, vy: 95 },
    target: { x: 536, y: 888, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 490, y: 988, charges: 1 }]
  },

  // design: combine — a flat entry off the right edge that has to be walked all
  // the way across and lifted. The charge sits well ahead of the ship, so the
  // turn starts long before it looks like it should.
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
    ship: { x: 850, y: 700, vx: -115, vy: -35 },
    target: { x: 216, y: 464, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 183, y: 363, charges: 1 }]
  },

  // design: optional challenge — the longest single-charge arc in the world,
  // bottom left to top middle, and the tightest hot zone of the four (tolerance
  // 88 against a floor of 60).
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
    ship: { x: 180, y: 1100, vx: 45, vy: -105 },
    target: { x: 448, y: 376, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 233, y: 323, charges: 1 }]
  },

  // =========================================================================
  // WORLD 2 — two wells. Charges 2, stackLimit 1: the charges CANNOT be stacked,
  // so a turn bigger than one charge can make has to be split between two
  // separated wells, and every placement has to account for the other one.
  // =========================================================================

  // design: introduce cooperation — 890 units of coast from the bottom left to
  // the top right, far more turn than one charge can give. The two charges sit
  // side by side across the path so the field between them is deeper than
  // either alone. Tolerance 80.
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
    ship: { x: 160, y: 1090, vx: 80, vy: -95 },
    target: { x: 678, y: 330, r: 28 },
    fixtures: [],
    radio: [
      { when: 'start', text: 'Two charges this run, and they will not stack. Set them apart: the first starts the turn, the second finishes it.', once: true },
      { when: 'fail', text: 'Both charges, Pilot. One will never bend you that far.', once: false }
    ],
    hint: null,
    solution: [{ x: 569, y: 292, charges: 1 }, { x: 481, y: 305, charges: 1 }]
  },

  // design: develop — a dive from the top right hauled back across the middle,
  // with the pair stacked one above the other ahead of the ship.
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
    ship: { x: 740, y: 210, vx: -80, vy: 95 },
    target: { x: 306, y: 566, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 251, y: 419, charges: 1 }, { x: 272, y: 465, charges: 1 }]
  },

  // design: combine — a climb from the bottom right stopped and turned back on
  // itself; both charges sit above the target so the ship falls into it from
  // below.
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
    ship: { x: 740, y: 1090, vx: -80, vy: -95 },
    target: { x: 450, y: 628, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 492, y: 576, charges: 1 }, { x: 542, y: 554, charges: 1 }]
  },

  // design: optional challenge — the longest fall in the world, 850 units from
  // the top left corner to the bottom right, with the pair laid flat across the
  // far end of the run.
  {
    id: 'w2-4',
    name: 'Scissors',
    phase: 2,
    optional: true,
    bounds: BOUNDS,
    charges: 2,
    stackLimit: 1,
    previewSeconds: 30,
    showBodyPreview: true,
    ship: { x: 160, y: 210, vx: 80, vy: 95 },
    target: { x: 654, y: 942, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 424, y: 964, charges: 1 }, { x: 493, y: 968, charges: 1 }]
  },

  // =========================================================================
  // WORLD 3 — stacking. stackLimit 3: tapping a well again deepens it. A 3-stack
  // at 150 units turns a 120 u/s ship through 123 degrees and will eat it at
  // 100, and a ship that STARTS inside the reach of a deep well is captured
  // rather than bent — which is what makes w3-2 a closed loop.
  // =========================================================================

  // design: introduce stacking — the target is BEHIND the ship, so the run is a
  // hairpin, and one charge cannot bend that far. Measured with `node
  // gravity-well/tools/hotzone.js w3-1 --step 12 --ascii`: the 1-charge sweep
  // wins from 35 cells of 7500, the 3-charge sweep from 184 — five times the
  // area, and the 1-charge scraps are slivers nobody finds by accident.
  // Tolerance 56.
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
    ship: { x: 361, y: 581, vx: -131, vy: 8 },
    target: { x: 552, y: 472, r: 28 },
    fixtures: [],
    radio: [
      { when: 'start', text: 'Tap a charge again to deepen it. One will not turn you this far — put all three in the same place.', once: true },
      { when: 'fail', text: 'Stack them, Pilot. Three shallow charges spread thin will not do it.', once: false }
    ],
    hint: null,
    solution: [{ x: 413, y: 405, charges: 3 }]
  },

  // design: develop — the loop. The ship STARTS inside the reach of where the
  // 3-stack has to go, moving across it, so the well captures it into an orbit
  // instead of bending it once; the target is a full lap away, 40 units from
  // the launch point.
  {
    id: 'w3-2',
    name: 'Full Circle',
    phase: 3,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 8,
    showBodyPreview: true,
    ship: { x: 450, y: 860, vx: -100, vy: 0 },
    target: { x: 495, y: 826, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 450, y: 640, charges: 3 }]
  },

  // design: combine — stacking plus World 2 handover: a single charge sets up
  // the entry, a 3-stack at the far end does the heavy turn. Drop either well
  // and the run fails.
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
    ship: { x: 840, y: 420, vx: -130, vy: 45 },
    target: { x: 136, y: 768, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 312, y: 862, charges: 1 }, { x: 136, y: 853, charges: 3 }]
  },

  // design: optional challenge — a fall from the top left carried nearly eight
  // seconds and 800 units to the bottom left, on a 3-stack plus a trim charge.
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
    ship: { x: 150, y: 200, vx: 95, vy: 80 },
    target: { x: 312, y: 968, r: 28 },
    fixtures: [],
    radio: [],
    hint: null,
    solution: [{ x: 518, y: 939, charges: 3 }, { x: 587, y: 770, charges: 1 }]
  },

  // =========================================================================
  // WORLD 4 — static obstacles. Rock is inert, lethal and permanent: it kills
  // the empty-board run outright and it cuts the hot zone down to the arcs that
  // clear it. Preview drops to 6 s.
  // =========================================================================

  // design: introduce rock — a shelf off the left wall sits square across the
  // climb (the empty board dies on it at 4.4 s). A 3-stack out to the right
  // swings the ship round its open end and tucks it in behind. Tolerance 104.
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
    ship: { x: 270, y: 1100, vx: 30, vy: -115 },
    target: { x: 446, y: 604, r: 28 },
    fixtures: [
      { type: "obstacle", id: "shelf", shape: "rect", x: 0, y: 540, w: 430, h: 44 }
    ],
    radio: [
      { when: 'start', text: 'Rock ahead. It does not move and it does not care. Shape a path around the open end.', once: true },
      { when: 'fail', text: 'You clipped it. Start the turn earlier, or pull harder.', once: false }
    ],
    hint: null,
    solution: [{ x: 570, y: 556, charges: 3 }]
  },

  // design: develop — the rock closed into a gate. Under-pull and you hit the
  // left slab, over-pull and you hit the right one, and the target above the
  // gap decides which side of it you cross.
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
    ship: { x: 280, y: 1110, vx: 20, vy: -105 },
    target: { x: 300, y: 428, r: 28 },
    fixtures: [
      { type: "obstacle", id: "gateL", shape: "rect", x: 0, y: 640, w: 340, h: 44 },
      { type: "obstacle", id: "gateR", shape: "rect", x: 560, y: 640, w: 340, h: 44 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 211, y: 430, charges: 3 }]
  },

  // design: combine — a standing post and a boulder, solved with World 2 pair
  // work: two 2-stacks in depth lift the ship up the right-hand side of the
  // post.
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
    ship: { x: 820, y: 1090, vx: -55, vy: -100 },
    target: { x: 696, y: 280, r: 28 },
    fixtures: [
      { type: "obstacle", id: "post", shape: "rect", x: 420, y: 320, w: 44, h: 420 },
      { type: "obstacle", id: "lump", shape: "circle", x: 250, y: 880, r: 90 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 752, y: 370, charges: 2 }, { x: 644, y: 366, charges: 2 }]
  },

  // design: optional challenge — the same room as w4-3 taken the long way: ten
  // and a half seconds and 1200 units of travel, round the post and back over
  // the boulder to the far corner.
  {
    id: 'w4-4',
    name: 'The Grand Tour',
    phase: 4,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 6,
    showBodyPreview: true,
    ship: { x: 820, y: 1090, vx: -55, vy: -100 },
    target: { x: 136, y: 120, r: 28 },
    fixtures: [
      { type: "obstacle", id: "post", shape: "rect", x: 420, y: 320, w: 44, h: 420 },
      { type: "obstacle", id: "lump", shape: "circle", x: 250, y: 880, r: 90 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 530, y: 191, charges: 3 }, { x: 667, y: 521, charges: 1 }]
  },

  // =========================================================================
  // WORLD 5 — asteroids. Inert movers: gravity does not touch them, but they are
  // lethal and they are somewhere else every second. A path crossing is not a
  // collision — the arrival times are. Preview 5 s, body previews on so the time
  // markers line up.
  // =========================================================================

  // design: introduce timing — one rock sweeps right to left across the climb
  // and the empty board dies on it. Bend early and hard to the left and the
  // ship crosses the lane well behind it.
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
    ship: { x: 300, y: 1120, vx: 15, vy: -115 },
    target: { x: 226, y: 584, r: 28 },
    fixtures: [
      { type: "asteroid", id: "rock", x: 738, y: 700, r: 38, vx: -105, vy: 0 }
    ],
    radio: [
      { when: 'start', text: 'Rock in the lane, and it is moving. Crossing its track is fine — arriving at the same moment is not.', once: true },
      { when: 'fail', text: 'Check the tick marks: yours and its. Cross behind it, not through it.', once: false }
    ],
    hint: null,
    solution: [{ x: 194, y: 627, charges: 3 }]
  },

  // design: develop — a patrolling rock that comes back. The window repeats, so
  // the question is which pass you can be at the crossing for.
  {
    id: 'w5-2',
    name: 'Sweeper',
    phase: 5,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 740, y: 1100, vx: -60, vy: -115 },
    target: { x: 616, y: 520, r: 28 },
    fixtures: [
      { type: "asteroid", id: "sweep", r: 40, speed: 100, loop: true, path: [{ x: 150, y: 660 }, { x: 820, y: 660 }] }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 595, y: 636, charges: 3 }, { x: 373, y: 931, charges: 1 }]
  },

  // design: combine — World 4 rock plus a moving one: the ledge forbids the
  // wide outside line, so the ship has to go up the inside and the timing is
  // the whole problem. Tolerance 88.
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
    ship: { x: 160, y: 1090, vx: 70, vy: -105 },
    target: { x: 440, y: 552, r: 28 },
    fixtures: [
      { type: "obstacle", id: "ledge", shape: "rect", x: 420, y: 880, w: 480, h: 40 },
      { type: "asteroid", id: "rock", x: 876, y: 620, r: 36, vx: -90, vy: 0 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 420, y: 483, charges: 2 }, { x: 316, y: 471, charges: 2 }]
  },

  // design: optional challenge — the same patrol as w5-2 crossed the other way,
  // which means waiting for the far pass instead of the near one.
  {
    id: 'w5-4',
    name: 'Second Pass',
    phase: 5,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 740, y: 1100, vx: -60, vy: -115 },
    target: { x: 296, y: 536, r: 28 },
    fixtures: [
      { type: "asteroid", id: "sweep", r: 40, speed: 100, loop: true, path: [{ x: 150, y: 660 }, { x: 820, y: 660 }] }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 806, y: 716, charges: 1 }, { x: 454, y: 595, charges: 3 }]
  },

  // =========================================================================
  // WORLD 6 — drones. Responsive movers: the same field that turns the ship
  // hauls them around too, and they start from rest, so they answer a charge far
  // more sharply than the ship does.
  // =========================================================================

  // design: introduce responsive movers — the drone is parked on the line and
  // it falls the same way you do, only harder, because it starts from rest. The
  // charge that turns the ship hauls the drone clear. Tolerance 128.
  {
    id: 'w6-1',
    name: 'Company',
    phase: 6,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 300, y: 1120, vx: 20, vy: -120 },
    target: { x: 376, y: 680, r: 28 },
    fixtures: [
      { type: "drone", id: "drone", x: 360, y: 760, r: 18 }
    ],
    radio: [
      { when: 'start', text: 'That drone is not rock. It falls into your field exactly like you do — every charge you place moves it too.', once: true },
      { when: 'fail', text: 'You moved it into your own path. Put the charge where it drags the drone off the line, not across it.', once: false }
    ],
    hint: null,
    solution: [{ x: 404, y: 549, charges: 3 }]
  },

  // design: develop — two drones, one parked and one already drifting, pulled
  // by the same field in different directions.
  {
    id: 'w6-2',
    name: 'Two of Them',
    phase: 6,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 720, y: 1100, vx: -50, vy: -115 },
    target: { x: 512, y: 704, r: 28 },
    fixtures: [
      { type: "drone", id: "d1", x: 607, y: 840, r: 18 },
      { type: "drone", id: "d2", x: 528, y: 520, r: 20, vx: -20, vy: 0 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 535, y: 616, charges: 3 }, { x: 383, y: 921, charges: 1 }]
  },

  // design: combine — a World 5 rock you cannot move at all and a drone you
  // cannot help moving, crossing the same stretch of board.
  {
    id: 'w6-3',
    name: 'Rock and Drone',
    phase: 6,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 200, y: 1100, vx: 55, vy: -110 },
    target: { x: 504, y: 880, r: 28 },
    fixtures: [
      { type: "asteroid", id: "rock", x: 710, y: 760, r: 34, vx: -110, vy: 0 },
      { type: "drone", id: "drone", x: 535, y: 430, r: 19 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 456, y: 1051, charges: 1 }, { x: 597, y: 1041, charges: 3 }]
  },

  // design: optional challenge — drone plus a wall, so the drone can only be
  // sent one way, and the target is the full height of the board away.
  {
    id: 'w6-4',
    name: 'Tight Company',
    phase: 6,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 5,
    showBodyPreview: true,
    ship: { x: 250, y: 1100, vx: 40, vy: -115 },
    target: { x: 392, y: 296, r: 28 },
    fixtures: [
      { type: "obstacle", id: "wall", shape: "rect", x: 520, y: 860, w: 380, h: 40 },
      { type: "drone", id: "drone", x: 389, y: 700, r: 18 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 244, y: 490, charges: 1 }, { x: 442, y: 253, charges: 3 }]
  },

  // =========================================================================
  // WORLD 7 — deliberate redirection. Stop treating the obstacle as something to
  // fly around: pull it out of the way, or feed it to a well.
  // =========================================================================

  // design: introduce redirection — the drone is parked exactly on the line and
  // the budget is too small to route round it. Swap the drone for rock of the
  // same size and the single-well sweep is EMPTY at 1 AND 2 charges (0 cells of
  // 7500 at step 12); leave it a drone and 412 placements win. The only way
  // through is to pull the drone aside first. Tolerance 96.
  {
    id: 'w7-1',
    name: 'Move It',
    phase: 7,
    optional: false,
    bounds: BOUNDS,
    charges: 2,
    stackLimit: 2,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 450, y: 1120, vx: 0, vy: -130 },
    target: { x: 450, y: 540, r: 28 },
    fixtures: [
      { type: "drone", id: "drone", x: 450, y: 660, r: 19 }
    ],
    radio: [
      { when: 'start', text: 'You cannot get round that one. So do not: put the charge where it pulls the drone off your line before you arrive.', once: true },
      { when: 'fail', text: 'Stop steering yourself. Steer the drone.', once: false }
    ],
    hint: null,
    solution: [{ x: 378, y: 426, charges: 2 }]
  },

  // design: develop — a drone already drifting into the lane. One deep well far
  // out to the right drags it away downrange while the ship coasts through the
  // space it used to be in.
  {
    id: 'w7-2',
    name: 'Disposal',
    phase: 7,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 250, y: 1110, vx: 35, vy: -115 },
    target: { x: 408, y: 616, r: 28 },
    fixtures: [
      { type: "drone", id: "drone", x: 624, y: 700, r: 20, vx: -70, vy: 0 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 786, y: 808, charges: 3 }]
  },

  // design: combine — redirection plus World 4 rock: the wall on the right
  // means the drone can only be sent one way, and that is the way the ship
  // needs it to go.
  {
    id: 'w7-3',
    name: 'Against the Wall',
    phase: 7,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 280, y: 1110, vx: 25, vy: -115 },
    target: { x: 424, y: 584, r: 28 },
    fixtures: [
      { type: "obstacle", id: "wall", shape: "rect", x: 540, y: 840, w: 360, h: 40 },
      { type: "drone", id: "drone", x: 369, y: 700, r: 19 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 499, y: 502, charges: 3 }]
  },

  // design: optional challenge — two drones on the same straight line and one
  // field to move both of them.
  {
    id: 'w7-4',
    name: 'Clear the Lane',
    phase: 7,
    optional: true,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 450, y: 1120, vx: 0, vy: -125 },
    target: { x: 456, y: 768, r: 28 },
    fixtures: [
      { type: "drone", id: "d1", x: 450, y: 780, r: 19 },
      { type: "drone", id: "d2", x: 490, y: 560, r: 19 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 632, y: 620, charges: 3 }]
  },

  // =========================================================================
  // WORLD 8 — mixed systems. No new fixture: the new idea is composition. Static
  // geometry, inert drift and responsive movers in the same box.
  // =========================================================================

  // design: introduce composition — a crag, a sweeping rock and a drone in one
  // box, and only one well to place. Nothing new here; the idea IS the
  // combination. Tolerance 136.
  {
    id: 'w8-1',
    name: 'Everything At Once',
    phase: 8,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 180, y: 1090, vx: 70, vy: -100 },
    target: { x: 480, y: 728, r: 28 },
    fixtures: [
      { type: "obstacle", id: "crag", shape: "circle", x: 640, y: 840, r: 85 },
      { type: "asteroid", id: "rock", x: 945, y: 640, r: 34, vx: -100, vy: 0 },
      { type: "drone", id: "drone", x: 411, y: 860, r: 18 }
    ],
    radio: [
      { when: 'start', text: 'Rock, drift and response in the same box now. No new tricks, Pilot — just all of them at once.', once: true }
    ],
    hint: null,
    solution: [{ x: 635, y: 666, charges: 3 }]
  },

  // design: develop — same three ingredients, but the wall now sits on the side
  // the ship wants to escape to, so the only line left runs straight at the
  // rock lane.
  {
    id: 'w8-2',
    name: 'Down the Middle',
    phase: 8,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 200, y: 1110, vx: 55, vy: -110 },
    target: { x: 344, y: 616, r: 28 },
    fixtures: [
      { type: "obstacle", id: "wall", shape: "rect", x: 560, y: 900, w: 340, h: 40 },
      { type: "asteroid", id: "rock", x: 796, y: 700, r: 34, vx: -105, vy: 0 },
      { type: "drone", id: "drone", x: 540, y: 430, r: 19 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 245, y: 589, charges: 3 }]
  },

  // design: combine — a flat entry across the whole board with a slab
  // underneath, a rock crossing high and a drone in the middle; two 2-stacks to
  // lift out of all three.
  {
    id: 'w8-3',
    name: 'Crosstown',
    phase: 8,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 130, y: 640, vx: 115, vy: -45 },
    target: { x: 392, y: 290, r: 28 },
    fixtures: [
      { type: "obstacle", id: "slab", shape: "rect", x: 380, y: 760, w: 420, h: 40 },
      { type: "asteroid", id: "rock", x: 1250, y: 400, r: 34, vx: -95, vy: 0 },
      { type: "drone", id: "drone", x: 454, y: 500, r: 18 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 324, y: 331, charges: 2 }, { x: 231, y: 285, charges: 2 }]
  },

  // design: optional challenge — entered from the top with a slab across the
  // bottom, so there is no long coast to recover on: the pair has to be right
  // first time.
  {
    id: 'w8-4',
    name: 'The Long Box',
    phase: 8,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 300, y: 160, vx: 55, vy: 100 },
    target: { x: 680, y: 584, r: 28 },
    fixtures: [
      { type: "obstacle", id: "slab", shape: "rect", x: 120, y: 1000, w: 520, h: 40 },
      { type: "asteroid", id: "rock", x: 1044, y: 640, r: 34, vx: -100, vy: 0 },
      { type: "drone", id: "drone", x: 685, y: 860, r: 19 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 731, y: 308, charges: 1 }, { x: 786, y: 458, charges: 3 }]
  },

  // =========================================================================
  // WORLD 9 — hunters. A hunter steers toward the ship AND falls into the field,
  // so the charge that saves you can post it straight into your lap.
  // =========================================================================

  // design: introduce hunters — it steers toward you AND it falls into your
  // field. The obvious charge, between you and it, posts the hunter straight
  // into your path; the charge that works sits past the target so the hunter is
  // always chasing from behind. Tolerance 136.
  {
    id: 'w9-1',
    name: 'Something Follows',
    phase: 9,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 300, y: 1110, vx: 30, vy: -115 },
    target: { x: 566, y: 242, r: 28 },
    fixtures: [
      { type: "hunter", id: "hunter", x: 640, y: 820, r: 18, accel: 60, maxSpeed: 140 }
    ],
    radio: [
      { when: 'start', text: 'Contact. It steers toward you and it falls the same way you do — the charge that saves you can just as easily post it into your lap.', once: true },
      { when: 'fail', text: 'You fed it. Put the charge where the hunter ends up behind you, not in front.', once: false }
    ],
    hint: null,
    solution: [{ x: 693, y: 151, charges: 3 }]
  },

  // design: develop — a faster hunter starting on the far side of the board, so
  // the route has to cross its line early and be gone before it arrives.
  {
    id: 'w9-2',
    name: 'Head Start',
    phase: 9,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 740, y: 1090, vx: -55, vy: -110 },
    target: { x: 224, y: 192, r: 28 },
    fixtures: [
      { type: "hunter", id: "hunter", x: 260, y: 760, r: 18, accel: 70, maxSpeed: 150 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 125, y: 339, charges: 2 }, { x: 268, y: 126, charges: 2 }]
  },

  // design: combine — hunter plus a wall: the wall takes away exactly the
  // escape the hunter is herding you toward.
  {
    id: 'w9-3',
    name: 'Cornered',
    phase: 9,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 220, y: 1100, vx: 50, vy: -110 },
    target: { x: 584, y: 632, r: 28 },
    fixtures: [
      { type: "obstacle", id: "wall", shape: "rect", x: 0, y: 700, w: 330, h: 40 },
      { type: "hunter", id: "hunter", x: 700, y: 880, r: 18, accel: 60, maxSpeed: 140 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 544, y: 680, charges: 2 }, { x: 749, y: 613, charges: 2 }]
  },

  // design: optional challenge — two hunters, symmetric, so any field that
  // helps you against one helps the other reach you.
  {
    id: 'w9-4',
    name: 'Both of Them',
    phase: 9,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 450, y: 1120, vx: 15, vy: -120 },
    target: { x: 424, y: 160, r: 28 },
    fixtures: [
      { type: "hunter", id: "h1", x: 180, y: 820, r: 18 },
      { type: "hunter", id: "h2", x: 720, y: 820, r: 18 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 336, y: 346, charges: 2 }, { x: 492, y: 185, charges: 2 }]
  },

  // =========================================================================
  // WORLD 10 — ore runs. Ore is harmless: it bounces off the ship. Reaching the
  // target is the mission; posting the ore into the depot is a bonus the same
  // field can often manage. Every authored solution here also delivers.
  // =========================================================================

  // design: introduce the ore run — reaching the target is the mission; the
  // same 3-stack that turns the ship also throws the cargo across the board
  // into the depot. Ore is harmless: it bounces.
  {
    id: 'w10-1',
    name: 'Ore Run',
    phase: 10,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 260, y: 1110, vx: 40, vy: -115 },
    target: { x: 432, y: 744, r: 28 },
    fixtures: [
      { type: "ore", id: "ore", x: 690, y: 937, r: 14 },
      { type: "oreReceiver", id: "depot", x: 575, y: 738, r: 50 },
      { type: "obstacle", id: "wall", shape: "rect", x: 0, y: 560, w: 330, h: 40 }
    ],
    radio: [
      { when: 'start', text: 'Cargo in the lane. It is not dangerous — it bounces. Get yourself home first; if the same field posts the ore into the depot, so much the better.', once: true }
    ],
    hint: null,
    solution: [{ x: 545, y: 686, charges: 3 }]
  },

  // design: develop — the depot sits between the ship and the target, so the
  // pair that lifts the ship also has to sweep the cargo the other way past it.
  {
    id: 'w10-2',
    name: 'Delivery',
    phase: 10,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 720, y: 1100, vx: -45, vy: -110 },
    target: { x: 264, y: 312, r: 28 },
    fixtures: [
      { type: "ore", id: "ore", x: 429, y: 662, r: 14 },
      { type: "oreReceiver", id: "depot", x: 314, y: 458, r: 50 },
      { type: "asteroid", id: "rock", x: 880, y: 520, r: 34, vx: -95, vy: 0 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 284, y: 411, charges: 2 }, { x: 311, y: 245, charges: 2 }]
  },

  // design: combine — ore and a drone in the same field: one you want moved,
  // one you do not.
  {
    id: 'w10-3',
    name: 'Consignment',
    phase: 10,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 200, y: 1090, vx: 60, vy: -105 },
    target: { x: 344, y: 248, r: 28 },
    fixtures: [
      { type: "ore", id: "o1", x: 259, y: 679, r: 14 },
      { type: "oreReceiver", id: "depot", x: 387, y: 457, r: 50 },
      { type: "drone", id: "drone", x: 474, y: 420, r: 18 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 404, y: 428, charges: 2 }, { x: 396, y: 203, charges: 2 }]
  },

  // design: optional challenge — two ore rocks, one depot and a post in the
  // way. Both loads can be posted with the field that gets the ship home.
  {
    id: 'w10-4',
    name: 'Double Load',
    phase: 10,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 450, y: 1120, vx: 10, vy: -120 },
    target: { x: 456, y: 208, r: 28 },
    fixtures: [
      { type: "ore", id: "o1", x: 139, y: 518, r: 14 },
      { type: "ore", id: "o2", x: 199, y: 578, r: 14 },
      { type: "oreReceiver", id: "depot", x: 263, y: 304, r: 50 },
      { type: "obstacle", id: "post", shape: "rect", x: 600, y: 420, w: 44, h: 360 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 284, y: 267, charges: 3 }, { x: 790, y: 416, charges: 1 }]
  },

  // =========================================================================
  // WORLD 11 — wormholes. A mover that touches a mouth is posted out of the far
  // one ALWAYS along that mouth’s tick, at the speed it went in. Gravity does
  // not pass through. Plan from the exit.
  // =========================================================================

  // design: introduce wormholes — the mouth sits on your line and posts you out
  // of the far one ALWAYS along the tick on its ring, at the speed you went in.
  // The well is placed for the EXIT, not the entry.
  {
    id: 'w11-1',
    name: 'Through the Throat',
    phase: 11,
    optional: false,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 300, y: 1120, vx: 15, vy: -115 },
    target: { x: 344, y: 568, r: 28 },
    fixtures: [
      { type: "wormhole", id: "gate", r: 26, color: 0, a: { x: 347, y: 760, angle: -1.5708 }, b: { x: 720, y: 880, angle: -0.34907 } }
    ],
    radio: [
      { when: 'start', text: 'Wormhole on your line. You come out of the far mouth along its tick, at the speed you went in — so plan from the exit, not the entry.', once: true }
    ],
    hint: null,
    solution: [{ x: 775, y: 1030, charges: 3 }]
  },

  // design: develop — the throat is the only way past a wall that spans the
  // board, and everything after the exit has to be shaped from the far side.
  // 1157 units of travel.
  {
    id: 'w11-2',
    name: 'Long Distance',
    phase: 11,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 760, y: 1090, vx: -50, vy: -110 },
    target: { x: 152, y: 120, r: 28 },
    fixtures: [
      { type: "wormhole", id: "gate", r: 26, color: 1, a: { x: 637, y: 820, angle: 1.91986 }, b: { x: 180, y: 340, angle: 0.61087 } },
      { type: "obstacle", id: "wall", shape: "rect", x: 300, y: 560, w: 500, h: 40 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 379, y: 285, charges: 1 }, { x: 357, y: 138, charges: 3 }]
  },

  // design: combine — wormhole plus a crossing rock: the jump resets where you
  // are but not how fast, so the timing problem comes through the throat with
  // you.
  {
    id: 'w11-3',
    name: 'Exit Velocity',
    phase: 11,
    optional: false,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 180, y: 1080, vx: 70, vy: -100 },
    target: { x: 520, y: 504, r: 28 },
    fixtures: [
      { type: "wormhole", id: "gate", r: 26, color: 2, a: { x: 376, y: 800, angle: -1.5708 }, b: { x: 700, y: 300, angle: 2.79253 } },
      { type: "asteroid", id: "rock", x: 880, y: 560, r: 34, vx: -100, vy: 0 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 722, y: 563, charges: 2 }, { x: 582, y: 554, charges: 2 }]
  },

  // design: optional challenge — two independent pairs and a drone that falls
  // through them too.
  {
    id: 'w11-4',
    name: 'Two Throats',
    phase: 11,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 450, y: 1130, vx: 0, vy: -120 },
    target: { x: 408, y: 856, r: 28 },
    fixtures: [
      { type: "wormhole", id: "g1", r: 26, color: 3, a: { x: 450, y: 860, angle: 3.14159 }, b: { x: 780, y: 620, angle: 1.5708 } },
      { type: "wormhole", id: "g2", r: 26, color: 4, a: { x: 150, y: 620, angle: 0 }, b: { x: 450, y: 240, angle: -1.5708 } },
      { type: "drone", id: "drone", x: 430, y: 520, r: 18 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 193, y: 724, charges: 3 }, { x: 720, y: 682, charges: 1 }]
  },

  // =========================================================================
  // WORLD 12 — expert gauntlet. Three optional levels, everything at once, and
  // no progression riding on them.
  // =========================================================================

  // design: expert — wall, crossing rock, hunter and drone, four charges and
  // four seconds of preview, 826 units of travel.
  {
    id: 'w12-1',
    name: 'Gauntlet',
    phase: 12,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 220, y: 1110, vx: 50, vy: -110 },
    target: { x: 744, y: 432, r: 28 },
    fixtures: [
      { type: "obstacle", id: "wall", shape: "rect", x: 480, y: 820, w: 420, h: 40 },
      { type: "asteroid", id: "rock", x: 880, y: 480, r: 34, vx: -100, vy: 0 },
      { type: "hunter", id: "hunter", x: 200, y: 520, r: 18 },
      { type: "drone", id: "drone", x: 406, y: 700, r: 18 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 626, y: 533, charges: 2 }, { x: 647, y: 339, charges: 2 }]
  },

  // design: expert — wormhole, ore, depot and a spur of rock: get home through
  // the throat, and post the cargo on the way.
  {
    id: 'w12-2',
    name: 'Cargo Under Fire',
    phase: 12,
    optional: true,
    bounds: BOUNDS,
    charges: 4,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 740, y: 1100, vx: -45, vy: -110 },
    target: { x: 614, y: 344, r: 28 },
    fixtures: [
      { type: "wormhole", id: "gate", r: 26, color: 5, a: { x: 609, y: 780, angle: 2.26893 }, b: { x: 250, y: 320, angle: 0.34907 } },
      { type: "ore", id: "ore", x: 426, y: 277, r: 14 },
      { type: "oreReceiver", id: "depot", x: 735, y: 417, r: 50 },
      { type: "obstacle", id: "spur", shape: "circle", x: 520, y: 480, r: 80 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 666, y: 277, charges: 3 }, { x: 562, y: 168, charges: 1 }]
  },

  // design: expert — the loop again, with a hunter on the board while you fly
  // it. The ship starts inside the reach of where the 3-stack has to go, so it
  // is captured rather than bent, and the target is a lap and a half away.
  {
    id: 'w12-3',
    name: 'Closed Orbit',
    phase: 12,
    optional: true,
    bounds: BOUNDS,
    charges: 3,
    stackLimit: 3,
    previewSeconds: 4,
    showBodyPreview: true,
    ship: { x: 450, y: 880, vx: -100, vy: 0 },
    target: { x: 368, y: 721, r: 28 },
    fixtures: [
      { type: "obstacle", id: "anvil", shape: "circle", x: 250, y: 420, r: 90 },
      { type: "hunter", id: "hunter", x: 760, y: 1080, r: 18 }
    ],
    radio: [],
    hint: null,
    solution: [{ x: 450, y: 660, charges: 3 }]
  }
];
