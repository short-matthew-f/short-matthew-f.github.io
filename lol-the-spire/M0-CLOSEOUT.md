# Lane Warden — M0 Closeout

**Closed:** 2026-08-22  
**Final reference build:** `lane-warden-m0-v0.2.4/`  
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

A separate PR-001 build was planned as a short pressure/commitment probe. The final ATT-001 run already exercised that exploratory question with useful telemetry and a clear human debrief, so creating another near-identical M0 build would add process without adding much information.

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

## Next recommended work

Do not spend another build polishing the M0 HUD or repeat R-01 merely to collect another version number.

The clean design handoff already contains the **R-01–R-04 reference encounter corpus**. R-01 Twin Toll has now done its job as the first two-lane proving ground. The next planned proving ground is **R-02**, which introduces the structural escalation that R-01 deliberately avoided: **three lanes, battlefield geometry, and Rival Commander pressure**.

That makes the next implementation question materially different from the one M0 just answered:

> Can the player preserve global strategic awareness and make deliberate local interventions once three lanes and an adversarial Rival compete for attention on the target phone?

### Recommended next sequence

**Instantiate R-02 in the shared gameplay harness → preserve the proven R-01 camera/input/attention conventions → exercise three-lane geometry and Rival behavior → run smallest-iPhone awareness/input validation → only then tune or broaden human strategic testing.**

Test 0b deterministic resume remains separate work. It should not be smuggled into the R-02 spike unless the build is going to be cited as representative mobile-product evidence that requires serialization/resume.
