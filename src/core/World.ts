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
    // Add simple tree representations
    const treeCount = 50;

    for (let i = 0; i < treeCount; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;

      // Skip trees too close to origin (player start)
      if (Math.sqrt(x * x + z * z) < 10) continue;

      this.createTree(x, z);
    }
  }

  private createTree(x: number, z: number): void {
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 5, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 2.5, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.scene.add(trunk);

    // Foliage (simple cone)
    const foliageGeometry = new THREE.ConeGeometry(2, 4, 8);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x1a4d0f });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.set(x, 6, z);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    this.scene.add(foliage);
  }

  public update(_delta: number): void {
    // World updates (day/night cycle, weather, etc.)
  }
}
