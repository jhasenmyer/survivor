/**
 * Rock - Minable rocks that provide stone and flint
 */

import * as THREE from 'three';
import { Entity } from './Entity';
import { ItemEntity } from './ItemEntity';
import { ITEMS } from '../types/Item';
import type { World } from '../core/World';
import type { Player } from '../core/Player';

export class Rock extends Entity {
  private mineCount: number = 0;
  private requiredMines: number = 3; // Takes 3 hits to break
  private rockType: 'stone' | 'flint';

  constructor(position: THREE.Vector3, rockType: 'stone' | 'flint' = 'stone') {
    super({
      position,
      health: 100,
      maxHealth: 100,
    });

    this.rockType = rockType;
    this.isInteractable = true;

    this.createMesh();
  }

  /**
   * Create rock mesh
   */
  private createMesh(): void {
    const group = new THREE.Group();

    // Rock body (irregular shape)
    const geometry = new THREE.DodecahedronGeometry(0.8, 0);
    const color = this.rockType === 'flint' ? 0x3a3a3a : 0x808080;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      metalness: 0.1,
    });

    const rock = new THREE.Mesh(geometry, material);
    rock.position.y = 0.4;
    rock.rotation.x = Math.random() * Math.PI;
    rock.rotation.z = Math.random() * Math.PI;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    this.mesh = group;
    this.mesh.position.copy(this.position);
  }

  /**
   * Update rock
   */
  public update(_delta: number, _world: World): void {
    this.updateBoundingBox();
  }

  /**
   * Handle mining interaction
   */
  public onInteract(player: Player): void {
    // Check if player has a tool equipped
    const equippedItem = player.inventory.getEquippedItem();

    if (!equippedItem || (equippedItem.id !== 'dull_axe' && equippedItem.id !== 'knife')) {
      console.log('You need a tool to mine rocks!');
      return;
    }

    // Increment mine count
    this.mineCount++;
    console.log(`Mined rock ${this.mineCount}/${this.requiredMines} times`);

    // Damage the tool (rocks wear tools faster)
    const selectedSlot = player.inventory.getSelectedSlot();
    const toolBroke = player.inventory.damageTool(selectedSlot, 2);
    if (toolBroke && player.notificationCallback) {
      player.notificationCallback(`Your ${equippedItem.name} broke!`, 'error');
    }

    // Shake rock slightly (visual feedback)
    if (this.mesh) {
      const originalScale = this.mesh.scale.clone();
      this.mesh.scale.multiplyScalar(0.9);
      setTimeout(() => {
        if (this.mesh) this.mesh.scale.copy(originalScale);
      }, 100);
    }

    // Check if rock should break
    if (this.mineCount >= this.requiredMines) {
      this.isDead = true;
      this.die();
    }
  }

  /**
   * Get interaction prompt
   */
  public getInteractionPrompt(): string {
    const equippedItem = (this as any).player?.inventory.getEquippedItem();
    if (!equippedItem) {
      return 'Need a tool to mine rock';
    }
    const resourceName = this.rockType === 'flint' ? 'Flint' : 'Stone';
    return `Press E to mine ${resourceName} (${this.mineCount}/${this.requiredMines})`;
  }

  /**
   * Handle rock breaking (drop resources)
   */
  protected die(): void {
    console.log(`Rock broke! Dropping ${this.rockType}...`);

    if (!this.mesh || !this.mesh.parent) return;

    // Drop resources based on rock type
    const dropPosition = this.position.clone();
    dropPosition.y += 0.5;

    if (this.rockType === 'flint') {
      // Drop 1-2 flint
      const quantity = 1 + Math.floor(Math.random() * 2);
      const flintDrop = new ItemEntity(ITEMS['flint'], dropPosition, quantity);
      if (this.mesh.parent) {
        (this.mesh.parent as any).entityManager?.addEntity(flintDrop);
      }
    } else {
      // Drop 2-4 stone
      const quantity = 2 + Math.floor(Math.random() * 3);
      const stoneDrop = new ItemEntity(ITEMS['stone'], dropPosition, quantity);
      if (this.mesh.parent) {
        (this.mesh.parent as any).entityManager?.addEntity(stoneDrop);
      }
    }

    // Remove rock from scene
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
