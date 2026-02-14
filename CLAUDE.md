# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a first-person survival game built with Three.js and TypeScript. The game takes place in a procedurally-generated forest environment where the player must manage health, hunger, and thirst while exploring and surviving.

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
- Player stats: health, hunger, thirst
- Physics: gravity and ground collision
- HUD updates

**World System** (`src/core/World.ts`)
- Terrain generation with height variation
- Tree placement and rendering
- Environment objects
- Future: day/night cycle, weather

**Input System** (`src/core/InputManager.ts`)
- Keyboard input tracking
- Key state management
- Used by Player for movement

### File Structure

```
src/
├── core/           # Core game systems
│   ├── Game.ts     # Main game loop and orchestration
│   ├── Player.ts   # Player controller and camera
│   ├── World.ts    # World generation and management
│   └── InputManager.ts  # Input handling
├── entities/       # Game entities (future: animals, items)
├── systems/        # Game systems (future: inventory, crafting)
└── main.ts         # Entry point
```

## Key Technical Details

### Three.js Scene Setup
- Fog distance: 50-200 units for atmospheric depth
- Shadow mapping enabled (PCFSoftShadowMap)
- Lighting: ambient (0.5) + directional sun (1.0)
- Camera FOV: 75°, near: 0.1, far: 1000

### Player Controls
- Movement: WASD or Arrow keys, relative to camera direction
- Look: Mouse (pointer lock required - click to enable)
- Jump: Spacebar
- Movement speed: 10 units/sec
- Jump force: 8 units/sec
- Gravity: 20 units/sec²
- Eye height: 1.6 units (ground level: 0)

### Coordinate System
- Three.js uses right-handed Y-up coordinate system
- Ground plane: XZ plane at y=0, terrain height varies -2 to +2
- Player starts at (0, 1.6, 5)

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

## Current Limitations

- Terrain collision is simplified (flat ground at y=0)
- No physics engine integrated yet
- Trees are static geometry (not interactive)
- No save/load system
- Stats (hunger/thirst) don't currently decrease

## Future Development Areas

- Inventory and crafting systems
- Resource gathering (wood, food, water)
- Wildlife AI (animals)
- Weather and day/night cycle
- Building/shelter mechanics
- Proper terrain collision using raycasting
- Model loading for better graphics (GLTF/GLB)
- Audio system (ambient sounds, footsteps)
