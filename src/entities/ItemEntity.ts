/**
 * ItemEntity - Represents a dropped item in the world
 * Can be picked up by the player
 */

import * as THREE from 'three';
import { Entity } from './Entity';
import type { World } from '../core/World';
import type { Player } from '../core/Player';
import { ItemDefinition } from '../types/Item';

export class ItemEntity extends Entity {
  private item: ItemDefinition;
  private quantity: number;
  private rotationSpeed: number = 1.5;
  private bobSpeed: number = 2;
  private bobHeight: number = 0.1;
  private baseY: number;
  private time: number = 0;

  constructor(item: ItemDefinition, position: THREE.Vector3, quantity: number = 1) {
    super({
      position,
      health: 1,
      maxHealth: 1,
    });

    this.item = item;
    this.quantity = quantity;
    this.baseY = position.y;
    this.isInteractable = true;

    this.createMesh();
  }

  /**
   * Create visual representation of item
   */
  private createMesh(): void {
    const group = new THREE.Group();

    // Create a canvas texture with the emoji
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;

    // Clear canvas
    context.clearRect(0, 0, size, size);

    // Draw emoji
    context.font = `${size * 0.8}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.item.icon, size / 2, size / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create sprite with emoji texture
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.6, 0.6, 1); // Size of the emoji sprite

    group.add(sprite);

    // Add a glow/highlight effect (circle behind the emoji)
    const glowGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFF00,
      transparent: true,
      opacity: 0.2,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    this.mesh = group;
    this.mesh.position.copy(this.position);
  }

  /**
   * Update item (rotation and bobbing animation)
   */
  public update(delta: number, _world: World): void {
    this.time += delta;

    // Rotate item
    this.mesh.rotation.y += this.rotationSpeed * delta;

    // Bob up and down
    const bobOffset = Math.sin(this.time * this.bobSpeed) * this.bobHeight;
    this.position.y = this.baseY + bobOffset;
    this.mesh.position.copy(this.position);

    // Update bounding box
    this.updateBoundingBox();
  }

  /**
   * Handle pickup interaction
   */
  public onInteract(player: Player): void {
    // Try to add item to player inventory
    const success = player.addItem(this.item, this.quantity);

    if (success) {
      console.log(`Picked up ${this.quantity}x ${this.item.name}`);
      // Mark for removal
      this.isDead = true;

      // Play pickup sound (if audio system available)
      // TODO: audioSystem.playSound('item_pickup', this.position);
    } else {
      console.log('Inventory full!');
    }
  }

  /**
   * Get interaction prompt
   */
  public getInteractionPrompt(): string {
    return `Press E to pick up ${this.item.name} (${this.quantity})`;
  }

  /**
   * Handle entity death (cleanup)
   */
  protected die(): void {
    // ItemEntity doesn't drop anything when picked up
    // Already handled in onInteract
  }

  /**
   * Get item definition
   */
  public getItem(): ItemDefinition {
    return this.item;
  }

  /**
   * Get item quantity
   */
  public getQuantity(): number {
    return this.quantity;
  }

  /**
   * Serialize item entity
   */
  public serialize(): any {
    return {
      ...super.serialize(),
      itemId: this.item.id,
      quantity: this.quantity,
      baseY: this.baseY,
    };
  }

  /**
   * Deserialize item entity
   */
  public deserialize(data: any): void {
    super.deserialize(data);
    // Note: Requires item registry to look up item definition
    this.quantity = data.quantity;
    this.baseY = data.baseY;
  }
}
