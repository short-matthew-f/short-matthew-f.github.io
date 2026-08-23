# Lane Warden tactical model assets

Build P2-0.16.0 uses selected assets by **Quaternius** from the RPG Character Pack, Ultimate Animated Character Pack, Ultimate Monsters, and Ultimate Fantasy RTS. Each authoritative pack page identifies the pack as **CC0 1.0 Universal**, free for personal and commercial use. The untouched downloaded `LICENSE.txt` supplied with each pack is preserved beside its source models under `assets/models/source/quaternius/`.

- RPG Character Pack: https://quaternius.com/packs/rpgcharacters.html
- Ultimate Animated Character Pack: https://quaternius.com/packs/ultimatedanimatedcharacter.html
- Ultimate Monsters: https://quaternius.com/packs/ultimatemonsters.html
- Ultimate Fantasy RTS: https://quaternius.com/packs/ultimatefantasyrts.html
- CC0 legal code: https://creativecommons.org/publicdomain/zero/1.0/

The complete per-file provenance, checksum, Lane Warden role, and transformation record is authoritative in `assets/manifests/tactical-models.json`.

## Transformation policy

Original glTF files remain untouched. Runtime PNGs are deterministic derivatives made by `assets/tools/render-tactical-sprites.mjs`: it samples selected animation poses, applies skinning, renders through the fixed three-quarter game camera, normalizes scale and palette, and packs 128 px frames into one atlas. The Siege Ram and tower attachments are original lightweight runtime proxies and do not incorporate third-party art.
