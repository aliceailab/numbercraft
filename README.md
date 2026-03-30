# NumberCraft

A Minecraft-style voxel shooter where the combat rules are driven by number theory.

Live demo: https://aliceailab.github.io/numbercraft/

## Overview

NumberCraft mixes a light FPS loop with math-based combat:

- Prime enemies fall to the Prime Blaster
- Composite enemies must be reduced with factor bullets
- Bosses use GCD shield-breaking and LCM core mechanics
- A central safe zone gives you breathing room
- Lava is a lethal hazard for the player
- Endless levels scale enemy count and boss count over time

## Play online

Open the hosted version:

https://aliceailab.github.io/numbercraft/

If GitHub Pages is still finishing a deployment, the site may briefly show a `404` until the latest workflow completes.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

To build a production bundle:

```bash
npm run build
```

## Controls

- `WASD`: move
- `Mouse`: aim
- `Click`: fire
- `Space`: jump
- `Shift`: sprint
- `Esc`: pause or resume
- `1`: equip Prime Blaster
- `2`: equip Factor Cannon
- `3`: equip GCD Pulse
- `Q / E`: change the current factor or pulse value
- `F`: run Fermat Scan after picking up the Fermat Lens

## Camera modes

- Use the on-screen `Third Person` / `First Person` button to switch views
- First-person shows the hand-held weapon HUD
- Third-person shows the player model from behind with gun animations and muzzle-fired shots

## Core combat guide

### 1. Prime Blaster

Use weapon `1` on prime targets.

Examples:

- `2`, `3`, `5`, `7`, `11`, `13` are prime
- prime enemies can be removed immediately with the Prime Blaster

### 2. Factor Cannon

Use weapon `2` on composite targets.

The selected bullet value is shown in the HUD, for example:

- `Factor Cannon [2]`
- `Factor Cannon [3]`
- `Factor Cannon [5]`
- `Factor Cannon [7]`

To damage a composite enemy, the selected factor must divide its current core value.

Example:

- enemy `12`
- shoot with factor `2` -> core becomes `6`
- shoot with factor `3` -> core becomes `2`
- switch to Prime Blaster if the remaining core becomes prime

### 3. Prime core rule

Some composite enemies eventually reduce to a prime core.

Example:

- enemy `33`
- factor hit with `3` -> core becomes `11`
- `11` is prime, so switch to weapon `1` to finish it

### 4. Euler Totient boost

The Totient pickup can transform the enemy core after a valid factor hit.

That means the new core value is not always just simple division. The HUD now says `core` instead of `remain` to make this clearer.

### 5. GCD boss shield

Use weapon `3` on boss shields.

You need the selected pulse value to satisfy the boss gcd rule:

- match `gcd(weapon value, boss number)` to the target shown in the HUD

### 6. LCM boss core

Once the boss shield breaks, switch back to factor bullets.

The boss core only collapses when your successful factor values combine to reach the required LCM target.

## Pickups

### Fermat Lens

- Unlocks `F` scan
- tells you whether the target is prime or composite

### Euler Totient pickup

- upgrades valid factor hits
- can compress the current core value faster

## Safe zone and hazards

### Safe zone

- Blue shielded area in the middle
- Player can enter
- Enemies cannot enter
- Weapons are disabled while you are standing inside it
- Shots also cannot pass through the shield

### Lava

- Red hazard area outside the safe zone
- The player dies instantly on contact
- Enemies are allowed to walk over it

## Health and failure

- Player starts with `100` health
- Each enemy collision removes `20` health
- The player dies after 5 enemy collisions total
- The top-left health bar tracks the current value
- Game over plays a fail jingle and offers a replay button

## Progression

- Level 1 starts with 3 enemies
- Each new level adds 3 more regular enemies
- Level 5 adds the first boss
- After Level 5, each level adds 1 more boss than the last
- You must destroy every enemy on the map to advance

## HUD guide

- `Health`: current player health
- `High Score`: best score saved locally
- `Stage`: current level name
- `Weapon`: currently equipped weapon
- `Selected`: current factor bullet or gcd pulse value
- `Enemies Left`: remaining enemies that must be cleared
- `Target`: number and current core state of the aimed enemy
- `Combat Feed`: immediate gameplay feedback

## Audio

The game includes:

- gameplay background music while actively playing
- shot sounds
- impact and explosion sounds
- button click sounds
- weapon swap sounds
- footstep, jump, landing, and hurt sounds
- fail music on game over

Browser audio usually starts after your first click or key press.

## Pause and replay

- Use the `Pause` button or press `Esc` to pause
- Pausing freezes gameplay and pauses the music
- Use `Resume` to continue
- Use `Replay From Level 1` after game over to restart the run

## Tech stack

- Vite
- Three.js
- Vanilla JavaScript
- GitHub Pages deployment via GitHub Actions

## Project structure

- `src/GameEngine.js`: main loop, HUD state, progression, pause, health
- `src/WorldGenerator.js`: terrain, safe zone, lava, walls
- `src/PlayerController.js`: movement, jumping, camera modes, avatar rig
- `src/EnemySystem.js`: enemy movement, collision, labels, defeat flow
- `src/MathEngine.js`: prime checking, factor logic, gcd/lcm rules, totient effects
- `src/WeaponSystem.js`: weapon selection and factor/gcd cycling
- `src/CombatEffects.js`: tracers, bullets, impacts, destruction effects
- `src/AudioSystem.js`: music and sound effects
- `src/main.js`: UI markup and button wiring

## Notes

- `.playwright-cli` is ignored and not intended for source control
- `dist/` is generated output and is not the primary source of truth
- GitHub Pages deployment uses the repo path `/numbercraft/`
