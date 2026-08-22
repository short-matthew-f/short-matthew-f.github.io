# LW-T8-002 — Test 8 Phone HUD

**Status:** DECLARED — supersedes LW-T8-001 before valid human evidence  
**Build:** T8-0.7.1  
**Design baseline:** 1.7  
**Gameplay base:** frozen M1-0.4.3 / R02-D over R02-C parameters

## Reason for supersession

T8-0.7.0 omitted hidden DOM nodes that the frozen R02-D runtime expects during initialization. The result was a non-starting harness, not gameplay or HUD evidence.

T8-0.7.1 repairs only harness integration:

- restores the full frozen-runtime compatibility DOM while keeping those controls hidden from the candidate production HUD;
- changes Test 8 arming from replacing the frozen `startBattle.onclick` handler to a non-invasive click listener that observes successful battle start;
- leaves gameplay, candidate HUD geometry, guided tasks, and acceptance thresholds unchanged.

No valid T8-0.7.0 evidence exists.

## Frozen test question

Can production controls coexist with the moving battlefield?

## Frozen configuration

- Middle temptation deployment
- 1× simulation
- landscape iPhone-first web/PWA
- live R02-D battlefield

## Required controls

Gold, abilities, Waypoint, lane strip, selected-structure controls, and safe-area behavior.

## Guided interactions

1. Pan battlefield.
2. Rally.
3. Enter Waypoint targeting.
4. Cancel Waypoint.
5. Jump to Mid via lane strip.
6. Open selected-structure controls.
7. Close structure controls.
8. Recenter on Commander.

## Acceptance thresholds

Unchanged from LW-T8-001:

- 8/8 guided interactions;
- all sampled required controls at least 44×44 CSS px;
- all sampled production controls within viewport/safe-area bounds;
- persistent candidate HUD footprint ≤28% of viewport area;
- candidate HUD with transient controls ≤42%;
- at most 1 recorded battlefield-to-control accidental-input risk;
- scored interaction samples landscape;
- YES: HUD can be used without getting in the way;
- YES: ordinary control loop can be operated with one thumb;
- YES: enough battlefield remains visible to read combat motion;
- NO: any required control was hard to hit reliably.
