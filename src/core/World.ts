import * as THREE from 'three';

interface Chunk {
  key: string;
  x: number;
  z: number;
  objects: THREE.Object3D[];
}

export class World {
  private scene: THREE.Scene;
  private chunks: Map<string, Chunk> = new Map();

  // Chunk settings
  private readonly CHUNK_SIZE = 50;
  private readonly VIEW_DISTANCE = 3; // Load chunks within 3 chunks of player
  private readonly TREE_DENSITY = 20; // Trees per chunk
  private readonly CHUNK_OVERLAP = 0.1; // Small overlap to prevent gaps

  private lastPlayerChunkX: number = 0;
  private lastPlayerChunkZ: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Generate initial chunks around spawn point
    this.loadChunksAroundPosition(0, 0);
  }

  // Seeded random number generator for consistent chunk generation
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private getChunkKey(chunkX: number, chunkZ: number): string {
    return `${chunkX},${chunkZ}`;
  }

  private getChunkCoords(worldX: number, worldZ: number): { chunkX: number; chunkZ: number } {
    return {
      chunkX: Math.floor(worldX / this.CHUNK_SIZE),
      chunkZ: Math.floor(worldZ / this.CHUNK_SIZE)
    };
  }

  private generateChunk(chunkX: number, chunkZ: number): Chunk {
    const chunk: Chunk = {
      key: this.getChunkKey(chunkX, chunkZ),
      x: chunkX,
      z: chunkZ,
      objects: []
    };

    // Generate terrain for this chunk
    const terrain = this.generateTerrainForChunk(chunkX, chunkZ);
    chunk.objects.push(terrain);
    this.scene.add(terrain);

    // Generate trees for this chunk
    const trees = this.generateTreesForChunk(chunkX, chunkZ);
    trees.forEach(tree => {
      chunk.objects.push(tree);
      this.scene.add(tree);
    });

    return chunk;
  }

  private generateTerrainForChunk(chunkX: number, chunkZ: number): THREE.Mesh {
    const worldX = chunkX * this.CHUNK_SIZE;
    const worldZ = chunkZ * this.CHUNK_SIZE;

    // More subdivisions for smoother terrain and better chunk alignment
    const segments = 20;
    const chunkSize = this.CHUNK_SIZE + this.CHUNK_OVERLAP;
    const geometry = new THREE.PlaneGeometry(
      chunkSize,
      chunkSize,
      segments,
      segments
    );

    const material = new THREE.MeshStandardMaterial({
      color: 0x2d5016,
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide // Render both sides to prevent transparency
    });

    // Add height variation using world coordinates for continuity
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const localX = positions.getX(i);
      const localZ = positions.getY(i);
      const x = worldX + localX;
      const z = worldZ + localZ;

      const height = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
      positions.setZ(i, height);
    }
    geometry.computeVertexNormals();

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(worldX, 0, worldZ);
    terrain.receiveShadow = true;

    return terrain;
  }

  private generateTreesForChunk(chunkX: number, chunkZ: number): THREE.Object3D[] {
    const trees: THREE.Object3D[] = [];
    const worldX = chunkX * this.CHUNK_SIZE;
    const worldZ = chunkZ * this.CHUNK_SIZE;

    // Use chunk coordinates as seed for consistent generation
    const seed = chunkX * 73856093 ^ chunkZ * 19349663;

    for (let i = 0; i < this.TREE_DENSITY; i++) {
      // Generate seeded random positions within chunk
      const randX = this.seededRandom(seed + i * 2);
      const randZ = this.seededRandom(seed + i * 2 + 1);
      const randScale = this.seededRandom(seed + i * 3);
      const randType = this.seededRandom(seed + i * 4);

      const localX = (randX - 0.5) * this.CHUNK_SIZE * 0.9; // 0.9 to avoid edge overlap
      const localZ = (randZ - 0.5) * this.CHUNK_SIZE * 0.9;
      const x = worldX + localX;
      const z = worldZ + localZ;

      // Skip trees too close to spawn (0,0)
      if (chunkX === 0 && chunkZ === 0 && Math.sqrt(localX * localX + localZ * localZ) < 10) {
        continue;
      }

      // Determine tree scale based on seeded random
      let scale: number;
      if (randType < 0.15) {
        scale = 0.2 + randScale * 0.3; // Seedlings
      } else if (randType < 0.35) {
        scale = 0.5 + randScale * 0.5; // Young
      } else if (randType < 0.70) {
        scale = 1.0 + randScale * 0.6; // Mature
      } else if (randType < 0.90) {
        scale = 1.6 + randScale * 0.8; // Old
      } else {
        scale = 2.4 + randScale * 1.6; // Ancient
      }

      // Place tree at correct terrain height
      const terrainHeight = this.getTerrainHeight(x, z);
      const treeGroup = this.createTree(x, z, scale, seed + i * 5, terrainHeight);
      trees.push(treeGroup);
    }

    return trees;
  }

  private createTree(x: number, z: number, scale: number, seed: number, terrainHeight: number = 0): THREE.Group {
    const treeGroup = new THREE.Group();

    // Base dimensions
    const baseHeight = 5;
    const baseTrunkRadiusTop = 0.3;
    const baseTrunkRadiusBottom = 0.4;
    const baseFoliageRadius = 2;
    const baseFoliageHeight = 4;

    // Seeded random variations
    const heightVariation = 0.9 + this.seededRandom(seed) * 0.2;
    const widthVariation = 0.85 + this.seededRandom(seed + 1) * 0.3;

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

    const barkDarkness = Math.max(0.3, 1 - scale * 0.15);
    const trunkColor = new THREE.Color(0x4a2511).multiplyScalar(barkDarkness);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: trunkColor });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, trunkHeight / 2, 0);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Foliage
    const foliageRadius = baseFoliageRadius * scale * widthVariation;
    const foliageHeight = baseFoliageHeight * scale * heightVariation;

    const foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8);

    const greenIntensity = scale < 1 ? 1.3 : Math.max(0.7, 1.2 - scale * 0.1);
    const foliageColor = new THREE.Color(0x1a4d0f).multiplyScalar(greenIntensity);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: foliageColor });

    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.set(0, trunkHeight + foliageHeight / 2, 0);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    treeGroup.add(foliage);

    treeGroup.position.set(x, terrainHeight, z);
    return treeGroup;
  }

  private unloadChunk(chunkKey: string): void {
    const chunk = this.chunks.get(chunkKey);
    if (!chunk) return;

    // Remove all objects from scene
    chunk.objects.forEach(obj => {
      this.scene.remove(obj);
      // Dispose geometries and materials
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      } else if (obj instanceof THREE.Group) {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
      }
    });

    this.chunks.delete(chunkKey);
  }

  private loadChunksAroundPosition(worldX: number, worldZ: number): void {
    const { chunkX, chunkZ } = this.getChunkCoords(worldX, worldZ);

    // Load chunks in a square around player
    for (let x = chunkX - this.VIEW_DISTANCE; x <= chunkX + this.VIEW_DISTANCE; x++) {
      for (let z = chunkZ - this.VIEW_DISTANCE; z <= chunkZ + this.VIEW_DISTANCE; z++) {
        const key = this.getChunkKey(x, z);
        if (!this.chunks.has(key)) {
          const chunk = this.generateChunk(x, z);
          this.chunks.set(key, chunk);
        }
      }
    }

    // Unload chunks that are too far away
    const chunksToUnload: string[] = [];
    this.chunks.forEach((chunk) => {
      const distance = Math.max(
        Math.abs(chunk.x - chunkX),
        Math.abs(chunk.z - chunkZ)
      );
      if (distance > this.VIEW_DISTANCE + 1) {
        chunksToUnload.push(chunk.key);
      }
    });

    chunksToUnload.forEach(key => this.unloadChunk(key));
  }

  public updatePlayerPosition(playerX: number, playerZ: number): void {
    const { chunkX, chunkZ } = this.getChunkCoords(playerX, playerZ);

    // Only update chunks if player moved to a new chunk
    if (chunkX !== this.lastPlayerChunkX || chunkZ !== this.lastPlayerChunkZ) {
      this.loadChunksAroundPosition(playerX, playerZ);
      this.lastPlayerChunkX = chunkX;
      this.lastPlayerChunkZ = chunkZ;
    }
  }

  public getTerrainHeight(x: number, z: number): number {
    // Use same height function as terrain generation
    return Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
  }

  public update(_delta: number): void {
    // World updates (day/night cycle, weather, etc.)
  }
}
