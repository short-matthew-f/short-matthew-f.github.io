# Lane Warden — R-02 Severity Alerts v0.4.3

**Build:** M1-0.4.3  
**Parameter revision:** R02-D  
**Design baseline:** 1.7  
**Patch:** ATT-002

R02-D is a UI-isolation revision over R02-C. Combat pacing, three-lane geometry, Rival behavior, and REFORM-001 remain frozen from v0.4.2.

## ATT-002

The prior edge threat control was hard to see and hard to tap on the target iPhone. R02-D replaces its visible presentation with a compact `!` badge while preserving the existing tap-to-focus behavior and no-camera-seizure rule.

- visible circle: 30 px
- actual tap target: 48 × 48 px
- safe-area inset from the upper-left edge
- grey: informational; no pulse
- yellow: watch; slow pulse
- orange: urgent; faster pulse
- red: critical; fastest pulse
- tap focuses the threatened lane and briefly pauses the pulse as acknowledgement
- reduced-motion preference disables pulse animation

The underlying danger toast remains. ATT-002 changes the edge affordance rather than replacing the toast.

## Severity interpretation

The current exploratory mapping is deliberately simple:

- **Grey / info:** Waypoint and reform-selection confirmations.
- **Yellow / watch:** emerging threats such as a Bastion entering the first warning band.
- **Orange / urgent:** Bastion critical, Commander endangered, or a Guard breach opening.
- **Red / critical:** Bastion lost, Commander incapacitated, or equivalent immediate consequence.

## Evidence

Gameplay exports add `attentionSeverityBadge: true` to structural claims. Attention events record the displayed severity, and attention-focus events record the severity that was tapped.

This remains exploratory. It is not a formal hardware/readability acceptance result.
