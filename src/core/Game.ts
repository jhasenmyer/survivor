import * as THREE from 'three';
import { Player } from './Player';
import { World } from './World';
import { InputManager } from './InputManager';

export class Game {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private world: World;
  private inputManager: InputManager;
  private clock: THREE.Clock;
  private isRunning: boolean = false;

  constructor() {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById('game-canvas');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    // Initialize game systems
    this.clock = new THREE.Clock();
    this.inputManager = new InputManager();
    this.player = new Player(this.inputManager);
    this.world = new World(this.scene);

    // Add lighting
    this.setupLighting();
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  public start(): void {
    this.isRunning = true;
    this.animate();
  }

  public pause(): void {
    this.isRunning = false;
  }

  public resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.clock.start();
      this.animate();
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // Update game systems
    this.player.update(delta);
    this.world.update(delta);

    // Render
    this.renderer.render(this.scene, this.player.camera);
  };

  public onWindowResize(): void {
    this.player.camera.aspect = window.innerWidth / window.innerHeight;
    this.player.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
