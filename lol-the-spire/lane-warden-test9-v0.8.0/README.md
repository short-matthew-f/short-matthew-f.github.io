# Lane Warden — Test 9 Distributed Stress & Performance v0.8.0

**Declaration:** LW-T9-001  
**Design baseline:** 1.7

## Purpose

Measure what the target phone sustains when a large Lane Warden battlefield is active, while separating local rendering pressure from offscreen simulation and individual visual subsystems.

This is not a readability test and the stress counts are not shipping wave sizes.

## Run

1. Open as the installed PWA in landscape.
2. Do not background the app during the matrix.
3. Tap **START 80s MATRIX**.
4. Leave the battlefield alone while the eight phases run automatically.
5. When the result panel appears, export **TEST 9 EVIDENCE**.

## Matrix

1. Reference target — 42 local / 168 total actors.
2. Visible actor stress — 90 local / 168 total.
3. Offscreen actor stress — 42 local / 270 total.
4. Projectile stress — reference actors + 160 projectiles.
5. Particle stress — reference actors + 320 particle proxies.
6. Structure stress — reference actors + 48 extra structures.
7. Wide zoom — reference distribution at 0.72 zoom.
8. Compound stress — 90 local / 270 total + all stress subsystems + wide zoom.

Each phase warms for about two seconds, then records about eight seconds of frame timing.

See `LW-T9-001-DECLARATION.md` for preregistered frame/crash thresholds.
