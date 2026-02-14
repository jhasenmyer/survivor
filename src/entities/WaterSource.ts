/**
 * WaterSource - Ponds and streams for drinking water
 */

import * as THREE from 'three';
import { Entity } from './Entity';
import type { World } from '../core/World';
import type { Player } from '../core/Player';

export class WaterSource extends Entity {
  private radius: number;

  constructor(position: THREE.Vector3, radius: number = 2) {
    super({
      position,
      health: 999999, // Indestructible
      maxHealth: 999999,
    });

    this.radius = radius;
    this.isInteractable = true;

    this.createMesh();
  }

  /**
   * Create visual representation of water
   */
  private createMesh(): void {
    const group = new THREE.Group();

    // Water surface (flat circle)
    const waterGeometry = new THREE.CircleGeometry(this.radius, 16);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x2299ff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0.6,
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2; // Lay flat
    water.position.y = 0.05; // Slightly above ground
    water.receiveShadow = true;
    group.add(water);

    // Pond edge (ring)
    const edgeGeometry = new THREE.RingGeometry(this.radius - 0.1, this.radius + 0.1, 16);
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      roughness: 0.9,
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.02;
    edge.receiveShadow = true;
    group.add(edge);

    this.mesh = group;
    this.mesh.position.copy(this.position);
  }

  /**
   * Update water source (minimal)
   */
  public update(_delta: number, _world: World): void {
    // Water sources are static, no updates needed
    this.updateBoundingBox();
  }

  /**
   * Handle interaction - drink water
   */
  public onInteract(player: Player): void {
    // Restore thirst
    player.consume(0, 50); // 0 hunger, 50 thirst
    console.log('Drank water, restored 50 thirst!');
  }

  /**
   * Get interaction prompt
   */
  public getInteractionPrompt(): string {
    return 'Press E to drink water';
  }

  /**
   * Water sources don't die
   */
  protected die(): void {
    // Water sources are permanent
  }

  /**
   * Get radius
   */
  public getRadius(): number {
    return this.radius;
  }
}
