/**
 * BuildingRecipe - Defines recipes for structures that can be built
 */

import { ITEMS } from './Item';

export interface BuildingRecipe {
  id: string;
  name: string;
  description: string;
  requirements: Array<{ itemId: string; quantity: number }>;
  width: number; // Width for placement collision
  depth: number; // Depth for placement collision
  interactable: boolean;
  interactionText?: string;
  onInteract?: (player: any) => void;
}

/**
 * All building recipes
 */
export const RECIPES: Record<string, BuildingRecipe> = {
  campfire: {
    id: 'campfire',
    name: 'Campfire',
    description: 'Cook food and stay warm. Requires 5 wood.',
    requirements: [
      { itemId: 'wood', quantity: 5 },
    ],
    width: 1.5,
    depth: 1.5,
    interactable: true,
    interactionText: 'Press E to cook raw meat',
    onInteract: (player) => {
      // Check if player has raw meat
      if (player.hasItem('raw_meat', 1)) {
        // Remove raw meat, add cooked meat
        player.removeItemById('raw_meat', 1);
        player.addItem(ITEMS['cooked_meat'], 1);
        console.log('Cooked raw meat into cooked meat!');
      } else {
        console.log('You need raw meat to cook!');
      }
    },
  },

  lean_to: {
    id: 'lean_to',
    name: 'Lean-to Shelter',
    description: 'A basic shelter. Requires 10 wood.',
    requirements: [
      { itemId: 'wood', quantity: 10 },
    ],
    width: 3,
    depth: 2,
    interactable: true,
    interactionText: 'Press E to rest (restores health)',
    onInteract: (player) => {
      // Restore health
      player.heal(50);
      console.log('Rested at shelter, restored 50 health!');
    },
  },

  // Abandoned structure (for spawning, not buildable)
  abandoned_shack: {
    id: 'abandoned_shack',
    name: 'Abandoned Shack',
    description: 'An old abandoned structure',
    requirements: [], // Not buildable
    width: 4,
    depth: 3,
    interactable: false,
  },
};
