# Lane Warden — Test 7 Paired Information Legibility v0.6.1

This build replaces the global-treatment framing of T7-0.6.0 with direct per-category paired comparison.

## What changed

For each of the six required information categories:

1. the player answers the same recognition question once under A and once under B;
2. both treatments use the same underlying battlefield state;
3. A/B presentation order alternates by category;
4. both treatments are then shown side-by-side;
5. the player chooses A, B, or Hybrid for that category;
6. Hybrid may include an optional note describing the desired combination.

No correctness feedback appears until the full test is complete.

## Why

T7-0.6.0 produced useful timing evidence but did not support immediate apples-to-apples comparison. It also framed the design choice too globally. Lane Warden may legitimately want different information treatments for Commander identity, Guard state, Presence, ordinary health, Bastion urgency, and Gate vulnerability.

## Decision output

The primary design artifact is a six-category battlefield information policy, not a universal A/B winner.

Recognition remains a quality gate: 12 exposures, at least 11 correct overall, no category missed under both treatments, clean phone layout, and 44px minimum targets.

See `LW-T7-002-DECLARATION.md` for the frozen method and interpretation.
