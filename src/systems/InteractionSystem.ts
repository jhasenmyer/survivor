/**
 * InteractionSystem - Handles raycast-based world interactions
 * Detects interactable entities and manages player interactions
 */

import * as THREE from 'three';
import type { Player } from '../core/Player';
import type { EntityManager } from './EntityManager';
import type { Entity } from '../entities/Entity';

export class InteractionSystem {
  private raycaster: THREE.Raycaster;
  private entityManager: EntityManager;
  private player: Player;
  private currentTarget: Entity | null = null;
  private maxInteractionDistance: number = 5;

  // UI elements
  private interactionPrompt: HTMLElement | null;

  constructor(player: Player, entityManager: EntityManager) {
    this.player = player;
    this.entityManager = entityManager;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.maxInteractionDistance;

    // Get UI elements
    this.interactionPrompt = document.getElementById('interaction-prompt');
  }

  /**
   * Update interaction system (check for interactable targets)
   */
  public update(): void {
    // Don't check for interactions if pointer not locked
    if (!this.player.isPointerLocked()) {
      this.hideInteractionPrompt();
      this.currentTarget = null;
      return;
    }

    // Cast ray from camera
    const camera = this.player.camera;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    this.raycaster.set(camera.position, direction);

    // Find closest interactable entity
    const target = this.entityManager.raycastEntities(
      this.raycaster,
      this.maxInteractionDistance
    );

    // Show prompt only if target is not an ItemEntity (items auto-pickup)
    if (target && target.constructor.name !== 'ItemEntity') {
      this.currentTarget = target;
      this.showInteractionPrompt(target.getInteractionPrompt());
    } else {
      this.currentTarget = null;
      this.hideInteractionPrompt();
    }
  }

  /**
   * Attempt to interact with current target
   */
  public interact(): void {
    if (this.currentTarget && this.player.isPointerLocked()) {
      this.currentTarget.onInteract(this.player);
      // Update immediately in case target was destroyed
      this.update();
    }
  }

  /**
   * Show interaction prompt
   */
  private showInteractionPrompt(text: string): void {
    if (this.interactionPrompt) {
      this.interactionPrompt.textContent = text;
      this.interactionPrompt.style.display = 'block';
    }
  }

  /**
   * Hide interaction prompt
   */
  private hideInteractionPrompt(): void {
    if (this.interactionPrompt) {
      this.interactionPrompt.style.display = 'none';
    }
  }

  /**
   * Get current interaction target
   */
  public getCurrentTarget(): Entity | null {
    return this.currentTarget;
  }

  /**
   * Set max interaction distance
   */
  public setMaxInteractionDistance(distance: number): void {
    this.maxInteractionDistance = distance;
    this.raycaster.far = distance;
  }
}
