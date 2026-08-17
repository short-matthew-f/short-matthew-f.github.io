# Idle Pachinko Shootout — Art Direction v1.8

## Goal
Move the presentation from flat/cartoon prototype toward a **gritty occult-Western arcade machine** while preserving mobile readability and lightweight web performance.

## North Star
Think: gunmetal, aged brass, dark walnut, soot, leather, smoke, ember light, spectral color accents, and pulp-horror silhouettes. The game should feel handmade and tactile rather than cute or flat.

## Visual hierarchy
1. **Combat strip** — dramatic silhouettes, readable threats, atmospheric depth.
2. **Pachinko board** — a physical machine: wood, brass, iron, engraved hardware.
3. **Special effects** — bright supernatural color used sparingly against dark materials.
4. **UI** — restrained Western typography and metal/leather framing; less rounded-card softness.

## Character direction
- Longer, more believable proportions.
- Faces mostly obscured by hats, shadow, smoke, glow, or decay.
- Strong silhouettes first; facial detail second.
- Guns and coats should feel weighty.
- Monsters should be disturbing silhouettes, not mascots.
- Animation remains economical: breathing, coat sway, weapon recoil, stagger, lunge, dissolve.

## Enemy families
- **Zombie:** collapsed posture, dragging coat, broken hat brim, asymmetric stance.
- **Ghoul:** low predatory posture, elongated arms, quick jerky movement.
- **Ghost:** translucent vertical silhouette, torn coat tails, internal spectral glow.
- **Troll:** broad shoulder mass, heavy arms, slow grounded movement.
- **Bosses:** larger silhouette language, distinctive hats/props/auras, stronger contrast.

## Board materials
- Backplate: charred walnut / dark lacquered wood.
- Standard pegs: domed brass rivets with highlight, shadow, and slight tarnish.
- Slot dividers: dark iron rails.
- Slot numbers: stamped brass plaques rather than floating boxes.
- Cylinder: revolver-inspired chamber treatment.

## Special peg language
Special pegs should feel like physical machine components, not colored dots.
- **Fire:** ember lens set in blackened brass.
- **Splitter:** twin-prong fork / bifurcated brass cap.
- **Piercing:** steel spike with cool cyan edge reflection.
- **Dynamite:** red blasting-cap housing with hazard ring.
- **Storm:** small induction coil / violet arc ring.

## Color rule
Most of the game stays brown/black/brass. Supernatural colors belong to mechanics:
- Fire — orange/red
- Splitter — teal
- Piercing — cyan steel
- Dynamite — red
- Storm — violet
- Poison — sick green
- Concussive — pale gold
- Ghost / spectral — blue-white

## v1.8 implementation scope
- Replace visible hero/enemy SVG figures with Canvas-rendered gritty silhouettes.
- Add a dedicated peg-overlay renderer with brass/steel physical peg caps.
- Improve board framing and slot plaques.
- Add smoke/grain/edge-darkening treatments to combat and board.
- Preserve existing hit/target/status readability.
- Avoid heavy image downloads; keep this pass procedural and lightweight.

## Future asset pass
Once the composition and proportions are validated, replace procedural silhouettes with authored sprite sheets / painted cutouts while retaining the v1.8 layout, materials, and animation language.
