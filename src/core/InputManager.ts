export class InputManager {
  private keys: Map<string, boolean>;

  constructor() {
    this.keys = new Map();
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

  public isKeyPressed(keyCode: string): boolean {
    return this.keys.get(keyCode) || false;
  }

  public reset(): void {
    this.keys.clear();
  }
}
