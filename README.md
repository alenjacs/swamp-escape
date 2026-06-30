# Swamp Escape

Swamp Escape is a top-down survival and extraction game built in JavaScript with three.js . The objective of the player is to  move through a procedurally generated swamp, avoid elevated obstacle islands, evade enemy guards, and reach the orange goal tile before dying. The project was designed to integrate the major course topics into one cohesive game rather than present them as isolated demos.

The project implements all five required final-project categories in a single playable system:

- **Complex Movement Algorithm:** Reynolds Path Following
- **Decision Making:** Finite State Machine
- **Pathfinding:** Jump Point Search (JPS)
- **Procedural Content Generation:** Perlin-based swamp terrain generation
- **Independent Extra Topic:** Separation

## How to Run

Because this project uses JavaScript modules, do not open `index.html` directly by double-clicking it. Run it through a local server using one of the methods below.

### Method 1: VS Code Live Server extension

1. Open the project folder in VS Code.
2. Right-click `index.html`.
3. Click **Open with Live Server**.
4. The game should open automatically in your browser.

### Method 2: VS Code terminal

1. Open the project folder in VS Code.
2. Open the terminal in that folder.
3. Run `python -m http.server 8000`
4. If that does not work, run `python3 -m http.server 8000`
5. Open `http://localhost:8000` in your browser.

### Method 3: Terminal or command prompt

1. Open a terminal or command prompt.
2. Navigate to the project folder.
3. Run `python -m http.server 8000`
4. If that does not work, run `python3 -m http.server 8000`
5. Open `http://localhost:8000` in your browser.

### Important Note

Opening `index.html` directly from the file explorer may not work because browsers can block JavaScript module loading unless the project is served through a local server.

## Controls

- **W / A / S / D** - move
- **Hold Shift** - sprint
- **R** - restart the run

## Objective

Reach the **orange goal tile** while avoiding guards and surviving environmental pressure.  
If your health reaches 0, the run is lost.

## Gameplay Overview

Each run takes place on a procedurally generated swamp map. The world contains:

- brown swamp ground
- blue water regions
- green elevated obstacle islands
- a player start position
- an orange extraction goal
- multiple enemy guards

The guards patrol the map until they detect the player. Once detected, they chase the player using pathfinding and path-following movement. If the player escapes line of sight, guards investigate the last seen position, search briefly, then return to patrol.

The player can sprint to escape danger, but sprinting is disabled in water. Water is still walkable, but it slows both the player and the guards.

## Implemented Course Topics

### 1) Complex Movement Algorithm: Reynolds Path Following

The guards do not move by snapping from tile to tile. Instead, they compute a tile-based route and then follow that route smoothly in world space using Reynolds-style path following.

This improves motion quality because guards:
- move continuously instead of teleporting between tiles
- steer along routes more naturally
- follow planned paths in a readable way during patrol, chase, search, and return

#### How to view it in the game
- Let a guard patrol normally and watch how it follows its route smoothly.
- Trigger a chase and observe that the guard still follows a continuous route rather than stepping rigidly from grid cell to grid cell.

### 2) Decision Making: Finite State Machine

Enemy behaviour is controlled by a finite state machine with four states:

- **Patrol**
- **Chase**
- **Search**
- **Return**

#### State descriptions

**Patrol**  
Guards follow patrol targets when the player has not been detected.

**Chase**  
If a guard detects the player within line of sight and range, it switches to chase and pursues the player.

**Search**  
If the player escapes after being detected, the guard moves to the player’s last seen position and searches briefly.

**Return**  
If the player is still not found after the search period, the guard returns to its patrol route.

#### Main transitions

- **Patrol -> Chase** when the player is detected
- **Chase -> Search** when line of sight is lost
- **Search -> Chase** if the player is seen again
- **Search -> Return** when the search timer expires
- **Return -> Patrol** when the guard resumes patrol
- Guards can re-enter **Chase** from other states if the player is detected again

#### How to view it in the game
- Move into a guard’s detection range and line of sight to trigger **Chase**.
- Break line of sight using obstacles to trigger **Search**.
- Stay hidden long enough to let the guard enter **Return** and then resume **Patrol**.

### 3) Pathfinding: Jump Point Search (JPS)

The guards use **Jump Point Search (JPS)** to compute efficient routes on the tile grid.

JPS was chosen because it is a course topic and is well suited to **uniform-cost grid maps**. The navigation grid in this project is therefore kept as a simple:

- walkable tile
- blocked tile

system for pathfinding purposes.

Elevated obstacle islands are blocked. Regular swamp ground and water are walkable.

#### Important design note about JPS and water

JPS only works correctly on **uniform-cost grids**. Because of that, water in this project does **not** change pathfinding cost.

Instead:

- water is still walkable
- water slows local movement speed only
- the pathfinding grid remains uniform-cost

This keeps the JPS implementation valid while still allowing water to affect gameplay moment-to-moment.

#### How to view it in the game
- Watch guards route around elevated obstacle islands.
- Trigger a chase and observe that guards compute valid paths across the swamp toward the player.
- Notice that guards can still path through water because water is walkable.

### 4) Procedural Content Generation: Perlin-Based Swamp Generation

The map is procedurally generated each run rather than being hand-authored.

Procedural generation is used for:

- swamp terrain variation
- elevated obstacle island layout
- random water region placement

The terrain generation is Perlin-based so the map has smoother, more natural spatial variation than pure white-noise randomness.

This supports the swamp theme and improves replayability because each run has a different layout.

#### How to view it in the game
- Restart the game multiple times.
- Observe that terrain layout, obstacle arrangement, and water placement change from run to run.

### 5) Independent Extra Topic: Separation

The independent extra topic used in this project is **Separation**.

Separation is applied to guards so that nearby enemies avoid stacking directly on top of each other. This makes movement more readable and improves the visual quality of multi-guard motion.

Without separation, guards would overlap too much during patrol and chase behaviour.

#### How to view it in the game
- Let multiple guards move near each other.
- During patrol or chase, observe that they spread apart instead of collapsing into one overlapping cluster.

## Other Implemented Gameplay Systems

### Player Health
The player has a health system. Taking enough damage results in death and a failed run.

### Obstacle Collision and Stun
Elevated obstacle islands are solid. The player cannot pass through them, and collisions can trigger a brief stun effect.

### Water Slowdown
Water affects moment-to-moment movement without breaking the JPS grid assumptions:

- player speed is reduced in water
- guard speed is reduced in water
- sprint is disabled in water

### Restart
The game can be restarted to generate a fresh run and test the procedural systems again.

### HUD
The HUD displays:
- title
- player status
- objective
- controls
- health bar

## Why the Systems Fit Together

The project was designed so the implemented course topics support the same game loop:

- **Procedural generation** builds a new swamp each run
- **JPS** computes routes through the generated map
- **Reynolds path following** turns those routes into smooth movement
- **FSM decision making** controls how guards react to the player
- **Separation** improves multi-guard behaviour

This gives the project cohesion across the required categories instead of treating them as separate features.

## File / System Summary

Main systems are organized across the project files, including:

- `js/World.js` - main gameplay loop, guard updates, player logic, path assignment, FSM transitions
- `js/entities/Guard.js` - guard state and per-guard AI data
- `js/ai/pathfinding/JPS.js` - Jump Point Search implementation
- `js/maps/TileMap.js` - walkable / blocked navigation grid
- `js/pcg/SwampGenerator.js` - procedural swamp and water generation
- `js/renderers/TileMapRenderer.js` - terrain, water, obstacles, and tile rendering
- `js/ui/Hud.js` - HUD display

## Citations


- "Minecraft" font by Craftron Gaming, downloaded from DaFont: https://www.dafont.com/minecraft.font

