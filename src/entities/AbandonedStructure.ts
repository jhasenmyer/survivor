/**
 * AbandonedStructure - Pre-placed structures in the world with loot
 */

import * as THREE from 'three';
import { Entity } from './Entity';
import { ItemEntity } from './ItemEntity';
import type { World } from '../core/World';
import type { AbandonedStructureType, LootEntry } from '../types/AbandonedStructureType';
import { ITEMS } from '../types/Item';

export class AbandonedStructure extends Entity {
  private structureType: AbandonedStructureType;
  private hasBeenLooted: boolean = false;

  constructor(position: THREE.Vector3, structureType: AbandonedStructureType) {
    super({
      position,
      health: 100,
      maxHealth: 100,
    });

    this.structureType = structureType;
    this.createMesh();
  }

  /**
   * Create structure mesh (simple box representation)
   */
  private createMesh(): void {
    const group = new THREE.Group();
    const { width, depth, height } = this.structureType.size;

    // Floor
    const floorGeometry = new THREE.BoxGeometry(width, 0.2, depth);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = 0.1;
    floor.castShadow = true;
    floor.receiveShadow = true;
    group.add(floor);

    // Walls (4 sides)
    const wallThickness = 0.2;
    const wallHeight = height;

    // Front and back walls
    const wallGeometry1 = new THREE.BoxGeometry(width, wallHeight, wallThickness);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: this.structureType.color,
      roughness: 0.8,
    });

    const frontWall = new THREE.Mesh(wallGeometry1, wallMaterial);
    frontWall.position.set(0, wallHeight / 2, depth / 2);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    group.add(frontWall);

    const backWall = new THREE.Mesh(wallGeometry1, wallMaterial);
    backWall.position.set(0, wallHeight / 2, -depth / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    // Left and right walls (with door gap on one side)
    const wallGeometry2 = new THREE.BoxGeometry(wallThickness, wallHeight, depth - 2);

    const leftWall = new THREE.Mesh(wallGeometry2, wallMaterial);
    leftWall.position.set(-width / 2, wallHeight / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeometry2, wallMaterial);
    rightWall.position.set(width / 2, wallHeight / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);

    // Roof (pyramid style)
    const roofGeometry = new THREE.ConeGeometry(
      Math.max(width, depth) * 0.7,
      height * 0.5,
      4
    );
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = wallHeight + (height * 0.25);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    this.mesh = group;
    this.mesh.position.copy(this.position);
  }

  /**
   * Update structure
   */
  public update(_delta: number, _world: World): void {
    this.updateBoundingBox();
  }

  /**
   * Handle interaction with player
   * Structures are not directly interactable - loot spawns as separate ItemEntity
   */
  public onInteract(_player: any): void {
    // No-op: Structures are passive collision objects
  }

  /**
   * Get interaction prompt
   * Structures are not directly interactable
   */
  public getInteractionPrompt(): string {
    return ''; // No interaction prompt
  }

  /**
   * Handle structure death/destruction
   * Structures cannot be destroyed
   */
  protected die(): void {
    // No-op: Structures are indestructible
  }

  /**
   * Spawn loot inside the structure
   */
  public spawnLoot(world: World, random: () => number): void {
    if (this.hasBeenLooted || !world.entityManager) return;

    const { width, depth } = this.structureType.size;
    const lootSpawned: string[] = [];

    this.structureType.lootTable.forEach((lootEntry: LootEntry) => {
      // Check if this item spawns based on chance
      if (random() < lootEntry.chance) {
        // Random quantity within range
        const quantity =
          lootEntry.quantityMin +
          Math.floor(random() * (lootEntry.quantityMax - lootEntry.quantityMin + 1));

        // Get item definition
        const itemDef = ITEMS[lootEntry.itemId];
        if (!itemDef) {
          console.warn(`Unknown item in loot table: ${lootEntry.itemId}`);
          return;
        }

        // Spawn item inside the structure with random position
        const lootPosition = this.position.clone();
        lootPosition.x += (random() - 0.5) * (width - 1);
        lootPosition.z += (random() - 0.5) * (depth - 1);
        lootPosition.y += 0.5; // Slightly above ground

        const itemEntity = new ItemEntity(itemDef, lootPosition, quantity);
        world.entityManager.addEntity(itemEntity);

        lootSpawned.push(`${quantity}x ${itemDef.name}`);
      }
    });

    this.hasBeenLooted = true;

    if (lootSpawned.length > 0) {
      console.log(
        `${this.structureType.name} spawned with loot: ${lootSpawned.join(', ')}`
      );
    }
  }

  /**
   * Get structure info
   */
  public getStructureType(): AbandonedStructureType {
    return this.structureType;
  }

  /**
   * Serialize structure
   */
  public serialize(): any {
    return {
      ...super.serialize(),
      structureTypeId: this.structureType.id,
      hasBeenLooted: this.hasBeenLooted,
    };
  }

  /**
   * Deserialize structure
   */
  public deserialize(data: any): void {
    super.deserialize(data);
    this.hasBeenLooted = data.hasBeenLooted || false;
  }
}
