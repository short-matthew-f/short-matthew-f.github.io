# Attention & Offscreen Threat Signaling — Future UX Experiment

**Status:** Recorded implementation hypothesis; **not enabled in R01-C**.  
**Motivation:** Human R01-B play showed that the intended fork can work, but the tester had advance knowledge of what to watch for. The game still needs to prove that a fresh player can notice an important offscreen deterioration without external coaching.

## Goal

Help the player notice **where actionable danger is developing** while preserving the strategic right to ignore that danger and continue a committed push.

This extends existing design-authority requirements for `BastionCritical`, `CommanderEndangered`, Guard threshold legibility, and redundant warning channels. It must not turn the battle into whack-a-mole or imply that the UI's recommended response is mandatory.

## Candidate interaction

1. **Brief toast** on a meaningful transition, e.g. `SOUTH BASTION UNDER PRESSURE` or `CORE EXPOSED`.
2. **Offscreen edge indicator** points toward the actual endangered world object, not merely the lane name.
3. The indicator tracks the object's world position as the camera pans.
4. As the target enters view, the edge indicator visually resolves/locks onto the object's existing marker and fades.
5. **Tap-to-focus** may pan/focus the camera on the endangered object.
6. Normal warnings do **not** automatically seize the camera.
7. A one-time onboarding peek or a major terminal transition such as Bastion break may be separately tested, but must not interrupt active input or become the default behavior.

## Severity model

- **Informational:** Guard pressure/threshold change. Directional treatment optional; no alarm semantics.
- **Danger:** sustained Bastion deterioration or canonical `BastionCritical` transition.
- **Critical:** Core exposed/under attack or `CommanderEndangered` where offscreen awareness is required.

Color may reinforce severity but cannot be the sole carrier. Icon shape, motion, text, and/or sound should redundantly communicate critical states.

## Interaction constraints

- Pointer-transparent except for an intentionally sized indicator target when tap-to-focus is enabled.
- Must not recreate the v0.2.0 overlay obstruction defect.
- Must not issue Commander orders when tapped.
- Must not obscure lane strip, objective state, or battlefield target areas.
- Warning frequency requires suppression/cooldown so sustained damage does not spam toasts.
- Acknowledging or ignoring a warning must not pause combat unless a separate Hold mechanic is explicitly invoked.

## Semantic-source rule

Consume canonical system states where they exist: `BastionCritical`, `CommanderEndangered`, Guard replacement/critical state, and Core exposed/under-fire state. Do not invent duplicate hidden danger thresholds merely for the UI.

## Evidence needed

The eventual human test should use a player who has **not** been told "sacrifice South to breach North." Success evidence is a player independently reporting the intended causal story.

Instrument at minimum: warning type and first appearance time; whether target was onscreen/offscreen; edge-indicator display duration; tap-to-focus use; time from warning to camera acquisition; whether the player changed lane/Commander plan afterward; false-alarm / annoyance debrief.
