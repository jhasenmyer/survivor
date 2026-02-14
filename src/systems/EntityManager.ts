/**
 * EntityManager - Manages all entities in the game world
 * Uses chunk-based spatial organization for efficient queries
 */

import * as THREE from 'three';
import { Entity } from '../entities/Entity';
import type { World } from '../core/World';

export class EntityManager {
  private entities: Map<string, Entity> = new Map();
  private entitiesByChunk: Map<string, Set<string>> = new Map();
  private scene: THREE.Scene;
  private world: World;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
  }

  /**
   * Add entity to the world
   */
  public addEntity(entity: Entity): void {
    // Add to entities map
    this.entities.set(entity.id, entity);

    // Add mesh to scene
    this.scene.add(entity.mesh);

    // Add to chunk
    const chunkKey = this.getChunkKey(entity.position.x, entity.position.z);
    entity.chunkKey = chunkKey;

    if (!this.entitiesByChunk.has(chunkKey)) {
      this.entitiesByChunk.set(chunkKey, new Set());
    }
    this.entitiesByChunk.get(chunkKey)!.add(entity.id);
  }

  /**
   * Remove entity from the world
   */
  public removeEntity(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    // Remove from chunk
    if (entity.chunkKey) {
      const chunkEntities = this.entitiesByChunk.get(entity.chunkKey);
      if (chunkEntities) {
        chunkEntities.delete(entityId);
        if (chunkEntities.size === 0) {
          this.entitiesByChunk.delete(entity.chunkKey);
        }
      }
    }

    // Dispose entity
    entity.dispose();

    // Remove from entities map
    this.entities.delete(entityId);
  }

  /**
   * Get entity by ID
   */
  public getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Get all entities
   */
  public getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities in a specific chunk
   */
  public getEntitiesInChunk(chunkKey: string): Entity[] {
    const entityIds = this.entitiesByChunk.get(chunkKey);
    if (!entityIds) return [];

    const entities: Entity[] = [];
    entityIds.forEach((id) => {
      const entity = this.entities.get(id);
      if (entity) {
        entities.push(entity);
      }
    });

    return entities;
  }

  /**
   * Get entities within radius of position
   */
  public getEntitiesInRadius(
    position: THREE.Vector3,
    radius: number
  ): Entity[] {
    const results: Entity[] = [];

    this.entities.forEach((entity) => {
      if (entity.isWithinRadius(position, radius)) {
        results.push(entity);
      }
    });

    return results;
  }

  /**
   * Get interactable entities within radius
   */
  public getInteractablesInRadius(
    position: THREE.Vector3,
    radius: number
  ): Entity[] {
    return this.getEntitiesInRadius(position, radius).filter(
      (e) => e.isInteractable && !e.isDead
    );
  }

  /**
   * Update all entities
   */
  public update(delta: number): void {
    // Create array to avoid iterator issues when entities are removed
    const entitiesToUpdate = Array.from(this.entities.values());

    entitiesToUpdate.forEach((entity) => {
      // Update entity
      entity.update(delta, this.world);

      // Update chunk assignment if entity moved
      const newChunkKey = this.getChunkKey(
        entity.position.x,
        entity.position.z
      );
      if (newChunkKey !== entity.chunkKey) {
        this.updateEntityChunk(entity, newChunkKey);
      }

      // Remove dead entities
      if (entity.isDead) {
        this.removeEntity(entity.id);
      }
    });
  }

  /**
   * Update entity's chunk assignment
   */
  private updateEntityChunk(entity: Entity, newChunkKey: string): void {
    // Remove from old chunk
    if (entity.chunkKey) {
      const oldChunkEntities = this.entitiesByChunk.get(entity.chunkKey);
      if (oldChunkEntities) {
        oldChunkEntities.delete(entity.id);
        if (oldChunkEntities.size === 0) {
          this.entitiesByChunk.delete(entity.chunkKey);
        }
      }
    }

    // Add to new chunk
    entity.chunkKey = newChunkKey;
    if (!this.entitiesByChunk.has(newChunkKey)) {
      this.entitiesByChunk.set(newChunkKey, new Set());
    }
    this.entitiesByChunk.get(newChunkKey)!.add(entity.id);
  }

  /**
   * Get chunk key for position
   */
  private getChunkKey(x: number, z: number): string {
    const chunkX = Math.floor(x / 50); // CHUNK_SIZE = 50
    const chunkZ = Math.floor(z / 50);
    return `${chunkX},${chunkZ}`;
  }

  /**
   * Raycast to find entity under cursor
   */
  public raycastEntities(
    raycaster: THREE.Raycaster,
    maxDistance: number = 5
  ): Entity | null {
    let closestEntity: Entity | null = null;
    let closestDistance = maxDistance;

    this.entities.forEach((entity) => {
      if (!entity.isInteractable || entity.isDead) return;

      // Check if ray intersects entity's bounding box
      const intersection = raycaster.ray.intersectBox(
        entity.boundingBox,
        new THREE.Vector3()
      );

      if (intersection) {
        const distance = raycaster.ray.origin.distanceTo(intersection);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEntity = entity;
        }
      }
    });

    return closestEntity;
  }

  /**
   * Get entity count
   */
  public getEntityCount(): number {
    return this.entities.size;
  }

  /**
   * Clean up all entities
   */
  public dispose(): void {
    const entityIds = Array.from(this.entities.keys());
    entityIds.forEach((id) => this.removeEntity(id));
    this.entitiesByChunk.clear();
  }

  /**
   * Serialize all entities for saving
   */
  public serialize(): any[] {
    return Array.from(this.entities.values()).map((entity) =>
      entity.serialize()
    );
  }

  /**
   * Deserialize entities from save data
   */
  public deserialize(_data: any[]): void {
    // Note: This requires entity factories to reconstruct specific entity types
    // For now, this is a placeholder that would need entity type registration
    console.warn('EntityManager.deserialize() requires entity type factories');
  }
}
