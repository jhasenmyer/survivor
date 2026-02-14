# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a first-person survival game built with Three.js and TypeScript. The game takes place in a procedurally-generated forest environment where the player must manage health, hunger, and thirst while gathering resources, crafting tools, hunting animals, and building structures to survive.

**Production URL**: https://survivor-bay.vercel.app

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (opens at localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Lint and auto-fix
npm run lint:fix

# Run tests
npm run test

# Run tests with UI
npm run test:ui
```

## Architecture

### Core Game Loop
The game follows a standard game engine architecture centered around `src/core/Game.ts`, which manages:
- Scene initialization and rendering (Three.js Scene/Renderer)
- Game loop using `requestAnimationFrame`
- Delta time management with Three.Clock
- Window resize and visibility handling

### Main Systems

**Player System** (`src/core/Player.ts`)
- First-person camera with pointer lock controls
- WASD movement with mouse look
- Player stats: health (100), hunger (100), thirst (100)
- Stats decrease over time: hunger (-2/sec), thirst (-1.5/sec)
- Physics: gravity and ground collision
- HUD updates with real-time stat bars
- Death and respawn mechanics
- Notification callback system

**World System** (`src/core/World.ts`)
- Procedural terrain generation with height variation
- Tree spawning and management
- Rock spawning for mining resources
- Water source (pond/stream) generation
- Animal spawning (deer, rabbits)
- Entity management and updates
- Chunk-based world structure

**Input System** (`src/core/InputManager.ts`)
- Keyboard input tracking with key state management
- Mouse input handling for camera and interactions
- Key binding system for all game actions
- Used by Player, BuildingSystem, and UI systems

**Inventory System** (`src/systems/InventorySystem.ts`)
- 30 total inventory slots (9 hotbar + 21 main inventory)
- Hotbar selection with number keys (1-9)
- Item stacking based on maxStack property
- Tool durability tracking per slot
- Drag-and-drop item management
- Visual UI with item icons, quantities, and durability bars

**Crafting System** (`src/systems/CraftingSystem.ts`)
- Recipe-based crafting with resource requirements
- Categories: tools, consumables, equipment
- Crafting UI shows available recipes and requirements
- Recipes include stone tools, iron tools, torches, and more

**Building System** (`src/systems/BuildingSystem.ts`)
- Structure placement with ghost preview system
- Build mode toggle (B key)
- Recipe cycling (R key) and placement (E key)
- Placement validation with visual feedback (green=valid, red=invalid)
- Structure recipes with resource requirements
- Structures: campfire, storage chest, basic shelter, walls

**Interaction System** (`src/systems/InteractionSystem.ts`)
- Entity interaction via raycasting (E key)
- Trees: gather wood, damage equipped tool
- Rocks: mine stone/flint/iron_ore (2x durability loss)
- Animals: hunt for raw meat using equipped tool
- Water sources: restore thirst or fill water bottles
- Structures: interact with placed buildings

**Entity Manager** (`src/systems/EntityManager.ts`)
- Centralized entity management
- Entity updates each frame
- Entity removal and cleanup
- Manages all interactive world objects

**Save System** (`src/systems/SaveSystem.ts`)
- LocalStorage-based save/load system
- Saves player position, stats, inventory, and world state
- Auto-save functionality
- Manual save/load via UI

**Audio System** (`src/systems/AudioSystem.ts`)
- Background music and ambient sounds
- Positional 3D audio for entities
- Sound effect management
- Volume controls

**Time System** (`src/systems/TimeSystem.ts`)
- Day/night cycle
- Dynamic lighting changes
- Time progression tracking

### File Structure

```
src/
├── core/                  # Core game systems
│   ├── Game.ts            # Main game loop and orchestration
│   ├── Player.ts          # Player controller, camera, and stats
│   ├── World.ts           # World generation and entity management
│   └── InputManager.ts    # Input handling and key bindings
├── entities/              # Game entities
│   ├── Entity.ts          # Base entity class
│   ├── Tree.ts            # Tree entities (harvestable)
│   ├── Rock.ts            # Rock entities (minable)
│   ├── Animal.ts          # Base animal class
│   ├── Deer.ts            # Deer entity (huntable)
│   ├── Rabbit.ts          # Rabbit entity (huntable)
│   ├── WaterSource.ts     # Water source entities (ponds, streams)
│   ├── Structure.ts       # Placed structures (campfire, shelter, etc.)
│   └── ItemEntity.ts      # Dropped items in world
├── systems/               # Game systems
│   ├── InventorySystem.ts # Inventory and hotbar management
│   ├── CraftingSystem.ts  # Crafting recipes and UI
│   ├── BuildingSystem.ts  # Structure placement and building mode
│   ├── InteractionSystem.ts # Entity interaction via raycasting
│   ├── EntityManager.ts   # Entity lifecycle management
│   ├── SaveSystem.ts      # Save/load functionality
│   ├── AudioSystem.ts     # Audio and music management
│   └── TimeSystem.ts      # Day/night cycle
├── types/                 # Type definitions
│   ├── Item.ts            # Item definitions and registry
│   ├── CraftingRecipe.ts  # Crafting recipe definitions
│   └── BuildingRecipe.ts  # Building/structure recipe definitions
├── ui/                    # UI components and overlays
└── main.ts                # Entry point
```

## Key Technical Details

### Three.js Scene Setup
- Fog distance: 50-200 units for atmospheric depth
- Shadow mapping enabled (PCFSoftShadowMap)
- Lighting: ambient (0.5) + directional sun (1.0)
- Camera FOV: 75°, near: 0.1, far: 1000

### Player Controls

**Movement**
- Move: WASD or Arrow keys (camera-relative)
- Jump: Spacebar
- Sprint: Shift (planned)
- Movement speed: 10 units/sec
- Jump force: 8 units/sec
- Gravity: 20 units/sec²
- Eye height: 1.6 units

**Camera**
- Look: Mouse (pointer lock - click to enable)
- FOV: 75°

**Inventory & Items**
- Hotbar selection: Number keys 1-9
- Toggle inventory: Tab or I
- Use/consume item: Right-click on item in inventory
- Drop item: (planned)

**Interactions**
- Interact: E key (trees, rocks, animals, water, structures)
- Opens crafting menu when near crafting station

**Building**
- Toggle build mode: B key
- Cycle recipes: R key (while in build mode)
- Place structure: E key (while in build mode)
- Cancel build mode: B key or Esc

**UI & System**
- Toggle help screen: H key
- Pause menu: Esc
- Save game: (via pause menu)
- Load game: (via pause menu)

### Coordinate System
- Three.js uses right-handed Y-up coordinate system
- Ground plane: XZ plane at y=0, terrain height varies -2 to +2
- Player starts at (0, 1.6, 5)

### Item System

**Item Types** (`src/types/Item.ts`)
- `TOOL`: Items with durability (axes, pickaxes, knives)
- `RESOURCE`: Stackable materials (wood, stone, flint, iron_ore)
- `CONSUMABLE`: Food, water, medical items with useAction
- `EQUIPMENT`: Equippable items (torches, water bottles)

**Tool Durability**
- Each tool has max durability (e.g., stone_axe: 100, iron_axe: 200)
- Tools lose durability on use (1 per tree chop, 2 per rock mine)
- Tools break at 0 durability (removed from inventory)
- Durability tracked per inventory slot
- Visual durability bar shown in UI

**Starting Inventory**
- Knife (🔪): 100 durability, 15 damage
- Old Dull Axe (🪓): 50 durability, 10 damage
- Med Kit (💊): Unpacks to 3 bandages
- Water Bottle (Empty) (🍶): Can be filled at water sources

**Resource Items**
- Wood (🪵): From trees, used in most crafting
- Stone (🪨): From rocks, used for stone tools
- Flint (🪨): From rocks, used for flint tools
- Iron Ore (⛏️): From rocks, used for iron tools
- Stick (🦯): Used in crafting recipes
- Raw Meat (🥩): From animals, restores 15 hunger
- Berries (🫐): Restores 10 hunger + 5 thirst

**Consumables**
- Water Bottle (Full) (💧): Restores 50 thirst, becomes empty bottle
- Bandage (🩹): Restores 25 health
- Cooked Meat (🍖): Restores 40 hunger (requires cooking - not yet implemented)
- Dirty Water (🌫️): Restores 20 thirst, 50% chance of 10 damage

### Crafting Recipes (`src/types/CraftingRecipe.ts`)

**Stone Tools**
- Stone Axe: 2 wood + 3 stone
- Stone Pickaxe: 2 wood + 3 stone (better for mining)
- Flint Knife: 1 wood + 2 flint (better for hunting)

**Iron Tools** (Higher durability: 200)
- Iron Axe: 2 wood + 3 iron_ore
- Iron Pickaxe: 2 wood + 3 iron_ore

**Equipment**
- Torch (x4): 1 wood + 2 stick

### Building Recipes (`src/types/BuildingRecipe.ts`)

**Structures**
- Campfire: 5 wood + 3 stone (for cooking - functionality planned)
- Storage Chest: 10 wood (for extra storage - functionality planned)
- Basic Shelter: 20 wood + 10 stone (protection - functionality planned)
- Wooden Wall: 8 wood (defensive structures)

## Adding New Features

### Adding Entities
1. Create entity class in `src/entities/`
2. Entities should have `update(delta: number)` method
3. Register with World or create an EntityManager system

### Adding Game Systems
1. Create system in `src/systems/`
2. Systems manage related entities/behaviors
3. Initialize in Game.ts and call update in game loop

### Performance Considerations
- Use object pooling for frequently created/destroyed objects
- Frustum culling is automatic with Three.js
- Consider LOD (Level of Detail) for distant objects
- Keep draw calls low by batching similar geometries

## Game Features (Implemented)

✅ **Survival Mechanics**
- Health, hunger, and thirst stats with depletion over time
- Food and water consumption system
- Tool durability and breakage
- Death and respawn

✅ **Inventory & Crafting**
- 30-slot inventory with 9-slot hotbar
- Tool durability tracking with visual bars
- Crafting system with recipes (stone tools, iron tools, torches)
- Item icons and organized UI

✅ **Resource Gathering**
- Chop trees for wood (damages tools)
- Mine rocks for stone, flint, iron ore (2x tool damage)
- Hunt animals (deer, rabbits) for raw meat
- Fill water bottles at water sources

✅ **Building System**
- Structure placement with ghost preview
- Build mode with validation (green/red indicators)
- Structures: campfire, storage chest, basic shelter, walls
- Resource requirements for each structure

✅ **World & Environment**
- Procedurally-generated terrain with height variation
- Tree, rock, and water source generation
- Animal spawning and basic AI
- Multiple biome support (planned extension)

✅ **UI & UX**
- Help screen with key bindings (H key)
- Real-time stat bars (health, hunger, thirst)
- Notification system (top-right corner)
- Build mode UI with recipe info
- Inventory UI with drag-and-drop (planned)

✅ **Systems**
- Save/load system (LocalStorage)
- Day/night cycle with dynamic lighting
- Audio system with music and sound effects
- Entity management system

## Current Limitations

- Terrain collision is simplified (flat ground at y=0)
- No full physics engine (basic gravity only)
- Animal AI is basic (wandering behavior)
- No multiplayer support
- No advanced graphics (using basic Three.js geometries)
- Tool repair not implemented
- No cooking system for raw meat (cooked meat exists but no cooking mechanic)
- Storage structures not yet functional

## Future Development Areas

**High Priority**
- Cooking system (campfire interaction to cook raw meat)
- Functional storage chests
- Tool repair mechanics
- Drag-and-drop inventory
- Item dropping in world
- Sprint/stamina system

**Medium Priority**
- Advanced animal AI (flee from player, herds)
- Weather system (rain, storms)
- Temperature mechanics (cold at night, need fire/shelter)
- More structure types (crafting bench, furnace)
- Farming/agriculture system
- Better terrain collision using raycasting

**Polish & Enhancement**
- Model loading for better graphics (GLTF/GLB)
- Particle effects (fire, smoke, sparkles)
- Better audio (positional sounds, footsteps)
- Achievements/progression system
- Settings menu (graphics, audio, controls)
- Mobile/touch controls
