/**
 * InventorySystem - Manages player inventory, hotbar, and item operations
 */

import { ItemDefinition } from '../types/Item';

export interface InventorySlot {
  item: ItemDefinition | null;
  quantity: number;
  currentDurability?: number; // For tools - tracks current durability
}

export class Inventory {
  private slots: InventorySlot[] = [];
  private maxSlots: number = 30; // 30 total inventory slots (9 hotbar + 21 main)
  private hotbarSize: number = 9; // First 9 slots are hotbar
  private selectedHotbarSlot: number = 0;

  constructor() {
    // Initialize empty slots
    for (let i = 0; i < this.maxSlots; i++) {
      this.slots.push({ item: null, quantity: 0 });
    }
  }

  /**
   * Add item to inventory
   */
  public addItem(item: ItemDefinition, quantity: number = 1): boolean {
    // Try to stack with existing items
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.item && slot.item.id === item.id) {
        const spaceAvailable = item.maxStack - slot.quantity;
        if (spaceAvailable > 0) {
          const amountToAdd = Math.min(quantity, spaceAvailable);
          slot.quantity += amountToAdd;
          quantity -= amountToAdd;

          if (quantity === 0) {
            return true; // All items added
          }
        }
      }
    }

    // Add to empty slots
    while (quantity > 0) {
      const emptySlot = this.findEmptySlot();
      if (emptySlot === -1) {
        console.warn('Inventory full! Cannot add more items.');
        return false; // Inventory full
      }

      const amountToAdd = Math.min(quantity, item.maxStack);
      this.slots[emptySlot] = {
        item: item,
        quantity: amountToAdd,
        currentDurability: item.durability, // Initialize durability for tools
      };
      quantity -= amountToAdd;
    }

    return true;
  }

  /**
   * Remove item from inventory
   */
  public removeItem(slotIndex: number, quantity: number = 1): boolean {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      return false;
    }

    const slot = this.slots[slotIndex];
    if (!slot.item || slot.quantity < quantity) {
      return false;
    }

    slot.quantity -= quantity;
    if (slot.quantity === 0) {
      slot.item = null;
    }

    return true;
  }

  /**
   * Remove item by ID (searches all slots)
   */
  public removeItemById(itemId: string, quantity: number = 1): boolean {
    let remaining = quantity;

    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot.item && slot.item.id === itemId) {
        const amountToRemove = Math.min(remaining, slot.quantity);
        slot.quantity -= amountToRemove;
        remaining -= amountToRemove;

        if (slot.quantity === 0) {
          slot.item = null;
        }
      }
    }

    return remaining === 0; // True if all requested items were removed
  }

  /**
   * Get item in slot
   */
  public getSlot(slotIndex: number): InventorySlot | null {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      return null;
    }
    return this.slots[slotIndex];
  }

  /**
   * Get all slots
   */
  public getAllSlots(): InventorySlot[] {
    return [...this.slots];
  }

  /**
   * Get hotbar slots (first 5 slots)
   */
  public getHotbarSlots(): InventorySlot[] {
    return this.slots.slice(0, this.hotbarSize);
  }

  /**
   * Get currently selected hotbar slot
   */
  public getSelectedSlot(): number {
    return this.selectedHotbarSlot;
  }

  /**
   * Get currently equipped item
   */
  public getEquippedItem(): ItemDefinition | null {
    const slot = this.slots[this.selectedHotbarSlot];
    return slot.item;
  }

  /**
   * Select hotbar slot (0-4)
   */
  public selectHotbarSlot(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.hotbarSize) {
      return false;
    }
    this.selectedHotbarSlot = slotIndex;
    return true;
  }

  /**
   * Find first empty slot
   */
  private findEmptySlot(): number {
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i].item) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if inventory has item
   */
  public hasItem(itemId: string, quantity: number = 1): boolean {
    let count = 0;
    for (const slot of this.slots) {
      if (slot.item && slot.item.id === itemId) {
        count += slot.quantity;
        if (count >= quantity) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get total quantity of item
   */
  public getItemCount(itemId: string): number {
    let count = 0;
    for (const slot of this.slots) {
      if (slot.item && slot.item.id === itemId) {
        count += slot.quantity;
      }
    }
    return count;
  }

  /**
   * Check if inventory is full
   */
  public isFull(): boolean {
    return this.findEmptySlot() === -1;
  }

  /**
   * Get number of empty slots
   */
  public getEmptySlotCount(): number {
    let count = 0;
    for (const slot of this.slots) {
      if (!slot.item) {
        count++;
      }
    }
    return count;
  }

  /**
   * Swap two slots
   */
  public swapSlots(slotA: number, slotB: number): boolean {
    if (
      slotA < 0 ||
      slotA >= this.slots.length ||
      slotB < 0 ||
      slotB >= this.slots.length
    ) {
      return false;
    }

    const temp = this.slots[slotA];
    this.slots[slotA] = this.slots[slotB];
    this.slots[slotB] = temp;
    return true;
  }

  /**
   * Clear inventory
   */
  public clear(): void {
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i] = { item: null, quantity: 0 };
    }
    this.selectedHotbarSlot = 0;
  }

  /**
   * Damage a tool in a specific slot
   */
  public damageTool(slotIndex: number, damageAmount: number = 1): boolean {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      return false;
    }

    const slot = this.slots[slotIndex];
    if (!slot.item || !slot.item.durability) {
      return false; // Not a tool or no durability
    }

    // Initialize durability if not set
    if (slot.currentDurability === undefined) {
      slot.currentDurability = slot.item.durability;
    }

    // Apply damage
    slot.currentDurability = Math.max(0, slot.currentDurability - damageAmount);

    // Remove tool if broken
    if (slot.currentDurability === 0) {
      console.log(`${slot.item.name} broke!`);
      this.removeItem(slotIndex, 1);
      return true; // Tool broke
    }

    return false; // Tool damaged but not broken
  }

  /**
   * Get durability percentage for a tool
   */
  public getDurabilityPercentage(slotIndex: number): number | null {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      return null;
    }

    const slot = this.slots[slotIndex];
    if (!slot.item || !slot.item.durability) {
      return null; // Not a tool
    }

    const current = slot.currentDurability ?? slot.item.durability;
    return (current / slot.item.durability) * 100;
  }

  /**
   * Get current durability for a tool
   */
  public getCurrentDurability(slotIndex: number): number | null {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      return null;
    }

    const slot = this.slots[slotIndex];
    if (!slot.item || !slot.item.durability) {
      return null;
    }

    return slot.currentDurability ?? slot.item.durability;
  }

  /**
   * Serialize inventory for saving
   */
  public serialize(): any {
    return {
      slots: this.slots.map((slot) => ({
        itemId: slot.item?.id || null,
        quantity: slot.quantity,
        currentDurability: slot.currentDurability,
      })),
      selectedHotbarSlot: this.selectedHotbarSlot,
    };
  }

  /**
   * Deserialize inventory from save data
   */
  public deserialize(data: any, getItemById: (id: string) => ItemDefinition | null): void {
    this.clear();

    if (data.slots) {
      for (let i = 0; i < Math.min(data.slots.length, this.maxSlots); i++) {
        const slotData = data.slots[i];
        if (slotData.itemId) {
          const item = getItemById(slotData.itemId);
          if (item) {
            this.slots[i] = {
              item: item,
              quantity: slotData.quantity,
              currentDurability: slotData.currentDurability,
            };
          }
        }
      }
    }

    if (data.selectedHotbarSlot !== undefined) {
      this.selectedHotbarSlot = data.selectedHotbarSlot;
    }
  }
}
