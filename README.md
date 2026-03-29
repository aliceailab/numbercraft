# Numbercraft Voxel

A Minecraft-style voxel FPS prototype where shooting mechanics are driven by number theory.

## Features

- Voxel terrain with a central safe zone and lava hazard area
- Prime-only standard blaster
- Factor cannon for composite enemies
- Prime, factor, and GCD weapons tied to number theory combat rules
- Euler Totient and Fermat pickups
- Boss fight with GCD shield-breaking and LCM synchronization
- In-game educational overlay for the active math concept

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL in your browser.

## Controls

- `WASD`: move
- `Mouse`: aim
- `Click`: fire
- `Space`: jump
- `Shift`: sprint
- `1`: Prime Blaster. Use it on prime enemies only.
- `2`: Factor Cannon. Equip this for composite enemies, then use `Q / E` to choose bullets like `2`, `3`, `5`, and `7`.
- `3`: GCD Pulse. This is a separate boss weapon, not a `3` bullet.
- `Q / E`: Change the selected number for the Factor Cannon or GCD Pulse. Example: to finish `6 -> remain 3`, press `2`, then use `Q / E` until the HUD says `Factor Cannon [3]`, then fire.
- `F`: Fermat Scan. After picking up the Fermat Lens, it tells you whether the target is prime or composite.

## Math integration

- Prime enemies are destroyed by the standard weapon.
- Composite enemies store a remaining value that shrinks only under valid factor shots.
- Zone damage is gated by congruence rules such as `n ≡ 1 (mod 4)`.
- There are no modular-zone restrictions. Combat depends on the current enemy number logic.
- The boss shield requires `gcd(weapon, bossNumber)` to match a target.
- The boss core collapses only once the LCM of successful factor rounds reaches a target value.
