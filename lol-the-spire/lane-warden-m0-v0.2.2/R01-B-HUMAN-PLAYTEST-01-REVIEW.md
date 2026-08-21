# R01-B Human Playtest 01 — v0.2.1 review

## Human UX result

**Battlefield interaction: PASS for this iteration.** The player reported that the battlefield feels pretty easy to use. The v0.2.1 tap-through/collapsed-control change is retained.

## Strategy evidence

### Siege + delay
- loss at 217.2s
- South Bastion broke at 160.9s; Core survived another 56.3s
- neither Guard broke
- 171g remained at loss
- 0 Push / 0 Overdrive

This does not justify a combat nerf/buff by itself. The strategy was not given its intended mid-battle intervention, and the UI did not make the banked 60g fork salient enough.

### Balanced
- win at 210.0s
- North Guard broke 149.02s; South Guard 158.89s
- 2 Push + 1 Overdrive
- no Bastion break
- human debrief: sacrifice **no**; Guard read **unclear**; gold fork **yes**

The gold opportunity-cost mechanism is legible. The intended sacrifice story is not yet established, and Guard replacement language remains too opaque.

### Thin everywhere
- still unresolved at export, 462.7s
- 4 Push + 1 Overdrive; 300g spent
- no Guard break
- no Bastion break

This is strong evidence that the replacement threshold now blocks safe width.

## Disposition

Do **not** change R01-B numbers for v0.2.2. Isolate the remaining usability question:
1. make Guard damage-vs-regeneration state explicit;
2. make 60g intervention readiness visible without occupying battlefield hit area;
3. expose a compact fork cue only when breach progress and a sacrifice clock overlap.

Then rerun Siege + delay before another numerical tuning pass.
