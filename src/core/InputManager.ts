export class InputManager {
  private keys: Map<string, boolean>;
  private keysJustPressed: Map<string, boolean>;
  private keysPressedLastFrame: Map<string, boolean>;

  constructor() {
    this.keys = new Map();
    this.keysJustPressed = new Map();
    this.keysPressedLastFrame = new Map();
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
   * Check interaction key (E)
   */
  public isInteractPressed(): boolean {
    return this.isKeyJustPressed('KeyE');
  }

  /**
   * Check inventory toggle (Tab)
   */
  public isInventoryToggled(): boolean {
    return this.isKeyJustPressed('Tab');
  }

  /**
   * Check build mode toggle (B)
   */
  public isBuildModeToggled(): boolean {
    return this.isKeyJustPressed('KeyB');
  }

  /**
   * Check save key (P)
   */
  public isSavePressed(): boolean {
    return this.isKeyJustPressed('KeyP');
  }

  /**
   * Check pause menu (Escape)
   */
  public isPausePressed(): boolean {
    return this.isKeyJustPressed('Escape');
  }

  /**
   * Check recipe cycle (R)
   */
  public isRecycleCyclePressed(): boolean {
    return this.isKeyJustPressed('KeyR');
  }

  /**
   * Check help toggle (H)
   */
  public isHelpToggled(): boolean {
    return this.isKeyJustPressed('KeyH');
  }

  /**
   * Check hotbar slot selection (1-5)
   */
  public getHotbarSlotPressed(): number | null {
    for (let i = 1; i <= 5; i++) {
      if (this.isKeyJustPressed(`Digit${i}`)) {
        return i - 1; // Return 0-4 for slots
      }
    }
    return null;
  }

  public reset(): void {
    this.keys.clear();
    this.keysJustPressed.clear();
    this.keysPressedLastFrame.clear();
  }
}
