import * as THREE from 'three';
import { Player } from './Player';
import { World } from './World';
import { InputManager } from './InputManager';
import { AssetManager } from './AssetManager';
import { AudioSystem } from '../systems/AudioSystem';
import { TimeSystem } from '../systems/TimeSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { BuildingSystem } from '../systems/BuildingSystem';
import { ITEMS } from '../types/Item';

export class Game {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private world: World;
  private inputManager: InputManager;
  private clock: THREE.Clock;
  private isRunning: boolean = false;

  // New systems
  private assetManager: AssetManager;
  private audioSystem: AudioSystem;
  private timeSystem: TimeSystem;
  private interactionSystem: InteractionSystem;
  private saveSystem: SaveSystem;
  private buildingSystem: BuildingSystem;

  // UI state
  private inventoryOpen: boolean = false;
  private helpOpen: boolean = false;
  private hasLoggedFirstFrame: boolean = false;

  // Lights (needed for TimeSystem)
  private directionalLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;

  constructor() {
    console.log('Game constructor: Starting initialization');

    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    console.log('Scene created');

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    console.log('Renderer created');

    const container = document.getElementById('game-canvas');
    if (container) {
      container.appendChild(this.renderer.domElement);
      console.log('Renderer attached to DOM');
    } else {
      console.error('Could not find game-canvas container!');
    }

    // Initialize core systems
    this.clock = new THREE.Clock();
    this.inputManager = new InputManager();

    // Add lighting
    this.setupLighting();

    // Initialize asset manager and audio system
    this.assetManager = new AssetManager();
    this.audioSystem = new AudioSystem(this.assetManager);

    // Initialize time system
    console.log('Creating TimeSystem');
    this.timeSystem = new TimeSystem(
      this.scene,
      this.directionalLight,
      this.ambientLight
    );
    console.log('TimeSystem created');

    // Initialize player and world
    console.log('Creating Player');
    this.player = new Player(this.inputManager);
    console.log('Player created');

    console.log('Creating World');
    this.world = new World(this.scene);
    this.world.setPlayer(this.player);
    console.log('World created');

    // Initialize interaction system
    console.log('Creating InteractionSystem');
    this.interactionSystem = new InteractionSystem(
      this.player,
      this.world.entityManager
    );
    console.log('InteractionSystem created');

    // Initialize save system
    console.log('Creating SaveSystem');
    this.saveSystem = new SaveSystem(this.player, this.world, this.timeSystem);
    console.log('SaveSystem created');

    // Initialize building system
    console.log('Creating BuildingSystem');
    this.buildingSystem = new BuildingSystem(this.player, this.world, this.scene);
    console.log('BuildingSystem created');

    // Setup UI handlers
    this.setupUIHandlers();

    // Give player starting items (only for new game)
    this.giveStartingItems();

    console.log('Game constructor: Initialization complete');
  }

  private setupLighting(): void {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(this.ambientLight);

    // Directional light (sun)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(50, 100, 50);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.left = -100;
    this.directionalLight.shadow.camera.right = 100;
    this.directionalLight.shadow.camera.top = 100;
    this.directionalLight.shadow.camera.bottom = -100;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(this.directionalLight);
  }

  /**
   * Give player starting items
   */
  private giveStartingItems(): void {
    // Add knife and axe to inventory
    this.player.inventory.addItem(ITEMS['knife'], 1);
    this.player.inventory.addItem(ITEMS['dull_axe'], 1);

    // Select knife as equipped item (slot 0)
    this.player.inventory.selectHotbarSlot(0);

    console.log('Starting items added: Knife and Axe');

    // Update hotbar UI
    this.updateHotbarUI();
  }

  /**
   * Setup UI event handlers
   */
  private setupUIHandlers(): void {
    // Respawn button
    const respawnButton = document.getElementById('respawn-button');
    if (respawnButton) {
      respawnButton.addEventListener('click', () => {
        this.player.respawn();
      });
    }

    // Continue button
    const continueButton = document.getElementById('continue-button');
    if (continueButton) {
      continueButton.addEventListener('click', () => {
        this.loadGame();
      });
    }

    // New game button
    const newGameButton = document.getElementById('new-game-button');
    if (newGameButton) {
      newGameButton.addEventListener('click', () => {
        this.startNewGame();
      });
    }

    // Prevent Tab key from changing focus
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
      }
    });
  }

  /**
   * Update hotbar UI to reflect inventory
   */
  private updateHotbarUI(): void {
    const hotbarSlots = this.player.inventory.getHotbarSlots();
    const selectedSlot = this.player.inventory.getSelectedSlot();

    hotbarSlots.forEach((slot, index) => {
      const slotElement = document.querySelector(
        `.hotbar-slot[data-slot="${index}"]`
      );
      if (slotElement) {
        const nameElement = slotElement.querySelector('.hotbar-slot-name');
        if (nameElement) {
          if (slot.item) {
            nameElement.textContent = `${slot.item.name}${
              slot.quantity > 1 ? ` (${slot.quantity})` : ''
            }`;
          } else {
            nameElement.textContent = 'Empty';
          }
        }

        // Update active state
        if (index === selectedSlot) {
          slotElement.classList.add('active');
        } else {
          slotElement.classList.remove('active');
        }
      }
    });
  }

  /**
   * Toggle inventory UI
   */
  private toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
    const inventoryUI = document.getElementById('inventory-ui');
    if (inventoryUI) {
      inventoryUI.style.display = this.inventoryOpen ? 'block' : 'none';
    }

    // Update inventory grid
    if (this.inventoryOpen) {
      this.updateInventoryUI();
    }

    // Unlock pointer when inventory is open
    if (this.inventoryOpen) {
      document.exitPointerLock();
    }
  }

  /**
   * Toggle help UI
   */
  private toggleHelp(): void {
    this.helpOpen = !this.helpOpen;
    const helpScreen = document.getElementById('help-screen');
    if (helpScreen) {
      helpScreen.style.display = this.helpOpen ? 'flex' : 'none';
    }

    // Unlock pointer when help is open
    if (this.helpOpen) {
      document.exitPointerLock();
    }
  }

  /**
   * Update full inventory UI
   */
  private updateInventoryUI(): void {
    const inventoryGrid = document.getElementById('inventory-grid');
    if (!inventoryGrid) return;

    inventoryGrid.innerHTML = '';

    const allSlots = this.player.inventory.getAllSlots();
    allSlots.forEach((slot, index) => {
      const slotElement = document.createElement('div');
      slotElement.className = 'inventory-slot';

      // Mark hotbar slots
      if (index < 5) {
        slotElement.classList.add('hotbar-slot-inv');
      }

      if (slot.item) {
        slotElement.textContent = `${slot.item.name}\n${slot.quantity}`;
      } else {
        slotElement.textContent = 'Empty';
      }

      // Add click handler for using items
      slotElement.addEventListener('click', () => {
        if (slot.item && slot.item.useAction) {
          slot.item.useAction(this.player);
          this.updateInventoryUI();
          this.updateHotbarUI();
        }
      });

      inventoryGrid.appendChild(slotElement);
    });
  }

  /**
   * Check for save and show main menu
   */
  public checkSaveAndShowMenu(): void {
    const mainMenu = document.getElementById('main-menu');
    const loadingScreen = document.getElementById('loading-screen');

    // Hide gameplay UI elements
    this.hideGameplayUI();

    // Release pointer lock
    document.exitPointerLock();

    if (this.saveSystem.hasSave()) {
      // Show main menu with continue option
      const saveInfo = this.saveSystem.getSaveInfo();
      const saveInfoEl = document.getElementById('save-info');
      if (saveInfoEl && saveInfo) {
        saveInfoEl.textContent = `Last saved: ${saveInfo.timeSince}`;
      }

      if (mainMenu) mainMenu.style.display = 'block';
      if (loadingScreen) loadingScreen.style.display = 'none';
    } else {
      // No save, start new game automatically
      this.startNewGame();
    }
  }

  /**
   * Load saved game
   */
  private loadGame(): void {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'none';

    if (this.saveSystem.load()) {
      console.log('Save loaded, starting game...');
      this.updateHotbarUI();
      this.start();
    } else {
      console.error('Failed to load save, starting new game...');
      this.startNewGame();
    }
  }

  /**
   * Start a new game
   */
  private startNewGame(): void {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'none';

    // Give starting items (already done in constructor for new game)
    console.log('Starting new game...');
    this.start();
  }

  public async start(): Promise<void> {
    console.log('start() called');

    // Show gameplay UI elements
    this.showGameplayUI();

    // Show loading screen
    const loadingScreen = document.getElementById('loading-screen');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingText = document.getElementById('loading-text');

    // Load audio assets
    if (loadingText) loadingText.textContent = 'Loading audio...';

    const audioFiles = [
      { path: '/sounds/forest_ambient.mp3', name: 'forest_ambient' },
      { path: '/sounds/footstep_grass.mp3', name: 'footstep_grass' },
      { path: '/sounds/tree_chop.mp3', name: 'tree_chop' },
      { path: '/sounds/item_pickup.mp3', name: 'item_pickup' },
    ];

    console.log('Loading audio files...');
    try {
      await this.assetManager.loadAudioBatch(audioFiles, (progress) => {
        if (loadingProgress) {
          loadingProgress.style.width = `${progress.percentage}%`;
        }
        if (loadingText) {
          loadingText.textContent = `Loading ${progress.currentFile}...`;
        }
      });
      console.log('Audio files loaded');
    } catch (error) {
      console.warn('Some audio files failed to load, continuing anyway...', error);
    }

    // Hide loading screen
    console.log('Hiding loading screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }

    // Resume audio context on first user interaction (don't await - will happen when user clicks)
    console.log('Attempting to resume audio context');
    this.audioSystem.resume().then(() => {
      console.log('Audio context resumed');
      // Start ambient forest sound after audio is allowed
      this.audioSystem.playAmbient('forest_ambient', 0.3);
    }).catch(err => {
      console.log('Audio context resume failed (expected until user interaction):', err);
    });

    // Start game loop immediately (don't wait for audio)
    console.log('Starting game loop');
    this.isRunning = true;
    this.animate();
    console.log('Game loop started');

    // Start auto-save
    this.saveSystem.startAutoSave();
    console.log('Auto-save enabled (every 60 seconds)');
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
    if (!this.isRunning) {
      console.log('animate() called but game not running');
      return;
    }

    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // Log first frame
    if (!this.hasLoggedFirstFrame) {
      console.log('First frame rendering, delta:', delta);
      this.hasLoggedFirstFrame = true;
    }

    // Update input manager
    this.inputManager.update();

    // Handle input
    this.handleInput();

    // Update game systems with terrain collision
    this.player.update(delta, (x, z) => this.world.getTerrainHeight(x, z));

    // Update world chunks based on player position
    this.world.updatePlayerPosition(
      this.player.camera.position.x,
      this.player.camera.position.z
    );

    // Update time system (day/night cycle)
    this.timeSystem.update(delta);

    // Update entities
    this.world.entityManager.update(delta);

    // Update interaction system (skip if in build mode)
    if (!this.buildingSystem.isActive()) {
      this.interactionSystem.update();
    }

    // Update building system ghost placement
    this.buildingSystem.updateGhostPlacement(this.player.camera);

    // Auto-pickup nearby items
    this.checkAutoPickup();

    // Update audio listener position
    this.audioSystem.updateListenerPosition(this.player.camera);

    // Update audio system
    this.audioSystem.update(delta);

    this.world.update(delta);

    // Render
    this.renderer.render(this.scene, this.player.camera);
  };

  /**
   * Check for nearby items and auto-pickup
   */
  private checkAutoPickup(): void {
    const pickupRadius = 1.5; // Pick up items within 1.5 units
    const playerPos = this.player.getPosition();

    // Get nearby entities
    const nearbyEntities = this.world.entityManager.getEntitiesInRadius(
      playerPos,
      pickupRadius
    );

    // Auto-pickup ItemEntity objects
    let pickedUpSomething = false;
    nearbyEntities.forEach((entity) => {
      // Check if it's an ItemEntity (we can check the constructor name)
      if (entity.constructor.name === 'ItemEntity' && entity.isInteractable && !entity.isDead) {
        console.log('Auto-picking up:', entity.constructor.name, 'at distance:', entity.distanceTo(playerPos));
        // Trigger the interaction (pickup)
        entity.onInteract(this.player);
        pickedUpSomething = true;
      }
    });

    // Update hotbar UI if we picked up anything
    if (pickedUpSomething) {
      this.updateHotbarUI();
    }
  }

  /**
   * Handle player input
   */
  private handleInput(): void {
    // Help toggle (H key) - always check so it can open/close anytime
    if (this.inputManager.isHelpToggled()) {
      this.toggleHelp();
      return; // Don't process other inputs when toggling
    }

    // Skip other inputs if help is open
    if (this.helpOpen) {
      return;
    }

    // Inventory toggle (Tab key) - always check so it can close too
    if (this.inputManager.isInventoryToggled()) {
      this.toggleInventory();
      return; // Don't process other inputs when toggling
    }

    // Skip other inputs if inventory is open
    if (this.inventoryOpen) {
      return;
    }

    // Build mode toggle (B key)
    if (this.inputManager.isBuildModeToggled()) {
      this.buildingSystem.toggleBuildMode();
    }

    // Handle inputs based on mode
    if (this.buildingSystem.isActive()) {
      // Build mode inputs
      if (this.inputManager.isInteractPressed()) {
        if (this.buildingSystem.placeStructure()) {
          this.updateHotbarUI(); // Update UI after placing (resources used)
        }
      }

      // Recipe cycle (R key)
      if (this.inputManager.isRecycleCyclePressed()) {
        this.buildingSystem.cycleRecipe();
      }
    } else {
      // Normal mode inputs
      // Interaction (E key)
      if (this.inputManager.isInteractPressed()) {
        this.interactionSystem.interact();
        this.updateHotbarUI();
      }
    }

    // Hotbar slot selection (1-5 keys)
    const hotbarSlot = this.inputManager.getHotbarSlotPressed();
    if (hotbarSlot !== null) {
      this.player.inventory.selectHotbarSlot(hotbarSlot);
      this.updateHotbarUI();
    }

    // Save game (P key)
    if (this.inputManager.isSavePressed()) {
      console.log('Saving game...');
      if (this.saveSystem.save()) {
        console.log('Game saved successfully!');
        // TODO: Show "Game Saved!" message to player
      }
    }

    // Pause menu (Escape key)
    if (this.inputManager.isPausePressed()) {
      console.log('Pause menu - not yet implemented');
      // TODO: Show pause menu
    }
  }

  /**
   * Hide gameplay UI elements (for main menu)
   */
  private hideGameplayUI(): void {
    const hud = document.getElementById('hud');
    const hotbar = document.getElementById('hotbar');
    const crosshair = document.getElementById('crosshair');

    if (hud) hud.style.display = 'none';
    if (hotbar) hotbar.style.display = 'none';
    if (crosshair) crosshair.style.display = 'none';
  }

  /**
   * Show gameplay UI elements (when game starts)
   */
  private showGameplayUI(): void {
    const hud = document.getElementById('hud');
    const hotbar = document.getElementById('hotbar');
    const crosshair = document.getElementById('crosshair');

    if (hud) hud.style.display = 'block';
    if (hotbar) hotbar.style.display = 'flex';
    if (crosshair) crosshair.style.display = 'block';
  }

  public onWindowResize(): void {
    this.player.camera.aspect = window.innerWidth / window.innerHeight;
    this.player.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
