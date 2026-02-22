/**
 * Safe Pointer Lock API helpers. iOS Safari does not support pointer lock;
 * calling requestPointerLock/exitPointerLock can throw or be undefined.
 */

export function exitPointerLock(): void {
  try {
    if (typeof document.exitPointerLock === 'function') {
      document.exitPointerLock();
    }
  } catch {
    // Ignore on unsupported browsers (e.g. iOS Safari)
  }
}

export function requestPointerLock(element: Element): void {
  try {
    if (typeof element.requestPointerLock === 'function') {
      element.requestPointerLock();
    }
  } catch {
    // Ignore on unsupported browsers (e.g. iOS Safari)
  }
}
