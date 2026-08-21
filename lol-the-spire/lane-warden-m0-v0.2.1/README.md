# Lane Warden — M0 v0.2.1

First corrected R-01 human decision-test build after the v0.2.0 gameplay-harness playtests.

## What changed

- Corrected Twin Toll's enemy script: fast balanced North, delayed slower siege South.
- Browser and deterministic simulator share `config.js` for fixture/tuning identity.
- R01-B repairs the Bastion→Core sacrifice clock and raises the Guard replacement threshold.
- R01-B gives Siege Ram enough survivability/structure identity to make Siege + delay mechanically possible in the reference probe.
- Gold is scarcer; Push and Overdrive share a 20s cooldown; Push cannot duplicate full lane composition.
- HUD information is tap-through; action/Lab panels start collapsed and close on battlefield taps.
- Gameplay evidence now includes 10s snapshots, kill/intervention breakdowns, Guard-break times, exact fixture script, and a three-question human debrief.

## Evidence status

This is **exploratory human-test tuning**. The deterministic probe is a regression/possibility check, not formal strategy acceptance. Ordinary battle duration still needs work after the decision thesis is confirmed in human play.

The included R01-A Playtest 02 evidence remains preserved as implementation/UX evidence but is excluded from canonical R-01 strategy balance claims because v0.2.0 used the wrong enemy fixture.

## Run locally

Serve this directory over HTTP/HTTPS and open `index.html`. For PWA behavior, use HTTPS or localhost.

## Checks

```bash
node --check config.js
node --check rules.js
node --check main.js
node --check sim-core.js
node tests/smoke.js
node tests/fixture-smoke.js
node tests/sim-regression.js
```
