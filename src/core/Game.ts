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
import { CraftingSystem } from '../systems/CraftingSystem';
import { ITEMS, getItem } from '../types/Item';
import type { Structure } from '../entities/Structure';
import { getPerformanceMode, setPerformanceMode as persistPerformanceMode } from './GameSettings';

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
  private craftingSystem: CraftingSystem;

  // Settings (performance mode affects renderer and shadows)
  private performanceMode: boolean;

  // UI state
  private inventoryOpen: boolean = false;
  private inventoryPickedSlotIndex: number | null = null;
  private helpOpen: boolean = false;
  private craftingOpen: boolean = false;
  private hasLoggedFirstFrame: boolean = false;
  private pauseMenuOpen: boolean = false;
  private settingsOpen: boolean = false;

  // Lights (needed for TimeSystem)
  private directionalLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;

  constructor() {
    console.log('Game constructor: Starting initialization');

    this.performanceMode = getPerformanceMode();

    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    console.log('Scene created');

    // Initialize renderer (antialias only when not in performance mode)
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.performanceMode });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.applyPerformanceSettings();
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

    // Set up notification callback so entities can show notifications
    this.player.notificationCallback = (message: string, type?: 'error' | 'success' | 'info' | 'warning') => {
      this.showNotification(message, type);
    };

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
    this.interactionSystem.onStructureInteract = (entity) => {
      this.player.setHomePosition(entity.position.clone());
      this.showNotification('Home set! Use the compass to find your way back.', 'success');
    };
    console.log('InteractionSystem created');

    // Initialize save system
    console.log('Creating SaveSystem');
    this.saveSystem = new SaveSystem(this.player, this.world, this.timeSystem);
    console.log('SaveSystem created');

    // Initialize building system
    console.log('Creating BuildingSystem');
    this.buildingSystem = new BuildingSystem(this.player, this.world, this.scene);
    console.log('BuildingSystem created');

    // Initialize crafting system
    console.log('Creating CraftingSystem');
    this.craftingSystem = new CraftingSystem(this.player);
    console.log('CraftingSystem created');

    // Setup UI handlers
    this.setupUIHandlers();

    // Give player starting items (only for new game)
    this.giveStartingItems();

    console.log('Game constructor: Initialization complete');
  }

  private setupLighting(): void {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x505060, 0.7);
    this.scene.add(this.ambientLight);

    // Directional light (sun)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.3);
    this.directionalLight.position.set(50, 100, 50);
    this.directionalLight.castShadow = true;
    this.applyDirectionalShadowSettings();
    this.scene.add(this.directionalLight);
  }

  /** Apply pixel ratio and shadow map type from current performance mode. */
  private applyPerformanceSettings(): void {
    this.renderer.setPixelRatio(
      this.performanceMode ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.type = this.performanceMode
      ? THREE.BasicShadowMap
      : THREE.PCFSoftShadowMap;
    if (this.directionalLight) {
      this.applyDirectionalShadowSettings();
    }
  }

  /** Set directional light shadow map size and camera bounds from performance mode. */
  private applyDirectionalShadowSettings(): void {
    if (!this.directionalLight) return;
    if (this.performanceMode) {
      this.directionalLight.shadow.mapSize.width = 1024;
      this.directionalLight.shadow.mapSize.height = 1024;
      this.directionalLight.shadow.camera.left = -50;
      this.directionalLight.shadow.camera.right = 50;
      this.directionalLight.shadow.camera.top = 50;
      this.directionalLight.shadow.camera.bottom = -50;
      this.directionalLight.shadow.camera.near = 0.5;
      this.directionalLight.shadow.camera.far = 300;
    } else {
      this.directionalLight.shadow.mapSize.width = 2048;
      this.directionalLight.shadow.mapSize.height = 2048;
      this.directionalLight.shadow.camera.left = -100;
      this.directionalLight.shadow.camera.right = 100;
      this.directionalLight.shadow.camera.top = 100;
      this.directionalLight.shadow.camera.bottom = -100;
      this.directionalLight.shadow.camera.near = 0.5;
      this.directionalLight.shadow.camera.far = 500;
    }
    this.directionalLight.shadow.camera.updateProjectionMatrix();
  }

  /**
   * Give player starting items
   */
  private giveStartingItems(): void {
    // Add knife, axe, and empty water bottle to inventory
    this.player.inventory.addItem(ITEMS['knife'], 1);
    this.player.inventory.addItem(ITEMS['dull_axe'], 1);
    this.player.inventory.addItem(ITEMS['water_bottle_empty'], 1);

    // Select knife as equipped item (slot 0)
    this.player.inventory.selectHotbarSlot(0);

    console.log('Starting items added: Knife, Axe, and Water Bottle');

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

    // Pause menu
    const resumeButton = document.getElementById('resume-button');
    if (resumeButton) {
      resumeButton.addEventListener('click', () => {
        this.closePauseMenu();
      });
    }
    const saveButton = document.getElementById('save-button');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        if (this.saveSystem.save()) {
          this.showNotification('Game saved!', 'success');
        }
      });
    }
    const pauseSettingsButton = document.getElementById('settings-button');
    if (pauseSettingsButton) {
      pauseSettingsButton.addEventListener('click', () => {
        this.openSettingsFrom('pause');
      });
    }
    const exitButton = document.getElementById('exit-button');
    if (exitButton) {
      exitButton.addEventListener('click', () => {
        this.closePauseMenu();
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.style.display = 'block';
      });
    }

    // Main menu Settings
    const mainMenuSettingsButton = document.getElementById('main-menu-settings-button');
    if (mainMenuSettingsButton) {
      mainMenuSettingsButton.addEventListener('click', () => {
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) mainMenu.style.display = 'none';
        this.openSettingsFrom('main');
      });
    }

    // Settings panel
    const settingsBackButton = document.getElementById('settings-back-button');
    if (settingsBackButton) {
      settingsBackButton.addEventListener('click', () => {
        this.closeSettings();
      });
    }
    const performanceToggle = document.getElementById('settings-performance-toggle') as HTMLInputElement | null;
    if (performanceToggle) {
      performanceToggle.addEventListener('change', () => {
        this.setPerformanceMode(performanceToggle.checked);
      });
    }
  }

  private openSettingsFrom(from: 'pause' | 'main'): void {
    this.settingsOpen = true;
    const pauseMenu = document.getElementById('pause-menu');
    const settingsPanel = document.getElementById('settings-panel');
    const performanceToggle = document.getElementById('settings-performance-toggle') as HTMLInputElement | null;
    if (pauseMenu) pauseMenu.style.display = 'none';
    if (settingsPanel) {
      settingsPanel.dataset.from = from;
      settingsPanel.style.display = 'block';
    }
    if (performanceToggle) performanceToggle.checked = this.getPerformanceMode();
  }

  private closeSettings(): void {
    this.settingsOpen = false;
    const settingsPanel = document.getElementById('settings-panel');
    if (!settingsPanel) return;
    settingsPanel.style.display = 'none';
    const from = settingsPanel.dataset.from;
    if (from === 'pause') {
      const pauseMenu = document.getElementById('pause-menu');
      if (pauseMenu) pauseMenu.style.display = 'block';
    } else if (from === 'main') {
      const mainMenu = document.getElementById('main-menu');
      if (mainMenu) mainMenu.style.display = 'block';
    }
  }

  private openPauseMenu(): void {
    this.pauseMenuOpen = true;
    document.exitPointerLock();
    this.pause();
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.style.display = 'block';
  }

  private closePauseMenu(): void {
    this.pauseMenuOpen = false;
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.style.display = 'none';
    this.resume();
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
        const iconElement = slotElement.querySelector('.hotbar-slot-icon');
        const quantityElement = slotElement.querySelector('.hotbar-slot-quantity');
        const nameElement = slotElement.querySelector('.hotbar-slot-name');

        if (slot.item) {
          if (iconElement) iconElement.textContent = slot.item.icon;
          if (quantityElement) quantityElement.textContent = slot.quantity > 1 ? `${slot.quantity}` : '';
          if (nameElement) nameElement.textContent = slot.item.name;

          // Update durability bar for tools
          let durabilityContainer = slotElement.querySelector('.hotbar-slot-durability');
          if (slot.item.durability) {
            const durabilityPercent = this.player.inventory.getDurabilityPercentage(index) || 100;

            if (!durabilityContainer) {
              durabilityContainer = document.createElement('div');
              durabilityContainer.className = 'hotbar-slot-durability';
              const durabilityBar = document.createElement('div');
              durabilityBar.className = 'hotbar-slot-durability-bar';
              durabilityContainer.appendChild(durabilityBar);
              slotElement.appendChild(durabilityContainer);
            }

            const durabilityBar = durabilityContainer.querySelector('.hotbar-slot-durability-bar') as HTMLElement;
            if (durabilityBar) {
              durabilityBar.style.width = `${durabilityPercent}%`;
            }
          } else if (durabilityContainer) {
            durabilityContainer.remove();
          }
        } else {
          if (iconElement) iconElement.textContent = '';
          if (quantityElement) quantityElement.textContent = '';
          if (nameElement) nameElement.textContent = 'Empty';

          // Remove durability bar if exists
          const durabilityContainer = slotElement.querySelector('.hotbar-slot-durability');
          if (durabilityContainer) {
            durabilityContainer.remove();
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
    if (!this.inventoryOpen) {
      this.inventoryPickedSlotIndex = null;
    }
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
   * Toggle crafting UI
   */
  private toggleCrafting(): void {
    this.craftingOpen = !this.craftingOpen;

    if (this.craftingOpen) {
      this.craftingSystem.openMenu();
    } else {
      this.craftingSystem.closeMenu();
      // Update hotbar when closing crafting menu (in case items were crafted)
      this.updateHotbarUI();
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
      if (index < 9) {
        slotElement.classList.add('hotbar-slot-inv');
      }

      // Highlight slot when picked for moving
      if (index === this.inventoryPickedSlotIndex) {
        slotElement.classList.add('inventory-slot-picked');
      }

      if (slot.item) {
        // Create icon and quantity display
        const iconElement = document.createElement('div');
        iconElement.className = 'item-icon';
        iconElement.textContent = slot.item.icon;

        const quantityElement = document.createElement('div');
        quantityElement.className = 'item-quantity';
        quantityElement.textContent = slot.quantity > 1 ? `${slot.quantity}` : '';

        const nameElement = document.createElement('div');
        nameElement.className = 'item-name';
        nameElement.textContent = slot.item.name;

        slotElement.appendChild(iconElement);
        slotElement.appendChild(quantityElement);
        slotElement.appendChild(nameElement);

        // Add durability bar for tools
        if (slot.item.durability) {
          const durabilityPercent = this.player.inventory.getDurabilityPercentage(index) || 100;

          const durabilityContainer = document.createElement('div');
          durabilityContainer.className = 'item-durability';

          const durabilityBar = document.createElement('div');
          durabilityBar.className = 'item-durability-bar';
          durabilityBar.style.width = `${durabilityPercent}%`;

          durabilityContainer.appendChild(durabilityBar);
          slotElement.appendChild(durabilityContainer);
        }
      } else {
        slotElement.classList.add('empty-slot');
        slotElement.textContent = '';
      }

      // Left-click: pick slot for moving, or place/swap with picked slot
      slotElement.addEventListener('click', (e: MouseEvent) => {
        if (e.button !== 0) return; // only left-click
        const slotIndex = index;

        if (this.inventoryPickedSlotIndex === null) {
          // Start move: pick this slot if it has an item
          if (slot.item) {
            this.inventoryPickedSlotIndex = slotIndex;
            this.updateInventoryUI();
          }
          return;
        }

        if (this.inventoryPickedSlotIndex === slotIndex) {
          // Clicked same slot: cancel pick
          this.inventoryPickedSlotIndex = null;
          this.updateInventoryUI();
          return;
        }

        // Place/swap: move from picked slot to this slot
        this.player.inventory.swapSlots(this.inventoryPickedSlotIndex, slotIndex);
        this.inventoryPickedSlotIndex = null;
        this.updateInventoryUI();
        this.updateHotbarUI();
      });

      // Right-click: use item (consumables, etc.)
      slotElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
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

    // Update game systems with terrain and structure collision
    this.player.update(
      delta,
      (x, z) => this.world.getTerrainHeight(x, z),
      (x, z, radius) => this.world.checkStructureCollision(x, z, radius)
    );

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

    // Update home compass (direction + distance)
    this.updateHomeCompass();

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

    // Crafting menu toggle (C key) - always check so it can close too
    if (this.inputManager.isCraftingToggled()) {
      this.toggleCrafting();
      return; // Don't process other inputs when toggling
    }

    // Skip other inputs if crafting is open
    if (this.craftingOpen) {
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

      // Rotate ghost (Q key)
      if (this.inputManager.isRotateGhostPressed()) {
        this.buildingSystem.rotateGhost();
      }
    } else {
      // Normal mode inputs
      const target = this.interactionSystem.getCurrentTarget();

      // Rotate structure (R key) when looking at a placed structure
      if (this.inputManager.isRotateStructurePressed() && target?.constructor.name === 'Structure') {
        (target as Structure).rotate();
        this.showNotification('Structure rotated', 'success');
      }

      // Destroy structure and reclaim materials (G key) when looking at a placed structure
      if (this.inputManager.isDestroyStructurePressed() && target?.constructor.name === 'Structure') {
        const structure = target as Structure;
        const recipe = structure.getRecipe();
        for (const req of recipe.requirements) {
          const item = getItem(req.itemId);
          if (item) {
            this.player.addItem(item, req.quantity);
          }
        }
        this.world.entityManager.removeEntity(structure.id);
        const reclaimed = recipe.requirements.map((r) => `${r.quantity}x ${r.itemId}`).join(', ');
        this.showNotification(`Destroyed ${recipe.name}. Reclaimed: ${reclaimed}.`, 'success');
        this.updateHotbarUI();
      }

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

    // Pause menu / Settings (Escape key)
    if (this.inputManager.isPausePressed()) {
      if (this.settingsOpen) {
        this.closeSettings();
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.style.display = 'block';
        return;
      }
      if (this.pauseMenuOpen) {
        this.closePauseMenu();
        return;
      }
      this.openPauseMenu();
      return;
    }
  }

  /**
   * Update home compass: show direction arrow and distance when home is set
   */
  private updateHomeCompass(): void {
    const compassEl = document.getElementById('home-compass');
    const arrowEl = document.getElementById('home-compass-arrow');
    const textEl = document.getElementById('home-compass-text');
    if (!compassEl || !arrowEl || !textEl) return;

    if (!this.player.hasHome()) {
      compassEl.style.display = 'none';
      return;
    }

    compassEl.style.display = 'flex';

    const home = this.player.getHomePosition()!;
    const pos = this.player.getPosition();
    const distance = pos.distanceTo(home);
    textEl.textContent = `⌂ Home ${Math.round(distance)}m`;

    // Point arrow toward home (XZ plane only)
    const forward = this.player.getDirection();
    forward.y = 0;
    forward.normalize();
    const toHome = home.clone().sub(pos);
    toHome.y = 0;
    toHome.normalize();
    const angleForward = Math.atan2(forward.x, forward.z);
    const angleToHome = Math.atan2(toHome.x, toHome.z);
    let deg = ((angleToHome - angleForward) * 180) / Math.PI;
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    arrowEl.style.transform = `rotate(${deg}deg)`;
  }

  /**
   * Hide gameplay UI elements (for main menu)
   */
  private hideGameplayUI(): void {
    const hud = document.getElementById('hud');
    const hotbar = document.getElementById('hotbar');
    const crosshair = document.getElementById('crosshair');
    const homeCompass = document.getElementById('home-compass');

    if (hud) hud.style.display = 'none';
    if (hotbar) hotbar.style.display = 'none';
    if (crosshair) crosshair.style.display = 'none';
    if (homeCompass) homeCompass.style.display = 'none';
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
    // Home compass visibility is updated each frame in updateHomeCompass()
  }

  /**
   * Show a notification message to the player
   */
  public showNotification(message: string, type: 'error' | 'success' | 'info' | 'warning' = 'error'): void {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationArea.appendChild(notification);

    // Auto-remove after 3 seconds (matching CSS animation duration)
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  public onWindowResize(): void {
    this.player.camera.aspect = window.innerWidth / window.innerHeight;
    this.player.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.applyPerformanceSettings();
  }

  /** Set performance mode (smoother on slow GPUs). Takes effect immediately. */
  public setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
    persistPerformanceMode(enabled);
    this.applyPerformanceSettings();
  }

  public getPerformanceMode(): boolean {
    return this.performanceMode;
  }
}
