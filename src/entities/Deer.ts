/**
 * Deer - Large prey animal
 * Faster and more valuable than rabbits
 */

import * as THREE from 'three';
import { Animal, AnimalOptions } from './Animal';
import { ItemEntity } from './ItemEntity';
import { ITEMS } from '../types/Item';

export class Deer extends Animal {
  constructor(position: THREE.Vector3) {
    const options: AnimalOptions = {
      position,
      health: 50,
      maxHealth: 50,
      fleeDistance: 8, // Reduced from 12
      fleeSpeed: 7, // Reduced from 12 - slower than player
      safeDistance: 20, // Reduced from 25
      lootTable: [], // Deer uses override dropLoot() for meat + leather
    };

    super(options);
    this.createMesh();
  }

  /**
   * Drop randomized meat and leather (at most 5 total; minimum of either can be zero).
   */
  protected override dropLoot(): void {
    if (!this.world?.entityManager) return;

    const total = Math.floor(Math.random() * 6); // 0..5 inclusive
    const meat = total === 0 ? 0 : Math.floor(Math.random() * (total + 1)); // 0..total
    const leather = total - meat;

    const dropPosition = this.position.clone();
    dropPosition.y += 0.5;

    if (meat > 0) {
      const pos = dropPosition.clone();
      pos.x += (Math.random() - 0.5) * 0.5;
      pos.z += (Math.random() - 0.5) * 0.5;
      const itemEntity = new ItemEntity(ITEMS['raw_meat'], pos, meat);
      this.world.entityManager.addEntity(itemEntity);
    }
    if (leather > 0) {
      const pos = dropPosition.clone();
      pos.x += (Math.random() - 0.5) * 0.5;
      pos.z += (Math.random() - 0.5) * 0.5;
      const itemEntity = new ItemEntity(ITEMS['leather'], pos, leather);
      this.world.entityManager.addEntity(itemEntity);
    }
  }

  /**
   * Create deer mesh
   */
  private createMesh(): void {
    const group = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.8, 1.2);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Brown
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    body.castShadow = true;
    body.receiveShadow = true;

    // Head
    const headGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.5);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.3, -0.7);
    head.castShadow = true;

    // Antlers (small for simplicity)
    const antlerGeometry = new THREE.ConeGeometry(0.05, 0.4, 4);
    const antlerMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });

    const leftAntler = new THREE.Mesh(antlerGeometry, antlerMaterial);
    leftAntler.position.set(-0.15, 1.6, -0.7);
    leftAntler.rotation.z = -0.3;

    const rightAntler = new THREE.Mesh(antlerGeometry, antlerMaterial);
    rightAntler.position.set(0.15, 1.6, -0.7);
    rightAntler.rotation.z = 0.3;

    // Legs (4 cylinders)
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });

    const legPositions = [
      { x: -0.2, z: -0.4 }, // Front left
      { x: 0.2, z: -0.4 }, // Front right
      { x: -0.2, z: 0.4 }, // Back left
      { x: 0.2, z: 0.4 }, // Back right
    ];

    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos.x, 0.4, pos.z);
      leg.castShadow = true;
      group.add(leg);
    });

    // Tail
    const tailGeometry = new THREE.ConeGeometry(0.08, 0.3, 4);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.set(0, 0.9, 0.6);
    tail.rotation.x = Math.PI / 4;

    // Assemble
    group.add(body);
    group.add(head);
    group.add(leftAntler);
    group.add(rightAntler);
    group.add(tail);

    this.mesh = group;
    this.mesh.position.copy(this.position);
  }

  /**
   * Get interaction prompt for deer
   */
  public getInteractionPrompt(): string {
    const equippedItem = (this as any).player?.inventory.getEquippedItem();
    if (!equippedItem || equippedItem.type !== 'tool') {
      return 'Need a weapon to hunt deer';
    }
    return `Press E to hunt deer with ${equippedItem.name}`;
  }
}
