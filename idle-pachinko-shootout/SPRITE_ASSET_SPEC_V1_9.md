# Idle Pachinko Shootout — Normalized Sprite Asset Specification v1.9

## Purpose
Define exactly how the generated character sheets should be interpreted, normalized, named, scaled, anchored, and mapped to animation states before full game integration.

The current generated files are excellent source art, but they are **source sheets**, not final production atlases. v1.9 should preserve the art while normalizing geometry so the renderer never has to guess.

---

# 1. Hard orientation rule

- **Hero artwork faces RIGHT.**
- **Every enemy and boss artwork faces LEFT.**

This is part of the asset contract, not a runtime preference.

Do not routinely mirror final sprites with CSS/Canvas because lighting, gun hands, holsters, coats, hats, and asymmetric costume details were generated for a specific side.

---

# 2. Source files inspected

| Character | Source file | Source size | Source cells |
|---|---|---:|---:|
| Gunslinger | `rugged_gunslinger_five_dynamic_poses.png` | 2172×724 RGBA | 5 |
| Zombie Cowboy | `undead_cowboy_animation_sprite_sheet.png` | 2172×724 RGBA | 5 |
| Ghoul Outlaw | `undead_cowboy_ghoul_sprite_sheet.png` | 1916×821 RGBA | 5 |
| Ghost/Wraith | `ghostly_cowboy_wraith_animation_sprites.png` | 2172×724 RGBA | 5 |
| Grave Troll | `graveyard_troll_cowboy_sprite_lineup.png` | 2172×724 RGBA | 5 |
| The Undertaker | `undertaker_s_spectral_gunslinger_sprite_sheet.png` | 1916×821 RGBA | 5 |
| Madame Dead-Eye | `madame_dead_eye_five_western_boss_poses.png` | 1916×821 RGBA | 5 |
| Big Hank | `big_hank_s_graveyard_rampage_sprite_sheet.png` | 1916×821 RGBA | 5 |
| Sheriff Nevermore | `sheriff_nevermore_spectral_gunslinger_sprite_shee.png` | 1916×821 RGBA | 5 |
| The Last Train | `haunted_ghost_train_boss_sprite_sheet.png` | 1916×821 RGBA | 5 |

All inspected source files contain alpha transparency.

---

# 3. Source-cell geometry

The generated sheets are laid out as five horizontal pose cells.

## 2172 px-wide sheets
Use these source X boundaries:

```text
frame 0: x 0    → 434
frame 1: x 434  → 869
frame 2: x 869  → 1303
frame 3: x 1303 → 1738
frame 4: x 1738 → 2172
```

Widths are `434, 435, 434, 435, 434`.

Use full source Y `0 → 724` for the first-pass renderer. Do not assume every figure touches the same top/bottom.

## 1916 px-wide sheets
Use these source X boundaries:

```text
frame 0: x 0    → 383
frame 1: x 383  → 766
frame 2: x 766  → 1150
frame 3: x 1150 → 1533
frame 4: x 1533 → 1916
```

Widths are `383, 383, 384, 383, 383`.

Use full source Y `0 → 821` for the first-pass renderer.

---

# 4. Measured visible-content bounds

These are alpha-derived content bounds inside the source sheets. They are useful for automated trimming/repacking and reveal which frames have large top/bottom margins.

Format: `(left, top, right, bottom)` in source pixels.

## Gunslinger — 2172×724
- F0 `(18, 15, 434, 696)`
- F1 `(434, 44, 869, 683)`
- F2 `(869, 68, 1303, 689)`
- F3 `(1303, 125, 1738, 685)`
- F4 `(1738, 148, 2144, 691)`

## Zombie Cowboy — 2172×724
- F0 `(41, 44, 434, 676)`
- F1 `(440, 45, 869, 676)`
- F2 `(869, 59, 1303, 674)`
- F3 `(1303, 122, 1738, 674)`
- F4 `(1738, 66, 2136, 671)`

## Ghoul Outlaw — 1916×821
- F0 `(12, 156, 383, 667)`
- F1 `(383, 187, 766, 664)`
- F2 `(766, 223, 1150, 666)`
- F3 `(1150, 212, 1533, 668)`
- F4 `(1533, 163, 1908, 675)`

## Ghost/Wraith — 2172×724
- F0 `(27, 15, 434, 704)`
- F1 `(434, 61, 869, 672)`
- F2 `(869, 91, 1303, 670)`
- F3 `(1303, 69, 1738, 689)`
- F4 `(1738, 43, 2146, 701)`

## Grave Troll — 2172×724
- F0 `(15, 72, 434, 697)`
- F1 `(434, 90, 869, 697)`
- F2 `(869, 100, 1303, 689)`
- F3 `(1303, 21, 1738, 697)`
- F4 `(1738, 91, 2160, 696)`

## The Undertaker — 1916×821
- F0 `(14, 107, 383, 711)`
- F1 `(383, 133, 766, 706)`
- F2 `(766, 128, 1150, 708)`
- F3 `(1150, 134, 1533, 712)`
- F4 `(1533, 214, 1910, 711)`

## Madame Dead-Eye — 1916×821
- F0 `(11, 69, 383, 745)`
- F1 `(383, 111, 766, 738)`
- F2 `(766, 150, 1150, 735)`
- F3 `(1150, 118, 1533, 739)`
- F4 `(1533, 186, 1904, 738)`

## Big Hank — 1916×821
- F0 `(8, 118, 383, 719)`
- F1 `(383, 161, 766, 716)`
- F2 `(766, 104, 1150, 716)`
- F3 `(1150, 102, 1533, 721)`
- F4 `(1533, 182, 1912, 720)`

## Sheriff Nevermore — 1916×821
- F0 `(14, 111, 383, 746)`
- F1 `(383, 153, 766, 736)`
- F2 `(766, 9, 1150, 730)`
- F3 `(1150, 94, 1533, 745)`
- F4 `(1533, 160, 1906, 741)`

## The Last Train — 1916×821
- F0 `(8, 109, 383, 601)`
- F1 `(383, 159, 766, 602)`
- F2 `(766, 179, 1150, 599)`
- F3 `(1150, 138, 1533, 632)`
- F4 `(1533, 167, 1906, 621)`

---

# 5. Animation-state mapping

Frame numbers are zero-based.

## Gunslinger — faces RIGHT
| State | Frame | Notes |
|---|---:|---|
| idle | 0 | default combat stance |
| moveA | 1 | subtle body shift; use sparingly because hero is stationary |
| moveB | 2 | alternate idle/ready motion |
| attack | 3 | clear rightward firing pose |
| hurt | 4 | hit reaction / pre-death |

Hero normally cycles `idle → moveA → idle → moveB` very slowly as breathing/ready motion rather than literally walking.

## Zombie Cowboy — faces LEFT
| State | Frame |
|---|---:|
| idle | 0 |
| moveA | 1 |
| moveB | 2 |
| attack | 3 |
| hurt/death | 4 |

## Ghoul Outlaw — faces LEFT
| State | Frame | Notes |
|---|---:|---|
| idle | 0 | hunched ready pose |
| moveA | 1 | fast close |
| moveB | 2 | strongest rushing pose |
| rangedAttack | 3 | potshot frame |
| hurt/death | 4 | recoil |

For a Ghoul melee attack, use F2 as the anticipation/lunge pose, then the engine's existing lunge transform. Do not reuse the gunshot frame for melee contact.

## Ghost/Wraith — faces LEFT
| State | Frame |
|---|---:|
| idle | 0 |
| driftA | 1 |
| driftB | 2 |
| rangedAttack | 3 |
| hurt/disperse | 4 |

## Grave Troll — faces LEFT
| State | Frame |
|---|---:|
| idle | 0 |
| moveA | 1 |
| moveB | 2 |
| smash | 3 |
| hurt | 4 |

## The Undertaker — faces LEFT
| State | Frame | Notes |
|---|---:|---|
| idle | 0 | ceremonial ready pose |
| moveA | 1 | stalk |
| moveB | 2 | stronger advance |
| attack | 3 | spectral gun attack / summon presentation |
| special/hurt | 4 | use for Grave Toll / heavy reaction |

## Madame Dead-Eye — faces LEFT
| State | Frame |
|---|---:|
| idle | 0 |
| moveA | 1 |
| moveB | 2 |
| attack | 3 |
| hurt | 4 |

## Big Hank — faces LEFT
| State | Frame |
|---|---:|
| idle | 0 |
| moveA | 1 |
| moveB | 2 |
| smash | 3 |
| hurt | 4 |

## Sheriff Nevermore — faces LEFT
| State | Frame | Notes |
|---|---:|---|
| idle | 0 |
| moveA | 1 |
| special/raven | 2 | useful for Raven Veil telegraph |
| rangedAttack | 3 |
| hurt | 4 |

## The Last Train — faces LEFT
| State | Frame | Notes |
|---|---:|---|
| idle | 0 | locomotive looming state |
| moveA | 1 | rolling variation |
| moveB | 2 | rolling variation |
| attack | 3 | spectral discharge / ram presentation |
| damaged | 4 | heavy-hit/breakup state |

The Train should not use humanoid walk timing.

---

# 6. Recommended normalized atlas cells

The source files can be used directly during the first implementation, but the target production repack should use fixed transparent cells.

| Character family | Normalized cell | Five-frame atlas |
|---|---:|---:|
| Hero / Zombie / Ghoul | 256×384 | 1280×384 |
| Ghost | 288×384 | 1440×384 |
| Grave Troll | 288×384 | 1440×384 |
| Undertaker / Dead-Eye / Nevermore | 288×448 | 1440×448 |
| Big Hank | 320×448 | 1600×448 |
| Last Train | 384×320 | 1920×320 |

### Repack rule
For each source frame:
1. crop to measured alpha bounds
2. add 6–10 px transparent safety padding
3. scale uniformly to fit the normalized cell
4. align to the character's common ground/anchor line
5. center around the declared horizontal anchor
6. never non-uniformly stretch

---

# 7. Recommended anchors and game scale

`anchorX` and `anchorY` are normalized within the destination cell.

| Character | anchorX | anchorY | Target game width | Notes |
|---|---:|---:|---:|---|
| Gunslinger | .50 | .97 | 82–90 px | hero-side figure |
| Zombie | .50 | .98 | 70–76 px | standard enemy baseline |
| Ghoul | .52 | .98 | 72–80 px | slightly wider during rush |
| Ghost | .50 | .93 | 78–86 px | wispy tail may extend below anchor |
| Grave Troll | .50 | .98 | 90–98 px | heavy silhouette |
| Undertaker | .50 | .98 | 98–106 px | tall boss |
| Madame Dead-Eye | .50 | .98 | 96–104 px | preserve hair silhouette |
| Big Hank | .50 | .98 | 116–126 px | largest humanoid boss |
| Sheriff Nevermore | .50 | .97 | 102–112 px | raven effects can exceed box visually |
| Last Train | .52 | .90 | 150–172 px | locomotive uses width, not humanoid height |

These are starting values for the 393 px portrait layout. Final tuning should be done on-device.

---

# 8. Frame timing recommendations

| Character | Idle cadence | Move cadence | Attack hold | Hurt hold |
|---|---:|---:|---:|---:|
| Gunslinger | 700–1000 ms subtle alternation | n/a | 150 ms | 190 ms |
| Zombie | 900 ms | 400 ms/frame | 240 ms | 220 ms |
| Ghoul | 650 ms | 250 ms/frame | 190 ms | 180 ms |
| Ghost | 800 ms + float | 450 ms/frame | 210 ms | 200 ms |
| Troll | 1000 ms | 520 ms/frame | 280 ms | 240 ms |
| Undertaker | 900 ms | 420 ms/frame | 230 ms | 240 ms |
| Dead-Eye | 750 ms | 360 ms/frame | 190 ms | 190 ms |
| Big Hank | 1000 ms | 540 ms/frame | 300 ms | 260 ms |
| Nevermore | 800 ms | 380 ms/frame | 210 ms | 210 ms |
| Last Train | 900 ms | 500 ms visual cycle | 260 ms | 250 ms |

These timings are presentation only and must never control actual combat events.

---

# 9. Sprite key / engine mapping

```js
function spriteKey(entity) {
  if (entity === 'hero') return 'hero';
  if (entity.bossType) {
    return {
      undertaker: 'undertaker',
      deadeye: 'deadeye',
      hank: 'hank',
      nevermore: 'nevermore',
      train: 'train'
    }[entity.bossType];
  }
  return {
    zombie: 'zombie',
    ghoul: 'ghoul',
    ghost: 'ghost',
    troll: 'troll'
  }[entity.kind];
}
```

Wraith Deputy uses `ghost` with a `summoned` variant flag.

---

# 10. Proposed production filenames

```text
assets/sprites/
  hero-gunslinger.png
  enemy-zombie.png
  enemy-ghoul.png
  enemy-ghost.png
  enemy-troll.png
  boss-undertaker.png
  boss-deadeye.png
  boss-hank.png
  boss-nevermore.png
  boss-last-train.png
```

Optional later conversion:

```text
assets/sprites-webp/
  hero-gunslinger.webp
  ...
```

Keep PNG masters in the art source archive even if WebP becomes the shipped runtime format.

---

# 11. Quality checks before repack acceptance

Each normalized atlas must pass:

- transparent background preserved
- no neighboring frame pixels bleed into another cell
- no pose clips hat, boots, gun muzzle, ghost flame, raven wing, troll fist, or train smoke
- common ground line is stable across idle/movement frames
- apparent character scale does not visibly jump between frames
- hero reads unmistakably facing right
- enemies/bosses read unmistakably facing left
- attack muzzle direction points toward the opposing side
- silhouette remains readable at actual phone size
- alpha edges do not show a light/black matte halo

---

# 12. Recommended implementation policy

For the **first v1.9 playable integration**, use the original generated sheets with explicit source-cell rectangles so we can evaluate the art in motion immediately.

After pose timing and scale feel correct, run the repack step into the normalized atlases above. That avoids spending time perfecting atlas geometry before we know which poses/scales need adjustment.

In other words:

**source sheets → playable integration → on-device tuning → normalized atlas repack → compression/performance pass.**
