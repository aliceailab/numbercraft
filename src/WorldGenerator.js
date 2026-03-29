import * as THREE from 'three';
import { createTextSprite } from './textSprites.js';

const ZONE_DEFINITIONS = [
  {
    id: 'northwest',
    name: 'Prime Meadow',
    bounds: { minX: -18, maxX: -1, minZ: -18, maxZ: -1 },
    color: 0x69b84f,
    accent: '#daf7cc',
    rule: null,
  },
  {
    id: 'northeast',
    name: 'Residue Ridge',
    bounds: { minX: 1, maxX: 18, minZ: -18, maxZ: -1 },
    color: 0x74c45d,
    accent: '#fff2d0',
    rule: { mod: 4, residue: 1 },
  },
  {
    id: 'southwest',
    name: 'Clockwork Basin',
    bounds: { minX: -18, maxX: -1, minZ: 1, maxZ: 18 },
    color: 0x63b04a,
    accent: '#d9ebff',
    rule: { mod: 3, residue: 2 },
  },
  {
    id: 'southeast',
    name: 'Totient Terrace',
    bounds: { minX: 1, maxX: 18, minZ: 1, maxZ: 18 },
    color: 0x7bc963,
    accent: '#fde3fb',
    rule: { mod: 5, residue: 0 },
  },
];

export class WorldGenerator {
  constructor(scene) {
    this.scene = scene;
    this.zoneDefinitions = ZONE_DEFINITIONS;
    this.heights = new Map();
    this.lavaTiles = new Set();
    this.size = 18;
    this.safeZoneRadius = 5.5;
    this.lavaPools = [
      { minX: 8, maxX: 16, minZ: 8, maxZ: 16 },
    ];
  }

  build() {
    const columns = [];
    let blockCount = 0;

    for (let x = -this.size; x <= this.size; x += 1) {
      for (let z = -this.size; z <= this.size; z += 1) {
        const height = this.computeHeight(x, z);
        this.heights.set(`${x},${z}`, height);
        const zone = this.getZoneForPosition({ x, z });
        const isLavaTile = this.shouldPlaceLava(x, z);

        if (isLavaTile) {
          this.lavaTiles.add(`${x},${z}`);
        }

        for (let y = 0; y < height; y += 1) {
          const isTopBlock = y === height - 1;
          columns.push({
            x,
            y,
            z,
            color: isTopBlock && isLavaTile ? 0xff3b24 : zone.color,
          });
          blockCount += 1;
        }
      }
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      metalness: 0.03,
      roughness: 0.93,
      vertexColors: true,
    });

    const instanced = new THREE.InstancedMesh(geometry, material, blockCount);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    columns.forEach((column, index) => {
      matrix.makeTranslation(column.x, column.y + 0.5, column.z);
      instanced.setMatrixAt(index, matrix);
      color.setHex(column.color).multiplyScalar(column.y === this.heights.get(`${column.x},${column.z}`) - 1 ? 1 : 0.86);
      instanced.setColorAt(index, color);
    });

    instanced.castShadow = true;
    instanced.receiveShadow = true;
    this.scene.add(instanced);

    this.buildLavaSurfaces();
    this.buildSafeZone();
    this.buildBoundaryWalls();
  }

  computeHeight(x, z) {
    const wave = Math.sin(x * 0.38) + Math.cos(z * 0.31);
    const ridge = Math.sin((x + z) * 0.22) * 1.1;
    return Math.max(1, Math.min(5, Math.floor(2.4 + wave * 0.75 + ridge * 0.55)));
  }

  shouldPlaceLava(x, z) {
    if (this.isInSafeZone({ x, z }, 1.2)) {
      return false;
    }

    return this.lavaPools.some((pool) => (
      x >= pool.minX
      && x <= pool.maxX
      && z >= pool.minZ
      && z <= pool.maxZ
    ));
  }

  buildLavaSurfaces() {
    const lavaMaterial = new THREE.MeshStandardMaterial({
      color: 0xff2f1a,
      emissive: 0xff3d24,
      emissiveIntensity: 1.2,
      roughness: 0.32,
      metalness: 0.04,
    });
    const lavaEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff8a3a,
      emissive: 0xff5a2b,
      emissiveIntensity: 0.85,
      roughness: 0.28,
      metalness: 0.05,
    });
    const lavaCapGeometry = new THREE.BoxGeometry(0.96, 0.12, 0.96);
    const emberGeometry = new THREE.BoxGeometry(0.42, 0.04, 0.42);

    this.lavaTiles.forEach((tileKey) => {
      const [x, z] = tileKey.split(',').map(Number);
      const height = this.heights.get(tileKey) ?? 1;

      const cap = new THREE.Mesh(lavaCapGeometry, lavaMaterial);
      cap.position.set(x, height + 0.06, z);
      cap.castShadow = false;
      cap.receiveShadow = true;
      this.scene.add(cap);

      const ember = new THREE.Mesh(emberGeometry, lavaEdgeMaterial);
      ember.position.set(x, height + 0.14, z);
      ember.rotation.y = Math.PI * 0.25;
      this.scene.add(ember);
    });
  }

  buildSafeZone() {
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(this.safeZoneRadius, this.safeZoneRadius, 8.5, 48, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x67c8ff,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
      }),
    );
    shield.position.set(0, 4.3, 0);
    this.scene.add(shield);

    const topRing = new THREE.Mesh(
      new THREE.TorusGeometry(this.safeZoneRadius, 0.12, 16, 64),
      new THREE.MeshStandardMaterial({
        color: 0x95e4ff,
        emissive: 0x2f8cff,
        emissiveIntensity: 0.45,
        roughness: 0.22,
        metalness: 0.35,
      }),
    );
    topRing.rotation.x = Math.PI / 2;
    topRing.position.set(0, 8.55, 0);
    this.scene.add(topRing);

    const bottomRing = topRing.clone();
    bottomRing.position.set(0, 0.9, 0);
    this.scene.add(bottomRing);

    const label = createTextSprite(['Safe Zone', 'Enemies blocked'], {
      fontSize: 24,
      scaleX: 4.2,
      scaleY: 1.6,
      color: '#dbf6ff',
      background: 'rgba(5, 18, 33, 0.74)',
    });
    label.position.set(0, 10.2, 0);
    this.scene.add(label);
  }

  buildBoundaryWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b7dff,
      emissive: 0x0e387d,
      emissiveIntensity: 0.42,
      roughness: 0.42,
      metalness: 0.28,
    });
    const wallHeight = 9;
    const halfSpan = this.size + 1.6;
    const wallLength = this.size * 2 + 4;
    const walls = [
      { size: [wallLength, wallHeight, 1], position: [0, wallHeight / 2, -halfSpan] },
      { size: [wallLength, wallHeight, 1], position: [0, wallHeight / 2, halfSpan] },
      { size: [1, wallHeight, wallLength], position: [-halfSpan, wallHeight / 2, 0] },
      { size: [1, wallHeight, wallLength], position: [halfSpan, wallHeight / 2, 0] },
    ];

    walls.forEach((wall) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...wall.size),
        wallMaterial,
      );
      mesh.position.set(...wall.position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
  }

  getGroundHeight(x, z) {
    const clampedX = Math.max(-this.size, Math.min(this.size, Math.round(x)));
    const clampedZ = Math.max(-this.size, Math.min(this.size, Math.round(z)));
    return this.heights.get(`${clampedX},${clampedZ}`) ?? 2;
  }

  getSpawnHeight(x, z, lift = 1.15) {
    return this.getGroundHeight(x, z) + lift;
  }

  isLavaAt(x, z) {
    const clampedX = Math.max(-this.size, Math.min(this.size, Math.round(x)));
    const clampedZ = Math.max(-this.size, Math.min(this.size, Math.round(z)));
    return this.lavaTiles.has(`${clampedX},${clampedZ}`);
  }

  isInSafeZone(position, padding = 0) {
    const radius = this.safeZoneRadius - padding;
    return (position.x * position.x) + (position.z * position.z) <= radius * radius;
  }

  getSafeZoneShieldHit(origin, direction, maxDistance = 28) {
    if (this.isInSafeZone(origin, 0.05)) {
      return null;
    }

    const a = (direction.x * direction.x) + (direction.z * direction.z);
    if (a < 0.00001) {
      return null;
    }

    const radius = this.safeZoneRadius;
    const b = 2 * ((origin.x * direction.x) + (origin.z * direction.z));
    const c = (origin.x * origin.x) + (origin.z * origin.z) - (radius * radius);
    const discriminant = (b * b) - (4 * a * c);

    if (discriminant < 0) {
      return null;
    }

    const minY = 0.8;
    const maxY = 8.7;
    const root = Math.sqrt(discriminant);
    const tValues = [
      (-b - root) / (2 * a),
      (-b + root) / (2 * a),
    ]
      .filter((value) => value > 0.001 && value <= maxDistance)
      .sort((left, right) => left - right);

    for (const distance of tValues) {
      const y = origin.y + (direction.y * distance);
      if (y < minY || y > maxY) {
        continue;
      }

      return origin.clone().addScaledVector(direction, distance);
    }

    return null;
  }

  clampToBounds(position, padding = 0.8) {
    const min = -this.size + padding;
    const max = this.size - padding;

    position.x = Math.max(min, Math.min(max, position.x));
    position.z = Math.max(min, Math.min(max, position.z));
    return position;
  }

  getZoneForPosition(position) {
    const x = position.x;
    const z = position.z;

    const zone = this.zoneDefinitions.find((candidate) => (
      x >= candidate.bounds.minX
      && x <= candidate.bounds.maxX
      && z >= candidate.bounds.minZ
      && z <= candidate.bounds.maxZ
    ));

    return zone ?? this.zoneDefinitions[0];
  }
}
