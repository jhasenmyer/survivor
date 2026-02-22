/**
 * TouchControls - Virtual joystick, look pad, and action buttons for touch devices.
 * Writes movement, look delta, and actions into InputManager.
 */

import type { InputManager, KeyBindingAction } from '../core/InputManager';

const JOYSTICK_RADIUS = 56;
const JOYSTICK_DEAD = 0.15;
const LOOK_SENSITIVITY = 0.5;

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export class TouchControls {
  private inputManager: InputManager;
  private overlay: HTMLElement | null = null;

  private joystickCenterX = 0;
  private joystickCenterY = 0;
  private joystickPointerId: number | null = null;
  private joystickValueX = 0;
  private joystickValueZ = 0;

  private lookPointerId: number | null = null;
  private lookLastX = 0;
  private lookLastY = 0;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;
  }

  /**
   * Whether touch controls should be shown and used (touch device detected).
   */
  shouldShow(): boolean {
    return isTouchDevice();
  }

  /**
   * Create and show the touch overlay. Call once when game starts and shouldShow() is true.
   */
  mount(container: HTMLElement): void {
    if (this.overlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'touch-controls-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // Left: virtual joystick
    const joystickZone = document.createElement('div');
    joystickZone.id = 'touch-joystick-zone';
    const base = document.createElement('div');
    base.id = 'touch-joystick-base';
    const thumb = document.createElement('div');
    thumb.id = 'touch-joystick-thumb';
    base.appendChild(thumb);
    joystickZone.appendChild(base);
    overlay.appendChild(joystickZone);

    // Right: look pad (invisible hit area for drag-to-look)
    const lookPad = document.createElement('div');
    lookPad.id = 'touch-look-pad';
    overlay.appendChild(lookPad);

    // Action buttons: Jump, Interact (over the look area but smaller, so look pad still works)
    const jumpBtn = document.createElement('button');
    jumpBtn.type = 'button';
    jumpBtn.id = 'touch-btn-jump';
    jumpBtn.className = 'touch-action-btn';
    jumpBtn.textContent = 'Jump';
    jumpBtn.setAttribute('aria-label', 'Jump');
    overlay.appendChild(jumpBtn);

    const interactBtn = document.createElement('button');
    interactBtn.type = 'button';
    interactBtn.id = 'touch-btn-interact';
    interactBtn.className = 'touch-action-btn';
    interactBtn.textContent = 'E';
    interactBtn.setAttribute('aria-label', 'Interact');
    overlay.appendChild(interactBtn);

    // Menu button + panel for Inventory, Crafting, Build, Help, Pause, Save, Map
    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.id = 'touch-btn-menu';
    menuBtn.className = 'touch-action-btn touch-menu-btn';
    menuBtn.textContent = '\u2630';
    menuBtn.setAttribute('aria-label', 'Menu');
    overlay.appendChild(menuBtn);

    const menuPanel = document.createElement('div');
    menuPanel.id = 'touch-menu-panel';
    menuPanel.className = 'touch-menu-panel';
    const menuActions: { label: string; action: KeyBindingAction }[] = [
      { label: 'Inventory', action: 'inventory' },
      { label: 'Crafting', action: 'crafting' },
      { label: 'Build', action: 'buildMode' },
      { label: 'Rotate', action: 'rotateGhost' },
      { label: 'Cycle', action: 'recipeCycle' },
      { label: 'Destroy', action: 'destroyStructure' },
      { label: 'Help', action: 'help' },
      { label: 'Pause', action: 'pause' },
      { label: 'Save', action: 'save' },
      { label: 'Map', action: 'map' },
    ];
    menuActions.forEach(({ label, action }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'touch-menu-item';
      btn.textContent = label;
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.inputManager.setTouchActionJustPressed(action);
        menuPanel.classList.remove('open');
      });
      btn.addEventListener('click', () => {
        this.inputManager.setTouchActionJustPressed(action);
        menuPanel.classList.remove('open');
      });
      menuPanel.appendChild(btn);
    });
    const fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'touch-menu-item touch-fullscreen-btn';
    fsBtn.textContent = 'Fullscreen';
    fsBtn.setAttribute('aria-label', 'Toggle fullscreen');
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });
    menuPanel.appendChild(fsBtn);
    overlay.appendChild(menuPanel);

    menuBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      menuPanel.classList.toggle('open');
    });
    menuBtn.addEventListener('click', () => menuPanel.classList.toggle('open'));

    const vibrate = (ms = 10) => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
    };

    jumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      vibrate(15);
      this.inputManager.setTouchJumpJustPressed();
    }, { passive: false });
    interactBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      vibrate(10);
      this.inputManager.setTouchActionJustPressed('interact');
    }, { passive: false });

    this.setupJoystick(joystickZone, base, thumb);
    this.setupLookPad(lookPad);

    container.appendChild(overlay);
    this.overlay = overlay;
    this.inputManager.setTouchActive(true);
  }

  /**
   * Hide and unmount touch controls (e.g. when switching to desktop).
   */
  unmount(): void {
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    this.overlay = null;
    this.inputManager.setTouchActive(false);
    this.inputManager.setTouchMoveDirection(0, 0);
  }

  private setupJoystick(zone: HTMLElement, base: HTMLElement, thumb: HTMLElement): void {
    const getRect = () => zone.getBoundingClientRect();
    const updateThumb = () => {
      if (!thumb || !base) return;
      const r = JOYSTICK_RADIUS;
      const x = this.joystickValueX * r;
      const z = this.joystickValueZ * r;
      thumb.style.transform = `translate(${x}px, ${z}px)`;
    };

    zone.addEventListener('touchstart', (e) => {
      if (this.joystickPointerId != null) return;
      const t = e.changedTouches[0];
      this.joystickPointerId = t.identifier;
      const rect = getRect();
      this.joystickCenterX = rect.left + rect.width / 2;
      this.joystickCenterY = rect.top + rect.height / 2;
      const dx = t.clientX - this.joystickCenterX;
      const dy = t.clientY - this.joystickCenterY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const maxR = rect.width / 2;
      const scale = Math.min(1, maxR / len);
      this.joystickValueX = (dx / maxR) * scale;
      this.joystickValueZ = (dy / maxR) * scale;
      this.inputManager.setTouchMoveDirection(this.joystickValueX, this.joystickValueZ);
      updateThumb();
    }, { passive: true });

    zone.addEventListener('touchmove', (e) => {
      const t = Array.from(e.changedTouches).find((x) => x.identifier === this.joystickPointerId);
      if (!t) return;
      e.preventDefault();
      const rect = getRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = t.clientX - cx;
      let dy = t.clientY - cy;
      const maxR = rect.width / 2;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      if (len > maxR) {
        dx = (dx / len) * maxR;
        dy = (dy / len) * maxR;
      }
      this.joystickValueX = dx / maxR;
      this.joystickValueZ = dy / maxR;
      if (Math.abs(this.joystickValueX) < JOYSTICK_DEAD) this.joystickValueX = 0;
      if (Math.abs(this.joystickValueZ) < JOYSTICK_DEAD) this.joystickValueZ = 0;
      this.inputManager.setTouchMoveDirection(this.joystickValueX, this.joystickValueZ);
      updateThumb();
    }, { passive: false });

    zone.addEventListener('touchend', (e) => {
      const t = Array.from(e.changedTouches).find((x) => x.identifier === this.joystickPointerId);
      if (!t) return;
      this.joystickPointerId = null;
      this.joystickValueX = 0;
      this.joystickValueZ = 0;
      this.inputManager.setTouchMoveDirection(0, 0);
      updateThumb();
    }, { passive: true });

    zone.addEventListener('touchcancel', (e) => {
      const t = Array.from(e.changedTouches).find((x) => x.identifier === this.joystickPointerId);
      if (!t) return;
      this.joystickPointerId = null;
      this.joystickValueX = 0;
      this.joystickValueZ = 0;
      this.inputManager.setTouchMoveDirection(0, 0);
      updateThumb();
    }, { passive: true });
  }

  private setupLookPad(pad: HTMLElement): void {
    pad.addEventListener('touchstart', (e) => {
      if (this.lookPointerId != null) return;
      const t = e.changedTouches[0];
      this.lookPointerId = t.identifier;
      this.lookLastX = t.clientX;
      this.lookLastY = t.clientY;
    }, { passive: true });

    pad.addEventListener('touchmove', (e) => {
      const t = Array.from(e.changedTouches).find((x) => x.identifier === this.lookPointerId);
      if (!t) return;
      e.preventDefault();
      const dx = (t.clientX - this.lookLastX) * LOOK_SENSITIVITY;
      const dy = (t.clientY - this.lookLastY) * LOOK_SENSITIVITY;
      this.lookLastX = t.clientX;
      this.lookLastY = t.clientY;
      this.inputManager.addLookDelta(dx, dy);
    }, { passive: false });

    pad.addEventListener('touchend', (e) => {
      const t = Array.from(e.changedTouches).find((x) => x.identifier === this.lookPointerId);
      if (t) this.lookPointerId = null;
    }, { passive: true });

    pad.addEventListener('touchcancel', (e) => {
      const t = Array.from(e.changedTouches).find((x) => x.identifier === this.lookPointerId);
      if (t) this.lookPointerId = null;
    }, { passive: true });
  }

  /**
   * Fire a virtual action (e.g. from a menu button). Use for inventory, crafting, etc.
   */
  fireAction(action: KeyBindingAction): void {
    this.inputManager.setTouchActionJustPressed(action);
  }

  /**
   * Set selected hotbar slot from touch (0-8).
   */
  setHotbarSlot(slotIndex: number): void {
    this.inputManager.setTouchHotbarSlot(slotIndex);
  }
}
