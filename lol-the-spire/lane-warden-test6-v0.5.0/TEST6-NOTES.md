# Test 6 implementation notes

The Test 6 layer derives scorable truth from the continuously rendered lane-strip state, which is itself derived from the simulation. This keeps the harness focused on whether the global instrument can be read correctly, rather than introducing a second simulation model.

A question is emitted only when its answer is unique enough to score. If a category is temporarily tied or unavailable (for example the Rival is reforming), the harness waits rather than fabricating certainty.

The eight-question run requires coverage of Commander, Rival, front, Bastion, Guard, and exceptional threat. Two categories repeat later to test the same instrument under a more developed battle state.
