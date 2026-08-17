# v1.1.1 Hotfix

Fixes a startup crash introduced in v1.1 where the upgraded enemy badge helper was generated under the legacy `enemyBadgesV10` name while the new queue renderer called `enemyBadgesV11`.

The hotfix adds a small compatibility helper before the v1.1 runtime loader and cache-busts the loader URL for mobile Safari. No save data, ammo quantities, enemy pressure rules, or combat balance values are changed.
