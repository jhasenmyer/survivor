import * as THREE from 'three';
import { InputManager } from './InputManager';

export class Player {
  public camera: THREE.PerspectiveCamera;
  private velocity: THREE.Vector3;
  private direction: THREE.Vector3;
  private inputManager: InputManager;

  // Player stats
  private health: number = 100;
  private hunger: number = 100;
  private thirst: number = 100;

  // Movement settings
  private readonly MOVE_SPEED = 10;
  private readonly MOUSE_SENSITIVITY = 0.002;
  private readonly GRAVITY = 20;
  private readonly JUMP_FORCE = 8;

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

    this.setupPointerLock();
  }

  private setupPointerLock(): void {
    document.addEventListener('click', () => {
      if (!this.isLocked) {
        document.body.requestPointerLock();
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

  public update(delta: number, getTerrainHeight?: (x: number, z: number) => number): void {
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

    // Update HUD
    this.updateHUD();
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
}
