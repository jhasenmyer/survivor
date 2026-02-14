/**
 * Entity - Base class for all interactive objects in the game world
 * Includes animals, structures, items, and any other world objects
 */

import * as THREE from 'three';
import type { World } from '../core/World';
import type { Player } from '../core/Player';

export interface EntityOptions {
  position: THREE.Vector3;
  health?: number;
  maxHealth?: number;
}

export abstract class Entity {
  public id: string;
  public position: THREE.Vector3;
  public mesh: THREE.Object3D;
  public health: number;
  public maxHealth: number;
  public isDead: boolean = false;
  public isInteractable: boolean = false;
  public chunkKey: string | null = null;

  // For raycasting
  public boundingBox: THREE.Box3;
  protected boundingBoxHelper?: THREE.Box3Helper;

  constructor(options: EntityOptions) {
    this.id = this.generateId();
    this.position = options.position.clone();
    this.health = options.health || 100;
    this.maxHealth = options.maxHealth || 100;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Initialize bounding box
    this.boundingBox = new THREE.Box3();
    this.updateBoundingBox();
  }

  /**
   * Generate unique ID for entity
   */
  private generateId(): string {
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update entity (called every frame)
   */
  public abstract update(delta: number, world: World): void;

  /**
   * Handle interaction with player
   */
  public abstract onInteract(player: Player): void;

  /**
   * Get interaction prompt text
   */
  public abstract getInteractionPrompt(): string;

  /**
   * Take damage
   */
  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0 && !this.isDead) {
      this.isDead = true;
      this.die();
    }
  }

  /**
   * Handle entity death
   */
  protected abstract die(): void;

  /**
   * Update bounding box for raycasting
   */
  protected updateBoundingBox(): void {
    this.boundingBox.setFromObject(this.mesh);
  }

  /**
   * Get distance to position
   */
  public distanceTo(position: THREE.Vector3): number {
    return this.position.distanceTo(position);
  }

  /**
   * Get distance to another entity
   */
  public distanceToEntity(entity: Entity): number {
    return this.position.distanceTo(entity.position);
  }

  /**
   * Check if entity is within radius of position
   */
  public isWithinRadius(position: THREE.Vector3, radius: number): boolean {
    return this.distanceTo(position) <= radius;
  }

  /**
   * Serialize entity for saving
   */
  public serialize(): any {
    return {
      id: this.id,
      type: this.constructor.name,
      position: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
      },
      health: this.health,
      maxHealth: this.maxHealth,
      isDead: this.isDead,
      chunkKey: this.chunkKey,
    };
  }

  /**
   * Deserialize entity from save data
   */
  public deserialize(data: any): void {
    this.id = data.id;
    this.position.set(data.position.x, data.position.y, data.position.z);
    this.mesh.position.copy(this.position);
    this.health = data.health;
    this.maxHealth = data.maxHealth;
    this.isDead = data.isDead;
    this.chunkKey = data.chunkKey;
    this.updateBoundingBox();
  }

  /**
   * Clean up entity resources
   */
  public dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
