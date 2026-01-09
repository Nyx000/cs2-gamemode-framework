# CS2 Workshop Tools - Workbench

Counter-Strike 2 custom map and scripting project using TypeScript.

---

## What This Is

TypeScript development environment for CS2 scripting via Valve's **cs_script** system. Write TypeScript, compile to
JavaScript, run natively in Source 2 engine through `point_script` entities in Hammer.

**Key Features:**

- Native engine integration with hot reload
- Type-safe development with full API definitions
- Auto-compile and auto-deploy workflow
- Event-driven architecture
- Modular feature-based gamemode system

---

## Quick Start

```bash
cd dev

# Development
bun run dev            # Auto-compile + watch + auto-deploy (start here)
bun run build          # One-time compile
bun run launch         # Launch CS2 with -tools flag

# Maintenance
bun run quick-reload   # Fix script cache issues
bun run clean:cache    # Clear .vjs_c cache
bun run sync-types     # Sync latest API types from CS2
```

**In CS2 console:** `script_reload` to hot reload after changes

---

## Project Structure

```
content/csgo_addons/workbench/
├── dev/
│   ├── src/
│   │   ├── scripts/             # Write TypeScript here
│   │   ├── features/            # Feature modules (gamemode components)
│   │   └── types/
│   │       └── cs_script.d.ts    # API definitions (always current - SOURCE OF TRUTH)
│   ├── docs/                     # This documentation
│   └── package.json
├── scripts/                      # Compiled .vjs output
└── maps/                         # Hammer maps

game/csgo_addons/workbench/
└── scripts/                      # CS2 runs from here (auto-deployed)
```

---

## Development Workflow

1. **Write** TypeScript in `dev/src/scripts/*.ts` or feature modules in `dev/src/features/*/`
2. **Compile** with `bun run dev` (watches for changes)
3. **Deploy** automatically to game directory
4. **Test** in CS2, use `script_reload` to hot reload
5. **Iterate** - changes auto-compile and deploy instantly

Auto-deploy system keeps content and game directories in sync.

---

## Documentation

### Core API Reference

- **[API Changelog](API_CHANGELOG.md)** - Complete history of API changes, breaking changes, and migration guides
- **[Common Patterns](COMMON_PATTERNS.md)** - Code examples: think loops, score tracking, entity spawning, damage
  system, hitbox tracing, enums, hot reload
- **`dev/src/types/cs_script.d.ts`** - The authoritative API reference (always up-to-date)

### Props & Assets

- **[Props Reference](PROPS_REFERENCE.md)** - All 7,979 props with categories, common props curated section, and Hammer
  Asset Browser guide

### Tools & Mapping

- **Hammer Reference** - Use Cursor's hammer-editor rule (run `fetch_rules` for details)
- **[Multitool System](../src/features/multitool/README.md)** - Prop placement feature module

---

## Essential Golden Rules

### 1. cs_script.d.ts is Always Correct

**If it's not in `dev/src/types/cs_script.d.ts`, it doesn't exist.** This file is the authoritative, always-current API
reference. Check it before writing code.

### 2. Never Store Entity References

```typescript
// ❌ WRONG - breaks on hot reload
let door = Instance.FindEntityByName("door");
door.Open(); // fails after reload!

// ✅ CORRECT - store names, refetch when needed
const doorName = "door";
const door = Instance.FindEntityByName(doorName);
if (door?.IsValid()) door.Open();
```

### 3. Always Clear Think Loops in Hot Reload

```typescript
Instance.OnScriptReload(({ before, after }) => {
  before(() => {
    Instance.SetNextThink(-1); // CRITICAL: Stop think loops
    return stateToPreserve;
  });
  after((memory) => {
    if (memory) state = memory;
  });
});
```

### 4. Event Callbacks Use Object Parameters

```typescript
// ✅ All event handlers receive a single object:
Instance.OnPlayerConnect(({ player }) => { ... });
Instance.OnPlayerKill(({ player, attacker, weapon }) => { ... });
Instance.OnRoundStart(({}) => { ... });
```

---

## Before Coding

**CS2's API changes frequently.** Before starting development:

```bash
bun run sync-types     # Get latest API definitions from CS2
```

Then **read `API_CHANGELOG.md`** for any breaking changes since you last updated.

---

## Troubleshooting

| Issue                                | Solution                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Scripts won't load after map compile | `bun run quick-reload`                                                                      |
| Need to find props                   | Check [Props Reference (Quick)](PROPS_REFERENCE_QUICK.md) or Hammer Asset Browser (Shift+A) |
| API changed or breaking              | Read [API Changelog](API_CHANGELOG.md)                                                      |
| TypeScript errors                    | Check `dev/src/types/cs_script.d.ts` for exact method signatures                            |

---

## Key Files

- **API Reference**: `dev/src/types/cs_script.d.ts` (always up-to-date, always correct)
- **Your Scripts**: `dev/src/scripts/*.ts`
- **Core Framework**: `dev/src/core/` (generic gamemode orchestrator)
- **Features**: `dev/src/features/*/` (self-contained gamemode modules)
- **Workbench Gamemode**: `dev/src/scripts/workbench-gamemode.ts`
- **Compiled Output**: `scripts/*.vjs`

---

**Last Updated**: October 2025  
**CS2 Build**: 10553+  
**cs_script Release**: September 16, 2025
