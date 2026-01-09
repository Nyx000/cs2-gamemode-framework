# Example Feature Template

This is a **minimal, working skeleton** for creating new CS2 features. Copy this entire folder to start building your
own feature!

## 📁 File Structure

```
example-feature/
├── index.ts       # Main entry point with public API
├── types.ts       # TypeScript type definitions
├── config.ts      # Configuration constants
└── README.md      # This file
```

## 🚀 Quick Start

### 1. Copy This Folder

```bash
cp -r features/example-feature features/your-feature-name
```

### 2. Rename and Customize

Update these files:

- **index.ts** - Rename `ExampleFeature` → `YourFeature`
- **types.ts** - Define your feature's data structures
- **config.ts** - Add your feature's constants

### 3. Import in Gamemode

In your gamemode script (e.g., `scripts/workbench-gamemode.ts`):

```typescript
import { createYourFeature } from "../features/your-feature-name";

let yourFeature: YourFeature;

Instance.OnActivate(() => {
  yourFeature = createYourFeature(Instance);
  yourFeature.init();
});
```

## 📝 Feature Pattern

Every feature exports a **factory function** that returns an interface:

```typescript
export function createYourFeature(instance: PointScript): YourFeature {
  return {
    init() {
      /* Setup logic */
    },
    cleanup() {
      /* Cleanup before hot reload */
    },
    getState() {
      /* Return serializable state */
    },
    restoreState(state) {
      /* Restore from state */
    },
    // ... custom lifecycle methods
  };
}
```

## 🔧 Core Lifecycle Methods

### `init()`

- Register event handlers
- Initialize systems
- Called once on map load or after hot reload

### `cleanup()`

- Clear think loops (`Instance.SetNextThink(-1)`)
- Stop timers
- Called before hot reload

### `getState()`

- Return all data to preserve across hot reload
- Must return plain objects (no entity references!)
- Store entity **names**, not entity objects

### `restoreState(state)`

- Restore feature state after hot reload
- Re-initialize systems with saved data

## 🎮 Game Event Handlers

Features can register their own event handlers:

```typescript
instance.OnPlayerConnect(({ player }) => {
  // Handle player connection
});

instance.OnPlayerChat(({ player, text }) => {
  // Handle chat messages
});

instance.OnGunFire(({ weapon }) => {
  // Handle weapon fire
});
```

See `dev/src/types/cs_script.d.ts` for all available events.

## 🔄 Think Loops

Features should **NOT** manage their own think loops directly. Instead, export an `onThink()` method and let the
gamemode call it:

```typescript
// ❌ Don't do this in features
Instance.SetThink(() => {
  /* ... */
});

// ✅ Do this instead
export interface YourFeature {
  onThink(): void;
}

// The gamemode orchestrator handles think loops automatically:
Instance.SetThink(() => {
  yourFeature.onThink();
  Instance.SetNextThink(Instance.GetGameTime() + 1.0);
});
```

## 📦 What to Include

### types.ts

- Interfaces for data structures
- Enums for states/modes
- Type aliases

### config.ts

- Numeric constants (distances, speeds, etc.)
- String constants (entity names, messages)
- Configuration arrays/objects

### index.ts

- Public API factory function
- Private implementation details
- Event handler registration

## 🎯 Best Practices

1. **Self-Contained** - Feature should work independently
2. **No Entity Storage** - Store entity names, not references
3. **Defensive Checks** - Always validate entities with `.IsValid()`
4. **Clean API** - Only expose what gamemode needs
5. **Type Safety** - Use TypeScript types everywhere

## 📚 Examples

- **Multitool** - Complex feature with preview system, prop management
- **Example Feature** (this!) - Minimal feature with think loop and player tracking

## 🧪 Testing Your Feature

### Standalone Mode

Features can be tested independently by creating a dedicated point_script:

```typescript
// scripts/test-your-feature.ts
import { Instance } from "cs_script/point_script";
import { createYourFeature } from "../features/your-feature-name";

const feature = createYourFeature(Instance);

Instance.OnActivate(() => {
  feature.init();
});

Instance.OnScriptReload({
  before: () => {
    feature.cleanup();
    return feature.getState();
  },
  after: (state) => {
    if (state) feature.restoreState(state);
    feature.init();
  },
});
```

### Integration Mode

Test alongside other features in the main gamemode script.

## 💡 Tips

- Start with this example skeleton
- Add functionality incrementally
- Test hot reload frequently
- Keep features focused on one responsibility
- Document your public API

## 🚧 Common Pitfalls

1. **Storing Entity References** - They become invalid on hot reload
2. **Multiple Think Loops** - Only ONE SetThink allowed per Instance
3. **Ignoring IsValid()** - Always check before using entities
4. **Forgetting Cleanup** - Clear think loops in `cleanup()`

---

**Happy coding! 🎮**
