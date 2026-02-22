/**
 * Structure - Placeable buildings like campfires and shelters
 */

import * as THREE from 'three';
import { Entity } from './Entity';
import type { World } from '../core/World';
import type { Player } from '../core/Player';
import type { BuildingRecipe } from '../types/BuildingRecipe';

export class Structure extends Entity {
  private recipe: BuildingRecipe;

  constructor(recipe: BuildingRecipe, position: THREE.Vector3) {
    super({
      position,
      health: 100,
      maxHealth: 100,
    });

    this.recipe = recipe;
    this.isInteractable = recipe.interactable;

    this.createMesh();
  }

  /**
   * Create visual representation based on structure type
   */
  private createMesh(): void {
    const group = new THREE.Group();

    switch (this.recipe.id) {
      case 'campfire':
        this.createCampfireMesh(group);
        break;
      case 'lean_to':
        this.createLeanToMesh(group);
        break;
      case 'abandoned_shack':
        this.createAbandonedShackMesh(group);
        break;
      default:
        // Default placeholder
        this.createPlaceholderMesh(group);
    }

    this.mesh = group;
    this.mesh.position.copy(this.position);
  }

  /**
   * Create campfire mesh
   */
  private createCampfireMesh(group: THREE.Group): void {
    // Fire pit (dark stones in circle)
    const stoneGeometry = new THREE.CylinderGeometry(0.6, 0.7, 0.2, 8);
    const stoneMaterial = new THREE.MeshPhongMaterial({ color: 0x404040 });
    const stones = new THREE.Mesh(stoneGeometry, stoneMaterial);
    stones.position.y = 0.1;
    stones.castShadow = true;
    stones.receiveShadow = true;
    group.add(stones);

    // Logs (crossed)
    const logGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 6);
    const logMaterial = new THREE.MeshPhongMaterial({ color: 0x4a2511 });

    const log1 = new THREE.Mesh(logGeometry, logMaterial);
    log1.rotation.z = Math.PI / 2;
    log1.position.y = 0.3;
    group.add(log1);

    const log2 = new THREE.Mesh(logGeometry, logMaterial);
    log2.rotation.x = Math.PI / 2;
    log2.position.y = 0.3;
    group.add(log2);

    // Fire (orange cone)
    const fireGeometry = new THREE.ConeGeometry(0.3, 0.8, 4);
    const fireMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8,
    });
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.y = 0.6;
    group.add(fire);

    // Proximity light (illuminates area after dark)
    const pointLight = new THREE.PointLight(0xff8844, 1.2, 10, 2);
    pointLight.position.set(0, 0.6, 0);
    group.add(pointLight);
  }

  /**
   * Create lean-to shelter mesh
   */
  private createLeanToMesh(group: THREE.Group): void {
    // Support poles
    const poleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2, 6);
    const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x4a2511 });

    const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
    leftPole.position.set(-1, 1, -0.8);
    leftPole.castShadow = true;
    group.add(leftPole);

    const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
    rightPole.position.set(1, 1, -0.8);
    rightPole.castShadow = true;
    group.add(rightPole);

    // Roof (angled)
    const roofGeometry = new THREE.BoxGeometry(2.5, 0.1, 2);
    const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x6b4423 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 1.8, 0);
    roof.rotation.x = Math.PI / 6; // Angled
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Back wall
    const wallGeometry = new THREE.BoxGeometry(2.5, 2, 0.1);
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x5a3a1a });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(0, 1, 0.9);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  }

  /**
   * Create abandoned shack mesh
   */
  private createAbandonedShackMesh(group: THREE.Group): void {
    // Similar to lean-to but more complete and weathered
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x3a2a1a });

    // Four walls
    const wallGeometry = new THREE.BoxGeometry(4, 2.5, 0.1);

    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 1.25, 1.5);
    group.add(backWall);

    const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWall.position.set(0, 1.25, -1.5);
    group.add(frontWall);

    const sideWallGeometry = new THREE.BoxGeometry(0.1, 2.5, 3);

    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-2, 1.25, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(2, 1.25, 0);
    group.add(rightWall);

    // Roof
    const roofGeometry = new THREE.BoxGeometry(4.2, 0.2, 3.2);
    const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x2a1a0a });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 2.6;
    group.add(roof);
  }

  /**
   * Create placeholder mesh
   */
  private createPlaceholderMesh(group: THREE.Group): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.5;
    group.add(mesh);
  }

  /**
   * Update structure (minimal)
   */
  public update(_delta: number, _world: World): void {
    // Structures are static, no updates needed
    this.updateBoundingBox();
  }

  /**
   * Handle interaction
   */
  public onInteract(player: Player): void {
    if (this.recipe.onInteract) {
      this.recipe.onInteract(player);
    }
  }

  /**
   * Get interaction prompt
   */
  public getInteractionPrompt(): string {
    return this.recipe.interactionText || `${this.recipe.name}`;
  }

  /**
   * Handle structure death (should not happen normally)
   */
  protected die(): void {
    console.log(`${this.recipe.name} destroyed`);
  }

  /**
   * Get recipe
   */
  public getRecipe(): BuildingRecipe {
    return this.recipe;
  }
}
