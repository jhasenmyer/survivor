import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Inventory } from '../systems/InventorySystem';
import { ItemDefinition } from '../types/Item';

export class Player {
  public camera: THREE.PerspectiveCamera;
  private velocity: THREE.Vector3;
  private direction: THREE.Vector3;
  private inputManager: InputManager;
  public inventory: Inventory;
  public notificationCallback?: (message: string, type?: 'error' | 'success' | 'info' | 'warning') => void;

  // Player stats
  private health: number = 100;
  private hunger: number = 100;
  private thirst: number = 100;
  private maxHealth: number = 100;
  private maxHunger: number = 100;
  private maxThirst: number = 100;

  // Movement settings
  private readonly MOVE_SPEED = 10;
  private readonly MOUSE_SENSITIVITY = 0.002;
  private readonly GRAVITY = 20;
  private readonly JUMP_FORCE = 8;

  // Home waypoint (campfire/tent/shelter) for compass
  private homePosition: THREE.Vector3 | null = null;

  private euler: THREE.Euler;
  private isLocked: boolean = false;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 5); // Eye height

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

    // Initialize inventory
    this.inventory = new Inventory();

    this.setupPointerLock();
  }

  private setupPointerLock(): void {
    document.addEventListener('click', () => {
      if (!this.isLocked) {
        // Don't lock pointer if any menu is open
        const mainMenu = document.getElementById('main-menu');
        const inventoryUI = document.getElementById('inventory-ui');
        const deathScreen = document.getElementById('death-screen');
        const loadingScreen = document.getElementById('loading-screen');
        const helpScreen = document.getElementById('help-screen');
        const pauseMenu = document.getElementById('pause-menu');
        const settingsPanel = document.getElementById('settings-panel');

        const isAnyMenuOpen =
          (mainMenu && mainMenu.style.display !== 'none') ||
          (inventoryUI && inventoryUI.style.display !== 'none') ||
          (deathScreen && deathScreen.style.display !== 'none') ||
          (loadingScreen && loadingScreen.style.display !== 'none') ||
          (helpScreen && helpScreen.style.display !== 'none') ||
          (pauseMenu && pauseMenu.style.display !== 'none') ||
          (settingsPanel && settingsPanel.style.display !== 'none');

        if (!isAnyMenuOpen) {
          document.body.requestPointerLock();
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === document.body;
    });

    document.addEventListener('mousemove', (event) => {
      if (this.isLocked) {
        this.euler.setFromQuaternion(this.camera.quaternion);
        this.euler.y -= event.movementX * this.MOUSE_SENSITIVITY;
        this.euler.x -= event.movementY * this.MOUSE_SENSITIVITY;
        this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
        this.camera.quaternion.setFromEuler(this.euler);
      }
    });
  }

  public update(
    delta: number,
    getTerrainHeight?: (x: number, z: number) => number,
    checkStructureCollision?: (x: number, z: number, radius: number) => boolean
  ): void {
    if (!this.isLocked) return;

    // Get input direction
    this.direction.set(0, 0, 0);

    if (this.inputManager.isKeyPressed('KeyW') || this.inputManager.isKeyPressed('ArrowUp')) this.direction.z -= 1;
    if (this.inputManager.isKeyPressed('KeyS') || this.inputManager.isKeyPressed('ArrowDown')) this.direction.z += 1;
    if (this.inputManager.isKeyPressed('KeyA') || this.inputManager.isKeyPressed('ArrowLeft')) this.direction.x -= 1;
    if (this.inputManager.isKeyPressed('KeyD') || this.inputManager.isKeyPressed('ArrowRight')) this.direction.x += 1;

    this.direction.normalize();

    // Apply movement relative to camera direction
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, this.camera.up).normalize();

    const moveDirection = new THREE.Vector3();
    moveDirection.addScaledVector(forward, -this.direction.z);
    moveDirection.addScaledVector(right, this.direction.x);

    this.velocity.x = moveDirection.x * this.MOVE_SPEED;
    this.velocity.z = moveDirection.z * this.MOVE_SPEED;

    // Structure collision - check if new position would collide
    if (checkStructureCollision) {
      const newX = this.camera.position.x + this.velocity.x * delta;
      const newZ = this.camera.position.z + this.velocity.z * delta;
      const playerRadius = 0.5;

      // Check collision at new position
      if (checkStructureCollision(newX, newZ, playerRadius)) {
        // Try sliding along walls by checking X and Z separately
        const xOnly = checkStructureCollision(newX, this.camera.position.z, playerRadius);
        const zOnly = checkStructureCollision(this.camera.position.x, newZ, playerRadius);

        if (xOnly) {
          this.velocity.x = 0; // Block X movement
        }
        if (zOnly) {
          this.velocity.z = 0; // Block Z movement
        }
      }
    }

    // Terrain collision - check BEFORE moving
    const EYE_HEIGHT = 1.6;
    let groundHeight = 0;
    let isOnGround = false;

    if (getTerrainHeight) {
      groundHeight = getTerrainHeight(this.camera.position.x, this.camera.position.z);
      const minHeight = groundHeight + EYE_HEIGHT;

      // Check if we're on or very close to the ground
      if (this.camera.position.y <= minHeight + 0.2) {
        isOnGround = true;
      }
    }

    // Apply gravity only if not on ground
    if (!isOnGround) {
      this.velocity.y -= this.GRAVITY * delta;
    } else {
      // On ground - stop falling
      this.velocity.y = Math.max(0, this.velocity.y);

      // Jump
      if (this.inputManager.isKeyPressed('Space')) {
        this.velocity.y = this.JUMP_FORCE;
        isOnGround = false;
      }
    }

    // Update position
    this.camera.position.addScaledVector(this.velocity, delta);

    // Post-movement terrain collision - ALWAYS enforce minimum height
    if (getTerrainHeight) {
      // Sample terrain at multiple points around player for better collision
      const sampleRadius = 0.5;
      const samples = [
        { x: this.camera.position.x, z: this.camera.position.z }, // Center
        { x: this.camera.position.x + sampleRadius, z: this.camera.position.z }, // Front
        { x: this.camera.position.x - sampleRadius, z: this.camera.position.z }, // Back
        { x: this.camera.position.x, z: this.camera.position.z + sampleRadius }, // Right
        { x: this.camera.position.x, z: this.camera.position.z - sampleRadius }, // Left
      ];

      // Find the maximum ground height from all samples
      let maxGroundHeight = 0;
      for (const sample of samples) {
        const height = getTerrainHeight(sample.x, sample.z);
        maxGroundHeight = Math.max(maxGroundHeight, height);
      }

      const minAllowedHeight = maxGroundHeight + EYE_HEIGHT;

      // Force player to stay above ground - this is a hard constraint
      if (this.camera.position.y < minAllowedHeight) {
        this.camera.position.y = minAllowedHeight;
        this.velocity.y = Math.max(0, this.velocity.y); // Stop downward velocity
      }
    }

    // Update survival stats
    this.updateSurvivalStats(delta);

    // Update HUD
    this.updateHUD();
  }

  /**
   * Update survival stats (hunger, thirst depletion)
   */
  private updateSurvivalStats(delta: number): void {
    // Deplete hunger and thirst over time
    this.hunger = Math.max(0, this.hunger - 0.5 * delta); // Lose 0.5 hunger per second
    this.thirst = Math.max(0, this.thirst - 0.4 * delta); // Lose 0.4 thirst per second

    // Take damage if starving or dehydrated
    if (this.hunger === 0 || this.thirst === 0) {
      this.takeDamage(5 * delta); // Lose 5 health per second when starving/dehydrated
    }

    // Check for death
    if (this.health <= 0) {
      this.onDeath();
    }
  }

  /**
   * Handle player death
   */
  private onDeath(): void {
    this.health = 0;
    // Show death screen
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
      deathScreen.style.display = 'flex';
    }
    // Unlock pointer so player can click respawn button
    document.exitPointerLock();
  }

  private updateHUD(): void {
    const healthEl = document.getElementById('health');
    const hungerEl = document.getElementById('hunger');
    const thirstEl = document.getElementById('thirst');

    if (healthEl) healthEl.textContent = `Health: ${Math.round(this.health)}`;
    if (hungerEl) hungerEl.textContent = `Hunger: ${Math.round(this.hunger)}`;
    if (thirstEl) thirstEl.textContent = `Thirst: ${Math.round(this.thirst)}`;
  }

  public getHealth(): number { return this.health; }
  public getHunger(): number { return this.hunger; }
  public getThirst(): number { return this.thirst; }

  /**
   * Take damage
   */
  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.updateHUD();
  }

  /**
   * Heal player
   */
  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.updateHUD();
    console.log(`Healed ${amount} health`);
  }

  /**
   * Consume food/water
   */
  public consume(hungerRestore: number, thirstRestore: number): void {
    this.hunger = Math.min(this.maxHunger, this.hunger + hungerRestore);
    this.thirst = Math.min(this.maxThirst, this.thirst + thirstRestore);
    this.updateHUD();

    if (hungerRestore > 0) console.log(`Restored ${hungerRestore} hunger`);
    if (thirstRestore > 0) console.log(`Restored ${thirstRestore} thirst`);
  }

  /**
   * Add item to inventory (helper method)
   */
  public addItem(item: ItemDefinition, quantity: number = 1): boolean {
    return this.inventory.addItem(item, quantity);
  }

  /**
   * Remove item from inventory (helper method)
   */
  public removeItemById(itemId: string, quantity: number = 1): boolean {
    return this.inventory.removeItemById(itemId, quantity);
  }

  /**
   * Check if inventory has item
   */
  public hasItem(itemId: string, quantity: number = 1): boolean {
    return this.inventory.hasItem(itemId, quantity);
  }

  /**
   * Respawn player
   */
  public respawn(): void {
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.thirst = this.maxThirst;
    this.camera.position.set(0, 1.6, 5);
    this.velocity.set(0, 0, 0);

    // Hide death screen
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
      deathScreen.style.display = 'none';
    }

    this.updateHUD();
  }

  /**
   * Get player position
   */
  public getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  /**
   * Get player direction
   */
  public getDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
  }

  /**
   * Check if pointer is locked
   */
  public isPointerLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Home waypoint for compass - set when interacting with campfire/tent/shelter
   */
  public getHomePosition(): THREE.Vector3 | null {
    return this.homePosition ? this.homePosition.clone() : null;
  }

  public setHomePosition(position: THREE.Vector3): void {
    this.homePosition = position.clone();
  }

  public hasHome(): boolean {
    return this.homePosition !== null;
  }
}
