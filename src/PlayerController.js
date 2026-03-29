import * as THREE from 'three';

export class PlayerController {
  constructor(renderer) {
    this.renderer = renderer;
    this.pointerLocked = false;
    this.pitch = new THREE.Object3D();
    this.yaw = new THREE.Object3D();
    this.camera = new THREE.PerspectiveCamera(78, 1, 0.1, 200);
    this.pitch.add(this.camera);
    this.yaw.add(this.pitch);

    this.eyeHeight = 1.65;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.keys = new Set();
    this.canJump = false;
    this.health = 100;
    this.damageFlashUntil = 0;

    this.yaw.position.set(-11, 7.8, -11);
    this.pitch.position.y = this.eyeHeight;

    this.raycaster = new THREE.Raycaster();
    this.isThirdPerson = false;
    this.viewOffset = {
      first: new THREE.Vector3(0, 0, 0),
      third: new THREE.Vector3(1.15, 0.35, 4.8),
    };
    this.avatar = this.createAvatar();
    this.avatar.position.set(0, -this.eyeHeight, 0);
    this.avatar.visible = false;
    this.yaw.add(this.avatar);
    this.camera.position.copy(this.viewOffset.first);
    this.walkCycle = 0;
    this.fireUntil = 0;
    this.swapUntil = 0;
    this.tempShotOrigin = new THREE.Vector3();
    this.isGrounded = true;
    this.isMovingOnGround = false;
    this.justJumped = false;
    this.justLanded = false;

    this.bindEvents();
    this.setWeaponStyle('standard', null);
  }

  createAvatar() {
    const avatar = new THREE.Group();
    avatar.rotation.y = Math.PI;

    const fabrics = {
      hair: new THREE.MeshStandardMaterial({ color: 0x6e3322, roughness: 0.88 }),
      skin: new THREE.MeshStandardMaterial({ color: 0xf0be96, roughness: 0.92 }),
      jacket: new THREE.MeshStandardMaterial({ color: 0x344d78, roughness: 0.68, metalness: 0.08 }),
      shirt: new THREE.MeshStandardMaterial({ color: 0x6dbd68, roughness: 0.8 }),
      pants: new THREE.MeshStandardMaterial({ color: 0x232934, roughness: 0.72 }),
      boot: new THREE.MeshStandardMaterial({ color: 0x151c26, roughness: 0.74 }),
      pack: new THREE.MeshStandardMaterial({ color: 0x151f29, roughness: 0.55, metalness: 0.15 }),
      glow: new THREE.MeshStandardMaterial({ color: 0x66d6ff, emissive: 0x66d6ff, emissiveIntensity: 0.7 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x7f97b7, roughness: 0.4, metalness: 0.48 }),
    };

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.05, 0.46), fabrics.jacket);
    torso.position.set(0, 1.04, 0);
    avatar.add(torso);

    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.68, 0.18), fabrics.shirt);
    shirt.position.set(0, 0.96, 0.24);
    avatar.add(shirt);

    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.24), fabrics.pack);
    backpack.position.set(0, 1.04, -0.34);
    avatar.add(backpack);

    const powerCell = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.08), fabrics.glow);
    powerCell.position.set(0.22, 0.8, 0.28);
    avatar.add(powerCell);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.38), fabrics.skin);
    head.position.set(0, 1.86, 0);
    avatar.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.34), fabrics.hair);
    hair.position.set(0, 1.93, -0.04);
    avatar.add(hair);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.55, 1.35, -0.03);
    avatar.add(this.leftArm);

    const leftUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), fabrics.skin);
    leftUpperArm.position.set(0, -0.31, 0);
    this.leftArm.add(leftUpperArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.55, 1.35, -0.03);
    avatar.add(this.rightArm);

    const rightUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), fabrics.skin);
    rightUpperArm.position.set(0, -0.31, 0);
    this.rightArm.add(rightUpperArm);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.18, 0.48, 0);
    avatar.add(this.leftLeg);

    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.24), fabrics.pants);
    leftLegMesh.position.set(0, -0.39, 0);
    this.leftLeg.add(leftLegMesh);

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.36), fabrics.boot);
    leftBoot.position.set(0, -0.82, 0.04);
    this.leftLeg.add(leftBoot);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.18, 0.48, 0);
    avatar.add(this.rightLeg);

    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.24), fabrics.pants);
    rightLegMesh.position.set(0, -0.39, 0);
    this.rightLeg.add(rightLegMesh);

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.36), fabrics.boot);
    rightBoot.position.set(0, -0.82, 0.04);
    this.rightLeg.add(rightBoot);

    this.weaponMount = new THREE.Group();
    this.weaponMount.position.set(0.2, 1.08, -0.05);
    this.weaponMount.rotation.set(-1.18, -0.34, 0.2);
    avatar.add(this.weaponMount);

    this.weaponBody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.16), fabrics.metal);
    this.weaponBody.position.set(0.1, 0, 0);
    this.weaponMount.add(this.weaponBody);

    this.weaponAccent = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), fabrics.glow);
    this.weaponAccent.position.set(-0.04, 0, 0);
    this.weaponMount.add(this.weaponAccent);

    this.weaponBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 0.08), fabrics.pack);
    this.weaponBarrel.position.set(0.55, 0, 0);
    this.weaponMount.add(this.weaponBarrel);

    this.weaponMuzzle = new THREE.Object3D();
    this.weaponMuzzle.position.set(0.9, 0, 0);
    this.weaponMount.add(this.weaponMuzzle);

    avatar.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return avatar;
  }

  bindEvents() {
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    });

    window.addEventListener('mousemove', (event) => {
      if (!this.pointerLocked) {
        return;
      }

      this.yaw.rotation.y -= event.movementX * 0.0019;
      this.pitch.rotation.x -= event.movementY * 0.0019;
      this.pitch.rotation.x = Math.max(-1.36, Math.min(1.36, this.pitch.rotation.x));
    });

    window.addEventListener('keydown', (event) => {
      this.keys.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
  }

  lockPointer() {
    this.renderer.domElement.requestPointerLock();
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(delta, groundHeight) {
    this.justJumped = false;
    this.justLanded = false;
    const moveSpeed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 8.8 : 6.2;
    const moveForward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const moveRight = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);

    this.direction.set(moveRight, 0, moveForward);
    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
    }
    const isMoving = this.direction.lengthSq() > 0;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.yaw.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.yaw.quaternion);
    right.y = 0;
    right.normalize();

    const horizontalVelocity = new THREE.Vector3()
      .addScaledVector(forward, this.direction.z * moveSpeed)
      .addScaledVector(right, this.direction.x * moveSpeed);

    this.yaw.position.addScaledVector(horizontalVelocity, delta);

    this.velocity.y -= 18 * delta;

    if ((this.keys.has('Space')) && this.canJump) {
      this.velocity.y = 8;
      this.canJump = false;
      this.isGrounded = false;
      this.justJumped = true;
    }

    this.yaw.position.y += this.velocity.y * delta;

    const feetHeight = groundHeight + this.eyeHeight;
    if (this.yaw.position.y <= feetHeight) {
      const wasAirborne = !this.isGrounded;
      this.yaw.position.y = feetHeight;
      this.velocity.y = 0;
      this.canJump = true;
      this.isGrounded = true;
      this.justLanded = wasAirborne;
    } else {
      this.isGrounded = false;
    }

    this.isMovingOnGround = isMoving && this.isGrounded;

    this.updateAvatar(delta, isMoving);
    this.updateCameraPose();
  }

  updateAvatar(delta, isMoving) {
    if (isMoving) {
      this.walkCycle += delta * 8.5;
    }

    const now = performance.now();
    const stride = isMoving ? Math.sin(this.walkCycle) * 0.55 : 0;
    const armSwing = isMoving ? Math.sin(this.walkCycle) * 0.14 : 0;
    const settle = isMoving ? 0 : 0.1;
    const fireFactor = Math.max(0, (this.fireUntil - now) / 140);
    const swapFactor = Math.max(0, (this.swapUntil - now) / 220);

    this.leftLeg.rotation.x = stride;
    this.rightLeg.rotation.x = -stride;
    this.leftArm.rotation.set(-0.95 - armSwing + fireFactor * 0.12, 0.4 - swapFactor * 0.1, -0.2);
    this.rightArm.rotation.set(-1.22 + armSwing + fireFactor * 0.22, -0.34, 0.26 + fireFactor * 0.06);
    this.avatar.position.y = -this.eyeHeight + (isMoving ? Math.abs(Math.sin(this.walkCycle)) * 0.04 : 0);
    this.weaponMount.position.set(0.2 + swapFactor * 0.22, 1.08 + fireFactor * 0.04, -0.05 + fireFactor * 0.18);
    this.weaponMount.rotation.set(
      -1.18 + fireFactor * 0.28,
      -0.34 + swapFactor * 0.55,
      0.2 + settle + swapFactor * 0.4,
    );
  }

  updateCameraPose() {
    if (this.isThirdPerson) {
      this.camera.position.copy(this.viewOffset.third);
    } else {
      this.camera.position.copy(this.viewOffset.first);
    }

    this.camera.rotation.set(0, 0, 0);
  }

  setThirdPerson(enabled) {
    this.isThirdPerson = enabled;
    this.avatar.visible = enabled;
    this.updateCameraPose();
  }

  toggleViewMode() {
    this.setThirdPerson(!this.isThirdPerson);
    return this.isThirdPerson;
  }

  setWeaponStyle(mode, value) {
    const factorPalette = {
      2: 0x8ce0ff,
      3: 0xbef58d,
      5: 0xffcb6f,
      7: 0xff97b7,
    };
    const bodyColor = mode === 'standard'
      ? 0xd3ad4e
      : mode === 'factor'
        ? 0x3cb5ff
        : 0xff7a68;
    const accentColor = mode === 'standard'
      ? 0xfff0a5
      : mode === 'factor'
        ? (factorPalette[value] ?? 0xdafcff)
        : 0xffd1ba;
    const barrelColor = mode === 'gcd' ? 0x451f2a : mode === 'factor' ? 0x14364c : 0x293748;

    this.weaponBody.material.color.setHex(bodyColor);
    this.weaponAccent.material.color.setHex(accentColor);
    this.weaponAccent.material.emissive?.setHex(accentColor);
    this.weaponBarrel.material.color.setHex(barrelColor);

    if (mode === 'standard') {
      this.weaponBody.scale.set(1, 1, 1);
      this.weaponAccent.scale.set(1, 1, 1);
      this.weaponBarrel.scale.set(1, 1, 1);
      this.weaponBarrel.position.set(0.55, 0, 0);
      this.weaponMuzzle.position.set(0.9, 0, 0);
      return;
    }

    if (mode === 'factor') {
      this.weaponBody.scale.set(1.12, 0.9, 0.92);
      this.weaponAccent.scale.set(0.72, 2.6, 1);
      this.weaponBarrel.scale.set(1.22, 0.85, 0.85);
      this.weaponBarrel.position.set(0.62, 0, 0);
      this.weaponMuzzle.position.set(0.98, 0, 0);
      return;
    }

    this.weaponBody.scale.set(0.92, 1.18, 1.14);
    this.weaponAccent.scale.set(1.12, 0.9, 1);
    this.weaponBarrel.scale.set(0.86, 1.42, 1.3);
    this.weaponBarrel.position.set(0.5, 0, 0);
    this.weaponMuzzle.position.set(0.82, 0, 0);
  }

  triggerWeaponFire() {
    this.fireUntil = performance.now() + 140;
  }

  triggerWeaponSwap() {
    this.swapUntil = performance.now() + 220;
  }

  getAimRaycaster() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    return this.raycaster;
  }

  getShotOrigin() {
    if (!this.isThirdPerson) {
      return this.camera.getWorldPosition(this.tempShotOrigin);
    }

    return this.weaponMuzzle.getWorldPosition(this.tempShotOrigin);
  }

  get position() {
    return this.yaw.position;
  }

  get viewModeLabel() {
    return this.isThirdPerson ? 'Third Person' : 'First Person';
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.damageFlashUntil = performance.now() + 250;
  }
}
