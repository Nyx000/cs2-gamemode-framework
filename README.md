# CS2 Gamemode Framework

A TypeScript framework for building custom CS2 gamemodes using Valve's `cs_script` system.

Write TypeScript, get hot reload, stop copy-pasting boilerplate.

## What this is

CS2's `cs_script` lets you run JavaScript in maps via `point_script` entities. This framework gives you:

- **Plugin architecture** - Features are self-contained modules with lifecycle hooks
- **Hot reload that works** - State preservation across `script_reload`
- **Centralized event handling** - One orchestrator dispatches events to all features
- **TypeScript with real types** - Generated from your CS2 installation

## Quick start

```bash
git clone https://github.com/Nyx000/cs2-gamemode-framework.git
cd cs2-gamemode-framework
bun install
bun run dev
```

In CS2 (with `-tools` flag), run `script_reload` to hot reload changes.

## Project structure

```
src/
├── core/                       # Framework (the reusable part)
│   ├── feature.ts              # Feature interface + FeatureContext
│   ├── gamemode-orchestrator.ts # Central event dispatcher
│   ├── event-bus.ts            # Inter-feature communication
│   └── state-utils.ts          # Hot reload state serialization
├── features/                   # Your features
│   ├── index.ts                # Auto-generated feature registry
│   ├── example-feature/        # Minimal template to copy
│   └── debug/                  # Event logger (toggleable)
├── gamemodes/
│   └── my-gamemode.ts          # Entry point template
└── types/
    └── cs_script.d.ts          # CS2 API definitions
```

## Creating a feature

1. Create folder: `src/features/my-feature/` (use kebab-case)
2. Add `index.ts` with a factory function named `createMyFeature` (create + PascalCase):

```typescript
import { CSPlayerController } from "cs_script/point_script";
import { Feature, FeatureContext } from "../../core/feature";

export function createMyFeature({ instance, eventBus }: FeatureContext): Feature {
  let state = { playerCount: 0 };

  return {
    init() {
      instance.Msg("[MyFeature] Ready");
    },
    cleanup() {},
    getState() { return { ...state }; },
    restoreState(s) { state = s; },

    onPlayerConnect(player: CSPlayerController) {
      state.playerCount++;
      eventBus.emit("my-feature:player-joined", { slot: player.GetPlayerSlot() });
    },
  };
}
```

3. Run `bun run build` - feature is auto-discovered and registered
4. Add to `enabledFeatures: ["myFeature"]` in your gamemode to use it

## Commands

```bash
bun run dev          # Watch mode - auto-compile on save
bun run build        # One-time build with type checking
bun run deploy       # Build and copy to game directory
bun run check        # Lint + type check
bun run sync-types   # Update cs_script.d.ts from CS2
```

## Golden rules

**1. Never store entity references**

```typescript
// Wrong - breaks on hot reload
let door = Instance.FindEntityByName("door");

// Right - store names, refetch when needed
const doorName = "door";
const door = Instance.FindEntityByName(doorName);
if (door?.IsValid()) door.Open();
```

**2. cs_script.d.ts is the source of truth**

If a method isn't in there, it doesn't exist.

**3. No async/await**

CS2's V8 doesn't support Promises. Use think loops for delayed operations.

## Requirements

- [Bun](https://bun.sh) (or Node)
- CS2 with Workshop Tools DLC
- A map with a `point_script` entity

## License

MIT
