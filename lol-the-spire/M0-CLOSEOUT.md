# Lane Warden — M0 Closeout

**Closed:** 2026-08-22  
**Final R-01 human reference build:** `lane-warden-m0-v0.2.4/`  
**Gameplay candidate:** `R01-C`  
**UX layers retained:** `DL-001`, `ATT-001`

## Disposition

M0 has done the job it was supposed to do: reduce preproduction risk and show that the core Lane Warden decision can exist on the target delivery channel.

This is a **prototype/playtest closeout**, not a shipping-balance acceptance declaration.

## What the M0 evidence supports

### Delivery / interaction

- Test 0a closed as a **COMPOSITE PASS**.
- The large battlefield, pan/tap interaction, distributed actors, and Web/PWA delivery path are no longer the primary preproduction risk.
- The tap-through/collapsed HUD interaction from v0.2.1 onward is retained.

### Pressure / commitment

- `Thin` can remain below the Guard replacement threshold rather than winning through inevitable chip.
- `Siege + delay` can create an above-replacement offensive and a bounded sacrifice clock.
- DL-001 made the Guard replacement read and intervention fork legible under informed human play.
- The player has repeatedly produced `sacrifice=yes / guardRead=clear / goldFork=yes` in the R01-C line.

### Attention without coercion

The final v0.2.4 human run is strong exploratory evidence for ATT-001:

- fork open: **158s**;
- North Guard broken: **175.98s**;
- South warning: **186s**;
- explicit focus taps: **204s**, **210s**;
- South critical: **234s**;
- decisive 60g North overdrive: **258.73s**;
- South Bastion lost: **265.2s**;
- Core under attack: **268s**;
- Gate win: **286.6s**;
- Core remaining: **65.2%**.

The important behavioral result is that the warning successfully drew attention **without forcing rescue behavior**. The player inspected South and still chose to spend the scarce intervention on North.

## PR-001 disposition

A separate PR-001 build was planned as a short pressure/commitment probe. The final ATT-001 run already exercised that exploratory question with useful telemetry and a clear human debrief, so creating another near-identical R-01 build would add process without adding much information.

PR-001 is therefore **satisfied as exploratory coverage, not a formal PASS**. No acceptance threshold was preregistered.

## Claims M0 does not make

M0 does not establish:

- shipping R-01 balance;
- a formal 5–10 minute battle-duration acceptance result;
- independent teaching/discoverability with a fresh uncoached player;
- representative-Gate strategic diversity across a seed bank;
- three-lane hardware/awareness viability;
- Rival Commander behavior;
- Reclamation behavior;
- Test 0b deterministic resume.

## Immediate engineering handoff

The shared harness now contains enough real simulation state that the roadmap's **M0.5 / Test 0b entry** is no longer premature. Do that hardening now, while R-01 is frozen and well understood, rather than mixing persistence defects with the first three-lane/Rival implementation.

`lane-warden-m0-v0.3.0/` is therefore an engineering-only DET-001 build over frozen R01-C. Its job is fixed-step simulation, one automatic recovery snapshot, background suspension, exact snapshot round-trip, and exact resumed continuation. It is not new R-01 balance evidence.

## Next gameplay proving ground

The clean design handoff already contains the **R-01–R-04 reference encounter corpus**. After Test 0b closes, the next gameplay proving ground is **R-02**, which introduces the structural escalation R-01 deliberately avoided: **three lanes, battlefield geometry, and Rival Commander pressure**.

That next gameplay question is:

> Can the player preserve global strategic awareness and make deliberate local interventions once three lanes and an adversarial Rival compete for attention on the target phone?

### Recommended sequence

**Close Test 0b on frozen R-01 → instantiate R-02 on the hardened harness → preserve the proven camera/input/attention conventions → exercise three-lane geometry and Rival behavior → run smallest-phone awareness/input validation → only then tune or broaden human strategic testing.**
