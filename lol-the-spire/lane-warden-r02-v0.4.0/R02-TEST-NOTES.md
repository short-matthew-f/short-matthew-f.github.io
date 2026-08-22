# R-02 v0.4.0 — First-Run Notes

This is an **exploratory structural run**, not a preregistered Test 6, 7, or 8 acceptance attempt.

Run the first human smoke test at **1× simulation speed**.

Primary question:

> Can the player preserve a usable global read while three lanes and a Rival Commander compete for attention, and does Rival movement create a real rotation decision rather than extra combat noise?

Pay attention to:

- whether the three-lane strip stays readable without becoming an autopilot danger score;
- whether `RIVAL → lane` intent is visible early enough to reason about but not so prescriptive that it solves the board;
- whether walking through junctions feels materially different from spending Waypoint;
- whether top↔bottom travel through the middle network is understandable from the battlefield;
- whether the Rival's temporary incapacitation creates a noticeable macro window;
- whether the two-position middle Guard line reads correctly, especially after the first position falls;
- whether offscreen Bastion alerts remain informative without stealing the camera;
- whether any HUD layer blocks intended taps.

At battle end, answer the three debrief questions and export gameplay evidence. A win is not required for the run to be useful.

Do not tune R02-A from one run unless a value creates an obvious structural failure (for example, the Rival never gets a meaningful rotation before the battle ends, or all three Bastions collapse before the player can make a macro choice). Repeated balance work belongs after the structural read is credible.
