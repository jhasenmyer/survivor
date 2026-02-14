/**
 * SaveSystem - Handles saving and loading game state to localStorage
 */

import type { Player } from '../core/Player';
import type { World } from '../core/World';
import type { TimeSystem } from './TimeSystem';
import { getItem } from '../types/Item';

export interface SaveData {
  version: number;
  timestamp: number;
  player: {
    position: { x: number; y: number; z: number };
    health: number;
    hunger: number;
    thirst: number;
    inventory: any;
  };
  world: {
    timeOfDay: number;
  };
  entities: any[];
}

export class SaveSystem {
  private readonly SAVE_KEY = 'survivor_game_save';
  private readonly SAVE_VERSION = 1;
  private player: Player;
  private world: World;
  private timeSystem: TimeSystem;
  private autoSaveInterval: number | null = null;

  constructor(player: Player, world: World, timeSystem: TimeSystem) {
    this.player = player;
    this.world = world;
    this.timeSystem = timeSystem;
  }

  /**
   * Save the current game state
   */
  public save(): boolean {
    try {
      const saveData: SaveData = {
        version: this.SAVE_VERSION,
        timestamp: Date.now(),
        player: {
          position: {
            x: this.player.camera.position.x,
            y: this.player.camera.position.y,
            z: this.player.camera.position.z,
          },
          health: this.player.getHealth(),
          hunger: this.player.getHunger(),
          thirst: this.player.getThirst(),
          inventory: this.player.inventory.serialize(),
        },
        world: {
          timeOfDay: this.timeSystem.getCurrentTime(),
        },
        entities: this.world.entityManager.serialize(),
      };

      const json = JSON.stringify(saveData);
      localStorage.setItem(this.SAVE_KEY, json);

      console.log('Game saved successfully!');
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  /**
   * Load the saved game state
   */
  public load(): boolean {
    try {
      const json = localStorage.getItem(this.SAVE_KEY);
      if (!json) {
        console.log('No save data found');
        return false;
      }

      const saveData: SaveData = JSON.parse(json);

      // Check version compatibility
      if (saveData.version !== this.SAVE_VERSION) {
        console.warn('Save data version mismatch, cannot load');
        return false;
      }

      // Restore player state
      this.player.camera.position.set(
        saveData.player.position.x,
        saveData.player.position.y,
        saveData.player.position.z
      );

      // Restore player stats (using private property access workaround)
      (this.player as any).health = saveData.player.health;
      (this.player as any).hunger = saveData.player.hunger;
      (this.player as any).thirst = saveData.player.thirst;

      // Restore inventory
      this.player.inventory.deserialize(saveData.player.inventory, getItem);

      // Restore time of day
      this.timeSystem.setCurrentTime(saveData.world.timeOfDay);

      // Note: Entity restoration would need entity factories
      // For now, we skip entity restoration and let them respawn naturally

      console.log('Game loaded successfully!');
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  /**
   * Check if a save exists
   */
  public hasSave(): boolean {
    return localStorage.getItem(this.SAVE_KEY) !== null;
  }

  /**
   * Get save data info without loading
   */
  public getSaveInfo(): { timestamp: number; timeSince: string } | null {
    try {
      const json = localStorage.getItem(this.SAVE_KEY);
      if (!json) return null;

      const saveData: SaveData = JSON.parse(json);
      const now = Date.now();
      const elapsed = now - saveData.timestamp;

      const minutes = Math.floor(elapsed / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let timeSince = '';
      if (days > 0) {
        timeSince = `${days} day${days > 1 ? 's' : ''} ago`;
      } else if (hours > 0) {
        timeSince = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (minutes > 0) {
        timeSince = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else {
        timeSince = 'Just now';
      }

      return {
        timestamp: saveData.timestamp,
        timeSince,
      };
    } catch {
      return null;
    }
  }

  /**
   * Delete the saved game
   */
  public deleteSave(): void {
    localStorage.removeItem(this.SAVE_KEY);
    console.log('Save deleted');
  }

  /**
   * Start auto-save (every 60 seconds)
   */
  public startAutoSave(): void {
    if (this.autoSaveInterval) return;

    this.autoSaveInterval = window.setInterval(() => {
      console.log('Auto-saving...');
      this.save();
    }, 60000); // 60 seconds
  }

  /**
   * Stop auto-save
   */
  public stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}
