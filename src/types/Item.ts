/**
 * Item system - Defines all items, their properties, and behaviors
 */

import type { Player } from '../core/Player';

export enum ItemType {
  TOOL = 'tool',
  RESOURCE = 'resource',
  CONSUMABLE = 'consumable',
  EQUIPMENT = 'equipment',
}

export interface ItemDefinition {
  id: string;
  name: string;
  type: ItemType;
  maxStack: number;
  description: string;
  useAction?: (player: Player) => void;
  durability?: number; // For tools
  damage?: number; // For tools/weapons
}

export interface ItemStack {
  item: ItemDefinition;
  quantity: number;
}

/**
 * Item Registry - All items in the game
 */
export const ITEMS: Record<string, ItemDefinition> = {
  // Tools
  knife: {
    id: 'knife',
    name: 'Knife',
    type: ItemType.TOOL,
    maxStack: 1,
    description: 'A sharp survival knife. Good for hunting small animals.',
    durability: 100,
    damage: 15,
  },

  dull_axe: {
    id: 'dull_axe',
    name: 'Old Dull Axe',
    type: ItemType.TOOL,
    maxStack: 1,
    description: 'An old axe, still usable for chopping trees.',
    durability: 50,
    damage: 10,
  },

  // Resources
  wood: {
    id: 'wood',
    name: 'Wood',
    type: ItemType.RESOURCE,
    maxStack: 50,
    description: 'Wood from trees. Used for building and crafting.',
  },

  stone: {
    id: 'stone',
    name: 'Stone',
    type: ItemType.RESOURCE,
    maxStack: 50,
    description: 'Stones gathered from the ground. Used for building.',
  },

  stick: {
    id: 'stick',
    name: 'Stick',
    type: ItemType.RESOURCE,
    maxStack: 50,
    description: 'A wooden stick. Used for crafting.',
  },

  // Food
  raw_meat: {
    id: 'raw_meat',
    name: 'Raw Meat',
    type: ItemType.CONSUMABLE,
    maxStack: 10,
    description: 'Raw meat from an animal. Restores 15 hunger. (Cook for better effect)',
    useAction: (player) => {
      player.consume(15, 0);
      player.removeItemById('raw_meat', 1);
    },
  },

  cooked_meat: {
    id: 'cooked_meat',
    name: 'Cooked Meat',
    type: ItemType.CONSUMABLE,
    maxStack: 10,
    description: 'Cooked meat. Restores 40 hunger.',
    useAction: (player) => {
      player.consume(40, 0);
      player.removeItemById('cooked_meat', 1);
    },
  },

  berries: {
    id: 'berries',
    name: 'Berries',
    type: ItemType.CONSUMABLE,
    maxStack: 20,
    description: 'Wild berries. Restores 10 hunger and 5 thirst.',
    useAction: (player) => {
      player.consume(10, 5);
      player.removeItemById('berries', 1);
    },
  },

  // Medical
  med_kit: {
    id: 'med_kit',
    name: 'Med Kit',
    type: ItemType.CONSUMABLE,
    maxStack: 1,
    description: 'Contains medical supplies. Use to unpack.',
    useAction: (player) => {
      player.addItem(ITEMS['bandage'], 3);
      player.removeItemById('med_kit', 1);
      // Show message to player (will be handled by UI)
      console.log('Unpacked med kit: Found 3 bandages!');
    },
  },

  bandage: {
    id: 'bandage',
    name: 'Bandage',
    type: ItemType.CONSUMABLE,
    maxStack: 10,
    description: 'A medical bandage. Restores 25 health.',
    useAction: (player) => {
      player.heal(25);
      player.removeItemById('bandage', 1);
    },
  },

  // Water
  water_bottle: {
    id: 'water_bottle',
    name: 'Water Bottle',
    type: ItemType.CONSUMABLE,
    maxStack: 5,
    description: 'A bottle of clean water. Restores 50 thirst.',
    useAction: (player) => {
      player.consume(0, 50);
      player.removeItemById('water_bottle', 1);
    },
  },

  dirty_water: {
    id: 'dirty_water',
    name: 'Dirty Water',
    type: ItemType.CONSUMABLE,
    maxStack: 5,
    description: 'Dirty water. Restores 20 thirst but may cause damage.',
    useAction: (player) => {
      player.consume(0, 20);
      // 50% chance to take 10 damage
      if (Math.random() < 0.5) {
        player.takeDamage(10);
        console.log('The dirty water made you sick!');
      }
      player.removeItemById('dirty_water', 1);
    },
  },
};

/**
 * Get item by ID
 */
export function getItem(itemId: string): ItemDefinition | null {
  return ITEMS[itemId] || null;
}

/**
 * Get all items of a specific type
 */
export function getItemsByType(type: ItemType): ItemDefinition[] {
  return Object.values(ITEMS).filter((item) => item.type === type);
}

/**
 * Check if item is consumable
 */
export function isConsumable(item: ItemDefinition): boolean {
  return item.type === ItemType.CONSUMABLE && item.useAction !== undefined;
}

/**
 * Check if item is a tool
 */
export function isTool(item: ItemDefinition): boolean {
  return item.type === ItemType.TOOL;
}
