# LW-T9-001 — Test 9 Distributed Stress & Performance

**Status:** DECLARED — thresholds frozen before human execution  
**Declared:** 2026-08-22T17:25:00-04:00  
**Design baseline:** 1.7  
**Harness build:** T9-0.8.0  
**Question:** What does the target phone sustain when the battlefield is large and active?

## Device scope

Formal device-scoped target for this run:

- iPhone 15 Pro
- iOS 26.6
- installed standalone PWA
- landscape

A PASS is evidence for this device class only. It does not by itself close any broader smallest-supported-iPhone requirement.

## Harness basis

The renderer and mobile lifecycle/input foundation are derived from the earlier M0 WebGL channel-spike harness, but this is a new preregistered performance matrix. Prior 18 / 42 / 90 crowd results remain exploratory only.

The matrix deliberately distinguishes:

- actors visible in the current camera;
- actors simulated offscreen;
- projectiles;
- particles;
- structures;
- camera zoom / wider visible world.

## Phase timing

Eight automatic phases.

Each phase:

- ~2 seconds warm-up;
- ~8 seconds measured;
- camera/configuration reset at phase boundary.

Target total matrix duration: ~80 seconds plus UI transition overhead.

## Frozen phase matrix

| Phase | Visible/local actor target | Total actors | Projectiles | Particle proxies | Extra structures | Zoom | Purpose |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1. Reference target | ~42 | 168 | 0 | 0 | 0 | 1.00 | Ordinary target performance |
| 2. Visible actor stress | ~90 | 168 | 0 | 0 | 0 | 1.00 | Draw/local actor cost |
| 3. Offscreen actor stress | ~42 | 270 | 0 | 0 | 0 | 1.00 | Simulation/offscreen cost |
| 4. Projectile stress | ~42 | 168 | 160 | 0 | 0 | 1.00 | Projectile cost |
| 5. Particle stress | ~42 | 168 | 0 | 320 | 0 | 1.00 | Particle/draw cost |
| 6. Structure stress | ~42 | 168 | 0 | 0 | 48 | 1.00 | Static-structure draw cost |
| 7. Wide zoom stress | reference distribution | 168 | 0 | 0 | 0 | 0.72 | Wider visible-world cost |
| 8. Compound stress | ~90 local before wide zoom | 270 | 160 | 320 | 48 | 0.72 | Deliberate combined stress |

Counts are stress-harness proxies, not shipping wave sizes or production content limits.

## Recorded metrics

Per phase:

- measured duration;
- frame count;
- mean frame time;
- median frame time;
- 95th-percentile frame time;
- maximum frame time;
- mean FPS;
- sampled visible actor count;
- total actor count;
- declared projectile / particle / structure load;
- camera zoom.

Session:

- WebGL startup;
- context-loss count;
- page lifecycle events when available;
- device/channel/orientation;
- completion of all eight phases.

## Acceptance thresholds

All must hold.

### Session integrity

- all 8 phases complete;
- zero WebGL context losses;
- no harness crash or unrecoverable reload during the matrix;
- measured phases remain landscape;
- run is observed as standalone PWA.

### Reference phase

- mean FPS **≥55**;
- p95 frame time **≤33.4 ms**;
- maximum frame time **≤150 ms**.

### Isolated stress phases 2–7

Each phase individually:

- mean FPS **≥45**;
- p95 frame time **≤33.4 ms**;
- maximum frame time **≤200 ms**.

### Compound stress phase 8

- mean FPS **≥30**;
- p95 frame time **≤50 ms**;
- maximum frame time **≤250 ms**;
- zero context loss/crash.

## Interpretation

A failure of one isolated phase identifies the first optimization target; it does not authorize silently lowering that phase's load or rewriting the threshold after the result.

The compound phase is deliberately beyond the expected ordinary local battle. Its purpose is to establish graceful degradation and headroom, not a shipping encounter target.

Readability remains a separate design question. Passing raw performance does not make 90 visible actors desirable.
