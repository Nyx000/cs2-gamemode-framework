# cs2-gamemode-framework

A TypeScript framework for building custom CS2 gamemodes using Valve's `cs_script` system.

Write TypeScript, get hot reload, stop copy-pasting boilerplate.

## What this is

CS2's `cs_script` lets you run JavaScript in maps via `point_script` entities. The problem is there's no structure - everyone writes monolithic scripts and copy-pastes the same patterns between projects.

This framework gives you:

- **Plugin architecture** - Features are self-contained modules with lifecycle hooks
- **Hot reload that actually works** - State preservation across `script_reload`, no more restarting maps to test changes
- **Centralized event handling** - One place dispatches events to all features, no more scattered `OnPlayerConnect` calls
- **TypeScript with real types** - Synced from your CS2 installation, always current

## Quick start

```bash
git clone https://github.com/Nyx000/cs2-gamemode-framework.git
cd cs2-gamemode-framework/dev
bun install
bun run dev
```

This starts watch mode - edit TypeScript, it compiles and deploys automatically.

In CS2 (with `-tools` flag), run `script_reload` to hot reload your changes.

## Project structure

```
dev/
├── src/
│   ├── core/                    # The framework (don't edit unless extending)
│   │   ├── feature.ts           # Feature interface
│   │   └── gamemode-orchestrator.ts
│   ├── features/                # Your features go here
│   │   ├── index.ts             # Auto-generated registry
│   │   ├── example-feature/
│   │   └── multitool/           # Real example: prop placement system
│   ├── scripts/
│   │   └── workbench-gamemode.ts  # Main entry point
│   └── types/
│       └── cs_script.d.ts       # CS2 API definitions
└── scripts/                     # Compiled .vjs output
```

## Creating a feature

Add a folder in `dev/src/features/`, export a create function:

```typescript
// dev/src/features/my-feature/index.ts
import { CSPlayerController, Instance } from "cs_script/point_script";
import { Feature } from "../../core/feature";

export function createMyFeature(instance: typeof Instance): Feature {
  let playerScores: Record<number, number> = {};

  return {
    init() {
      instance.Msg("[MyFeature] Ready");
    },

    cleanup() {
      // Called before hot reload
    },

    getState() {
      return { playerScores };
    },

    restoreState(state) {
      playerScores = state.playerScores;
    },

    onPlayerActivate(player: CSPlayerController) {
      const slot = player.GetPlayerSlot();
      playerScores[slot] = 0;
    },

    onThink() {
      // Called every tick by the orchestrator
    },
  };
}
```

Run `bun run build` - the feature auto-registers.

## Creating a gamemode

```typescript
// dev/src/scripts/my-gamemode.ts
import { Instance } from "cs_script/point_script";
import { createGamemodeOrchestrator } from "../core/gamemode-orchestrator";
import { features } from "../features";

const orchestrator = createGamemodeOrchestrator(Instance, {
  gamemodeName: "My Gamemode",
  features: features,
  serverCommands: ["mp_roundtime 5", "sv_cheats 1"],
  welcomeMessages: ["Welcome!", "Press R with zeus to cycle modes"],
  disabledFeatures: ["example-feature"],
});

Instance.OnActivate(() => {
  orchestrator.initialize();
});
```

## Commands

```bash
bun run dev          # Watch mode (start here)
bun run build        # One-time build with type checking
bun run deploy       # Build and copy to game directory
bun run check        # Lint + type check
bun run sync-types   # Update cs_script.d.ts from your CS2 install
bun run quick-reload # Nuclear option when scripts won't load
```

## The golden rules

**1. Never store entity references**

```typescript
// Wrong - breaks on hot reload
let door = Instance.FindEntityByName("door");

// Right - store names, refetch when needed
const doorName = "door";
const door = Instance.FindEntityByName(doorName);
if (door?.IsValid()) door.Open();
```

**2. Clear think loops before hot reload**

The framework handles this, but if you're doing something custom:

```typescript
Instance.OnScriptReload({
  before: () => {
    Instance.SetNextThink(-1); // Critical
    return stateToSave;
  },
});
```

**3. cs_script.d.ts is the source of truth**

If a method isn't in there, it doesn't exist. Run `bun run sync-types` to update from your CS2 installation.

## Docs

- `dev/docs/COMMON_PATTERNS.md` - Think loops, damage handling, tracing, etc.
- `dev/docs/API_CHANGELOG.md` - Breaking changes when CS2 updates
- `ARCHITECTURE_GUIDE.txt` - Deep dive on the design patterns

## Requirements

- [Bun](https://bun.sh) (or Node, but Bun is faster)
- CS2 with Workshop Tools DLC
- A map with a `point_script` entity

## Why this exists

I analyzed 27+ Zombie Escape map scripts. Found 2,000+ lines of duplicated boilerplate - the same boss HP system copied 5 times, heal zones reimplemented everywhere, utility functions pasted into every file.

This framework eliminates that. Write a feature once, use it everywhere. The multitool feature included here is 340 lines that would be 600+ without the framework.

## License

MIT
