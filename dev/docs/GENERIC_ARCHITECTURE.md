# Generic Gamemode Architecture

This document explains the refactored generic gamemode framework architecture.

## Overview

The Workbench codebase has been refactored to separate generic orchestration logic from Workbench-specific implementation. This makes the core architecture reusable across multiple CS2 projects.

## Architecture Layers

### 1. Core Framework (`dev/src/core/`)

**Generic, reusable components:**

#### `feature.ts`

- Defines the `Feature` interface that all features must implement
- Specifies lifecycle methods: `init()`, `cleanup()`, `getState()`, `restoreState()`
- Specifies optional event handlers: `onPlayerConnect`, `onPlayerActivate`, `onPlayerDisconnect`, `onGunReload`, `onRoundStart`, `onThink`
- Type definitions for feature factories and descriptors

#### `gamemode-orchestrator.ts`

- Generic orchestrator that manages feature lifecycle
- Handles all CS2 event dispatching (player events, weapon events, round events)
- Coordinates hot reload state preservation (development only)
- Manages unified think loop across all features
- Configurable via `GamemodeConfig` object

**Key Features:**

- Feature discovery and initialization
- Centralized event dispatching to features
- Hot reload orchestration with state aggregation
- Server command execution
- Player welcome messages
- Think loop coordination (default: 20 ticks/sec)

### 2. Feature Modules (`dev/src/features/`)

**Self-contained gameplay features:**

- Each feature implements the `Feature` interface from `core/feature.ts`
- Features are auto-discovered by `build-features.mjs`
- Features export a `create` factory function
- Features manage their own internal state
- Features respond to events via optional lifecycle hooks

**Examples:**

- `multitool/` - Prop placement system
- `example-feature/` - Template for new features

### 3. Gamemode Implementation (`dev/src/scripts/`)

**Concrete gamemode using the framework:**

#### `workbench-gamemode.ts`

- Imports and configures the generic orchestrator
- Provides Workbench-specific configuration:
  - Server commands (cheats, infinite ammo, etc.)
  - Welcome messages
  - Disabled features list
  - Custom initialization logic
  - Custom player activation logic
- Adds Workbench-specific features (god mode for human players)
- Displays custom banner on startup

## How to Use This Architecture in Other Projects

### Step 1: Copy Core Framework

Copy the `dev/src/core/` directory to your new project:

```
your-project/
└── dev/
    └── src/
        └── core/
            ├── feature.ts
            └── gamemode-orchestrator.ts
```

### Step 2: Create Your Gamemode

Create your gamemode script (e.g., `dev/src/scripts/my-gamemode.ts`):

```typescript
import { Instance } from "cs_script/point_script";
import { createGamemodeOrchestrator } from "../core/gamemode-orchestrator";
import { features } from "../features";

const orchestrator = createGamemodeOrchestrator(Instance, {
  gamemodeName: "My Custom Gamemode",
  features: features,
  serverCommands: [
    "mp_roundtime 5",
    "mp_buy_anywhere 1",
    // ... your commands
  ],
  welcomeMessages: ["Welcome to my gamemode!", "Type !help for commands"],
  disabledFeatures: [], // Optional
  thinkInterval: 0.05, // 20 ticks/sec (optional)

  // Optional: Custom initialization
  onInitialize: () => {
    Instance.Msg("[MyGamemode] Custom setup complete");
  },

  // Optional: Custom player activation
  onPlayerActivate: (player) => {
    player.JoinTeam(2); // Force team assignment, etc.
  },
});

Instance.OnActivate(() => {
  orchestrator.initialize();
});

// Add gamemode-specific event handlers here
Instance.OnBeforePlayerDamage(({ player }) => {
  // Custom damage logic
});
```

### Step 3: Create Features

Build features that implement the `Feature` interface:

```typescript
import { Feature } from "../core/feature";
import { Instance } from "cs_script/point_script";

export function createMyFeature(instance: typeof Instance): Feature {
  return {
    init() {
      instance.Msg("[MyFeature] Initialized");
    },

    cleanup() {
      // Called before hot reload
    },

    getState() {
      // Return state to preserve during hot reload
      return {};
    },

    restoreState(state: any) {
      // Restore state after hot reload
    },

    // Optional event handlers
    onPlayerConnect(player) {
      // Handle player connection
    },

    onThink() {
      // Called every tick (managed by orchestrator)
    },
  };
}
```

### Step 4: Register Features

Features are auto-registered via `dev/src/features/index.ts`. This file should import from `core/feature.ts`:

```typescript
import { Feature } from "../core/feature";
import * as myFeatureModule from "./my-feature";

export const features = [{ name: "myFeature", create: myFeatureModule.createMyFeature }] as const;

export type { Feature };
```

## Benefits of This Architecture

### 1. **Separation of Concerns**

- Core framework is generic and reusable
- Gamemode implementation is clean and focused
- Features are self-contained and portable

### 2. **Hot Reload Support**

- Orchestrator handles state aggregation automatically
- Features only need to implement `getState()` and `restoreState()`
- Think loops are properly cleared and restarted

### 3. **Event Dispatching**

- Centralized event handling in orchestrator
- Features opt-in to events they care about
- No need to register/unregister event handlers manually

### 4. **Type Safety**

- TypeScript interfaces ensure consistency
- Features must implement required methods
- Optional methods are clearly marked

### 5. **Scalability**

- Easy to add new features (just create a folder)
- Features don't interfere with each other
- Orchestrator handles coordination automatically

## Migration from Old Architecture

If you have an existing monolithic gamemode, here's how to migrate:

1. **Extract feature logic** into separate `createFeature()` functions
2. **Move generic orchestration** to use `createGamemodeOrchestrator()`
3. **Keep gamemode-specific logic** in your main script
4. **Update imports** to use `core/feature.ts`

## Files Changed in Refactoring

**New Files:**

- `dev/src/core/feature.ts` - Feature interface
- `dev/src/core/gamemode-orchestrator.ts` - Generic orchestrator
- `dev/src/scripts/workbench-gamemode.ts` - Workbench implementation

**Deleted Files:**

- `dev/src/scripts/gamemode-setup.ts` - Replaced by workbench-gamemode.ts

**Modified Files:**

- `dev/src/features/index.ts` - Now imports Feature from core
- `dev/tsconfig.json` - Added "src/core/\*_/_" to include
- Documentation files - Updated references

## Hot Reload (Development Only)

**Important:** Hot reload is a DEVELOPMENT-ONLY feature (requires `-tools` flag).

- **Development:** `script_reload` command preserves in-memory state
- **Production:** Hot reload doesn't exist; state is lost on map change/crash

For production persistence, implement external storage (database, files, etc.).

## Next Steps

Now that you have a generic framework:

1. **Create new features** by copying the `example-feature/` template
2. **Build new gamemodes** by creating new scripts that use the orchestrator
3. **Share the core framework** across multiple projects
4. **Extend the orchestrator** with additional hooks as needed

## Questions?

See the full implementation in:

- `dev/src/core/gamemode-orchestrator.ts` - Complete orchestrator code
- `dev/src/scripts/workbench-gamemode.ts` - Example usage
- `dev/src/features/example-feature/` - Feature template
