/**
 * Game settings persisted to localStorage.
 * Used for performance mode and future options.
 */

const STORAGE_KEY = 'survivor-settings';

export interface SurvivorSettings {
  performanceMode: boolean;
}

const DEFAULTS: SurvivorSettings = {
  performanceMode: false
};

function load(): SurvivorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SurvivorSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(settings: SurvivorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save game settings', e);
  }
}

export function getPerformanceMode(): boolean {
  return load().performanceMode;
}

export function setPerformanceMode(enabled: boolean): void {
  const s = load();
  s.performanceMode = enabled;
  save(s);
}
