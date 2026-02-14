/**
 * Rabbit - Small prey animal
 * Fast and skittish, less valuable than deer
 */

import * as THREE from 'three';
import { Animal, AnimalOptions } from './Animal';

export class Rabbit extends Animal {
  constructor(position: THREE.Vector3) {
    const options: AnimalOptions = {
      position,
      health: 20,
      maxHealth: 20,
      fleeDistance: 6, // Reduced from 8
      fleeSpeed: 9, // Reduced from 14 - slightly slower than player
      safeDistance: 15, // Reduced from 18
      lootTable: [
        { itemId: 'raw_meat', quantity: 1, chance: 1.0 }, // Always drops 1 meat
      ],
    };

    super(options);
    this.createMesh();
  }

  /**
   * Create rabbit mesh
   */
  private createMesh(): void {
    const group = new THREE.Group();

    // Body (small and round)
    const bodyGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC }); // Gray
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.25;
    body.scale.set(1, 0.8, 1.2); // Slightly elongated
    body.castShadow = true;
    body.receiveShadow = true;

    // Head (smaller sphere)
    const headGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 0.35, -0.3);
    head.castShadow = true;

    // Ears (long and upright)
    const earGeometry = new THREE.ConeGeometry(0.04, 0.25, 4);
    const earMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC });

    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.08, 0.55, -0.3);
    leftEar.rotation.z = -0.2;

    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.08, 0.55, -0.3);
    rightEar.rotation.z = 0.2;

    // Legs (4 small cylinders)
    const legGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 4);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0xAAAAAA });

    const legPositions = [
      { x: -0.1, z: -0.15 }, // Front left
      { x: 0.1, z: -0.15 }, // Front right
      { x: -0.12, z: 0.15 }, // Back left
      { x: 0.12, z: 0.15 }, // Back right
    ];

    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos.x, 0.1, pos.z);
      leg.castShadow = true;
      group.add(leg);
    });

    // Tail (fluffy)
    const tailGeometry = new THREE.SphereGeometry(0.08, 6, 6);
    const tail = new THREE.Mesh(tailGeometry, new THREE.MeshPhongMaterial({ color: 0xFFFFFF })); // White
    tail.position.set(0, 0.25, 0.25);

    // Eyes (tiny black spheres)
    const eyeGeometry = new THREE.SphereGeometry(0.03, 4, 4);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.08, 0.37, -0.42);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.08, 0.37, -0.42);

    // Assemble
    group.add(body);
    group.add(head);
    group.add(leftEar);
    group.add(rightEar);
    group.add(tail);
    group.add(leftEye);
    group.add(rightEye);

    this.mesh = group;
    this.mesh.position.copy(this.position);
  }

  /**
   * Get interaction prompt for rabbit
   */
  public getInteractionPrompt(): string {
    const equippedItem = (this as any).player?.inventory.getEquippedItem();
    if (!equippedItem || equippedItem.type !== 'tool') {
      return 'Need a weapon to hunt rabbit';
    }
    return `Press E to hunt rabbit with ${equippedItem.name}`;
  }
}
