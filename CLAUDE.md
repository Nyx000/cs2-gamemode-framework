# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript development framework for Counter-Strike 2 custom gamemodes using Valve's `cs_script` system. Code is written in TypeScript, compiled to JavaScript (.vjs), and runs natively in Source 2 engine via `point_script` entities.

## Essential Commands

All commands run from the `dev/` directory using Bun:

```bash
# Development
bun run dev              # Interactive menu (recommended starting point)
bun run dev:watch        # Background auto-compile + auto-deploy
bun run stop             # Stop background processes

# Build & Deploy
bun run build            # Full build with type checking
bun run deploy           # Compile + deploy to game directory
bun run quick-reload     # Clear cache + recompile + deploy (fixes most issues)
bun run fresh            # Nuclear option - clears everything and rebuilds

# Code Quality
bun run check            # Lint + type-check (run before commits)
bun run lint             # ESLint only
bun run type-check       # TypeScript validation only
bun run format           # Auto-format code

# Utilities
bun run sync-types       # Update cs_script.d.ts from game installation
bun run logs --follow    # View live compilation logs
```

In-game hot reload: `script_reload` in CS2 console (requires `-tools` launch flag)

## Architecture

**Plugin-based framework with centralized event orchestration:**

```
dev/src/
├── core/
│   ├── feature.ts              # Feature interface contract
│   └── gamemode-orchestrator.ts # Central event dispatcher
├── scripts/
│   └── workbench-gamemode.ts   # Main entry point
├── features/
│   ├── index.ts                # Auto-generated registry (DO NOT EDIT)
│   └── [feature-name]/         # Self-contained feature modules
│       ├── index.ts            # Factory function + public API
│       ├── types.ts            # TypeScript interfaces
│       └── config.ts           # Feature configuration
└── types/
    └── cs_script.d.ts          # CS2 API definitions (SOURCE OF TRUTH)
```

**Key patterns:**
- Features implement the `Feature` interface with lifecycle hooks (`init`, `cleanup`, `getState`, `restoreState`)
- Factory functions receive `Instance` for dependency injection: `createFeature(instance: typeof Instance): Feature`
- Orchestrator dispatches all game events to features - features never register events directly
- Auto-discovery: add a feature folder in `features/` and it's automatically included (via `bun run prebuild`)

## Critical Rules

### 1. cs_script.d.ts is the Authority
If it's not in `dev/src/types/cs_script.d.ts`, it doesn't exist. Always check this file for exact method signatures before writing code.

### 2. Never Store Entity References
Entity references break on hot reload. Store entity names as strings and refetch when needed:
```typescript
// ❌ WRONG
let door = Instance.FindEntityByName("door");

// ✅ CORRECT
const doorName = "door";
const door = Instance.FindEntityByName(doorName);
if (door?.IsValid()) door.Open();
```

### 3. Clear Think Loops Before Hot Reload
Always call `SetNextThink(-1)` in the `before` callback of `OnScriptReload` to prevent duplicate think loops.

### 4. Event Callbacks Use Object Parameters
```typescript
Instance.OnPlayerConnect(({ player }) => { ... });
Instance.OnPlayerKill(({ player, attacker, weapon }) => { ... });
```

### 5. Single Unified Think Loop
Never create individual think loops per feature. Features implement `onThink()` and the orchestrator calls them from its unified loop (20 ticks/sec default).

## Feature Implementation Pattern

```typescript
export function createMyFeature(instance: typeof Instance): Feature {
  // Private state (survives within session, needs getState/restoreState for hot reload)
  let state = { ... };

  return {
    init(): void { /* setup */ },
    cleanup(): void { /* pre-hot-reload cleanup */ },
    getState(): typeof state { return { ...state }; }, // Return copy
    restoreState(s: typeof state): void { state = s; },
    onPlayerConnect?(player): void { /* optional hook */ },
    onPlayerActivate?(player): void { /* optional hook */ },
    onThink?(): void { /* called every tick by orchestrator */ },
  };
}
```

## Key Documentation

- `dev/docs/COMMON_PATTERNS.md` - Code examples for think loops, tracing, damage, etc.
- `dev/docs/API_CHANGELOG.md` - Breaking changes and migration guides
- `ARCHITECTURE_GUIDE.txt` - Deep dive on design patterns with web framework analogies
