import * as THREE from 'three';

function getWeaponColor(mode, value) {
  if (mode === 'standard') {
    return 0xf9ef8d;
  }

  if (mode === 'factor') {
    const palette = {
      2: 0x8ce0ff,
      3: 0xbef58d,
      5: 0xffcb6f,
      7: 0xff97b7,
    };

    return palette[value] ?? 0xffffff;
  }

  return 0xff8f7a;
}

export class CombatEffects {
  constructor(scene) {
    this.scene = scene;
    this.tracers = [];
    this.projectiles = [];
    this.particles = [];
    this.tempDirection = new THREE.Vector3();
    this.tempMidpoint = new THREE.Vector3();
  }

  spawnProjectile(start, end, success = true) {
    const projectile = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 14),
      new THREE.MeshBasicMaterial({
        color: 0xff4f4f,
        transparent: true,
        opacity: success ? 0.98 : 0.72,
      }),
    );

    projectile.position.copy(start);
    this.scene.add(projectile);

    const distance = start.distanceTo(end);
    const duration = THREE.MathUtils.clamp(distance / 42, 0.08, 0.3);

    this.projectiles.push({
      mesh: projectile,
      start: start.clone(),
      end: end.clone(),
      life: duration,
      maxLife: duration,
    });
  }

  spawnTracer(start, end, mode, value, success = true) {
    const color = getWeaponColor(mode, value);
    const direction = this.tempDirection.subVectors(end, start);
    const distance = Math.max(direction.length(), 0.001);
    direction.normalize();

    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, distance, 6),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: success ? 0.95 : 0.45,
      }),
    );

    tracer.position.copy(this.tempMidpoint.copy(start).lerp(end, 0.5));
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.scene.add(tracer);

    this.tracers.push({
      mesh: tracer,
      life: 0.12,
      maxLife: 0.12,
    });
  }

  spawnImpact(point, mode, value, strong = false) {
    const color = getWeaponColor(mode, value);
    const particleCount = strong ? 12 : 6;

    for (let index = 0; index < particleCount; index += 1) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(strong ? 0.26 : 0.14, strong ? 0.26 : 0.14, strong ? 0.26 : 0.14),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: strong ? 0.92 : 0.78,
        }),
      );

      mesh.position.copy(point);
      this.scene.add(mesh);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * (strong ? 8 : 4.5),
        Math.random() * (strong ? 5 : 3.4) + 1.2,
        (Math.random() - 0.5) * (strong ? 8 : 4.5),
      );

      this.particles.push({
        mesh,
        velocity,
        life: strong ? 0.6 : 0.28,
        maxLife: strong ? 0.6 : 0.28,
        gravity: strong ? 8.5 : 5,
        spin: (Math.random() - 0.5) * 8,
      });
    }

    if (strong) {
      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 14),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.65,
        }),
      );

      flash.position.copy(point);
      this.scene.add(flash);
      this.particles.push({
        mesh: flash,
        velocity: new THREE.Vector3(0, 0, 0),
        life: 0.22,
        maxLife: 0.22,
        gravity: 0,
        spin: 0,
        flash: true,
      });
    }
  }

  update(delta) {
    this.tracers = this.tracers.filter((tracer) => {
      tracer.life -= delta;

      if (tracer.life <= 0) {
        this.scene.remove(tracer.mesh);
        tracer.mesh.geometry.dispose();
        tracer.mesh.material.dispose();
        return false;
      }

      tracer.mesh.material.opacity = tracer.life / tracer.maxLife;
      return true;
    });

    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.life -= delta;

      if (projectile.life <= 0) {
        this.scene.remove(projectile.mesh);
        projectile.mesh.geometry.dispose();
        projectile.mesh.material.dispose();
        return false;
      }

      const progress = 1 - projectile.life / projectile.maxLife;
      projectile.mesh.position.lerpVectors(projectile.start, projectile.end, progress);
      projectile.mesh.scale.setScalar(1 + progress * 0.5);
      projectile.mesh.material.opacity = 0.98 - progress * 0.4;
      return true;
    });

    this.particles = this.particles.filter((particle) => {
      particle.life -= delta;

      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        particle.mesh.material.dispose();
        return false;
      }

      particle.velocity.y -= particle.gravity * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.rotation.x += particle.spin * delta;
      particle.mesh.rotation.y += particle.spin * delta * 1.2;

      const fade = particle.life / particle.maxLife;
      particle.mesh.material.opacity = (particle.flash ? 0.65 : 0.9) * fade;

      if (particle.flash) {
        const growth = 1 + (1 - fade) * 3.2;
        particle.mesh.scale.setScalar(growth);
      }

      return true;
    });
  }

  clear() {
    this.tracers.forEach((tracer) => {
      this.scene.remove(tracer.mesh);
      tracer.mesh.geometry.dispose();
      tracer.mesh.material.dispose();
    });
    this.tracers = [];

    this.projectiles.forEach((projectile) => {
      this.scene.remove(projectile.mesh);
      projectile.mesh.geometry.dispose();
      projectile.mesh.material.dispose();
    });
    this.projectiles = [];

    this.particles.forEach((particle) => {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
    });
    this.particles = [];
  }
}
