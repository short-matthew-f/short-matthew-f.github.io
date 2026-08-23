# Tactical sprite bake

The runtime uses phone-optimized sprites baked from the untouched source glTF files. This preserves the fixed tactical camera and Canvas renderer while keeping the full 3D provenance path available.

Run `npm install` and `npm run render` in this directory. The deterministic software bake samples the selected glTF animation poses, applies skinning, renders them through a fixed three-quarter camera, and rebuilds 128 px palette PNGs plus `processed/sprites/tactical-models-atlas.png` and its JSON frame map. It does not require Blender, WebGL, or a browser.

Do not edit files under `assets/models/source/`. Change the manifest or bake script, then regenerate processed output.
