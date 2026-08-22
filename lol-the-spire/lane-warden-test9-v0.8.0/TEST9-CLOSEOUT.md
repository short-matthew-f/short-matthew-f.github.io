# Test 9 — Distributed Stress & Performance Closeout

**Declaration:** LW-T9-001  
**Build:** T9-0.8.0  
**Status:** CLOSED — PASS  
**Date:** 2026-08-22

## Result

All 8 preregistered phases passed on the target iPhone in standalone landscape PWA mode.

| Phase | Mean FPS | p95 frame | Max frame | Result |
| --- | ---: | ---: | ---: | --- |
| Reference target | 59.99 | 17 ms | 27 ms | PASS |
| Visible actor stress | 59.99 | 17 ms | 17 ms | PASS |
| Offscreen actor stress | 59.99 | 17 ms | 18 ms | PASS |
| Projectile stress | 59.99 | 17 ms | 22 ms | PASS |
| Particle stress | 59.99 | 17 ms | 21 ms | PASS |
| Structure stress | 59.99 | 17 ms | 19 ms | PASS |
| Wide zoom stress | 59.99 | 17 ms | 18 ms | PASS |
| Compound stress | 59.99 | 17 ms | 19 ms | PASS |

Compound phase: 145 visible actors, 270 total simulated actors, 160 projectile proxies, 320 particle proxies, 48 extra structures, zoom 0.72.

- WebGL context losses: 0
- Background transitions during measured matrix: 0
- Standalone: yes
- Landscape: yes

## Narrow claim

The adapted WebGL stress harness sustains the declared distributed and compound proxy loads on the tested phone. These counts are not shipping wave-size limits, and placeholder geometry is not a production-rendering guarantee. Readability remains a separate constraint.
