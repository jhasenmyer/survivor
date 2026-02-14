import * as THREE from 'three';

export class World {
  private scene: THREE.Scene;
  private terrain: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.generateTerrain();
    this.addTrees();
  }

  private generateTerrain(): void {
    // Create a simple ground plane
    const geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2d5016,
      roughness: 0.8,
      metalness: 0.2
    });

    // Add some height variation for terrain
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i); // Note: Y is Z in plane geometry
      const height = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
      positions.setZ(i, height);
    }
    geometry.computeVertexNormals();

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  private addTrees(): void {
    // Create a very dense forest with varied tree sizes
    const treeCount = 800;

    for (let i = 0; i < treeCount; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;

      // Skip trees too close to origin (player start)
      if (Math.sqrt(x * x + z * z) < 10) continue;

      // Generate varied tree sizes with weighted distribution
      const rand = Math.random();
      let scale: number;

      if (rand < 0.15) {
        // 15% Seedlings (very small)
        scale = 0.2 + Math.random() * 0.3; // 0.2-0.5
      } else if (rand < 0.35) {
        // 20% Young trees (small)
        scale = 0.5 + Math.random() * 0.5; // 0.5-1.0
      } else if (rand < 0.70) {
        // 35% Mature trees (medium - most common)
        scale = 1.0 + Math.random() * 0.6; // 1.0-1.6
      } else if (rand < 0.90) {
        // 20% Old trees (large)
        scale = 1.6 + Math.random() * 0.8; // 1.6-2.4
      } else {
        // 10% Ancient trees (very large)
        scale = 2.4 + Math.random() * 1.6; // 2.4-4.0
      }

      this.createTree(x, z, scale);
    }
  }

  private createTree(x: number, z: number, scale: number = 1.0): void {
    // Base dimensions that will be scaled
    const baseHeight = 5;
    const baseTrunkRadiusTop = 0.3;
    const baseTrunkRadiusBottom = 0.4;
    const baseFoliageRadius = 2;
    const baseFoliageHeight = 4;

    // Add slight random variation to proportions
    const heightVariation = 0.9 + Math.random() * 0.2; // 0.9-1.1
    const widthVariation = 0.85 + Math.random() * 0.3; // 0.85-1.15

    // Trunk
    const trunkHeight = baseHeight * scale * heightVariation;
    const trunkRadiusTop = baseTrunkRadiusTop * scale * widthVariation;
    const trunkRadiusBottom = baseTrunkRadiusBottom * scale * widthVariation;

    const trunkGeometry = new THREE.CylinderGeometry(
      trunkRadiusTop,
      trunkRadiusBottom,
      trunkHeight,
      8
    );

    // Vary trunk color slightly (darker for older trees)
    const barkDarkness = Math.max(0.3, 1 - scale * 0.15);
    const trunkColor = new THREE.Color(0x4a2511).multiplyScalar(barkDarkness);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: trunkColor });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, trunkHeight / 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.scene.add(trunk);

    // Foliage (simple cone)
    const foliageRadius = baseFoliageRadius * scale * widthVariation;
    const foliageHeight = baseFoliageHeight * scale * heightVariation;

    const foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8);

    // Vary foliage color (lighter green for young trees, darker for old)
    const greenIntensity = scale < 1 ? 1.3 : Math.max(0.7, 1.2 - scale * 0.1);
    const foliageColor = new THREE.Color(0x1a4d0f).multiplyScalar(greenIntensity);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: foliageColor });

    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.set(x, trunkHeight + foliageHeight / 2, z);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    this.scene.add(foliage);
  }

  public update(_delta: number): void {
    // World updates (day/night cycle, weather, etc.)
  }
}
