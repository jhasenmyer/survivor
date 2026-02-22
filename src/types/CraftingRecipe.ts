/**
 * Crafting Recipe system - Defines recipes for craftable items
 */

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  resultItemId: string; // Item ID from ITEMS registry
  resultQuantity: number;
  requirements: Array<{ itemId: string; quantity: number }>;
  category: 'tools' | 'consumables' | 'equipment';
}

/**
 * All crafting recipes in the game
 */
export const RECIPES: Record<string, CraftingRecipe> = {
  // Basic Stone Tools
  stone_axe: {
    id: 'stone_axe',
    name: 'Stone Axe',
    description: 'A sturdy axe made from stone. Better than the old dull axe.',
    resultItemId: 'stone_axe',
    resultQuantity: 1,
    requirements: [
      { itemId: 'wood', quantity: 2 },
      { itemId: 'stone', quantity: 3 },
    ],
    category: 'tools',
  },

  stone_pickaxe: {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    description: 'A pickaxe for mining rocks more efficiently.',
    resultItemId: 'stone_pickaxe',
    resultQuantity: 1,
    requirements: [
      { itemId: 'wood', quantity: 2 },
      { itemId: 'stone', quantity: 3 },
    ],
    category: 'tools',
  },

  flint_knife: {
    id: 'flint_knife',
    name: 'Flint Knife',
    description: 'A sharp knife made from flint. Better for hunting.',
    resultItemId: 'flint_knife',
    resultQuantity: 1,
    requirements: [
      { itemId: 'wood', quantity: 1 },
      { itemId: 'flint', quantity: 2 },
    ],
    category: 'tools',
  },

  // Advanced Iron Tools
  iron_axe: {
    id: 'iron_axe',
    name: 'Iron Axe',
    description: 'A high-quality iron axe. Very durable.',
    resultItemId: 'iron_axe',
    resultQuantity: 1,
    requirements: [
      { itemId: 'wood', quantity: 2 },
      { itemId: 'iron_ore', quantity: 3 },
    ],
    category: 'tools',
  },

  iron_pickaxe: {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    description: 'An iron pickaxe for efficient mining.',
    resultItemId: 'iron_pickaxe',
    resultQuantity: 1,
    requirements: [
      { itemId: 'wood', quantity: 2 },
      { itemId: 'iron_ore', quantity: 3 },
    ],
    category: 'tools',
  },

  // Resources
  stick: {
    id: 'stick',
    name: 'Stick',
    description: 'Craft sticks from wood. One wood makes 3 sticks.',
    resultItemId: 'stick',
    resultQuantity: 3,
    requirements: [{ itemId: 'wood', quantity: 1 }],
    category: 'equipment',
  },

  // Consumables
  torch: {
    id: 'torch',
    name: 'Torch',
    description: 'A simple torch for light.',
    resultItemId: 'torch',
    resultQuantity: 4,
    requirements: [
      { itemId: 'wood', quantity: 1 },
      { itemId: 'stick', quantity: 2 },
    ],
    category: 'consumables',
  },
};

/**
 * Get all recipes in a category
 */
export function getRecipesByCategory(category: string): CraftingRecipe[] {
  return Object.values(RECIPES).filter((recipe) => recipe.category === category);
}

/**
 * Get recipe by ID
 */
export function getRecipe(recipeId: string): CraftingRecipe | null {
  return RECIPES[recipeId] || null;
}
