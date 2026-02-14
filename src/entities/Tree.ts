/**
 * Tree - Interactable tree entity that can be chopped for wood
 */

import * as THREE from 'three';
import { Entity } from './Entity';
import type { World } from '../core/World';
import type { Player } from '../core/Player';
import { ItemEntity } from './ItemEntity';
import { ITEMS } from '../types/Item';

export class Tree extends Entity {
  private scale: number;
  private chopCount: number = 0;
  private requiredChops: number = 5;
  private world: World | null = null;

  constructor(position: THREE.Vector3, scale: number, treeGroup: THREE.Group) {
    super({
      position,
      health: 100,
      maxHealth: 100,
    });

    this.scale = scale;
    this.isInteractable = true;
    this.mesh = treeGroup;

    // Adjust required chops based on tree size
    this.requiredChops = Math.ceil(3 + scale * 2);
  }

  /**
   * Update tree (minimal - trees are static)
   */
  public update(_delta: number, world: World): void {
    // Store world reference for spawning loot
    this.world = world;
    // Trees don't need updates unless we want to add wind sway animation
    this.updateBoundingBox();
  }

  /**
   * Handle tree chopping interaction
   */
  public onInteract(player: Player): void {
    // Check if player has an axe equipped
    const equippedItem = player.inventory.getEquippedItem();

    if (!equippedItem || equippedItem.id !== 'dull_axe') {
      console.log('You need an axe to chop trees!');
      return;
    }

    // Increment chop count
    this.chopCount++;
    console.log(`Chopped tree ${this.chopCount}/${this.requiredChops} times`);

    // Play chop sound
    // TODO: audioSystem.playSound3D('tree_chop', this.position);

    // Shake tree slightly (visual feedback)
    const originalY = this.mesh.position.y;
    this.mesh.position.y = originalY - 0.1;
    setTimeout(() => {
      if (this.mesh) this.mesh.position.y = originalY;
    }, 100);

    // Check if tree should fall
    if (this.chopCount >= this.requiredChops) {
      this.isDead = true;
      this.die(); // Call die to handle loot drops
    }
  }

  /**
   * Get interaction prompt
   */
  public getInteractionPrompt(): string {
    const equippedItem = (this as any).player?.inventory.getEquippedItem();
    if (!equippedItem || equippedItem.id !== 'dull_axe') {
      return 'Need an axe to chop tree';
    }
    return `Press E to chop tree with axe (${this.chopCount}/${this.requiredChops})`;
  }

  /**
   * Handle tree death (falling and dropping wood)
   */
  protected die(): void {
    console.log('Tree has been chopped down!');

    // Calculate wood yield based on tree size
    const woodAmount = Math.ceil(2 + this.scale * 2); // 2-10 wood based on size

    // Spawn wood items in the world
    if (this.world && this.world.entityManager) {
      // Drop wood slightly above ground to make it visible
      const dropPosition = this.position.clone();
      dropPosition.y += 0.5;

      // Create wood item entity
      const woodItem = new ItemEntity(ITEMS['wood'], dropPosition, woodAmount);
      this.world.entityManager.addEntity(woodItem);

      console.log(`Tree dropped ${woodAmount} wood at position`, dropPosition);
    }

    // Add falling animation (optional)
    this.animateFall();
  }

  /**
   * Animate tree falling
   */
  private animateFall(): void {
    // Simple fall animation - rotate tree over 1 second
    const fallDirection = Math.random() * Math.PI * 2;
    const fallDuration = 1000; // 1 second
    const startTime = Date.now();
    const startRotation = this.mesh.rotation.z;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fallDuration, 1);

      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);

      this.mesh.rotation.z = startRotation + eased * (Math.PI / 2);
      this.mesh.rotation.y = fallDirection;

      // Also lower it
      this.mesh.position.y -= eased * 0.5 * (1 / 60); // Per frame

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Serialize tree
   */
  public serialize(): any {
    return {
      ...super.serialize(),
      scale: this.scale,
      chopCount: this.chopCount,
      requiredChops: this.requiredChops,
    };
  }

  /**
   * Deserialize tree
   */
  public deserialize(data: any): void {
    super.deserialize(data);
    this.scale = data.scale;
    this.chopCount = data.chopCount;
    this.requiredChops = data.requiredChops;
  }
}
