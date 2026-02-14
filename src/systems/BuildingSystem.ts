/**
 * BuildingSystem - Handles structure placement with ghost preview
 */

import * as THREE from 'three';
import type { Player } from '../core/Player';
import type { World } from '../core/World';
import { RECIPES, BuildingRecipe } from '../types/BuildingRecipe';
import { Structure } from '../entities/Structure';

export class BuildingSystem {
  private player: Player;
  private world: World;
  private scene: THREE.Scene;
  private isInBuildMode: boolean = false;
  private currentRecipeId: string = 'campfire';
  private ghostMesh: THREE.Mesh | null = null;
  private placementValid: boolean = false;
  private placementPosition: THREE.Vector3 = new THREE.Vector3();

  constructor(player: Player, world: World, scene: THREE.Scene) {
    this.player = player;
    this.world = world;
    this.scene = scene;
  }

  /**
   * Toggle build mode on/off
   */
  public toggleBuildMode(): void {
    this.isInBuildMode = !this.isInBuildMode;

    if (this.isInBuildMode) {
      console.log('Entered build mode - Press B to exit, E to place');
      this.createGhostMesh();
    } else {
      console.log('Exited build mode');
      this.removeGhostMesh();
    }
  }

  /**
   * Check if in build mode
   */
  public isActive(): boolean {
    return this.isInBuildMode;
  }

  /**
   * Create ghost preview mesh
   */
  private createGhostMesh(): void {
    const recipe = RECIPES[this.currentRecipeId];
    if (!recipe) return;

    // Create a simple box for preview
    const geometry = new THREE.BoxGeometry(recipe.width, 1, recipe.depth);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
      wireframe: true,
    });

    this.ghostMesh = new THREE.Mesh(geometry, material);
    this.ghostMesh.position.y = 0.5;
    this.scene.add(this.ghostMesh);
  }

  /**
   * Remove ghost preview mesh
   */
  private removeGhostMesh(): void {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh.geometry.dispose();
      (this.ghostMesh.material as THREE.Material).dispose();
      this.ghostMesh = null;
    }
  }

  /**
   * Update ghost placement position and validity
   */
  public updateGhostPlacement(camera: THREE.Camera): void {
    if (!this.isInBuildMode || !this.ghostMesh) return;

    const recipe = RECIPES[this.currentRecipeId];
    if (!recipe) return;

    // Calculate placement position (in front of player)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const playerPos = camera.position.clone();
    this.placementPosition.copy(playerPos);
    this.placementPosition.addScaledVector(forward, 3); // 3 units in front

    // Snap to terrain height
    const terrainHeight = this.world.getTerrainHeight(
      this.placementPosition.x,
      this.placementPosition.z
    );
    this.placementPosition.y = terrainHeight;

    // Update ghost mesh position
    this.ghostMesh.position.copy(this.placementPosition);
    this.ghostMesh.position.y = terrainHeight + 0.5;

    // Check if placement is valid
    this.placementValid = this.checkPlacementValid(recipe);

    // Update ghost color based on validity
    const material = this.ghostMesh.material as THREE.MeshBasicMaterial;
    material.color.set(this.placementValid ? 0x00ff00 : 0xff0000);
  }

  /**
   * Check if placement is valid
   */
  private checkPlacementValid(recipe: BuildingRecipe): boolean {
    // Check if player has required items
    for (const req of recipe.requirements) {
      if (!this.player.hasItem(req.itemId, req.quantity)) {
        return false;
      }
    }

    // Check if too close to other structures (simple check)
    const nearbyStructures = this.world.entityManager.getEntitiesInRadius(
      this.placementPosition,
      recipe.width + 2
    );

    for (const entity of nearbyStructures) {
      if (entity.constructor.name === 'Structure') {
        return false; // Too close to another structure
      }
    }

    return true;
  }

  /**
   * Attempt to place structure
   */
  public placeStructure(): boolean {
    if (!this.isInBuildMode || !this.placementValid) {
      if (this.isInBuildMode && !this.placementValid) {
        console.log('Cannot place here! Check requirements and spacing.');
      }
      return false;
    }

    const recipe = RECIPES[this.currentRecipeId];
    if (!recipe) return false;

    // Remove required items from inventory
    for (const req of recipe.requirements) {
      this.player.removeItemById(req.itemId, req.quantity);
    }

    // Create structure entity
    const structure = new Structure(recipe, this.placementPosition.clone());
    this.world.entityManager.addEntity(structure);

    console.log(`Placed ${recipe.name}!`);

    // Exit build mode after placement
    this.toggleBuildMode();

    return true;
  }

  /**
   * Switch between available recipes
   */
  public cycleRecipe(): void {
    const recipeIds = Object.keys(RECIPES).filter(
      (id) => RECIPES[id].requirements.length > 0 // Only buildable structures
    );

    const currentIndex = recipeIds.indexOf(this.currentRecipeId);
    const nextIndex = (currentIndex + 1) % recipeIds.length;
    this.currentRecipeId = recipeIds[nextIndex];

    console.log(`Selected: ${RECIPES[this.currentRecipeId].name}`);

    // Update ghost mesh
    if (this.ghostMesh) {
      this.removeGhostMesh();
      this.createGhostMesh();
    }
  }

  /**
   * Get current recipe
   */
  public getCurrentRecipe(): BuildingRecipe | null {
    return RECIPES[this.currentRecipeId] || null;
  }
}
