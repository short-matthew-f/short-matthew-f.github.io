# v0.2.3 deployment note

This Pages build changes R-01 tuning from R01-B to R01-C while freezing DL-001 UX.

Changed simulation knobs are limited to the effective durability representation of structural throughput and Guard/Gate/Bastion/Core durability. `main.js` and `rules.js` remain byte-identical to v0.2.2. Unit movement/combat cadence, pulse cadence, encounter script, gold rules, Commander behavior, tower outgoing behavior, and deployment presets are unchanged.

The deployed browser expresses the conceptual 0.6× structure-throughput hypothesis through equivalent objective durability; `r01c-runtime-adapter.js` scales tower HP only.

The future Attention & Offscreen Threat Signaling experiment is documented but is **not** part of this runtime.
