# Lane Warden — Test 8 Phone HUD v0.7.0

**Declaration:** LW-T8-001  
**Design baseline:** 1.7  
**Gameplay base:** frozen R02-D / M1-0.4.3 over R02-C parameters

## Purpose

Answer one question: **Can production controls coexist with the moving battlefield on a phone?**

This build overlays a candidate production HUD on the live R02-D battle and guides the player through the interaction combinations most likely to expose mobile problems.

## Included production-HUD surfaces

- gold;
- Waypoint readiness;
- Commander recenter;
- representative battle abilities;
- Waypoint targeting/cancel;
- lane strip;
- selected-structure control and transient detail panel;
- safe-area-aware placement.

The centered TEST 8 task prompt is instrumentation only and is excluded from production-footprint accounting.

## Run

1. Use the locked Middle Temptation deployment and start the battle.
2. Follow the eight HUD tasks in order.
3. Complete the four-question post-test.
4. Export **TEST 8 EVIDENCE** and preserve the JSON.

Winning or losing the underlying battle does not determine Test 8.

## Frozen acceptance gates

See `LW-T8-001-DECLARATION.md`. The build checks task completion, ≥44px touch targets, safe-area containment, persistent/transient footprint, accidental-input risk, landscape operation, one-thumb usability, control coexistence, battle readability, and hit reliability.
