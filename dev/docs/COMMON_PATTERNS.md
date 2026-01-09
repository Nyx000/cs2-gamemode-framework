# CS2 Scripting Common Patterns

This document contains common coding patterns and examples for CS2 scripting using the `cs_script` API.

For API reference, always consult `dev/src/types/cs_script.d.ts` first.

---

## Think Loop Pattern

Use this pattern for periodic logic that needs to run at regular intervals.

```typescript
Instance.SetThink(() => {
  // Your periodic logic
  Instance.SetNextThink(Instance.GetGameTime() + 1.0);
});

// Start the loop
Instance.SetNextThink(Instance.GetGameTime());

// ALWAYS clear in hot reload
Instance.OnScriptReload(({ before }) => {
  before(() => {
    Instance.SetNextThink(-1); // Stop think loops
    return stateToPreserve;
  });
});
```

**Key Points:**

- `SetThink` registers the callback
- `SetNextThink` controls when it runs (pass game time for next execution)
- **Critical:** Clear think loops in `OnScriptReload` before callback with `SetNextThink(-1)`
- Without clearing, loops persist after hot reload causing duplicate execution

---

## Score Tracking

Track player scores across rounds and reconnections.

```typescript
let scores: Record<number, number> = {};

Instance.OnPlayerActivate(({ player }) => {
  const slot = player.GetPlayerSlot();
  if (!(slot in scores)) scores[slot] = 0;
});

function addScore(player: CSPlayerController, points: number) {
  const slot = player.GetPlayerSlot();
  scores[slot] += points;
  player.AddScore(points);
}
```

**Key Points:**

- Use `GetPlayerSlot()` as the key (stable across rounds)
- Initialize scores when players activate
- Call `player.AddScore()` to update the in-game scoreboard

---

## Entity Spawning & Cleanup

Spawn entities from templates and clean them up properly.

```typescript
let spawnedEntityNames: string[] = [];

function spawnFromTemplate(templateName: string, pos: Vector) {
  const template = Instance.FindEntityByName(templateName);
  if (template) {
    const entities = (template as PointTemplate).ForceSpawn(pos, null);
    entities?.forEach((e) => {
      if (e.GetEntityName()) {
        spawnedEntityNames.push(e.GetEntityName());
      }
    });
  }
}

function cleanup() {
  spawnedEntityNames.forEach((name) => {
    const entity = Instance.FindEntityByName(name);
    if (entity?.IsValid()) entity.Remove();
  });
  spawnedEntityNames = [];
}

// Preserve spawned entity list across hot reloads
Instance.OnScriptReload(({ before, after }) => {
  before(() => ({ names: spawnedEntityNames }));
  after((mem) => {
    if (mem) spawnedEntityNames = mem.names;
  });
});
```

**Key Points:**

- **Never store entity references directly** - store entity names as strings
- Refetch entities by name when you need to use them
- Always check `IsValid()` before operations
- Preserve entity name lists across hot reloads

---

## Debugging Visualizations

Debug visualizations only work with the `-tools` flag. They silently fail in production.

```typescript
// Console logging (accepts any type)
Instance.Msg(anyValue);

// Draw a line between two points
Instance.DebugLine({
  start: pos1,
  end: pos2,
  duration: 5.0,
  color: { r: 255, g: 0, b: 0 },
});

// Draw a sphere at a position
Instance.DebugSphere({
  center: pos,
  radius: 50,
  duration: 3.0,
  color: { r: 0, g: 255, b: 0 },
});

// Draw an axis-aligned box
Instance.DebugBox({
  mins: { x: -10, y: -10, z: 0 },
  maxs: { x: 10, y: 10, z: 20 },
  duration: 2.0,
  color: { r: 0, g: 0, b: 255 },
});

// Display text on screen
Instance.DebugScreenText({
  text: "Hello!",
  x: 0.5, // 0.0-1.0 (screen space)
  y: 0.5, // 0.0-1.0 (screen space)
  duration: 3.0,
  color: { r: 255, g: 255, b: 255 },
});
```

**Key Points:**

- Requires `-tools` flag: `cs2.exe -tools +map your_map`
- Without `-tools`, these methods do nothing (no errors)
- `duration` is in seconds (omit or use 0 for one frame)
- Colors use RGB values 0-255

---

## Hot Reload State Preservation

Preserve state across hot reloads in `-tools` mode.

```typescript
interface State {
  scores: Record<number, number>;
  round: number;
  customData: any;
}

let state: State = {
  scores: {},
  round: 0,
  customData: null,
};

Instance.OnScriptReload<State>(({ before, after }) => {
  before(() => {
    // Clear think loops FIRST
    Instance.SetNextThink(-1);

    // Return state to preserve
    return state;
  });

  after((memory) => {
    // Restore state after reload
    if (memory) {
      state = memory;
      Instance.Msg(`State restored: Round ${state.round}`);
    }
  });
});
```

**Key Points:**

- `before` callback runs before reload - return data to preserve
- `after` callback receives the preserved data
- **Always** call `SetNextThink(-1)` in `before` to clear think loops
- Entity references won't survive - store entity names instead

---

## Damage System

Work with the damage system using damage types and flags.

```typescript
// Modify damage before it's applied
Instance.OnBeforePlayerDamage(({ player, damage, damageTypes, damageFlags, attacker, weapon }) => {
  // Check for headshot using bitwise AND
  if (damageTypes & CSDamageTypes.HEADSHOT) {
    return { damage: damage * 2 }; // Double headshot damage
  }

  // Prevent low-health players from dying
  if (player.GetHealth() <= 10) {
    return {
      damage: 0,
      damageFlags: CSDamageFlags.PREVENT_DEATH,
    };
  }

  // Abort the damage entirely
  if (someCondition) {
    return { abort: true };
  }
});

// React to damage after it's applied
Instance.OnPlayerDamage(({ player, damage, damageTypes, damageFlags, attacker, weapon }) => {
  if (damageTypes & CSDamageTypes.FALL) {
    Instance.Msg(`${player.GetPlayerName()} took ${damage} fall damage`);
  }
});

// Apply custom damage to entities
entity.TakeDamage({
  damage: 50,
  damageTypes: CSDamageTypes.BULLET | CSDamageTypes.HEADSHOT,
  damageFlags: CSDamageFlags.NONE,
  attacker: player,
  inflictor: weapon,
});
```

**Key Points:**

- Damage types are bit flags - use `|` to combine, `&` to check
- `OnBeforePlayerDamage` can modify or abort damage
- `OnPlayerDamage` is informational only (damage already applied)
- Common types: GENERIC, BULLET, SLASH, BURN, BLAST, FALL, HEADSHOT

---

## Hitbox Tracing

Trace against player hitboxes for precise hit detection.

```typescript
// Standard line trace
const trace = Instance.TraceLine({
  start: eyePos,
  end: farPos,
  ignoreEntity: shooter, // Can be Entity or Entity[]
  ignorePlayers: false,
});

if (trace.didHit && trace.hitEntity) {
  Instance.Msg(`Hit entity at ${trace.end}`);
}

// Hitbox trace (more precise)
const hitboxTrace = Instance.TraceLine({
  start: eyePos,
  end: farPos,
  ignoreEntity: [shooter, weapon], // Array of entities to ignore
  traceHitboxes: true, // Trace against hitboxes
});

if (hitboxTrace.didHit && hitboxTrace.hitGroup) {
  if (hitboxTrace.hitGroup === CSHitGroup.HEAD) {
    Instance.Msg("Headshot!");
  } else if (hitboxTrace.hitGroup === CSHitGroup.CHEST) {
    Instance.Msg("Chest shot!");
  }
}

// Bullet trace (includes penetration)
const bulletHits = Instance.TraceBullet({
  start: eyePos,
  end: farPos,
  shooter: pawn,
  damage: 30,
  rangeModifier: 0.85,
  penetration: 1,
});

bulletHits.forEach((hit) => {
  Instance.Msg(`Hit group: ${hit.hitGroup}, Damage: ${hit.damage}`);
});
```

**Key Points:**

- `TraceLine`, `TraceSphere`, `TraceBox` support hitbox tracing
- Set `traceHitboxes: true` to trace against player hitboxes
- `hitGroup` is only present when tracing hitboxes
- `ignoreEntity` accepts single entity or array (0-2 entities is fast, 3+ is slower)
- `TraceBullet` returns array and always includes `hitGroup`

---

## Enum Usage

Enums can be imported and used like TypeScript enums.

```typescript
import { CSRoundEndReason, CSWeaponAttackType, CSHitGroup, CSDamageTypes, CSDamageFlags } from "cs_script/point_script";

// Check round end reason
Instance.OnRoundEnd(({ winningTeam, reason }) => {
  if (reason === CSRoundEndReason.TARGET_BOMBED) {
    Instance.Msg("Bomb exploded!");
  } else if (reason === CSRoundEndReason.BOMB_DEFUSED) {
    Instance.Msg("Bomb defused!");
  }
});

// Check knife attack type
Instance.OnKnifeAttack(({ weapon, attackType }) => {
  if (attackType === CSWeaponAttackType.PRIMARY) {
    Instance.Msg("Slash attack!");
  } else if (attackType === CSWeaponAttackType.SECONDARY) {
    Instance.Msg("Stab attack!");
  }
});

// Enum reverse mapping works
Instance.Msg(CSHitGroup[CSHitGroup.HEAD]); // "HEAD"
```

**Key Points:**

- All enums are importable from `cs_script/point_script`
- Use them for type-safe comparisons
- Reverse mapping works: `CSHitGroup[1]` returns `"HEAD"`

---

## Additional Resources

- **API Reference**: `dev/src/types/cs_script.d.ts` (source of truth)
- **API Changelog**: `dev/docs/API_CHANGELOG.md` (historical changes)
- **Official Updates**: https://www.counter-strike.net/news/updates
