const PRIME_POOL = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];
const COMPOSITE_RECIPES = [
  [2, 2],
  [2, 3],
  [2, 2, 3],
  [3, 3],
  [2, 5],
  [3, 5],
  [2, 2, 5],
  [2, 3, 5],
  [3, 7],
  [5, 5],
  [2, 7],
  [2, 2, 7],
  [3, 3, 5],
  [5, 7],
];
const BOSS_TEMPLATES = [
  { number: 30, gcdTarget: 6, lcmTarget: 6, requiredShieldHits: 2, color: 0xff8678 },
  { number: 20, gcdTarget: 4, lcmTarget: 10, requiredShieldHits: 2, color: 0xff9a70 },
  { number: 15, gcdTarget: 3, lcmTarget: 15, requiredShieldHits: 2, color: 0xffb57d },
  { number: 14, gcdTarget: 2, lcmTarget: 14, requiredShieldHits: 3, color: 0xffa6a1 },
  { number: 42, gcdTarget: 6, lcmTarget: 21, requiredShieldHits: 3, color: 0xff6f88 },
  { number: 70, gcdTarget: 2, lcmTarget: 35, requiredShieldHits: 3, color: 0xff8e68 },
  { number: 105, gcdTarget: 3, lcmTarget: 105, requiredShieldHits: 4, color: 0xffad74 },
];

function fixedPrimeStage() {
  return {
    name: 'Level 1: Prime Panic',
    objective: 'Clear 3 enemies. Use the Prime Blaster on primes, then swap to the Factor Cannon for the composite cube.',
    lessonTitle: 'Prime Numbers',
    lessonBody: 'Prime targets have exactly two positive divisors, so the standard blaster only works on 2, 3, 5, 7, 11, and other primes. To finish the level, you also need to factor the composite cube with weapon 2.',
    enemies: [
      { x: -15, z: -15, number: 2 },
      { x: -6, z: -13, number: 5 },
      { x: -12, z: -7, number: 6 },
    ],
    pickups: [
      { type: 'fermat', x: -10, z: -10 },
    ],
  };
}

function factorStage() {
  const factorRecipes = [
    [2, 2, 3],
    [2, 3, 3],
    [2, 2, 5],
    [3, 7],
    [5, 5],
  ];

  const positions = [
    { x: -15, z: -13 },
    { x: -11, z: -4 },
    { x: -4, z: -15 },
    { x: -2, z: -6 },
    { x: -14, z: -1 },
    { x: -5, z: 6 },
  ];

  const enemies = factorRecipes.map((recipe, index) => ({
    ...positions[index],
    number: recipe.reduce((product, value) => product * value, 1),
  }));

  enemies.push({ x: -8, z: -8, number: 13 });

  return {
    name: 'Level 2: Factor Forge',
    objective: 'Clear 6 enemies. Composite enemies shrink when hit by valid factors, but primes still want weapon 1.',
    lessonTitle: 'Factorization',
    lessonBody: 'Composite targets carry a remaining core value. Every correct factor bullet divides that core, and the Euler Totient pickup compresses the remaining defense after valid hits.',
    enemies,
    pickups: [
      { type: 'totient', x: -10, z: -9 },
    ],
  };
}

function modularStage(world) {
  return {
    name: 'Level 3: Open Range',
    objective: 'Clear 9 enemies. Zone locks are gone, so every miss now comes from number logic, not map position.',
    lessonTitle: 'Open Range',
    lessonBody: 'Area-based restrictions are disabled. If a shot fails now, it is because of the number logic, not because an enemy wandered into a different part of the map.',
    enemies: [
      { x: 13, z: -13, number: 9 },
      { x: 8, z: -5, number: 13 },
      { x: -13, z: 10, number: 8 },
      { x: -6, z: 14, number: 11 },
      { x: 11, z: 8, number: 10 },
      { x: 14, z: 14, number: 15 },
      { x: -13, z: -8, number: 17 },
      { x: 4, z: 15, number: 21 },
      { x: -15, z: 4, number: 19 },
    ],
    pickups: [
      { type: 'totient', x: 10, z: 10 },
    ],
  };
}

function bossStage() {
  return {
    name: 'Level 4: Boss of Common Divisors',
    objective: 'Clear 12 enemies. Break the boss shield with the GCD Pulse, then synchronize factor shots until the LCM reaches 6.',
    lessonTitle: 'GCD and LCM',
    lessonBody: 'The boss shield only reacts when gcd(weapon, 36) equals the required alignment. Once the shield is down, the core tracks the least common multiple of your successful factor shots until it reaches 6.',
    enemies: [
      {
        x: 0,
        z: -13,
        y: 8.3,
        number: 36,
        kind: 'boss',
        speed: 0.8,
        damage: 14,
        leash: 7,
        requiredShieldHits: 3,
        gcdTarget: 6,
        lcmTarget: 6,
        color: 0xff8678,
        labelColor: '#fff3ee',
      },
      { x: -12, z: 12, number: 14 },
      { x: 12, z: -12, number: 19 },
      { x: -14, z: -4, number: 21 },
      { x: 14, z: 6, number: 25 },
      { x: -15, z: -15, number: 11 },
      { x: -6, z: -15, number: 18 },
      { x: 6, z: -15, number: 23 },
      { x: 15, z: -6, number: 27 },
      { x: 15, z: 6, number: 29 },
      { x: 6, z: 15, number: 33 },
      { x: -6, z: 15, number: 35 },
    ],
    pickups: [
      { type: 'totient', x: 0, z: 0 },
    ],
  };
}

function seededValue(stage, index) {
  const value = Math.sin((stage + 1) * 91.17 + (index + 1) * 17.23) * 43758.5453;
  return value - Math.floor(value);
}

function buildSpawnSlots(world) {
  const slots = [];

  for (let x = -15; x <= 15; x += 3) {
    for (let z = -15; z <= 15; z += 3) {
      if (world.isInSafeZone({ x, z }, -0.5)) {
        continue;
      }

      if (world.isLavaAt(x, z)) {
        continue;
      }

      slots.push({ x, z });
    }
  }

  return slots;
}

function pickSlots(world, count, stage) {
  const slots = buildSpawnSlots(world)
    .map((slot, index) => ({
      ...slot,
      sortKey: seededValue(stage, index),
    }))
    .sort((a, b) => a.sortKey - b.sortKey);

  return slots.slice(0, count).map(({ x, z }) => ({ x, z }));
}

function makeRegularNumber(stage, index) {
  const compositeBias = stage > 2 ? 0.68 : 0.45;
  const roll = seededValue(stage, index);

  if (roll > compositeBias) {
    return PRIME_POOL[(stage + index * 2) % PRIME_POOL.length];
  }

  const recipe = COMPOSITE_RECIPES[(stage * 3 + index) % COMPOSITE_RECIPES.length];
  const multiplier = stage >= 8 && seededValue(stage, index + 30) > 0.74 ? 2 : 1;
  return recipe.reduce((product, value) => product * value, 1) * multiplier;
}

function makeBoss(stage, index, slot) {
  const template = BOSS_TEMPLATES[(stage + index) % BOSS_TEMPLATES.length];
  const shieldBonus = Math.floor(Math.max(0, stage - 5) / 4);

  return {
    ...slot,
    y: 8.1,
    kind: 'boss',
    number: template.number,
    speed: 0.78 + Math.min(0.3, stage * 0.02),
    damage: 14 + stage,
    leash: 999,
    requiredShieldHits: template.requiredShieldHits + shieldBonus,
    gcdTarget: template.gcdTarget,
    lcmTarget: template.lcmTarget,
    color: template.color,
    labelColor: '#fff3ee',
  };
}

function endlessStage(stage, world) {
  const bossCount = stage >= 5 ? stage - 4 : 0;
  const regularCount = stage * 3;
  const slots = pickSlots(world, regularCount + bossCount, stage);
  const enemies = [];

  for (let index = 0; index < regularCount; index += 1) {
    const slot = slots[index];
    enemies.push({
      ...slot,
      number: makeRegularNumber(stage, index),
      speed: 0.95 + Math.min(0.35, stage * 0.018),
      damage: 8 + Math.floor(stage / 3),
      leash: 999,
    });
  }

  for (let bossIndex = 0; bossIndex < bossCount; bossIndex += 1) {
    const slot = slots[regularCount + bossIndex];
    enemies.push(makeBoss(stage, bossIndex, slot));
  }

  const pickups = [
    { type: 'totient', x: 0, z: 0 },
  ];

  if (stage === 5 || stage % 3 === 0) {
    pickups.push({ type: 'fermat', x: 2, z: 0 });
  }

  return {
    name: `Level ${stage}: Endless Surge`,
    objective: `Destroy all ${regularCount} enemies and ${bossCount} boss${bossCount === 1 ? '' : 'es'} to advance.`,
    lessonTitle: 'Endless Mode',
    lessonBody: 'The run is now infinite. Every new level adds 3 regular enemies, and Level 5 onward adds one more boss each time.',
    enemies,
    pickups,
  };
}

export class StageFactory {
  static create(stage, world) {
    if (stage === 1) {
      return fixedPrimeStage();
    }

    if (stage === 2) {
      return factorStage();
    }

    if (stage === 3) {
      return modularStage(world);
    }

    if (stage === 4) {
      return bossStage();
    }

    return endlessStage(stage, world);
  }
}
