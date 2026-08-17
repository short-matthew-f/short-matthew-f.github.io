# Idle Pachinko Shootout v1.1 — Ammo Economy + Active Enemy Pressure

## Finite special ammunition

Special ammunition now has two independent progression axes, matching trick pegs:

- **Quantity** — how many chambers may contain that ammunition type at once.
- **Tune Rank** — improves the damage efficiency of every owned round of that type.

Unlocking a special ammunition family grants exactly **one** round. Standard ammunition remains unlimited. Additional copies are crafted individually and become progressively more expensive using the current prototype curve `0.8 × unlock cost × 1.65^(owned-1)`.

The cylinder enforces inventory. A player cannot assign three Incendiary rounds while only owning one. Existing saves that unlocked a family before v1.1 are migrated to one owned round of that family; excess chamber assignments fall back to Standard rather than granting free inventory.

## Active enemy turns

Enemy movement and ordinary attacks are no longer dependent on completing a player reload. That dependency let high-output builds clear a wave before enemies ever received a turn, producing effectively immortal runs.

Enemies now act on a persistent combat clock. The baseline interval begins around 8.5 seconds and gradually compresses with wave pressure toward a 4.7-second floor. This is authored wave scaling, not adaptive scaling from measured player DPS.

## Combat roles

- **Melee** — Zombies and Trolls. They advance through Far → Mid → Near → Cover and attack only from the frontline at Cover.
- **Ranged** — Ghosts and ranged bosses. They can attack from the back of the queue and only advance occasionally.
- **Hybrid** — Ghouls and the Undertaker. They fire weaker potshots while approaching, then switch to stronger melee attacks at Cover.

Boss roles follow their fiction: Madame Dead-Eye, Sheriff Nevermore and The Last Train are ranged; Big Hank is melee; The Undertaker is hybrid.

At most two ordinary attackers fire/strike on one enemy action turn so a three-monster wave creates pressure without producing an unreadable instant burst.

## Visible queue

Only the frontline combatant can occupy the closest band. Followers advance behind it, producing a staggered queue rather than three monsters occupying the hero at once. Ranged enemies can still shoot from behind the frontline.

Each distance band now produces a much larger physical screen movement, and attacks have visible enemy tracers, melee lunges and hero hit reactions. Role badges identify MELEE / RANGED / HYBRID behavior directly on enemies.

## First-death target

The intended fresh-save cadence is now:

- opening minutes: forgiving enough to learn and buy the first upgrades;
- early run: enemy fire begins producing visible chip damage;
- later first session: accumulated damage plus wave scaling should create a credible first death well before a 30-minute untouched run;
- upgrades to damage, reload, HP and mitigation should extend the next push without making the Gunslinger permanently safe.

Enemy base attack scaling has increased from roughly 7.5% to **9% per wave**, while the existing 13.5% HP curve is retained for this playtest. The result should be tested from a clean save before further tuning.
