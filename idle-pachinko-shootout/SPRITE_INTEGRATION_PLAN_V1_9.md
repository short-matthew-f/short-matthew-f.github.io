# Idle Pachinko Shootout — Sprite Integration Patch Plan v1.9

## Goal
Replace the temporary Canvas-painted character silhouettes with the generated occult-Western character sheets while preserving the stable v1.8 combat engine, focus targeting, lane motion, hit feedback, status effects, and boss behavior.

The implementation should be additive and low-risk: **the engine continues to decide what every entity is doing; the sprite layer only decides how that state is drawn.**

---

## 1. Files to add

### Runtime
- `sprite-v19.js` — loader, metadata, state machine, frame selection, rendering
- `sprite-v19.css` — sprite-canvas sizing, transforms, glow/focus/status compatibility

### Assets
Create `assets/sprites/` and add the normalized production sheets/atlases described in `SPRITE_ASSET_SPEC_V1_9.md`.

Recommended filenames:
- `hero-gunslinger.png`
- `enemy-zombie.png`
- `enemy-ghoul.png`
- `enemy-ghost.png`
- `enemy-troll.png`
- `boss-undertaker.png`
- `boss-deadeye.png`
- `boss-hank.png`
- `boss-nevermore.png`
- `boss-last-train.png`

### Existing files to patch
- `engine-v17.js` — expose stable entity identity/state in DOM attributes and emit animation events
- `art-v18.js` — keep the peg/board hardware renderer, but stop painting replacement character silhouettes once v1.9 sprites are available
- `index.html` — load sprite CSS/JS and bump displayed version

---

## 2. Engine contract: expose state, do not let the art layer infer it

The current art layer infers enemy type by inspecting generated SVG markup. That is acceptable for a temporary skin, but not for production sprites.

Patch `renderEnemies()` so each `.enemy` receives explicit attributes:

```html
<div class="enemy"
     data-enemy-id="..."
     data-kind="zombie"
     data-boss-type=""
     data-role="melee"
     data-lane="1">
```

Bosses use the same contract:

```html
<div class="enemy boss"
     data-kind="boss"
     data-boss-type="undertaker"
     ...>
```

The sprite layer must never parse enemy names to determine art.

### Add lightweight animation events
Emit the following events from the existing engine actions:

- `ips:entityMove` — `{id, kind, bossType}` when an enemy is actively advancing
- `ips:entityAttack` — `{id, kind, bossType, attackType}`
- `ips:entityHit` — `{id, damage, crit, status}`
- `ips:entityDeath` — `{id, kind, bossType}`
- `ips:heroAttack` — `{ammo, crit}`
- `ips:heroHit` — `{damage}`
- `ips:heroDeath`

These events are presentation hints only. Losing one must never affect combat correctness.

---

## 3. Sprite runtime architecture

`sprite-v19.js` owns three things:

1. image preloading/cache
2. animation state per rendered entity
3. drawing the current frame into a small canvas inside the existing `.hero-art` / `.unit-figure` containers

### Metadata shape

```js
const SPRITES = {
  hero: {
    src: 'assets/sprites/hero-gunslinger.png',
    orientation: 'right',
    frames: 5,
    states: { idle: 0, moveA: 1, moveB: 2, attack: 3, hurt: 4 },
    fpsMove: 3.2,
    attackHold: 150,
    hurtHold: 190,
    anchorX: .50,
    anchorY: .96,
    scale: 1.00
  },
  zombie: { ... },
  ghoul: { ... },
  ghost: { ... },
  troll: { ... },
  undertaker: { ... },
  deadeye: { ... },
  hank: { ... },
  nevermore: { ... },
  train: { ... }
};
```

Do **not** bake combat timing into the sprite metadata. Animation timing can be tuned, but attack damage still occurs when the engine says it does.

---

## 4. State priority

Every entity has a presentation-only state machine.

Priority, highest first:

1. `death`
2. `hurt`
3. `attack`
4. `move`
5. `idle`

This prevents an entity from snapping back to walking while displaying a hit or attack pose.

### Suggested durations
- hero attack: 130–170 ms
- enemy ranged attack: 160–220 ms
- enemy melee attack/lunge: 200–280 ms
- hit reaction: 140–210 ms
- death pose hold: 260–400 ms followed by existing fade/removal

Movement alternates between `moveA` and `moveB` at 2.5–4 fps. This is intentionally low-frame animation; the existing continuous lane transform supplies the actual smooth movement.

---

## 5. Rendering strategy

Use one Canvas element per visible character.

Why Canvas instead of CSS background-position:
- the source sheets are not all the same dimensions
- the original generated sheets are not perfectly divisible into pixel-identical production cells
- Canvas lets us use explicit source rectangles and anchors
- hit flashes, alpha, tinting, and ghost effects are easy to layer

Pseudo-code:

```js
function drawSprite(view, meta, frameIndex) {
  const frame = meta.frameRects[frameIndex];
  const ctx = view.ctx;
  ctx.clearRect(0, 0, view.w, view.h);

  ctx.save();
  applyEntityFx(ctx, view.entity);
  ctx.drawImage(
    meta.image,
    frame.x, frame.y, frame.w, frame.h,
    view.dx, view.dy, view.dw, view.dh
  );
  ctx.restore();
}
```

### Rendering loop
Use one `requestAnimationFrame` loop for all sprites. Do not create one timer per entity.

The loop:
1. checks active state/expiry
2. selects frame
3. redraws only when the frame or effect state changes

This keeps iPhone/Safari overhead low.

---

## 6. Character mapping

### Regular enemies
- `kind=zombie` → Zombie Cowboy
- `kind=ghoul` → Ghoul Outlaw
- `kind=ghost` → Ghost/Wraith Gunhand
- `kind=troll` → Grave Troll

### Bosses
- `bossType=undertaker` → The Undertaker
- `bossType=deadeye` → Madame Dead-Eye
- `bossType=hank` → Big Hank
- `bossType=nevermore` → Sheriff Nevermore
- `bossType=train` → The Last Train

### Summons
- Wraith Deputy reuses the Ghost sheet at ~88% scale with a cooler/lower-opacity treatment.

### Elite affixes
Do not generate duplicate sprite sheets.
Apply overlays/effects:
- Armored — gunmetal shoulder/edge overlay + reduced saturation
- Quickdraw — pale amber edge glow / brief motion streak on attack
- Frenzied — ember-red pulse
- Gravebound — sickly green grave-light underlay

---

## 7. Orientation rule

This is a hard production rule:

- **Hero always visually faces right.**
- **All enemies and bosses always visually face left.**

Do not use CSS `scaleX(-1)` as the normal solution because weapon hands, holsters, costume asymmetry, and lighting were authored for direction. Use the correctly oriented generated sheet.

A flip is allowed only as a temporary development fallback if an asset is missing, and must be visually flagged in DEV diagnostics.

---

## 8. Movement animation

Existing lane movement remains unchanged.

The sprite system observes movement by comparing the engine's continuous enemy position between frames or by consuming `ips:entityMove` hints.

### Regular enemy cadence
- Zombie: slow `moveA ↔ moveB`, 2.4 fps
- Ghoul: quick `moveA ↔ moveB`, 4 fps
- Ghost: 2.2 fps plus continuous ±2 px float bob
- Troll: 1.8–2.2 fps, heavier vertical settle

The movement sprite animation should not change actual travel speed.

---

## 9. Attack and hit integration

### Hero
On `ips:heroAttack`:
- switch to hero attack frame
- preserve existing muzzle flash/tracer
- return to idle after attack hold

On `ips:heroHit`:
- switch to hurt frame
- preserve existing screen/hit feedback

### Enemies
On attack:
- show attack pose
- ranged enemies preserve tracer FX
- melee enemies preserve lane lunge FX

On hit:
- use hurt/death frame plus existing CSS/FX flash

Do not encode muzzle flash into every sprite requirement. Existing procedural muzzle flashes are useful and should remain layered over the sprite.

---

## 10. Ghost / supernatural treatment

For Ghost, Undertaker, Nevermore, and Train:
- preserve sheet alpha
- add subtle cyan/blue additive glow beneath the character
- optionally draw a second copy at 8–12% opacity with 1–2 px drift for spectral smear
- avoid large blur filters on the whole DOM node; Safari can become expensive with several simultaneous filtered layers

Use Canvas compositing where possible.

---

## 11. Boss sizing

Bosses should break the regular silhouette scale without covering the UI.

Target visible widths in the 393 px portrait layout:
- normal enemy: ~70–78 px
- Ghost: ~76–84 px including glow
- Troll: ~88–96 px
- normal humanoid boss: ~92–108 px
- Big Hank: ~112–124 px
- Last Train: ~145–175 px wide, custom anchor and reduced vertical height

The existing `.enemy.boss { width: 90px; }` becomes a class-specific CSS variable instead of a single fixed width.

Example:

```css
.enemy { --sprite-w:74px; width:var(--sprite-w); }
.enemy[data-kind="troll"] { --sprite-w:92px; }
.enemy[data-boss-type="hank"] { --sprite-w:118px; }
.enemy[data-boss-type="train"] { --sprite-w:164px; }
```

---

## 12. Focus targeting / statuses

Keep existing interaction layers outside the sprite canvas:
- focus reticle
- HP bar
- enemy name
- STUNNED / BURNING badges
- elite/boss trait badges

This prevents art changes from breaking tap targeting or accessibility.

Status visual overlays can affect the sprite:
- Burn: warm edge pulse
- Stun: existing stars/jitter, reduced movement-frame cadence
- Poison: green underglow only while inside cloud

---

## 13. Art-v18 migration

`art-v18.js` currently paints hero/enemy silhouettes and draws physical pegs.

For v1.9:
- **retain** `setupPegOverlay()`, `metalPeg()`, and board material work
- **disable/remove** `drawHero()`, `drawEnemy()`, `repaintEnemies()` once sprite-v19 is active

Recommended compatibility gate:

```js
if (!window.__ipsSpriteCharacters) {
  drawHero(...);
  repaintEnemies();
}
```

This leaves Canvas-painted characters as a fallback if a sprite asset fails to load.

---

## 14. Loading / failure behavior

Sprites must never block game boot.

### Boot sequence
1. engine boots normally
2. art-v18 provides fallback character art
3. sprite-v19 preloads images
4. each successful asset replaces its fallback art independently

If one image fails:
- that character keeps v1.8 fallback rendering
- DEV telemetry lists `SPRITE FALLBACK: <asset>`
- gameplay continues

No red startup error for a missing cosmetic asset.

---

## 15. Memory/performance requirements

The generated source sheets are large. Do not ship all original full-resolution sheets unchanged forever.

First prototype integration can use them temporarily, but production normalization should target roughly:
- regular characters: 5 frames × ~256–320 px tall source art
- bosses: 5 frames × ~320–420 px tall
- Train: frames around ~420–520 px wide

Prefer WebP after visual validation; retain PNG only when alpha quality materially benefits.

Only preload the five regular cast sheets immediately. Boss sheets can lazy-load when the player enters the relevant region or approaches the boss wave.

---

## 16. Implementation sequence

### Patch A — engine contract
- add data attributes to entity DOM
- add presentation events
- no visual change

### Patch B — sprite loader + hero
- add loader/cache
- replace hero fallback
- verify right-facing pose, attack/hurt timing

### Patch C — four regular enemies
- zombie, ghoul, ghost, troll
- verify continuous lane motion remains smooth
- verify target taps still work

### Patch D — bosses
- Undertaker, Dead-Eye, Hank, Nevermore, Train
- add per-boss scaling/anchors
- lazy-load boss art

### Patch E — polish
- elite overlays
- spectral compositing
- status tint integration
- DEV asset diagnostics

---

## 17. Acceptance criteria

The v1.9 sprite integration is accepted when:

- hero always faces right
- every enemy/boss always faces left
- regular enemies visibly alternate movement poses while their lane position moves continuously
- attack frames appear for both ranged and melee attacks
- hurt pose triggers without altering damage timing
- focus targeting still works on the full visible sprite footprint
- HP/status/elite UI remains readable
- no sprite load failure can prevent game boot
- v1.8 Canvas silhouettes remain a graceful fallback
- iPhone Safari maintains smooth gameplay with three regular enemies and active board physics
- all five bosses display their correct unique art
- Last Train uses custom scale/anchor rather than being forced into a humanoid-sized box
