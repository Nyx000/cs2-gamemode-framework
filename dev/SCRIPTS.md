# Development Scripts Reference

This document explains all available npm/bun scripts for CS2 cs_script development.

## Quick Start

**Most common workflow:**

```bash
bun run dev          # Start interactive menu (recommended)
```

**Direct commands:**

```bash
bun run dev:watch    # Start watch mode in background
bun run stop         # Stop watch mode
bun run quick-reload # Fast rebuild + deploy
```

---

## Development Workflow

### `bun run dev`

**Interactive development menu** - The easiest way to work with the project.

Provides a visual menu with options for:

- Starting/stopping watch mode
- Building and deploying
- Viewing logs
- Code quality checks
- Maintenance tasks

**When to use:** Default choice for development. User-friendly interface for all common tasks.

---

### `bun run dev:watch`

**Watch mode** - Automatically compiles and deploys on file changes.

Runs both `dev:compile` and `dev:deploy` in parallel as background processes. Logs output to `/tmp/cs2-dev.log`.

**When to use:** When you want continuous auto-rebuild without the interactive menu.

**Example:**

```bash
bun run dev:watch    # Start watching
bun run logs --follow # View live logs in another terminal
bun run stop         # Stop when done
```

---

### `bun run dev:compile`

**Watch compilation only** - Compiles TypeScript on file changes without deploying.

**When to use:** Rarely needed directly. Useful if you want to compile without deploying, or debug compilation issues separately.

---

### `bun run dev:deploy`

**Watch deployment only** - Watches compiled output and deploys to game directory.

**When to use:** Rarely needed directly. Part of `dev:watch`.

---

### `bun run stop`

**Stop all development processes** - Gracefully stops all background watch processes.

Terminates any running `dev:watch`, `dev:compile`, or `dev:deploy` processes tracked by PID files.

**When to use:** After running `dev:watch` to clean up background processes.

---

## Build & Deploy

### `bun run prebuild`

**Pre-build setup** - Auto-generates feature registry index.

Scans `src/features/` directory and generates `src/features/index.ts` with all feature exports.

**When to use:** Automatically runs before `build`. Rarely needed manually unless you want to regenerate the feature index.

---

### `bun run build`

**Full production build** - Complete build pipeline with validation.

Runs in sequence:

1. `prebuild` - Generate feature index
2. `type-check` - TypeScript validation
3. `compile` - Compile all TypeScript files

**When to use:** Before testing in production mode, or to verify everything compiles cleanly.

**Example:**

```bash
bun run build        # Full build with type checking
```

---

### `bun run compile`

**Compile TypeScript** - One-time compilation without watching.

Compiles all `.ts` files in `src/scripts/` to `.js` in `../scripts/`.

**When to use:** Part of other commands. Use `build` for a full build or `deploy` to compile + deploy.

---

### `bun run deploy`

**Build and deploy to game** - Compiles code and copies to game directory.

Runs `compile` then deploys scripts to:
`../../../../game/csgo_addons/workbench/scripts/`

**When to use:** When you want to test in-game after making changes.

**Example:**

```bash
bun run deploy       # Compile and copy to game
# Then in CS2 console:
# map your_map_name
# OR
# script_reload (if using -tools flag)
```

---

### `bun run deploy:clean`

**Clean deploy** - Removes all deployed scripts then redeploys.

**When to use:** When you want to ensure no stale/renamed files remain in the game directory.

---

### `bun run quick-reload`

**Fast rebuild for game reload** - Clears cache, recompiles, and deploys.

Three-step process:

1. Clear build cache
2. Recompile all scripts
3. Deploy to game directory

**When to use:** When hot reload in-game isn't working, or you suspect cache issues.

**Example:**

```bash
bun run quick-reload
# Then in CS2 console: script_reload
```

---

## Code Quality

### `bun run lint`

**ESLint check** - Lints all TypeScript files except type definitions.

Checks code style and potential errors using ESLint rules.

**When to use:** Before committing code, or to check for linting issues.

---

### `bun run type-check`

**TypeScript validation** - Type checks without emitting files.

Runs `tsc --noEmit` to validate TypeScript types.

**When to use:** To verify type correctness, find type errors early.

---

### `bun run check`

**Full code quality check** - Runs lint and type-check in parallel.

**When to use:** Before commits, pull requests, or to verify overall code quality.

**Example:**

```bash
bun run check        # Lint + type check
```

---

### `bun run format`

**Format code** - Auto-formats TypeScript files using Bun's formatter.

**When to use:** To maintain consistent code style across the project.

---

## Maintenance

### `bun run clear-cache`

**Clear build cache** - Removes cached compilation artifacts.

**When to use:** When you suspect cache corruption, or compilation seems stale.

---

### `bun run clean`

**Remove compiled scripts** - Deletes all compiled `.js` and `.vjs` files.

Removes files from `../scripts/` (content directory output).

**When to use:** To force a complete recompilation from scratch.

---

### `bun run fresh`

**Complete fresh rebuild** - Nuclear option for build issues.

Combines `clear-cache` and `deploy:clean` for a completely clean slate.

**When to use:** When experiencing persistent build or deployment issues. Fixes 99% of "it works on my machine" problems.

**Example:**

```bash
bun run fresh        # Clean everything and redeploy
```

---

### `bun run sync-types`

**Sync type definitions** - Updates cs_script.d.ts from game installation.

Copies the latest CS2 API type definitions from your game directory.

**When to use:** After CS2 updates that might change the scripting API.

---

### `bun run extract-props`

**Extract prop definitions** - Generates prop reference from game files.

Utility for building prop databases/references.

**When to use:** When updating prop documentation or creating prop browsers.

---

## Utilities

### `bun run logs`

**View development logs** - Shows last 200 lines of dev log file.

**When to use:** To check what happened during watch mode compilation/deployment.

**Example:**

```bash
bun run logs         # View last 200 lines
bun run logs --follow # Live tail (Ctrl+C to exit)
```

---

## Common Workflows

### Daily Development

```bash
bun run dev          # Use interactive menu
# OR
bun run dev:watch    # Start background watch
# ... make changes ...
# In CS2 console: script_reload
bun run stop         # When done
```

### Quick Test After Changes

```bash
bun run deploy       # Compile + deploy
# In CS2: script_reload or map reload
```

### Fix Build Issues

```bash
bun run fresh        # Nuclear clean + rebuild
```

### Before Committing

```bash
bun run check        # Lint + type check
bun run format       # Format code
```

### Debug Compilation

```bash
bun run logs --follow # In one terminal
bun run dev:watch     # In another terminal
# Watch logs in real-time
```

---

## Script Categories

### Entry Points (Use These Directly)

- `dev` - Interactive menu
- `dev:watch` - Background watch mode
- `build` - Full production build
- `deploy` - Build + deploy
- `quick-reload` - Fast rebuild
- `check` - Code quality
- `fresh` - Clean rebuild
- `logs` - View logs

### Internal/Advanced (Used by Other Scripts)

- `prebuild` - Auto-runs before build
- `compile` - Low-level compilation
- `dev:compile` - Watch compilation only
- `dev:deploy` - Watch deployment only
- `clear-cache` - Cache management
- `clean` - File cleanup

### Specialized Tools

- `sync-types` - Update API definitions
- `extract-props` - Prop database tools
- `lint` - ESLint only
- `type-check` - TypeScript only
- `format` - Code formatting

---

## Tips

**Use the interactive menu** - `bun run dev` is the easiest way to work. It handles everything.

**Background watch mode** - `dev:watch` is great for "set and forget" development. Just remember to `stop` it when done.

**Log files** - Watch mode logs to `/tmp/cs2-dev.log`. Use `bun run logs --follow` to watch in real-time.

**When things break** - Try `bun run fresh` first. Clears all caches and rebuilds everything.

**Hot reload** - In CS2 with `-tools` flag, use `script_reload` console command. Without it, reload the map.
