/**
 * CraftingSystem - Handles crafting recipes and UI
 */

import type { Player } from '../core/Player';
import { exitPointerLock } from '../core/pointerLock';
import { RECIPES, CraftingRecipe, getRecipesByCategory } from '../types/CraftingRecipe';
import { ITEMS } from '../types/Item';

export class CraftingSystem {
  private player: Player;
  private isOpen: boolean = false;

  constructor(player: Player) {
    this.player = player;
  }

  /**
   * Check if crafting menu is open
   */
  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Open crafting menu
   */
  public openMenu(): void {
    this.isOpen = true;
    const craftingUI = document.getElementById('crafting-ui');
    if (craftingUI) {
      craftingUI.style.display = 'block';
      this.updateCraftingUI();
    }

    // Unlock pointer when menu is open (no-op on iOS Safari)
    exitPointerLock();
  }

  /**
   * Close crafting menu
   */
  public closeMenu(): void {
    this.isOpen = false;
    const craftingUI = document.getElementById('crafting-ui');
    if (craftingUI) {
      craftingUI.style.display = 'none';
    }
  }

  /**
   * Toggle crafting menu
   */
  public toggleMenu(): void {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  /**
   * Update crafting UI with available recipes
   */
  public updateCraftingUI(): void {
    const recipeList = document.getElementById('crafting-recipe-list');
    if (!recipeList) return;

    recipeList.innerHTML = '';

    // Get all recipes by category
    const categories = ['tools', 'consumables', 'equipment'];

    categories.forEach((category) => {
      const recipes = getRecipesByCategory(category);
      if (recipes.length === 0) return;

      // Add category header
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'crafting-category';
      categoryHeader.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      recipeList.appendChild(categoryHeader);

      // Add recipes
      recipes.forEach((recipe) => {
        const recipeElement = this.createRecipeElement(recipe);
        recipeList.appendChild(recipeElement);
      });
    });
  }

  /**
   * Create a recipe element for the UI
   */
  private createRecipeElement(recipe: CraftingRecipe): HTMLElement {
    const recipeEl = document.createElement('div');
    recipeEl.className = 'crafting-recipe';

    // Check if player can craft this recipe
    const canCraft = this.canCraft(recipe.id);
    if (canCraft) {
      recipeEl.classList.add('craftable');
    }

    // Get the result item
    const resultItem = ITEMS[recipe.resultItemId];

    // Recipe info
    const recipeInfo = document.createElement('div');
    recipeInfo.className = 'crafting-recipe-info';

    const recipeName = document.createElement('div');
    recipeName.className = 'crafting-recipe-name';
    recipeName.textContent = `${resultItem?.icon || ''} ${recipe.name}`;
    if (recipe.resultQuantity > 1) {
      recipeName.textContent += ` (x${recipe.resultQuantity})`;
    }

    const recipeDesc = document.createElement('div');
    recipeDesc.className = 'crafting-recipe-desc';
    recipeDesc.textContent = recipe.description;

    recipeInfo.appendChild(recipeName);
    recipeInfo.appendChild(recipeDesc);

    // Requirements
    const requirementsEl = document.createElement('div');
    requirementsEl.className = 'crafting-requirements';

    recipe.requirements.forEach((req) => {
      const reqItem = ITEMS[req.itemId];
      const playerHas = this.player.inventory.getItemCount(req.itemId);
      const hasEnough = playerHas >= req.quantity;

      const reqEl = document.createElement('div');
      reqEl.className = 'crafting-requirement';
      if (hasEnough) reqEl.classList.add('has-enough');

      reqEl.textContent = `${reqItem?.icon || ''} ${req.quantity} ${reqItem?.name || req.itemId} (${playerHas}/${req.quantity})`;
      requirementsEl.appendChild(reqEl);
    });

    // Craft button
    const craftButton = document.createElement('button');
    craftButton.className = 'crafting-button';
    craftButton.textContent = 'Craft';
    craftButton.disabled = !canCraft;

    craftButton.addEventListener('click', () => {
      if (this.craft(recipe.id)) {
        // Success - update UI
        this.updateCraftingUI();
      }
    });

    recipeEl.appendChild(recipeInfo);
    recipeEl.appendChild(requirementsEl);
    recipeEl.appendChild(craftButton);

    return recipeEl;
  }

  /**
   * Check if player can craft a recipe
   */
  public canCraft(recipeId: string): boolean {
    const recipe = RECIPES[recipeId];
    if (!recipe) return false;

    // Check all requirements
    return recipe.requirements.every((req) => {
      const playerHas = this.player.inventory.getItemCount(req.itemId);
      return playerHas >= req.quantity;
    });
  }

  /**
   * Craft an item
   */
  public craft(recipeId: string): boolean {
    const recipe = RECIPES[recipeId];
    if (!recipe) {
      console.error(`Recipe not found: ${recipeId}`);
      return false;
    }

    // Check if player can craft
    if (!this.canCraft(recipeId)) {
      console.log('Not enough resources to craft this item!');
      return false;
    }

    // Remove required items from inventory
    recipe.requirements.forEach((req) => {
      this.player.inventory.removeItemById(req.itemId, req.quantity);
    });

    // Add crafted item to inventory
    const resultItem = ITEMS[recipe.resultItemId];
    if (resultItem) {
      const success = this.player.inventory.addItem(resultItem, recipe.resultQuantity);
      if (success) {
        console.log(`Crafted ${recipe.name}!`);

        // Show notification if available
        if (this.player.notificationCallback) {
          this.player.notificationCallback(`Crafted ${recipe.name}!`, 'success');
        }

        return true;
      } else {
        console.log('Inventory full! Could not add crafted item.');
        // Refund materials since crafting failed
        recipe.requirements.forEach((req) => {
          const item = ITEMS[req.itemId];
          if (item) {
            this.player.inventory.addItem(item, req.quantity);
          }
        });
        return false;
      }
    }

    return false;
  }
}
