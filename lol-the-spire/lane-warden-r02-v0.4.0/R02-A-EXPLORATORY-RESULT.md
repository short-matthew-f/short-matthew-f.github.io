# Lane Warden R-02 — R02-A Exploratory Result

**Run:** 2026-08-22  
**Build:** M1-0.4.0  
**Fixture / parameter revision:** R-02-STRUCTURAL / R02-A  
**Disposition:** useful exploratory evidence; structural promise with two clear tuning defects

## Evidence

Gameplay export:

`lane-warden-M1-0.4.0-R02-A-gameplay-2026-08-22T11-35-23-099Z.json`

The run was exported during an active battle at about 130 seconds rather than after resolution, so no win/loss or post-battle debrief is available.

## What worked

### Rival movement clearly changed player movement

The first six Rival lane decisions were followed by a player Commander lane order to the same destination lane:

- Rival → South at 10.00; Commander ordered South at 14.87 (+4.87 s)
- Rival → North at 28.02; Commander ordered North at 39.02 (+11.00 s)
- Rival → South at 46.03; Commander ordered South at 52.52 (+6.49 s)
- Rival → Mid at 64.05; Commander ordered Mid at 66.93 (+2.88 s)
- Rival → North at 82.07; Commander ordered North at 96.23 (+14.16 s)
- Rival → South at 100.08; Commander ordered South at 105.78 (+5.70 s)

The run contained 12 Commander lane transitions, 7 Rival decisions, one Waypoint use, and two gold Pushes. This is strong behavioral evidence that the Rival entered the player's rotation calculus rather than acting only as a local high-HP mob.

### Concentration created real offensive progress

The middle lane carried the concentrated package. Its first Guard position broke at 114.38 s. By the 130 s snapshot the second Guard stood at 34% while middle pressure remained `above` replacement. North and South Guards remained at 100%.

That is the intended qualitative distinction: concentration accomplished something width did not.

### Rival incapacitation grammar fired

The Rival was incapacitated at 105.73 s, reformed at 117.75 s, and was incapacitated again at 127.10 s. No economy bounty was granted; the reward was the intended temporary macro window.

The second very-fast incapacitation after reform is worth watching in later tuning, but this run alone does not establish that reform-anchor camping is a defect.

### Camera housekeeping stayed low in telemetry

The run recorded only one ordinary lane-strip camera jump plus one Waypoint-target focus despite repeated cross-lane Commander movement. That is encouraging for the 'camera is not a tax' goal, but human readability still requires explicit player feedback and smallest-device validation.

## What did not work yet

### 1. Neglect was not costly enough

At 120 s, North Bastion was 99%, Middle 100%, South 100%. At 130 s, North was still 98%, Middle 100%, South 100%. No Bastion warning or break occurred.

The North rear Frost tower did fall at 104.28 s, but an R02-A telemetry-key collision serialized that event as `type: frost` instead of `type: tower-destroyed`.

The result is that the run contained rotation activity but not the intended three-lane sacrifice clock. The validation benchmark's initial unattended-Bastion hypothesis is roughly 80–110 seconds under representative pressure. R02-A's outer lanes were effectively safe for substantially longer than that.

### 2. Rival choice was too dominated by 'player absent'

All seven Rival decisions reported the same reason: `exploiting your absence`. The Rival therefore demonstrated that it can move the player, but not yet that it can create a varied, baitable opponent-facing macro problem.

R02-B should reduce the absence term, add persistence/hysteresis, and give damaged Guard/offensive pressure more weight so the Rival sometimes contests a winning push instead of simply oscillating toward wherever the Commander is not.

## Engineering defect

The event helper writes `{ type, ...detail }`. `tower-destroyed` passes a detail field also named `type`, so the tower archetype overwrites the event name. R02-B must make event identity authoritative and move the tower archetype to `towerType`.

## Next iteration

R02-B should remain exploratory and change only what this run clearly exposed:

1. increase unattended outer-lane pressure enough to create a real Bastion clock;
2. make Rival rotation scoring less binary and less ping-pong-prone;
3. fix tower-destruction telemetry;
4. retain the successful three-lane strip, junction routing, ordered Guard-line model, ATT-style focus behavior, and deterministic recovery.

No formal Test 6/7/8 verdict is claimed from this run.
