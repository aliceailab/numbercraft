import * as THREE from 'three';
import { MathEngine } from './MathEngine.js';
import { createTextSprite, updateTextSprite } from './textSprites.js';

function makeEnemyMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.2,
    emissive: color,
    emissiveIntensity: 0.12,
  });
}

export class EnemySystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.enemies = [];
    this.nextEnemyId = 1;
  }

  clear() {
    this.enemies.forEach((enemy) => {
      this.scene.remove(enemy.mesh);
      this.scene.remove(enemy.label);
    });
    this.enemies = [];
  }

  spawnWave(definition) {
    this.clear();
    definition.enemies.forEach((enemyDefinition) => this.spawnEnemy(enemyDefinition));
  }

  spawnEnemy(definition) {
    const isBoss = definition.kind === 'boss';
    const geometry = isBoss
      ? new THREE.IcosahedronGeometry(1.85, 1)
      : MathEngine.isPrime(definition.number)
        ? new THREE.OctahedronGeometry(0.72, 0)
        : new THREE.BoxGeometry(1.15, 1.15, 1.15);

    const mesh = new THREE.Mesh(
      geometry,
      makeEnemyMaterial(definition.color ?? (isBoss ? 0xff6a5f : MathEngine.isPrime(definition.number) ? 0xf6e27b : 0x7ed8ff)),
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const y = definition.y ?? this.world.getSpawnHeight(definition.x, definition.z, isBoss ? 2.2 : 1.15);
    mesh.position.set(definition.x, y, definition.z);
    mesh.userData.enemyId = this.nextEnemyId;
    this.scene.add(mesh);

    const label = createTextSprite(this.buildLabelLines(definition), {
      color: definition.labelColor ?? '#fff2cf',
      fontSize: isBoss ? 34 : 44,
      scaleX: isBoss ? 4.8 : 3.4,
      scaleY: isBoss ? 2.1 : 1.7,
    });

    label.position.copy(mesh.position).add(new THREE.Vector3(0, isBoss ? 2.75 : 1.45, 0));
    this.scene.add(label);

    const enemy = {
      id: this.nextEnemyId,
      kind: definition.kind ?? 'regular',
      number: definition.number,
      remaining: definition.number,
      position: mesh.position,
      anchor: new THREE.Vector3(definition.x, y, definition.z),
      hoverLift: isBoss ? 2.2 : 1.15,
      baseY: y,
      baseScale: mesh.scale.clone(),
      verticalVelocity: 0,
      canJump: true,
      jumpStrength: isBoss ? 0 : 6.6,
      zone: definition.zone ?? this.world.getZoneForPosition({ x: definition.x, z: definition.z }),
      speed: definition.speed ?? (isBoss ? 1.0 : 1.05),
      damage: definition.damage ?? (isBoss ? 11 : 8),
      leash: definition.leash ?? (isBoss ? 6 : 4.5),
      mesh,
      label,
      defeated: false,
      hitCooldownUntil: 0,
      requiredShieldHits: definition.requiredShieldHits ?? 3,
      shieldHits: 0,
      shieldBroken: false,
      gcdTarget: definition.gcdTarget ?? null,
      lcmTarget: definition.lcmTarget ?? null,
      coreFactorsApplied: [],
      bobOffset: Math.random() * Math.PI * 2,
    };

    this.enemies.push(enemy);
    this.nextEnemyId += 1;
    return enemy;
  }

  buildLabelLines(enemy) {
    if (enemy.kind === 'boss') {
      return [`Boss ${enemy.number}`, 'Shielded'];
    }

    if (MathEngine.isPrime(enemy.number)) {
      return [`${enemy.number}`, 'prime'];
    }

    return [`${enemy.number}`, `core ${enemy.remaining ?? enemy.number}`];
  }

  update(delta, elapsedTime, playerPosition, onPlayerDamage) {
    this.enemies.forEach((enemy) => {
      if (enemy.defeated) {
        return;
      }

      const bob = Math.sin(elapsedTime * 2.3 + enemy.bobOffset) * 0.15;

      const toPlayer = new THREE.Vector3().subVectors(playerPosition, enemy.mesh.position);
      const horizontalToPlayer = new THREE.Vector3(toPlayer.x, 0, toPlayer.z);
      const distance = horizontalToPlayer.length();

      if (distance > 0.001) {
        horizontalToPlayer.normalize();
        const proposedPosition = enemy.mesh.position.clone().addScaledVector(horizontalToPlayer, enemy.speed * delta);

        if (!this.world.isInSafeZone(proposedPosition, 0.4)) {
          if (enemy.kind !== 'boss') {
            const currentGround = this.world.getSpawnHeight(enemy.mesh.position.x, enemy.mesh.position.z, enemy.hoverLift);
            const nextGround = this.world.getSpawnHeight(proposedPosition.x, proposedPosition.z, enemy.hoverLift);
            const climb = nextGround - currentGround;

            if (climb > 0.35 && enemy.canJump) {
              enemy.verticalVelocity = enemy.jumpStrength;
              enemy.canJump = false;
            }
          }

          enemy.mesh.position.copy(proposedPosition);
          this.world.clampToBounds(enemy.mesh.position, enemy.kind === 'boss' ? 1.8 : 1.1);
        }
      }

      if (enemy.kind === 'boss') {
        enemy.baseY = enemy.anchor.y;
      } else {
        const targetGround = this.world.getSpawnHeight(enemy.mesh.position.x, enemy.mesh.position.z, enemy.hoverLift);
        enemy.verticalVelocity -= 18 * delta;
        enemy.baseY += enemy.verticalVelocity * delta;

        if (enemy.baseY <= targetGround) {
          enemy.baseY = targetGround;
          enemy.verticalVelocity = 0;
          enemy.canJump = true;
        }
      }

      enemy.zone = this.world.getZoneForPosition(enemy.mesh.position);
      enemy.mesh.position.y = enemy.baseY + bob;

      enemy.label.position.copy(enemy.mesh.position).add(new THREE.Vector3(0, enemy.kind === 'boss' ? 2.75 : 1.45, 0));
      enemy.mesh.rotation.y += delta * (enemy.kind === 'boss' ? 0.9 : 0.55);

      if (distance < (enemy.kind === 'boss' ? 2.6 : 1.25) && performance.now() > enemy.hitCooldownUntil) {
        enemy.hitCooldownUntil = performance.now() + 900;
        onPlayerDamage(enemy.damage, enemy.kind === 'boss' ? 'Boss collision' : `${enemy.number} hit you`);
      }
    });
  }

  raycast(raycaster) {
    const meshes = this.enemies.filter((enemy) => !enemy.defeated).map((enemy) => enemy.mesh);
    const hits = raycaster.intersectObjects(meshes, false);

    if (!hits.length) {
      return null;
    }

    const id = hits[0].object.userData.enemyId;
    const enemy = this.enemies.find((candidate) => candidate.id === id);
    return enemy ? { enemy, hit: hits[0] } : null;
  }

  getAliveEnemies() {
    return this.enemies.filter((enemy) => !enemy.defeated);
  }

  getRemainingRequiredEnemies() {
    return this.enemies.filter((enemy) => !enemy.defeated);
  }

  applyShot(enemy, weapon, buffs) {
    let result;

    if (weapon.mode === 'standard') {
      result = MathEngine.evaluateStandardShot(enemy, enemy.zone);
    }

    if (weapon.mode === 'factor') {
      result = MathEngine.evaluateFactorShot(enemy, weapon.value, enemy.zone, buffs);
    }

    if (weapon.mode === 'gcd') {
      result = MathEngine.evaluateGcdShot(enemy, weapon.value);
    }

    if (!result?.ok) {
      return { ok: false, message: result?.message ?? 'Nothing happened' };
    }

    if (weapon.mode === 'factor' && enemy.kind !== 'boss') {
      enemy.remaining = result.remaining;
      const shrinkRatio = Math.max(0.38, Math.sqrt(enemy.remaining / enemy.number));
      enemy.mesh.scale.copy(enemy.baseScale).multiplyScalar(shrinkRatio);
      updateTextSprite(enemy.label, [`${enemy.number}`, `core ${enemy.remaining}`]);
    }

    if (weapon.mode === 'factor' && enemy.kind === 'boss') {
      enemy.coreFactorsApplied = result.newBossFactors;
      updateTextSprite(enemy.label, [`Boss ${enemy.number}`, `lcm ${MathEngine.lcmOf(enemy.coreFactorsApplied)}/${enemy.lcmTarget}`], {
        fontSize: 34,
      });
    }

    if (weapon.mode === 'gcd') {
      enemy.shieldHits = result.shieldHits;
      enemy.shieldBroken = result.shieldBroken;
      updateTextSprite(enemy.label, result.shieldBroken
        ? [`Boss ${enemy.number}`, `Core target lcm ${enemy.lcmTarget}`]
        : [`Boss ${enemy.number}`, `Shield ${enemy.shieldHits}/${enemy.requiredShieldHits}`], {
        fontSize: 34,
      });
    }

    if (result.defeated) {
      enemy.defeated = true;
      this.scene.remove(enemy.mesh);
      this.scene.remove(enemy.label);
    }

    return { ok: true, defeated: result.defeated, message: result.message };
  }
}
