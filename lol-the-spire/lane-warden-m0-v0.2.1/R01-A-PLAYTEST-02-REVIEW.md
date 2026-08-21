# R01-A Playtest 02 — Disposition

**Source:** `lane-warden-M0-0.2.0-R01-A-gameplay-2026-08-21T20-04-25-287Z.json`  
**Build:** M0-0.2.0 / R01-A  
**Disposition:** Valid implementation/UX evidence; **not valid R-01 strategy-tuning evidence** because the v0.2.0 Twin Toll enemy script was nonconformant.

## Completed human runs

- **Siege + delay:** loss 98.6s; South Bastion 84.0s; Core only ~14.6s later; no Guard breach.
- **All-in:** loss 94.1s; South Bastion 79.0s; Core ~15.1s later; no Guard breach.
- **Thin/symmetric:** loss 105.4s; South Bastion 89.6s; Core ~15.8s later; no Guard breach.

## Findings carried forward

1. The first Bastion clock was in the rough expected order of magnitude, but the post-Bastion Core window was much too compressed.
2. R01-A did not allow the concentrated human deployments to establish a Guard breach.
3. The v0.2.0 HUD/overlays impeded battlefield tapping and are treated as a prototype-blocking UX defect.
4. Repeated audio-unlock events exposed noisy/non-idempotent prototype instrumentation.
5. These results must not be used to infer the viability of canonical Twin Toll strategy shapes because the enemy lane cadence/packages were wrong.
