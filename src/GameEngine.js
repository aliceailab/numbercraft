import * as THREE from 'three';
import { AudioSystem } from './AudioSystem.js';
import { CombatEffects } from './CombatEffects.js';
import { EnemySystem } from './EnemySystem.js';
import { MathEngine } from './MathEngine.js';
import { PlayerController } from './PlayerController.js';
import { StageFactory } from './StageFactory.js';
import { WeaponSystem } from './WeaponSystem.js';
import { WorldGenerator } from './WorldGenerator.js';
import { createTextSprite } from './textSprites.js';

function makePickupMesh(type) {
  const color = type === 'totient' ? 0xf5df77 : 0x9effc5;
  const geometry = type === 'totient'
    ? new THREE.DodecahedronGeometry(0.45, 0)
    : new THREE.TorusKnotGeometry(0.27, 0.1, 70, 12);

  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.18,
      metalness: 0.38,
      roughness: 0.34,
    }),
  );
}

export class GameEngine {
  constructor(ui) {
    this.ui = ui;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    ui.viewport.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ec5ff);
    this.scene.fog = new THREE.Fog(0x8ec5ff, 24, 78);

    this.clock = new THREE.Clock();
    this.world = new WorldGenerator(this.scene);
    this.player = new PlayerController(this.renderer);
    this.weaponSystem = new WeaponSystem();
    this.enemySystem = new EnemySystem(this.scene, this.world);
    this.combatEffects = new CombatEffects(this.scene);
    this.audioSystem = new AudioSystem();

    this.scene.add(this.player.yaw);

    this.pickups = [];
    this.currentStageDefinition = null;
    this.hasFermatScanner = false;
    this.stageNumber = 1;
    this.currentObjective = '';
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.highScoreBeaten = false;
    this.gameOver = false;
    this.introActive = true;
    this.paused = false;
    this.pendingStageAdvanceAt = null;
    this.victory = false;
    this.bannerTimeout = null;
    this.feedbackUntil = 0;
    this.activeFeedback = 'Click to lock the cursor, then clear the prime mobs first.';
    this.totientUntil = 0;
    this.nextFootstepAt = 0;

    this.setupScene();
    this.bindEvents();
    this.resize();
    this.loadStage(1);
  }

  loadHighScore() {
    try {
      return Number(window.localStorage.getItem('numbercraft-high-score') ?? 0);
    } catch {
      return 0;
    }
  }

  saveHighScore() {
    try {
      window.localStorage.setItem('numbercraft-high-score', String(this.highScore));
    } catch {
      // Ignore storage failures and keep the session running.
    }
  }

  setupScene() {
    this.world.build();

    const sun = new THREE.DirectionalLight(0xfff2c1, 2.3);
    sun.position.set(16, 28, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    this.scene.add(sun);

    this.scene.add(new THREE.AmbientLight(0x8fbef0, 1.25));

    const skyOrb = new THREE.Mesh(
      new THREE.SphereGeometry(94, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xdff0ff,
        side: THREE.BackSide,
      }),
    );
    this.scene.add(skyOrb);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && !this.introActive && !this.gameOver) {
        event.preventDefault();
        this.togglePause();
        return;
      }

      if (this.gameOver || this.introActive || this.paused) {
        return;
      }

      this.audioSystem.unlock();

      const selection = this.weaponSystem.handleKey(event.code);

      if (selection) {
        this.showSelection(selection);
        this.syncWeaponView('switch');
        this.audioSystem.swap(this.weaponSystem.mode.id);
        this.player.setWeaponStyle(this.weaponSystem.mode.id, this.weaponSystem.value);
        this.player.triggerWeaponSwap();
      }

      if (event.code === 'KeyF') {
        this.runFermatScan();
      }
    });

    this.renderer.domElement.addEventListener('mousedown', (event) => {
      if (event.button !== 0) {
        return;
      }

      if (this.gameOver || this.introActive || this.paused) {
        return;
      }

      this.audioSystem.unlock();

      if (!this.player.pointerLocked) {
        this.player.lockPointer();
        this.setFeedback('Cursor locked. Solve the wave with the right math rule.');
        return;
      }

      this.fireWeapon();
    });
  }

  resize() {
    const { clientWidth, clientHeight } = this.ui.viewport;
    this.renderer.setSize(clientWidth, clientHeight);
    this.player.resize(clientWidth, clientHeight);
  }

  setIntroActive(active) {
    this.introActive = active;

    if (active) {
      this.setPaused(false);
      this.audioSystem.stopMusic();
      document.exitPointerLock?.();
    } else {
      this.audioSystem.startMusic();
    }
  }

  setPaused(paused) {
    if (this.introActive || this.gameOver) {
      this.paused = false;
      this.ui.pauseOverlay?.classList.add('is-hidden');
      if (this.ui.pauseToggle) {
        this.ui.pauseToggle.textContent = 'Pause';
      }
      return this.paused;
    }

    this.paused = paused;
    this.ui.pauseOverlay?.classList.toggle('is-hidden', !paused);

    if (this.ui.pauseToggle) {
      this.ui.pauseToggle.textContent = paused ? 'Resume' : 'Pause';
    }

    if (paused) {
      this.audioSystem.pauseAll();
      document.exitPointerLock?.();
      this.showBanner('Paused');
      this.setFeedback('Game paused. Press Resume or Esc to continue.');
    } else {
      this.audioSystem.resumeAll();
      this.showBanner('Resume');
      this.setFeedback('Back in action.');
    }

    return this.paused;
  }

  togglePause() {
    return this.setPaused(!this.paused);
  }

  getStageDefinition(stage) {
    return StageFactory.create(stage, this.world);
  }

  loadStage(stage) {
    const definition = this.getStageDefinition(stage);
    this.currentStageDefinition = definition;
    this.stageNumber = stage;
    this.currentObjective = definition.objective;
    this.pendingStageAdvanceAt = null;
    this.enemySystem.spawnWave(definition);
    this.positionPlayerForStage(definition);
    this.clearPickups();
    definition.pickups.forEach((pickup) => this.spawnPickup(pickup));
    this.showBanner(definition.name);
    this.setFeedback(definition.objective);
  }

  playUiClick() {
    this.audioSystem.unlock();
    this.audioSystem.click();
  }

  toggleCameraMode() {
    const isThirdPerson = this.player.toggleViewMode();
    this.syncViewHud();
    this.showBanner(isThirdPerson ? 'Third Person' : 'First Person');
    this.setFeedback(isThirdPerson
      ? 'Third-person camera enabled. Click to keep aiming with the crosshair.'
      : 'First-person camera restored.');
    return this.player.viewModeLabel;
  }

  positionPlayerForStage(definition) {
    const candidateSpawns = [
      { x: -16, z: 16 },
      { x: 16, z: 16 },
      { x: 16, z: -16 },
      { x: -16, z: -16 },
      { x: 0, z: 16 },
      { x: 16, z: 0 },
      { x: -16, z: 0 },
      { x: 0, z: -16 },
    ];
    const safeCandidates = candidateSpawns.filter((candidate) => !this.world.isLavaAt(candidate.x, candidate.z));
    const availableCandidates = safeCandidates.length > 0 ? safeCandidates : candidateSpawns;

    let bestSpawn = availableCandidates[0];
    let bestDistance = -Infinity;

    availableCandidates.forEach((candidate) => {
      const closestEnemyDistance = definition.enemies.reduce((minimum, enemy) => {
        const distance = Math.hypot(candidate.x - enemy.x, candidate.z - enemy.z);
        return Math.min(minimum, distance);
      }, Infinity);

      if (closestEnemyDistance > bestDistance) {
        bestDistance = closestEnemyDistance;
        bestSpawn = candidate;
      }
    });

    if (this.world.isLavaAt(bestSpawn.x, bestSpawn.z)) {
      const fallback = this.findNearestSafeSpawn(bestSpawn);
      if (fallback) {
        bestSpawn = fallback;
      }
    }

    const playerY = this.world.getGroundHeight(bestSpawn.x, bestSpawn.z) + this.player.eyeHeight;
    this.player.position.set(bestSpawn.x, playerY, bestSpawn.z);
    this.player.velocity.set(0, 0, 0);
    this.player.canJump = true;
    this.world.clampToBounds(this.player.position, 1.1);
  }

  findNearestSafeSpawn(origin) {
    let nearest = null;
    let nearestDistance = Infinity;

    for (let x = -this.world.size; x <= this.world.size; x += 1) {
      for (let z = -this.world.size; z <= this.world.size; z += 1) {
        if (this.world.isLavaAt(x, z)) {
          continue;
        }

        const distance = Math.hypot(origin.x - x, origin.z - z);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { x, z };
        }
      }
    }

    return nearest;
  }

  awardScore(amount, reason) {
    this.score += amount;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();

      if (!this.highScoreBeaten) {
        this.highScoreBeaten = true;
        this.showBanner('New High Score');
        this.setFeedback(`New high score: ${this.highScore}. ${reason}`);
        this.ui.highScoreValue.closest('.corner-card')?.classList.add('is-celebrating');
        window.setTimeout(() => {
          this.ui.highScoreValue.closest('.corner-card')?.classList.remove('is-celebrating');
        }, 2600);
      }
    }
  }

  clearPickups() {
    this.pickups.forEach((pickup) => {
      this.scene.remove(pickup.mesh);
      this.scene.remove(pickup.label);
    });
    this.pickups = [];
  }

  spawnPickup(definition) {
    const mesh = makePickupMesh(definition.type);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(definition.x, this.world.getSpawnHeight(definition.x, definition.z, 1.5), definition.z);
    this.scene.add(mesh);

    const label = createTextSprite(
      definition.type === 'totient'
        ? ['Euler Totient', 'defense shred']
        : ['Fermat Lens', 'prime scan'],
      {
        fontSize: 24,
        scaleX: 3.9,
        scaleY: 1.5,
        color: definition.type === 'totient' ? '#fff8d1' : '#d9ffea',
      },
    );

    label.position.copy(mesh.position).add(new THREE.Vector3(0, 1.2, 0));
    this.scene.add(label);

    this.pickups.push({
      ...definition,
      mesh,
      label,
      anchorY: mesh.position.y,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  collectPickup(pickup) {
    if (pickup.type === 'totient') {
      this.totientUntil = performance.now() + 12000;
      this.setFeedback('Euler Totient boost active. Valid factor shots now compress enemy defenses.');
    }

    if (pickup.type === 'fermat') {
      this.hasFermatScanner = true;
      this.setFeedback('Fermat Lens collected. Press F to detect prime and composite targets instantly.');
    }

    this.scene.remove(pickup.mesh);
    this.scene.remove(pickup.label);
    this.pickups = this.pickups.filter((candidate) => candidate !== pickup);
  }

  runFermatScan() {
    if (!this.hasFermatScanner) {
      this.setFeedback('Find the Fermat Lens pickup to unlock prime detection.');
      return;
    }

    const hit = this.enemySystem.raycast(this.player.getAimRaycaster());
    if (!hit) {
      this.setFeedback('Fermat scan found no target under the crosshair.');
      return;
    }

    const result = MathEngine.fermatScan(hit.enemy);
    this.setFeedback(result.message);
  }

  fireWeapon() {
    if (this.gameOver) {
      return;
    }

    if (this.world.isInSafeZone(this.player.position, 0.2)) {
      this.showBanner('Safe Zone');
      this.setFeedback('Weapons are disabled inside the Safe Zone. Step outside the blue shield to fire.');
      this.audioSystem.reject();
      return;
    }

    if (!this.weaponSystem.tryFire()) {
      return;
    }

    this.audioSystem.fire(this.weaponSystem.mode.id, this.weaponSystem.value);
    this.player.triggerWeaponFire();

    const raycaster = this.player.getAimRaycaster();
    const hit = this.enemySystem.raycast(raycaster);
    const shotEnd = hit
      ? hit.hit.point.clone()
      : raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 28);
    const shotStart = this.player.getShotOrigin().clone();
    const shotDirection = shotEnd.clone().sub(shotStart).normalize();
    const shieldHit = this.world.getSafeZoneShieldHit(
      shotStart,
      shotDirection,
      shotStart.distanceTo(shotEnd),
    );

    if (shieldHit) {
      this.combatEffects.spawnProjectile(shotStart, shieldHit, true);
      this.combatEffects.spawnTracer(
        shotStart,
        shieldHit,
        this.weaponSystem.mode.id,
        this.weaponSystem.value,
        true,
      );
      this.combatEffects.spawnImpact(
        shieldHit,
        this.weaponSystem.mode.id,
        this.weaponSystem.value,
        false,
      );
      this.setFeedback('The Safe Zone shield blocked that shot.');
      this.showSelection(this.weaponSystem.getSelectionSummary());
      this.syncWeaponView('fire');
      this.audioSystem.impact(this.weaponSystem.mode.id, false);
      return;
    }

    if (!hit) {
      this.combatEffects.spawnProjectile(shotStart, shotEnd, false);
      this.combatEffects.spawnTracer(
        shotStart,
        shotEnd,
        this.weaponSystem.mode.id,
        this.weaponSystem.value,
        false,
      );
      this.setFeedback('Shot missed.');
      this.showSelection(this.weaponSystem.getSelectionSummary());
      this.syncWeaponView('fire');
      return;
    }

    this.combatEffects.spawnProjectile(shotStart, shotEnd, true);
    this.combatEffects.spawnTracer(
      shotStart,
      shotEnd,
      this.weaponSystem.mode.id,
      this.weaponSystem.value,
      true,
    );

    const result = this.enemySystem.applyShot(hit.enemy, {
      mode: this.weaponSystem.mode.id,
      value: this.weaponSystem.value,
    }, {
      totientActive: performance.now() < this.totientUntil,
    });

    if (result.ok) {
      this.combatEffects.spawnImpact(
        result.defeated ? hit.enemy.mesh.position.clone() : hit.hit.point.clone(),
        this.weaponSystem.mode.id,
        this.weaponSystem.value,
        result.defeated,
      );
      this.audioSystem.impact(this.weaponSystem.mode.id, result.defeated);
    } else {
      this.audioSystem.reject();
    }

    if (result.defeated) {
      const defeatedPoints = hit.enemy.kind === 'boss'
        ? 1500
        : 100 + hit.enemy.number * 10;
      this.awardScore(defeatedPoints, `Defeated ${hit.enemy.kind === 'boss' ? 'the boss' : `enemy ${hit.enemy.number}`}`);
    }

    this.setFeedback(result.message);
    if (result.defeated && this.enemySystem.getRemainingRequiredEnemies().length === 0) {
      this.pendingStageAdvanceAt = performance.now() + 1600;
    }

    this.showSelection(this.weaponSystem.getSelectionSummary());
    this.syncWeaponView('fire');
  }

  updatePickups(elapsed) {
    this.pickups.forEach((pickup) => {
      pickup.mesh.rotation.y += 0.02;
      pickup.mesh.position.y = pickup.anchorY + Math.sin(elapsed * 3 + pickup.bobOffset) * 0.18;
      pickup.label.position.copy(pickup.mesh.position).add(new THREE.Vector3(0, 1.2, 0));

      if (pickup.mesh.position.distanceTo(this.player.position) < 1.5) {
        this.collectPickup(pickup);
      }
    });
  }

  updateHud() {
    const targetHit = this.enemySystem.raycast(this.player.getAimRaycaster());
    const target = targetHit?.enemy ?? null;
    const healthPercent = Math.max(0, this.player.health) / 100;

    this.ui.stageName.textContent = this.currentStageDefinition.name;
    this.ui.objective.textContent = this.currentObjective;
    this.ui.weaponName.textContent = this.weaponSystem.getDisplayName();
    this.ui.zoneRule.textContent = 'Safe Zone blocks fire | Red lava kills';
    this.ui.scoreValue.textContent = `${this.score}${performance.now() < this.totientUntil ? ' | Totient buff' : ''}`;
    this.ui.cycleValue.textContent = this.weaponSystem.getCycleHint();
    this.ui.enemiesLeft.textContent = `${this.enemySystem.getAliveEnemies().length}`;
    this.ui.highScoreValue.textContent = `${this.highScore}`;
    this.ui.healthValue.textContent = `${Math.max(0, Math.ceil(this.player.health))} / 100`;
    this.ui.healthFill.style.width = `${healthPercent * 100}%`;
    this.ui.healthFill.style.background = healthPercent > 0.55
      ? 'linear-gradient(90deg, #65e86c, #b8ff83)'
      : healthPercent > 0.25
        ? 'linear-gradient(90deg, #f0c84f, #ffd86a)'
        : 'linear-gradient(90deg, #ff5c5c, #ff8e5a)';

    if (!target) {
      this.ui.targetName.textContent = 'No target';
      this.ui.targetDetails.textContent = 'Center the crosshair on an enemy to inspect its number rule.';
      this.ui.targetHint.innerHTML = '<strong>Hint:</strong> Prime enemies die to weapon 1. Composite enemies usually want weapon 2.';
    } else {
      this.ui.targetName.textContent = target.kind === 'boss' ? `Boss ${target.number}` : `Enemy ${target.number}`;
      this.ui.targetDetails.textContent = `${MathEngine.describeEnemy(target)}`;
      this.ui.targetHint.innerHTML = `<strong>Hint:</strong> ${this.getTargetHint(target)}`;
    }

    this.ui.feedbackText.textContent = this.activeFeedback;
  }

  getTargetHint(target) {
    if (target.kind === 'boss') {
      if (!target.shieldBroken) {
        return `Press 3 for the GCD Pulse, then use Q / E until the weapon number gives gcd(${this.weaponSystem.value ?? 'x'}, ${target.number}) = ${target.gcdTarget}.`;
      }

      return `Shield is down. Press 2 for the Factor Cannon and combine factor bullets until the LCM reaches ${target.lcmTarget}.`;
    }

    const remaining = target.remaining ?? target.number;

    if (MathEngine.isPrime(target.number)) {
      return `This target is prime, so weapon 1 destroys it immediately.`;
    }

    if (MathEngine.isPrime(remaining)) {
      return `Its remaining core is prime (${remaining}). Press 1 and finish it with the Prime Blaster.`;
    }

    if (this.weaponSystem.mode.id !== 'factor') {
      return `This target is composite. Press 2 for the Factor Cannon.`;
    }

    if (remaining === 1) {
      return 'Its factor core is already empty.';
    }

    if (remaining % this.weaponSystem.value === 0) {
      return `Good choice: Factor Cannon [${this.weaponSystem.value}] divides the current core value ${remaining}. Fire now.`;
    }

    const nextFactor = MathEngine.factorize(remaining)[0] ?? remaining;
    return `Current core value is ${remaining}. Use Q / E until the HUD shows Factor Cannon [${nextFactor}], then fire.`;
  }

  setFeedback(message) {
    this.activeFeedback = message;
    this.feedbackUntil = performance.now() + 5000;
  }

  showSelection(selection) {
    this.ui.selectionTitle.textContent = selection.title;
    this.ui.selectionLabel.textContent = selection.label;
    this.ui.selectionDetail.textContent = selection.detail;
  }

  syncViewHud() {
    this.ui.weaponView?.classList.toggle('is-hidden', this.player.isThirdPerson);
    if (this.ui.viewToggle) {
      this.ui.viewToggle.textContent = this.player.isThirdPerson ? 'First Person' : 'Third Person';
    }
  }

  syncWeaponView(animation = '') {
    if (!this.ui.weaponView) {
      return;
    }

    const modeId = this.weaponSystem.mode.id;
    const classes = ['weapon-standard', 'weapon-factor', 'weapon-gcd'];
    this.ui.weaponView.classList.remove(...classes, 'is-firing', 'is-switching');
    this.ui.weaponView.classList.add(`weapon-${modeId}`);

    if (this.ui.weaponBadge) {
      this.ui.weaponBadge.textContent = modeId === 'standard'
        ? 'P'
        : `${this.weaponSystem.value}`;
    }

    if (this.ui.weaponReadout) {
      this.ui.weaponReadout.textContent = this.weaponSystem.getDisplayName();
    }

    if (animation) {
      void this.ui.weaponView.offsetWidth;
      this.ui.weaponView.classList.add(animation === 'fire' ? 'is-firing' : 'is-switching');
    }
  }

  showBanner(message) {
    this.ui.centerBanner.textContent = message;
    this.ui.centerBanner.classList.remove('is-hidden');
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = window.setTimeout(() => {
      this.ui.centerBanner.classList.add('is-hidden');
    }, 1800);
  }

  triggerGameOver(reason) {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.paused = false;
    this.audioSystem.stopMusic();
    document.exitPointerLock?.();
    this.ui.pauseOverlay?.classList.add('is-hidden');
    this.ui.gameOverTitle.textContent = 'Game Over';
    this.ui.gameOverText.textContent = `${reason} Replay to start again from Level 1.`;
    this.ui.gameOverScore.textContent = `${this.score}`;
    this.ui.gameOverHighScore.textContent = `${this.highScore}`;
    this.ui.gameOverOverlay.classList.remove('is-hidden');
    this.setFeedback(reason);
    this.audioSystem.failure();
  }

  restartGame() {
    this.gameOver = false;
    this.victory = false;
    this.paused = false;
    this.pendingStageAdvanceAt = null;
    this.score = 0;
    this.highScoreBeaten = false;
    this.hasFermatScanner = false;
    this.totientUntil = 0;
    this.nextFootstepAt = 0;
    this.player.health = 100;
    this.weaponSystem.reset();
    this.combatEffects.clear();
    this.ui.gameOverOverlay.classList.add('is-hidden');
    this.ui.pauseOverlay?.classList.add('is-hidden');
    if (this.ui.pauseToggle) {
      this.ui.pauseToggle.textContent = 'Pause';
    }
    this.setIntroActive(false);
    this.loadStage(1);
    this.showSelection(this.weaponSystem.getSelectionSummary('1'));
    this.syncWeaponView();
    this.player.setWeaponStyle(this.weaponSystem.mode.id, this.weaponSystem.value);
    this.syncViewHud();
  }

  start() {
    const tick = () => {
      const delta = Math.min(this.clock.getDelta(), 0.033);
      const elapsed = this.clock.elapsedTime;
      this.combatEffects.update(delta);

      if (!this.gameOver && !this.introActive && !this.paused) {
        const groundHeight = this.world.getGroundHeight(this.player.position.x, this.player.position.z);
        this.player.update(delta, groundHeight);
        this.world.clampToBounds(this.player.position, 1.1);
        this.updatePickups(elapsed);

        if (this.player.justJumped) {
          this.audioSystem.jump();
        }

        if (this.player.justLanded) {
          this.audioSystem.land();
          this.nextFootstepAt = performance.now() + 120;
        }

        if (this.player.isMovingOnGround && performance.now() >= this.nextFootstepAt) {
          this.audioSystem.footstep();
          this.nextFootstepAt = performance.now() + 300;
        }

        if (this.world.isLavaAt(this.player.position.x, this.player.position.z)) {
          this.triggerGameOver('You touched lava.');
        }

        this.enemySystem.update(delta, elapsed, this.player.position, (damage, reason) => {
          this.player.takeDamage(20);
          this.audioSystem.hurt();
          this.showBanner(`-${20} HP`);
          this.setFeedback(`${reason}. Health ${Math.max(0, Math.ceil(this.player.health))}/100.`);

          if (this.player.health <= 0) {
            this.triggerGameOver('You were overwhelmed after 5 enemy collisions.');
          }
        });

        if (this.pendingStageAdvanceAt && performance.now() > this.pendingStageAdvanceAt) {
          this.pendingStageAdvanceAt = null;
          this.awardScore(250 * this.stageNumber, `Cleared stage ${this.stageNumber}`);
          this.audioSystem.levelAdvance();
          this.loadStage(this.stageNumber + 1);
        }
      }

      this.updateHud();
      this.renderer.render(this.scene, this.player.camera);
      window.requestAnimationFrame(tick);
    };

    this.showSelection(this.weaponSystem.getSelectionSummary('1'));
    this.syncWeaponView();
    this.player.setWeaponStyle(this.weaponSystem.mode.id, this.weaponSystem.value);
    this.syncViewHud();
    tick();
  }
}
