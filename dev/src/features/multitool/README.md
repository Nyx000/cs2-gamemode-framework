# Multitool Object Placement System

> **Feature Module** for the **Workbench Gamemode** testbed environment.  
> Part of a modular CS2 scripting architecture using the generic gamemode orchestrator.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Hammer Entity Setup](#hammer-entity-setup)
- [Script Compilation](#script-compilation)
- [Testing in CS2](#testing-in-cs2)
- [Usage Guide](#usage-guide)
- [Available Props](#available-props)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)
- [Implementation Details](#implementation-details)
- [Developer Guide](#developer-guide)

---

## Overview

The Multitool system allows players to place, manipulate, and destroy physics-enabled props in CS2 using the
`weapon_taser` as a multitool.

**Workbench Integration:**

- Part of the Workbench gamemode testbed (alongside other features like example-feature)
- Orchestrated by the generic gamemode framework which handles initialization, events, and hot reload
- Benefits from gamemode conveniences: god mode, auto-zeus, infinite ammo, cheats enabled

---

## Features

- **Place Mode**: Place props at aim point
- **Move Mode**: Reposition existing props
- **Rotate Mode**: Rotate props in 15° increments
- **Scale Mode**: Scale props up (standing) or down (crouching)
- **Delete Mode**: Remove props
- **Reload to Cycle Modes**: Press 'R' on taser to cycle through modes quickly
- **Ownership System**: Players can only manipulate their own props
- **Damage System**: Props take damage from weapons and are destroyed at 0 HP
- **Preview System**: Translucent hologram shows placement location
- **Hot Reload Support**: State preservation across script reloads
- **Taser Safety**: Taser cannot damage players - it's a multitool, not a weapon!
- **Automatic Zeus**: Taser is automatically given to human players (no `/give` needed)
- **God Mode**: Human players cannot be damaged (testing convenience from gamemode)

---

## Hammer Entity Setup

### Required Templates

You need to create two `point_template` entities in your map:

#### 1. Prop Template (`prop_template`)

This template spawns the actual placeable props.

**Entity Configuration:**

- **Entity Type**: `point_template`
- **Name**: `prop_template` (exact name required)
- **Template 1**: `prop_base` (or any name for child entity)

**Child Entity (prop_physics):**

- **Entity Type**: `prop_physics` ⚠️ **IMPORTANT: Must use prop_physics, not prop_dynamic!**
- **Name**: `prop_base` (match Template 1 name)
- **Model**: Any CS2 model (will be overridden by script)
- **Health**: `100` or any value (will be overridden)
- **Motion Enabled**: `Yes` (full physics enabled)
- **Start Asleep**: `No`
- **Enable Damage Forces**: `Yes`
- **Disable Receiving Shadows**: `No`
- **Collision Group**: `Default`

**Important Settings:**

- The script will set the model, health, and scale dynamically
- Props have full physics - they will fall, collide, and can be knocked around
- Props can be damaged by weapons and destroyed at 0 HP
- **prop_dynamic will NOT work** - it has no collision in CS2

#### 2. Preview Template (`preview_template`)

This template spawns the preview holograms for players.

**Entity Configuration:**

- **Entity Type**: `point_template`
- **Name**: `preview_template` (exact name required)
- **Template 1**: `preview_base` (or any name for child entity)

**Child Entity (prop_dynamic):**

- **Entity Type**: `prop_dynamic`
- **Name**: `preview_base` (match Template 1 name)
- **Model**: Any CS2 model (will be overridden)
- **Render Mode**: `Translucent` (or leave default, script sets alpha)
- **Collision Group**: `Debris` or `None`
- **Start with collision disabled**: `Yes`
- **Disable Receiving Shadows**: `Yes`
- **Health**: `0` or disabled

**Important Settings:**

- Preview should not block players or take damage
- Script handles translucency and glow effects

### Quick Setup Steps

1. **Open your map in Hammer**
2. **Add first point_template**:
   - Press `Shift+E`, type "point_template"
   - Name it `prop_template`
   - Right-click → "Tie to Entity"
3. **Add prop_physics to first template**:
   - Create a new prop_physics
   - Set its name to match Template 1 field
   - Parent it to the point_template
4. **Repeat for preview_template**:
   - Same process, name it `preview_template`
   - Make child prop_dynamic non-solid
5. **Add point_script entity**:
   - Create `point_script` entity
   - Set **Script File** to `scripts/workbench-gamemode.vjs`
6. **Save and compile map**

---

## Script Compilation

Before testing, compile the TypeScript to JavaScript:

```bash
bun run build
# Or for watch mode:
bun run dev
```

This compiles all TypeScript (gamemode + features) → `scripts/workbench-gamemode.vjs`

---

## Testing in CS2

### Launch CS2 with Tools Mode (for hot reload)

```batch
cs2.exe -tools +map your_map_name
```

### Launch CS2 Normal Mode

```batch
cs2.exe +map your_map_name
```

### In-Game Commands

#### Quick Mode Switching

- **Press 'R' (Reload)** - Cycle through modes (PLACE → MOVE → ROTATE → SCALE → DELETE → PLACE)
  - Fastest way to switch modes!
  - No need to type in chat

#### Chat Commands

Type these in **chat** (press Y or U):

##### Mode Commands

- `/place` or `/p` - Switch to placement mode
- `/move` or `/m` - Switch to move mode
- `/rotate` or `/r` - Switch to rotate mode
- `/scale` or `/s` - Switch to scale mode
- `/delete` or `/d` - Switch to delete mode

##### Prop Selection

- `/next` or `/n` - Cycle to next prop type
- `/prev` - Cycle to previous prop type

##### Utility

- `/give` - Get the multitool (weapon_taser) - **Note: Auto-provided, command unnecessary**
- `/info` or `/i` - Show current mode and selected prop
- `/help` or `/h` - Display all commands

---

## Usage Guide

### 1. Get the Multitool

- The Zeus/taser is **automatically given** to all human players
- Given on: player spawn, round start, and re-given every ~1 second
- Simply equip the taser (weapon slot 8)
- **Note**: `/give` command still works but is unnecessary

### 2. Select a Prop

- Type `/next` to cycle through available props
- Use `/info` to see current selection

### 3. Switch Modes

**Quick Method (Recommended):**

- Press 'R' (reload button) to cycle through modes
- Cycles: PLACE → MOVE → ROTATE → SCALE → DELETE → PLACE

**Chat Method:**

- Type `/place`, `/move`, `/rotate`, `/scale`, or `/delete`
- Useful for jumping directly to a specific mode

### 4. Place a Prop

- Switch to placement mode (press 'R' until "PLACE" or type `/place`)
- Aim where you want to place
- Fire the taser to place the prop

### 5. Manipulate Props

- Press 'R' to cycle to desired mode (MOVE, ROTATE, or SCALE)
- Aim at one of your props
- Fire the taser to manipulate it
- **Scale Mode**: Stand = scale up, Crouch = scale down

### 6. Delete Props

- Press 'R' until you reach DELETE mode (or type `/delete`)
- Aim at one of your props
- Fire to delete it

### 7. Damage Props

- Switch to any weapon (not the taser)
- Shoot any player's props
- Props change color as they take damage:
  - **White**: Healthy (100-50% HP)
  - **Orange**: Damaged (50-25% HP)
  - **Red**: Critical (25-0% HP)
- Props are destroyed at 0 HP
- **Note**: Taser cannot damage players (it's a building tool, not a weapon!)

---

## Available Props

The system includes 5 CS2 props with varying health:

1. **Wooden Crate** - 100 HP
2. **Metal Barrel** - 200 HP
3. **Office Chair** - 150 HP
4. **Filing Cabinet** - 300 HP
5. **Metal Locker** - 500 HP

Props can be added/modified in `config.ts` (this directory)

---

## Troubleshooting

### "Template not found" Error

**Problem**: Console shows `ERROR: Template 'prop_template' not found!`

**Solution**:

- Check entity name spelling (exact match required)
- Ensure templates are in the map (use Entity Report in Hammer)
- Verify point_script is loading `scripts/gamemode-setup.vjs`

### Props Don't Spawn

**Problem**: Taser fires but nothing appears

**Solution**:

- Check that Template 1 field matches child entity name
- Verify prop_physics has a valid model set in Hammer
- Look for script errors in console (`con_filter_enable 1`, `con_filter_text Multitool`)

### Props Float in Air / No Collision

**Problem**: Props spawn but float and you can walk through them

**Solution**:

- **You're using prop_dynamic instead of prop_physics!**
- In Hammer, delete the prop_dynamic child entity
- Create a new prop_physics entity with the same name
- Set Motion Enabled = Yes
- Save and recompile the map

### Preview Not Showing

**Problem**: No hologram appears in placement mode

**Solution**:

- Ensure `preview_template` exists in map
- Check that you're in placement mode (type `/place`)
- Verify you're aiming at a valid surface

### Props Take No Damage

**Problem**: Shooting props doesn't reduce health

**Solution**:

- Ensure prop_physics has health enabled in Hammer
- Check that "Enable Damage Forces" is set to Yes
- Verify `sv_cheats 1` is enabled (may be required for some damage)

### Can't Manipulate Props

**Problem**: "Cannot move - not your prop" message

**Solution**:

- You can only manipulate props you placed
- Other players can only damage your props, not move/rotate/scale them
- Use `/delete` mode to remove then replace if needed

---

## Advanced Configuration

Edit `config.ts` (in this directory) to customize:

```typescript
export const MAX_PROPS_PER_PLAYER = 20; // Prop limit
export const RAYCAST_DISTANCE = 2000; // Max placement distance
export const ROTATION_INCREMENT = 15; // Degrees per rotate
export const SCALE_MULTIPLIER = 1.2; // Scale factor
export const MIN_SCALE = 0.2; // Minimum scale
export const MAX_SCALE = 5.0; // Maximum scale
```

Add custom props to `PLACEABLE_PROPS` array:

```typescript
{
  name: "Custom Prop",
  modelPath: "models/path/to/model.vmdl",
  maxHealth: 250,
  defaultScale: 1.0,
}
```

### Performance Notes

- **Max Props per Player**: 20 (configurable in `config.ts`)
- **Preview Update Rate**: 20 Hz (every 0.05 seconds)
- **Damage Check Rate**: 10 Hz (every 0.1 seconds)
- For large player counts, consider reducing update rates

---

## Implementation Details

### Workbench Gamemode Architecture

The Multitool is a **feature module** within the larger **Workbench Gamemode** testbed.

**Gamemode Responsibilities:**

- **Initialization**: Orchestrates all features (multitool, example-feature, etc.)
- **Event Routing**: Centralized handlers distribute events to features
- **Think Loop**: Coordinates periodic updates for all features
- **Hot Reload**: Aggregates and restores state across all features
- **Server Config**: Sets up testing environment (cheats, god mode, infinite ammo, etc.)
- **Auto-Zeus**: Ensures human players always have the taser

**Feature Module Pattern:**

Each feature (including multitool) implements a standard interface:

```typescript
interface Feature {
  init(): void; // Initialize the feature
  cleanup(): void; // Cleanup before hot reload
  getState(): State; // Return state for preservation
  restoreState(state: State): void; // Restore after hot reload
  onPlayerConnect(player): void; // Handle player events
  onPlayerDisconnect(slot): void;
  // ... other lifecycle hooks
}
```

The multitool is imported by `workbench-gamemode.ts`:

```typescript
import { createMultitool } from "../features/multitool";

const multitool = createMultitool(Instance);
multitool.init();
```

### File Structure

```text
dev/src/
├── scripts/
│   └── workbench-gamemode.ts        # Main entry point (referenced in Hammer)
└── features/
    ├── multitool/               # This feature
    │   ├── index.ts             # Feature public API
    │   ├── types.ts             # TypeScript interfaces
    │   ├── config.ts            # Configuration & prop definitions
    │   ├── player-state.ts      # Per-player state management
    │   ├── prop-manager.ts      # Prop spawning and tracking
    │   ├── preview-manager.ts   # Preview hologram system
    │   ├── damage-handler.ts    # Health and damage system
    │   ├── weapon-handler.ts    # Taser fire detection
    │   └── chat-commands.ts     # Chat command handlers
    └── example-feature/         # Other features...
```

### Core Modules

**1. Player State Management** (`player-state.ts`)

- Tracks each player's current mode, selected prop, and owned props
- Uses Map-based storage for efficient lookups
- Handles state serialization for hot reload

**2. Prop Manager** (`prop-manager.ts`)

- Spawns props from `point_template` entities
- Tracks all placed props by name
- Handles prop removal and cleanup
- Enforces per-player prop limits

**3. Preview Manager** (`preview-manager.ts`)

- Creates per-player preview holograms
- Updates preview position/rotation in real-time
- Provides visual feedback during placement
- Updates at 20 Hz for smooth experience

**4. Damage Handler** (`damage-handler.ts`)

- Polls prop health at 10 Hz
- Applies visual feedback (color changes, glow)
- Destroys props at 0 HP
- Tracks health thresholds (50%, 25%)

**5. Weapon Handler** (`weapon-handler.ts`)

- Detects taser fire events
- Determines which mode action to execute
- Performs raycasting for target detection
- Validates ownership before operations

**6. Chat Commands** (`chat-commands.ts`)

- Parses player chat messages
- Routes commands to appropriate handlers
- Provides feedback via console echo
- Supports aliases (e.g., `/p` for `/place`)

### Features Implemented

#### Core Functionality

- [x] Modular file structure with 8 separate modules
- [x] TypeScript with full type safety
- [x] Hot reload support with state persistence
- [x] Per-player state management using Map
- [x] Entity spawning via PointTemplate.ForceSpawn()

#### Placement System

- [x] weapon_taser as multitool
- [x] Reload button mode cycling (press 'R')
- [x] Taser damage disabled for all players (building tool, not weapon)
- [x] Raycasting for placement targeting
- [x] Preview hologram with per-player colors
- [x] Real-time preview updates (20 Hz)
- [x] Physics-enabled props with full collision and gravity

#### Manipulation Modes

- [x] **PLACE** - Place props at aim point
- [x] **MOVE** - Reposition owned props
- [x] **ROTATE** - Rotate props by 15° increments
- [x] **SCALE** - Scale up (stand) or down (crouch)
- [x] **DELETE** - Remove owned props
- [x] **Mode Cycling** - Press 'R' to cycle modes quickly

#### Ownership & Permissions

- [x] Per-player ownership tracking
- [x] Players can only manipulate their own props
- [x] Other players can damage any prop
- [x] Ownership validation on all operations

#### Damage System

- [x] Props have health (100-500 HP)
- [x] Health polling at 10 Hz
- [x] Visual feedback based on health:
  - White: 100-50% HP
  - Orange: 50-25% HP
  - Red: 25-0% HP (critical)
- [x] Auto-destruction at 0 HP
- [x] Glow effects on damaged props

#### User Interface

- [x] Chat-based command system
- [x] Mode switching (/place, /move, etc.)
- [x] Prop cycling (/next, /prev)
- [x] Help system (/help)
- [x] Info display (/info)
- [x] Client-side echo feedback

### Technical Stats

**Multitool Feature Module:**

- **Total TypeScript Files**: 9
- **Total Lines of Code**: ~1,286 (excluding docs)
- **Modules**: 8 independent modules
- **Interfaces**: 5 (PlaceableProp, PropInstance, PlayerState, etc.)
- **Enums**: 1 (MultitoolMode with 5 values)
- **Chat Commands**: 10 commands
- **Prop Types**: 5 (expandable)
- **Update Loops**: 2 (preview updates, health checks - coordinated by gamemode)

**Note**: Gamemode adds additional coordination, event handlers, and features (god mode, auto-zeus, etc.)

### Configuration Reference

All settings in `config.ts` (this directory):

```typescript
MAX_PROPS_PER_PLAYER = 20; // Prop limit per player
RAYCAST_DISTANCE = 2000; // Max placement distance
ROTATION_INCREMENT = 15; // Degrees per rotate
SCALE_MULTIPLIER = 1.2; // Scale factor
MIN_SCALE = 0.2; // Minimum scale
MAX_SCALE = 5.0; // Maximum scale
PREVIEW_ALPHA = 128; // Preview transparency
HEALTH_WARNING_THRESHOLD = 0.5; // 50% HP (orange)
HEALTH_CRITICAL_THRESHOLD = 0.25; // 25% HP (red)
```

---

## Developer Guide

### Module Dependencies

```
types.ts
    ↓
config.ts
    ↓
player-state.ts ──→ preview-manager.ts
    ↓                      ↓
prop-manager.ts ───────────┤
    ↓                      ↓
damage-handler.ts          ↓
    ↓                      ↓
weapon-handler.ts ←────────┘
    ↓
chat-commands.ts
```

### Adding New Props

Edit `config.ts` and add to the `PLACEABLE_PROPS` array:

```typescript
{
  name: "New Prop Name",
  modelPath: "models/path/to/model.vmdl",
  maxHealth: 150,
  defaultScale: 1.0,
}
```

### Adding New Modes

1. Add mode to `MultitoolMode` enum in `types.ts`
2. Add handler function in `weapon-handler.ts`
3. Add route case in `handleMultitoolFire()`
4. Add chat command in `chat-commands.ts`

### Customizing Behavior

#### Adjust Rotation Speed

In `config.ts`: Change `ROTATION_INCREMENT` (default: 15°)

#### Adjust Scale Speed

In `config.ts`: Change `SCALE_MULTIPLIER` (default: 1.2x)

#### Change Prop Limit

In `config.ts`: Change `MAX_PROPS_PER_PLAYER` (default: 20)

#### Modify Damage Thresholds

In `config.ts`: Adjust `HEALTH_WARNING_THRESHOLD` and `HEALTH_CRITICAL_THRESHOLD`

#### Change Preview Colors

In `config.ts`: Edit `PLAYER_PREVIEW_COLORS` array

### Hot Reload Support

All modules implement state serialization:

- `getSerializableState()` - Returns state for hot reload
- `restoreState(data)` - Restores state after hot reload

The gamemode (`workbench-gamemode.ts`) orchestrates saving/restoring all module states:

```typescript
Instance.OnScriptReload<State>({
  before: () => {
    Instance.SetNextThink(-1); // Clear think loops
    // Gamemode aggregates state from all features
    return {
      multitool: multitool.getState(),
      exampleFeature: exampleFeature.getState(),
    };
  },

  after: (memory) => {
    if (memory) {
      // Gamemode restores state to all features
      multitool.restoreState(memory.multitool);
      exampleFeature.restoreState(memory.exampleFeature);
    }
  },
});
```

**How it works:**

- **Gamemode Orchestration**: `workbench-gamemode.ts` manages hot reload for all features
- **State Aggregation**: Collects state from all features (multitool, example-feature, etc.)
- **Entity Preservation**: Entity names are stored (not direct references)
- **State Restoration**: After reload, entities are refetched by name and state restored
- **Feature Interface**: Each feature implements `getState()`/`restoreState()` methods

When testing with `-tools` flag:

1. Edit any `.ts` file in `dev/src/`
2. Save (auto-compiles if using `bun run dev`)
3. Type `script_reload` in CS2 console
4. All placed props and player states are preserved!

### Networking

All entity operations are server-authoritative:

- Entities spawned via `ForceSpawn()` are automatically networked
- `EntFireAtTarget()` commands replicate to clients
- State is stored only on server
- No manual networking code required

### Performance Considerations

#### Update Rates

- **Preview Updates**: 20 Hz (every 0.05s) - coordinated by gamemode think loop
- **Damage Checks**: 10 Hz (every 0.1s) - coordinated by gamemode think loop

#### Optimization Tips

- Reduce update rates for large player counts
- Implement spatial partitioning for prop lookups (future enhancement)
- Batch entity operations when possible

### Testing

Run linter:

```bash
bun run lint
```

Build and test:

```bash
bun run build
# Launch CS2 with: cs2.exe -tools +map your_map
```

Check console for `[Multitool]` and `[GM:Workbench]` messages to verify initialization.

---

## Chat Commands Reference

### Quick Controls

| Input       | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| **Press R** | Cycle modes: PLACE → MOVE → ROTATE → SCALE → DELETE → PLACE      |
| **Fire**    | Execute current mode action (place, move, rotate, scale, delete) |

### Chat Commands

| Command   | Alias | Description                                   |
| --------- | ----- | --------------------------------------------- |
| `/place`  | `/p`  | Place props at aim point                      |
| `/move`   | `/m`  | Move props to new location                    |
| `/rotate` | `/r`  | Rotate props by 15°                           |
| `/scale`  | `/s`  | Scale props (crouch = down)                   |
| `/delete` | `/d`  | Delete props                                  |
| `/next`   | `/n`  | Select next prop type                         |
| `/prev`   | -     | Select previous prop type                     |
| `/give`   | -     | Get weapon_taser (unnecessary, auto-provided) |
| `/info`   | `/i`  | Show current status                           |
| `/help`   | `/h`  | Display all commands                          |

---

## Future Enhancements

### Potential Additions

- [ ] Prop rotation on multiple axes (pitch, roll)
- [ ] Precise angle/scale input via chat
- [ ] Prop presets/templates
- [ ] Save/load prop layouts
- [ ] Undo/redo functionality
- [ ] Copy/paste props
- [ ] Snap-to-grid placement
- [ ] Prop alignment tools
- [ ] Material/skin selection
- [ ] Physics toggle (freeze/unfreeze props)
- [ ] Prop groups/selection sets
- [ ] Admin-only mode
- [ ] Prop limit per team
- [ ] Prop spawning restrictions by zone
- [ ] Custom damage multipliers per prop type

### UI Improvements

- [ ] VGUI menu for prop selection
- [ ] HUD display for current mode
- [ ] Prop info on crosshair hover
- [ ] Keybind support (instead of chat only)
- [ ] Mouse wheel for prop cycling
- [ ] Visual grid for alignment

---

## Known Limitations

1. **Preview visibility**: All players see all previews (CS2 API limitation)
2. **Model paths**: Must use valid CS2 .vmdl paths
3. **Damage detection**: Relies on health polling (no direct damage event)
4. **Template requirement**: Maps must have required Hammer entities
5. **Reload cycling**: Mode cycling is forward-only via reload button (use chat commands for direct mode selection)

---

## Support

For issues or questions:

- Check CS2 console for error messages
- Enable detailed logging: `con_filter_enable 1; con_filter_text Multitool`
- Verify Hammer entities are named correctly
- Ensure TypeScript compiled successfully (`bun run build`)
- Check that point_script references `scripts/gamemode-setup.vjs`

---

**Status**: Production-ready feature module with clean architecture, comprehensive documentation, and full feature
implementation. Ready for testing and deployment as part of the Workbench gamemode system!
