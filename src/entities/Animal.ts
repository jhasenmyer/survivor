/**
 * Animal - Base class for all animals (deer, rabbits, etc.)
 * Implements basic AI: idle, flee behavior
 */

import * as THREE from 'three';
import { Entity, EntityOptions } from './Entity';
import type { World } from '../core/World';
import type { Player } from '../core/Player';
import { ItemEntity } from './ItemEntity';
import { ITEMS } from '../types/Item';

export enum AnimalState {
  IDLE = 'idle',
  FLEEING = 'fleeing',
}

export interface AnimalOptions extends EntityOptions {
  fleeDistance?: number;
  fleeSpeed?: number;
  safeDistance?: number;
  lootTable?: Array<{ itemId: string; quantity: number; chance: number }>;
}

export abstract class Animal extends Entity {
  protected state: AnimalState = AnimalState.IDLE;
  protected fleeDistance: number;
  protected fleeSpeed: number;
  protected safeDistance: number;
  protected fleeDirection: THREE.Vector3;
  protected lootTable: Array<{ itemId: string; quantity: number; chance: number }>;
  protected idleTime: number = 0;
  protected maxIdleTime: number = 3;
  protected world: World | null = null;

  constructor(options: AnimalOptions) {
    super(options);
    this.isInteractable = true;
    this.fleeDistance = options.fleeDistance || 10;
    this.fleeSpeed = options.fleeSpeed || 8;
    this.safeDistance = options.safeDistance || 20;
    this.lootTable = options.lootTable || [];
    this.fleeDirection = new THREE.Vector3();
  }

  /**
   * Update animal AI and movement
   */
  public update(delta: number, world: World): void {
    // Store world reference for spawning loot
    this.world = world;

    // Get player position (assumes world has access to player)
    const playerPos = this.getPlayerPosition(world);

    if (playerPos) {
      const distanceToPlayer = this.position.distanceTo(playerPos);

      // State machine
      switch (this.state) {
        case AnimalState.IDLE:
          this.updateIdle(delta);

          // Check if player is too close
          if (distanceToPlayer < this.fleeDistance) {
            this.startFleeing(playerPos);
          }
          break;

        case AnimalState.FLEEING:
          this.updateFleeing(delta, playerPos, world);

          // Return to idle if far enough
          if (distanceToPlayer > this.safeDistance) {
            this.state = AnimalState.IDLE;
          }
          break;
      }
    }

    // Update mesh position
    this.mesh.position.copy(this.position);

    // Update bounding box
    this.updateBoundingBox();
  }

  /**
   * Update idle state
   */
  protected updateIdle(delta: number): void {
    // Simple idle behavior - could add random wandering
    this.idleTime += delta;

    if (this.idleTime > this.maxIdleTime) {
      // Reset idle timer
      this.idleTime = 0;
    }
  }

  /**
   * Start fleeing from threat
   */
  protected startFleeing(threatPosition: THREE.Vector3): void {
    this.state = AnimalState.FLEEING;

    // Calculate flee direction (away from threat)
    this.fleeDirection
      .copy(this.position)
      .sub(threatPosition)
      .normalize();
  }

  /**
   * Update fleeing state
   */
  protected updateFleeing(
    delta: number,
    playerPos: THREE.Vector3,
    world: World
  ): void {
    // Update flee direction to point away from player
    this.fleeDirection
      .copy(this.position)
      .sub(playerPos)
      .normalize();

    // Move in flee direction with smaller steps for better terrain following
    const moveDistance = this.fleeSpeed * delta;
    const steps = Math.ceil(moveDistance / 0.5); // Sample every 0.5 units
    const stepSize = moveDistance / steps;

    for (let i = 0; i < steps; i++) {
      this.position.x += this.fleeDirection.x * stepSize;
      this.position.z += this.fleeDirection.z * stepSize;

      // Update Y position to match terrain at each step
      const terrainHeight = world.getTerrainHeight(this.position.x, this.position.z);
      this.position.y = terrainHeight; // Feet on ground
    }

    // Rotate mesh to face flee direction
    const angle = Math.atan2(this.fleeDirection.x, this.fleeDirection.z);
    this.mesh.rotation.y = angle;
  }

  /**
   * Get player position from world (helper method)
   */
  protected getPlayerPosition(world: World): THREE.Vector3 | null {
    // This is a simplified approach - in a real implementation,
    // the world or entity manager would provide access to the player
    // For now, we'll return null if not available
    return (world as any).player?.getPosition() || null;
  }

  /**
   * Handle interaction (hunting the animal)
   */
  public onInteract(player: Player): void {
    // Check if player has the right tool equipped
    const equippedItem = player.inventory.getEquippedItem();

    // Valid hunting weapons
    const validWeapons = ['knife', 'flint_knife', 'dull_axe', 'stone_axe', 'iron_axe'];
    if (!equippedItem || !validWeapons.includes(equippedItem.id)) {
      console.log('You need a weapon to hunt!');
      return;
    }

    // Deal damage based on tool
    const damage = equippedItem.damage || 10;
    this.takeDamage(damage);

    // Damage the weapon
    const selectedSlot = player.inventory.getSelectedSlot();
    const toolBroke = player.inventory.damageTool(selectedSlot, 1);
    if (toolBroke && player.notificationCallback) {
      player.notificationCallback(`Your ${equippedItem.name} broke!`, 'error');
    }

    console.log(`Hit ${this.constructor.name} for ${damage} damage!`);
  }

  /**
   * Get interaction prompt
   */
  public getInteractionPrompt(): string {
    const equippedItem = this.player?.inventory.getEquippedItem();
    const itemName = equippedItem?.name || 'weapon';
    return `Press E to hunt with ${itemName}`;
  }

  // Store player reference for prompt
  private player?: Player;
  public setPlayerReference(player: Player): void {
    this.player = player;
  }

  /**
   * Handle animal death
   */
  protected die(): void {
    console.log(`${this.constructor.name} died!`);

    // Drop loot
    this.dropLoot();

    // Fade out animation (optional)
    // For now, the entity will be removed by EntityManager
  }

  /**
   * Drop loot based on loot table
   */
  protected dropLoot(): void {
    if (!this.lootTable || this.lootTable.length === 0) return;
    if (!this.world || !this.world.entityManager) return;

    // Store reference to avoid null check issues in callback
    const entityManager = this.world.entityManager;

    // Spawn ItemEntity objects for each loot item
    this.lootTable.forEach((lootItem) => {
      if (Math.random() < lootItem.chance) {
        // Get item definition
        const itemDef = ITEMS[lootItem.itemId];
        if (!itemDef) {
          console.warn(`Unknown item: ${lootItem.itemId}`);
          return;
        }

        // Drop at animal position, slightly above ground
        const dropPosition = this.position.clone();
        dropPosition.y += 0.5;

        // Add slight random offset so multiple items don't stack perfectly
        dropPosition.x += (Math.random() - 0.5) * 0.5;
        dropPosition.z += (Math.random() - 0.5) * 0.5;

        // Create and spawn item entity
        const itemEntity = new ItemEntity(itemDef, dropPosition, lootItem.quantity);
        entityManager.addEntity(itemEntity);

        console.log(
          `Dropped ${lootItem.quantity}x ${lootItem.itemId} at position`,
          dropPosition
        );
      }
    });
  }

  /**
   * Serialize animal for saving
   */
  public serialize(): any {
    return {
      ...super.serialize(),
      state: this.state,
      fleeDistance: this.fleeDistance,
      fleeSpeed: this.fleeSpeed,
      safeDistance: this.safeDistance,
      lootTable: this.lootTable,
    };
  }

  /**
   * Deserialize animal from save data
   */
  public deserialize(data: any): void {
    super.deserialize(data);
    this.state = data.state || AnimalState.IDLE;
    this.fleeDistance = data.fleeDistance;
    this.fleeSpeed = data.fleeSpeed;
    this.safeDistance = data.safeDistance;
    this.lootTable = data.lootTable || [];
  }
}
