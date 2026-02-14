/**
 * Abandoned Structure Types - Defines structure types and their loot tables
 */

export interface LootEntry {
  itemId: string;
  quantityMin: number;
  quantityMax: number;
  chance: number; // 0-1, probability this item spawns
}

export interface AbandonedStructureType {
  id: string;
  name: string;
  description: string;
  size: { width: number; depth: number; height: number };
  lootTable: LootEntry[];
  rarity: number; // Higher = rarer (1-10)
  color: number; // Color for the structure
}

/**
 * All abandoned structure types
 */
export const ABANDONED_STRUCTURES: Record<string, AbandonedStructureType> = {
  old_shack: {
    id: 'old_shack',
    name: 'Old Shack',
    description: 'A weathered wooden shack',
    size: { width: 4, depth: 4, height: 3 },
    rarity: 3,
    color: 0x8b7355, // Brown wood
    lootTable: [
      { itemId: 'med_kit', quantityMin: 1, quantityMax: 1, chance: 0.3 },
      { itemId: 'bandage', quantityMin: 1, quantityMax: 3, chance: 0.5 },
      { itemId: 'water_bottle', quantityMin: 1, quantityMax: 2, chance: 0.4 },
      { itemId: 'wood', quantityMin: 3, quantityMax: 8, chance: 0.6 },
      { itemId: 'stick', quantityMin: 2, quantityMax: 5, chance: 0.5 },
    ],
  },

  abandoned_cabin: {
    id: 'abandoned_cabin',
    name: 'Abandoned Cabin',
    description: 'A larger cabin, once someone\'s home',
    size: { width: 6, depth: 6, height: 4 },
    rarity: 5,
    color: 0x654321, // Dark brown
    lootTable: [
      { itemId: 'med_kit', quantityMin: 1, quantityMax: 2, chance: 0.5 },
      { itemId: 'bandage', quantityMin: 2, quantityMax: 5, chance: 0.7 },
      { itemId: 'water_bottle', quantityMin: 2, quantityMax: 4, chance: 0.6 },
      { itemId: 'cooked_meat', quantityMin: 1, quantityMax: 3, chance: 0.4 },
      { itemId: 'wood', quantityMin: 5, quantityMax: 15, chance: 0.8 },
      { itemId: 'stone', quantityMin: 3, quantityMax: 10, chance: 0.5 },
      { itemId: 'dull_axe', quantityMin: 1, quantityMax: 1, chance: 0.3 },
    ],
  },

  hunters_camp: {
    id: 'hunters_camp',
    name: 'Hunter\'s Camp',
    description: 'A small hunting camp with supplies',
    size: { width: 3, depth: 3, height: 2.5 },
    rarity: 4,
    color: 0x556b2f, // Olive drab
    lootTable: [
      { itemId: 'knife', quantityMin: 1, quantityMax: 1, chance: 0.4 },
      { itemId: 'raw_meat', quantityMin: 2, quantityMax: 5, chance: 0.6 },
      { itemId: 'cooked_meat', quantityMin: 1, quantityMax: 3, chance: 0.5 },
      { itemId: 'water_bottle_full', quantityMin: 1, quantityMax: 2, chance: 0.5 },
      { itemId: 'bandage', quantityMin: 1, quantityMax: 2, chance: 0.4 },
      { itemId: 'stick', quantityMin: 3, quantityMax: 8, chance: 0.7 },
    ],
  },

  supply_cache: {
    id: 'supply_cache',
    name: 'Supply Cache',
    description: 'A hidden supply stash',
    size: { width: 2, depth: 2, height: 2 },
    rarity: 6,
    color: 0x696969, // Gray metal
    lootTable: [
      { itemId: 'med_kit', quantityMin: 1, quantityMax: 1, chance: 0.6 },
      { itemId: 'water_bottle', quantityMin: 2, quantityMax: 3, chance: 0.7 },
      { itemId: 'cooked_meat', quantityMin: 2, quantityMax: 4, chance: 0.6 },
      { itemId: 'bandage', quantityMin: 3, quantityMax: 6, chance: 0.8 },
      { itemId: 'stone_axe', quantityMin: 1, quantityMax: 1, chance: 0.3 },
      { itemId: 'flint', quantityMin: 3, quantityMax: 8, chance: 0.5 },
    ],
  },

  old_tent: {
    id: 'old_tent',
    name: 'Old Tent',
    description: 'A weathered camping tent',
    size: { width: 3, depth: 2.5, height: 2 },
    rarity: 2,
    color: 0x8fbc8f, // Dark sea green
    lootTable: [
      { itemId: 'water_bottle_empty', quantityMin: 1, quantityMax: 2, chance: 0.5 },
      { itemId: 'bandage', quantityMin: 1, quantityMax: 2, chance: 0.4 },
      { itemId: 'berries', quantityMin: 2, quantityMax: 5, chance: 0.5 },
      { itemId: 'stick', quantityMin: 2, quantityMax: 4, chance: 0.6 },
      { itemId: 'torch', quantityMin: 1, quantityMax: 3, chance: 0.4 },
    ],
  },
};

/**
 * Get a random structure type based on rarity
 */
export function getRandomStructureType(random: number): AbandonedStructureType {
  // Calculate total rarity weight (inverse of rarity = more common)
  const structures = Object.values(ABANDONED_STRUCTURES);
  const totalWeight = structures.reduce((sum, s) => sum + (10 - s.rarity), 0);

  // Pick a random structure based on weighted probability
  let roll = random * totalWeight;
  for (const structure of structures) {
    roll -= (10 - structure.rarity);
    if (roll <= 0) {
      return structure;
    }
  }

  // Fallback to first structure
  return structures[0];
}
