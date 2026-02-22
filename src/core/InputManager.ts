/**
 * Key binding actions - used for configurable key bindings (Option A: extend InputManager)
 */
export type KeyBindingAction =
  | 'interact'
  | 'inventory'
  | 'buildMode'
  | 'save'
  | 'pause'
  | 'recipeCycle'
  | 'rotateStructure'
  | 'destroyStructure'
  | 'rotateGhost'
  | 'help'
  | 'crafting'
  | 'map';

export const DEFAULT_KEY_BINDINGS: Record<KeyBindingAction, string> = {
  interact: 'KeyE',
  inventory: 'Tab',
  buildMode: 'KeyB',
  save: 'KeyP',
  pause: 'Escape',
  recipeCycle: 'KeyR',
  rotateStructure: 'KeyR',
  destroyStructure: 'KeyG',
  rotateGhost: 'KeyQ',
  help: 'KeyH',
  crafting: 'KeyC',
  map: 'KeyM',
};

/** Unified move direction for keyboard or touch (-1 to 1 on each axis) */
export interface MoveDirection {
  x: number;
  z: number;
}

/** Look delta in pixels for this frame (e.g. from touch drag or mouse) */
export interface LookDelta {
  dx: number;
  dy: number;
}

export class InputManager {
  private keys: Map<string, boolean>;
  private keysJustPressed: Map<string, boolean>;
  private keysPressedLastFrame: Map<string, boolean>;
  private keyBindings: Record<KeyBindingAction, string>;

  /** Touch/virtual input state - written by touch layer, read by Player/Game */
  private touchActive: boolean = false;
  private touchMoveDirection: MoveDirection = { x: 0, z: 0 };
  private lookDeltaAccum: LookDelta = { dx: 0, dy: 0 };
  private touchJumpJustPressed: boolean = false;
  private touchActionJustPressed: Partial<Record<KeyBindingAction, boolean>> = {};
  private touchHotbarSlot: number | null = null;

  constructor() {
    this.keys = new Map();
    this.keysJustPressed = new Map();
    this.keysPressedLastFrame = new Map();
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS };
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      this.keys.set(event.code, true);
    });

    document.addEventListener('keyup', (event) => {
      this.keys.set(event.code, false);
    });
  }

  /**
   * Update input state (call once per frame)
   */
  public update(): void {
    // Update just pressed keys
    this.keysJustPressed.clear();

    this.keys.forEach((isPressed, keyCode) => {
      const wasPressed = this.keysPressedLastFrame.get(keyCode) || false;
      if (isPressed && !wasPressed) {
        this.keysJustPressed.set(keyCode, true);
      }
    });

    // Store current frame state for next frame
    this.keysPressedLastFrame.clear();
    this.keys.forEach((isPressed, keyCode) => {
      this.keysPressedLastFrame.set(keyCode, isPressed);
    });
  }

  /**
   * Clear touch just-pressed state. Call once per frame after handleInput and player have run.
   */
  public clearTouchJustPressed(): void {
    this.touchJumpJustPressed = false;
    this.touchActionJustPressed = {};
    this.touchHotbarSlot = null;
  }

  // --- Touch layer API (called by TouchControls) ---

  public setTouchActive(active: boolean): void {
    this.touchActive = active;
  }

  public isTouchActive(): boolean {
    return this.touchActive;
  }

  public setTouchMoveDirection(x: number, z: number): void {
    this.touchMoveDirection.x = x;
    this.touchMoveDirection.z = z;
  }

  public addLookDelta(dx: number, dy: number): void {
    this.lookDeltaAccum.dx += dx;
    this.lookDeltaAccum.dy += dy;
  }

  public setTouchJumpJustPressed(): void {
    this.touchJumpJustPressed = true;
  }

  public setTouchActionJustPressed(action: KeyBindingAction): void {
    this.touchActionJustPressed[action] = true;
  }

  public setTouchHotbarSlot(slotIndex: number): void {
    this.touchHotbarSlot = slotIndex;
  }

  // --- Unified getters (keyboard + touch) ---

  /**
   * Move direction for this frame. From keyboard (WASD) or touch joystick.
   * Returns normalized -1..1 on x and z.
   */
  public getMoveDirection(): MoveDirection {
    if (this.touchActive) {
      const { x, z } = this.touchMoveDirection;
      const len = Math.sqrt(x * x + z * z);
      if (len > 1) {
        return { x: x / len, z: z / len };
      }
      return { x, z };
    }
    let x = 0;
    let z = 0;
    if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) z -= 1;
    if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) z += 1;
    if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) x -= 1;
    if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) x += 1;
    const len = Math.sqrt(x * x + z * z);
    if (len > 1) return { x: x / len, z: z / len };
    return { x, z };
  }

  /**
   * Look delta in pixels for this frame. Returns and clears (single consumer per frame).
   */
  public consumeLookDelta(): LookDelta {
    const d = { dx: this.lookDeltaAccum.dx, dy: this.lookDeltaAccum.dy };
    this.lookDeltaAccum.dx = 0;
    this.lookDeltaAccum.dy = 0;
    return d;
  }

  /**
   * Jump just pressed this frame (Space or touch jump button).
   */
  public isJumpJustPressed(): boolean {
    return this.isKeyJustPressed('Space') || this.touchJumpJustPressed;
  }

  /**
   * Check if key is currently held down
   */
  public isKeyPressed(keyCode: string): boolean {
    return this.keys.get(keyCode) || false;
  }

  /**
   * Check if key was just pressed this frame (not held)
   */
  public isKeyJustPressed(keyCode: string): boolean {
    return this.keysJustPressed.get(keyCode) || false;
  }

  /**
   * Check if the key bound to an action was just pressed this frame (keyboard or touch)
   */
  public isActionJustPressed(action: KeyBindingAction): boolean {
    return this.isKeyJustPressed(this.keyBindings[action]) || !!this.touchActionJustPressed[action];
  }

  /**
   * Get the key code currently bound to an action
   */
  public getBinding(action: KeyBindingAction): string {
    return this.keyBindings[action];
  }

  /**
   * Set the key code for an action
   */
  public setBinding(action: KeyBindingAction, keyCode: string): void {
    this.keyBindings[action] = keyCode;
  }

  /**
   * Get all current key bindings (e.g. for settings UI or save)
   */
  public getAllBindings(): Record<KeyBindingAction, string> {
    return { ...this.keyBindings };
  }

  /**
   * Set all key bindings (e.g. from loaded settings)
   */
  public setAllBindings(bindings: Partial<Record<KeyBindingAction, string>>): void {
    for (const action of Object.keys(DEFAULT_KEY_BINDINGS) as KeyBindingAction[]) {
      if (bindings[action] != null) {
        this.keyBindings[action] = bindings[action]!;
      }
    }
  }

  /**
   * Check interaction key (E by default)
   */
  public isInteractPressed(): boolean {
    return this.isActionJustPressed('interact');
  }

  /**
   * Check inventory toggle (Tab by default)
   */
  public isInventoryToggled(): boolean {
    return this.isActionJustPressed('inventory');
  }

  /**
   * Check build mode toggle (B by default)
   */
  public isBuildModeToggled(): boolean {
    return this.isActionJustPressed('buildMode');
  }

  /**
   * Check save key (P by default)
   */
  public isSavePressed(): boolean {
    return this.isActionJustPressed('save');
  }

  /**
   * Check pause menu (Escape by default)
   */
  public isPausePressed(): boolean {
    return this.isActionJustPressed('pause');
  }

  /**
   * Check recipe cycle (R) - build mode only
   */
  public isRecycleCyclePressed(): boolean {
    return this.isActionJustPressed('recipeCycle');
  }

  /**
   * Check rotate structure (R) - when looking at placed structure
   */
  public isRotateStructurePressed(): boolean {
    return this.isActionJustPressed('rotateStructure');
  }

  /**
   * Check destroy structure (G) - when looking at placed structure
   */
  public isDestroyStructurePressed(): boolean {
    return this.isActionJustPressed('destroyStructure');
  }

  /**
   * Check rotate ghost (Q) - build mode only
   */
  public isRotateGhostPressed(): boolean {
    return this.isActionJustPressed('rotateGhost');
  }

  /**
   * Check help toggle (H by default)
   */
  public isHelpToggled(): boolean {
    return this.isActionJustPressed('help');
  }

  /**
   * Check crafting menu toggle (C by default)
   */
  public isCraftingToggled(): boolean {
    return this.isActionJustPressed('crafting');
  }

  /**
   * Check map toggle (M by default)
   */
  public isMapToggled(): boolean {
    return this.isActionJustPressed('map');
  }

  /**
   * Check hotbar slot selection (1-9 or touch)
   */
  public getHotbarSlotPressed(): number | null {
    if (this.touchHotbarSlot !== null) return this.touchHotbarSlot;
    for (let i = 1; i <= 9; i++) {
      if (this.isKeyJustPressed(`Digit${i}`)) {
        return i - 1; // Return 0-8 for slots
      }
    }
    return null;
  }

  public reset(): void {
    this.keys.clear();
    this.keysJustPressed.clear();
    this.keysPressedLastFrame.clear();
    this.touchActive = false;
    this.touchMoveDirection = { x: 0, z: 0 };
    this.lookDeltaAccum = { dx: 0, dy: 0 };
    this.touchJumpJustPressed = false;
    this.touchActionJustPressed = {};
    this.touchHotbarSlot = null;
  }
}
