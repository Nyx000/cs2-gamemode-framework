# CS2 Scripting API Changelog

All notable changes to the Counter-Strike 2 `cs_script` / `point_script` API are documented here.

**Format**: Based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
**Versioning**: CS2 Workshop Tools versions when available, otherwise by date  
**Order**: Reverse chronological (newest first)  
**Source**: https://www.counter-strike.net/news/updates

---

## [2025-10-14] - Official Release: Enum Exports & Damage System

> **Build**: CS2 Official Update  
> **Source**: https://www.counter-strike.net/news (Tue, October 14, 2025)  
> **Note**: This is the official release of features from the 2025-10-13 pre-release (RC1)

### Added

- **Enum Import System** - cs_script enums can now be imported and behave the same as TypeScript enums
  - **Impact**: All enums are now `export enum` and can be imported/used in scripts with full TypeScript enum features
  - **Example**:

  ```typescript
  import { CSWeaponType } from "cs_script/point_script";

  CSWeaponType.PISTOL == 1; // ✅ Enum value access
  CSWeaponType[1] == "PISTOL"; // ✅ Reverse mapping works
  ```

- **New Enums**
  - `CSRoundEndReason` - Enum for round end reasons (TARGET_BOMBED, TARGET_SAVED, BOMB_DEFUSED, etc.)
  - `CSWeaponAttackType` - Enum for weapon attack types (PRIMARY, SECONDARY)
  - `CSHitGroup` - Enum for hit groups (HEAD, CHEST, STOMACH, LEFTARM, RIGHTARM, LEFTLEG, RIGHTLEG, NECK, GENERIC)
  - `CSLoadoutSlot` - Enum for weapon loadout slots (MELEE, SECONDARY0-4, SMG0-4, RIFLE0-4, EQUIPMENT2)
  - `CSDamageTypes` - Bit flags for damage types (GENERIC, CRUSH, BULLET, SLASH, BURN, BLAST, BUCKSHOT, HEADSHOT, etc.)
  - `CSDamageFlags` - Bit flags for damage behavior (SUPPRESS_HEALTH_CHANGES, PREVENT_DEATH, FORCE_DEATH, etc.)

- **New Enum Values**
  - `CSGearSlot.BOOSTS = 5` - Gear slot for healthshots

- **New Methods**
  - `CSWeaponData.GetGearSlot()` - Returns the gear slot for a weapon

### Changed

- **Instance.OnRoundEnd** - Now receives `reason` parameter (CSRoundEndReason enum)
  - **Impact**: Scripts can now detect why a round ended

- **Instance.OnBeforePlayerDamage** - Now receives `damageTypes` and `damageFlags`, can modify them in return value
  - **Impact**: Scripts can inspect and modify damage types and behavior flags

- **Instance.OnPlayerDamage** - Now receives `damageTypes` and `damageFlags`
  - **Impact**: Scripts can inspect what type of damage was dealt

- **Instance.OnKnifeAttack** - Now receives `attackType` parameter (CSWeaponAttackType enum)
  - **Impact**: Scripts can distinguish between primary (slash) and secondary (stab) attacks

- **Trace Methods** - `TraceLine`, `TraceSphere`, `TraceBox` updated with advanced configuration
  - **Changes**:
    - Config now accepts `ignoreEntity` as `Entity | Entity[]` (array of entities)
    - Config can specify `traceHitboxes: boolean` to trace against player hitboxes
    - Result includes `hitGroup?: CSHitGroup` when tracing against hitboxes
  - **Impact**: Better hit detection and ability to ignore multiple entities

- **Instance.TraceBullet** - Result now includes `hitGroup` (CSHitGroup enum)
  - **Impact**: Scripts can now detect which body part was hit by bullets

- **Entity.TakeDamage** - Now accepts `damageTypes` and `damageFlags` parameters
  - **Impact**: Scripts can specify detailed damage behavior when applying damage

### Notes

- This is the official stable release of the enum system and damage API overhaul
- All features from the 2025-10-13 pre-release (RC1) are now in the stable build
- **Engine Improvements**: Reworked bullet penetration simulation reduces CPU usage
- **Gameplay Changes**: Defusing C4 now affects weapon handling (lowers viewmodel, prevents scoping, 150ms fire delay)
- **Migration**: See 2025-10-13 entry for detailed migration examples and patterns
- **Testing**: Recommended to test enum imports, damage type/flag handling, and hitbox traces
- **Performance**: Ignoring 0-2 entities in traces is fast, 3+ is slower

---

## [2025-10-13] - Major Enum Export & Damage System Update

> **Build**: CS2 Pre-Release Update (_1.41.1.3-rc1_)  
> **Source**: https://www.counter-strike.net/news (Mon, October 13, 2025)

### Added

- **Enum Imports** - cs_script enums can now be imported and behave the same as TypeScript enums
  - **Impact**: All enums are now `export enum` and can be imported/used in scripts
  - **Example**:

  ```typescript
  import { CSWeaponType, CSGearSlot } from "cs_script/point_script";

  CSWeaponType.PISTOL == 1; // ✅ Now works!
  CSWeaponType[1] == "PISTOL"; // ✅ Enum reverse mapping works!
  ```

- **New Enums**
  - `CSRoundEndReason` - Enum for round end reasons (TARGET_BOMBED, TARGET_SAVED, BOMB_DEFUSED, etc.)
  - `CSWeaponAttackType` - Enum for weapon attack types (PRIMARY, SECONDARY)
  - `CSHitGroup` - Enum for hit groups (HEAD, CHEST, STOMACH, LEFTARM, RIGHTARM, LEFTLEG, RIGHTLEG, NECK, GENERIC)
  - `CSLoadoutSlot` - Enum for weapon loadout slots (MELEE, SECONDARY0-4, SMG0-4, RIFLE0-4, EQUIPMENT2)
  - `CSDamageTypes` - Bit flags for damage types (GENERIC, CRUSH, BULLET, SLASH, BURN, BLAST, BUCKSHOT, HEADSHOT, etc.)
  - `CSDamageFlags` - Bit flags for damage behavior (SUPPRESS_HEALTH_CHANGES, PREVENT_DEATH, FORCE_DEATH, etc.)

- **New Interfaces**
  - `BaseTraceConfig` - Shared configuration for trace methods
  - `BeforePlayerDamageEvent` - Event data for OnBeforePlayerDamage with damage types/flags
  - `BeforePlayerDamageModify` - Return type for modifying damage
  - `PlayerDamageEvent` - Event data for OnPlayerDamage with damage types/flags
  - `EntityDamage` - Configuration for Entity.TakeDamage()

- **New Methods**
  - `CSWeaponData.GetGearSlot()` - Returns the gear slot for a weapon

- **New Enum Values**
  - `CSGearSlot.BOOSTS = 5` - New gear slot for healthshots

### Changed

- **Instance.OnRoundEnd** - Now receives `reason` parameter
  - **Impact**: Scripts can now detect why a round ended
  - **Migration**:

  ```typescript
  // ❌ OLD:
  Instance.OnRoundEnd(({ winningTeam }) => {
    Instance.Msg(`Team ${winningTeam} won!`);
  });

  // ✅ NEW:
  Instance.OnRoundEnd(({ winningTeam, reason }) => {
    if (reason === CSRoundEndReason.TARGET_BOMBED) {
      Instance.Msg("Bomb exploded!");
    } else if (reason === CSRoundEndReason.BOMB_DEFUSED) {
      Instance.Msg("Bomb defused!");
    }
  });
  ```

- **Instance.OnBeforePlayerDamage** - Now receives `damageType` and `damageFlags`, can modify them
  - **Impact**: Scripts can now inspect and modify damage types and flags
  - **Breaking**: Return type changed from `BeforeDamageResult` to `BeforePlayerDamageModify | { abort: true } | void`
  - **Migration**:

  ```typescript
  // ❌ OLD:
  Instance.OnBeforePlayerDamage(({ player, damage, attacker, inflictor, weapon }) => {
    return { damage: damage * 2 }; // Double damage
  });

  // ✅ NEW:
  Instance.OnBeforePlayerDamage(({ player, damage, damageTypes, damageFlags, attacker, inflictor, weapon }) => {
    // Check damage type
    if (damageTypes & CSDamageTypes.HEADSHOT) {
      return { damage: damage * 3 }; // Triple headshot damage
    }
    // Modify damage flags
    if (player.GetHealth() <= 10) {
      return {
        damage: 0,
        damageFlags: CSDamageFlags.PREVENT_DEATH,
      };
    }
    return { damage: damage * 2 };
  });
  ```

- **Instance.OnPlayerDamage** - Now receives `damageType` and `damageFlags`
  - **Impact**: Scripts can now inspect what type of damage was dealt
  - **Migration**:

  ```typescript
  // ❌ OLD:
  Instance.OnPlayerDamage(({ player, damage, attacker, inflictor, weapon }) => {
    Instance.Msg(`${player.GetPlayerName()} took ${damage} damage`);
  });

  // ✅ NEW:
  Instance.OnPlayerDamage(({ player, damage, damageTypes, damageFlags, attacker, inflictor, weapon }) => {
    if (damageTypes & CSDamageTypes.FALL) {
      Instance.Msg(`${player.GetPlayerName()} took ${damage} fall damage`);
    } else if (damageTypes & CSDamageTypes.HEADSHOT) {
      Instance.Msg(`${player.GetPlayerName()} took ${damage} headshot damage`);
    }
  });
  ```

- **Instance.OnKnifeAttack** - Now receives `attackType` parameter
  - **Impact**: Scripts can distinguish between primary (slash) and secondary (stab) attacks
  - **Migration**:

  ```typescript
  // ❌ OLD:
  Instance.OnKnifeAttack(({ weapon }) => {
    Instance.Msg("Knife attack!");
  });

  // ✅ NEW:
  Instance.OnKnifeAttack(({ weapon, attackType }) => {
    if (attackType === CSWeaponAttackType.PRIMARY) {
      Instance.Msg("Knife slash!");
    } else if (attackType === CSWeaponAttackType.SECONDARY) {
      Instance.Msg("Knife stab!");
    }
  });
  ```

- **Trace Methods** - `TraceLine`, `TraceSphere`, `TraceBox` now support advanced configuration
  - **Impact**: Can now ignore multiple entities, trace against hitboxes, and get hit group information
  - **Changes**:
    - `ignoreEntity` now accepts `Entity | Entity[]` (array of 0-2 entities is fast, 3+ is slower)
    - Added `traceHitboxes: boolean` option to trace against player hitboxes instead of collision bounds
    - `TraceResult` now includes `hitGroup?: CSHitGroup` when tracing against hitboxes
  - **Migration**:

  ```typescript
  // ❌ OLD:
  const trace = Instance.TraceLine({
    start: eyePos,
    end: farPos,
    ignoreEntity: player,
    ignorePlayers: false,
  });

  // ✅ NEW - Ignore multiple entities:
  const trace = Instance.TraceLine({
    start: eyePos,
    end: farPos,
    ignoreEntity: [player, weapon], // Array of entities
    ignorePlayers: false,
  });

  // ✅ NEW - Trace against hitboxes:
  const trace = Instance.TraceLine({
    start: eyePos,
    end: farPos,
    traceHitboxes: true, // Trace against player hitboxes
  });

  if (trace.didHit && trace.hitGroup === CSHitGroup.HEAD) {
    Instance.Msg("Headshot!");
  }
  ```

- **Instance.TraceBullet** - Result now includes `hitGroup`
  - **Impact**: Scripts can now detect which body part was hit by bullets
  - **Example**:

  ```typescript
  const hits = Instance.TraceBullet({
    start: eyePos,
    end: farPos,
    shooter: pawn,
    damage: 30,
    rangeModifier: 0.85,
    penetration: 1,
  });

  hits.forEach((hit) => {
    if (hit.hitGroup === CSHitGroup.HEAD) {
      Instance.Msg(`Headshot! Damage: ${hit.damage}`);
    }
  });
  ```

- **Entity.TakeDamage** - Now accepts `damageTypes` and `damageFlags`
  - **Impact**: Scripts can now specify how damage should be applied
  - **Migration**:

  ```typescript
  // ❌ OLD:
  entity.TakeDamage({
    damage: 50,
    attacker: player,
    inflictor: player,
  });

  // ✅ NEW:
  entity.TakeDamage({
    damage: 50,
    damageTypes: CSDamageTypes.BULLET | CSDamageTypes.HEADSHOT,
    damageFlags: CSDamageFlags.NONE,
    attacker: player,
    inflictor: player,
  });

  // Force kill with fire damage:
  entity.TakeDamage({
    damage: 100,
    damageTypes: CSDamageTypes.BURN,
    damageFlags: CSDamageFlags.FORCE_DEATH,
  });
  ```

- **CSWeaponType Enum** - Enum values changed to start at 0 (removed explicit numbering)
  - **Impact**: KNIFE is now 0 instead of explicitly 0, values remain the same
  - **Note**: No migration needed, values are identical

- **CSPlayerController.GetWeaponDataForLoadoutSlot** - Now uses `CSLoadoutSlot` enum instead of number
  - **Impact**: Better type safety for loadout slot queries
  - **Migration**:

  ```typescript
  // ❌ OLD:
  const weaponData = controller.GetWeaponDataForLoadoutSlot(1);

  // ✅ NEW:
  const weaponData = controller.GetWeaponDataForLoadoutSlot(CSLoadoutSlot.MELEE);
  ```

### Fixed

- **Type Definitions** - Corrected documentation comments in OnPlayerDamage (inline docs moved to interface)

### Notes

- **Enum Import Feature**: This is a major improvement for TypeScript development - enums are now first-class citizens
  that can be imported and used like regular TypeScript enums
- **Damage System Overhaul**: The damage system is now much more flexible with type flags and control flags
- **Hitbox Tracing**: New hitbox tracing enables precise hit detection for custom game modes
- **Testing**: Test enum imports, damage modifications, and hitbox traces thoroughly
- **Performance**: Ignoring 0-2 entities in traces is fast, 3+ entities is slower - optimize accordingly
- **Migration Priority**: HIGH - Update damage event handlers and trace calls if using these APIs

---

## [2025-10-03] - Bugfix Release

### Fixed

- **Instance.OnPlayerPing** - Fixed not sending position parameter
  - **Impact**: `OnPlayerPing` callbacks now correctly receive position data
  - **Affected**: Code using `OnPlayerPing` now works as intended

---

## [2025-10-02] - Hot Reload & Weapon Event Fixes

### Fixed

- **Script Reload Callbacks** - Fixed bug where old callbacks could be invoked after a script reload
  - **Impact**: Prevents stale event handlers from firing after hot reload
  - **Stability**: Significant improvement to `-tools` mode development
- **Script Reload Duplicates** - Fixed bug where new callbacks could be invoked multiple times after a script reload
  - **Impact**: Event handlers now register correctly on reload
  - **Stability**: Eliminates duplicate event firing
- **Instance.IsFreezePeriod** - Fixed missing implementation
  - **Impact**: Method now available and functional
  - **Previous Status**: Was declared in types but not implemented
- **Weapon Event Handlers** - Fixed `Instance.OnGunReload` and `Instance.OnGunFire` not working for XM1014, Nova, and
  Sawed-Off
  - **Impact**: Shotgun events now fire correctly
  - **Affected Weapons**: XM1014, Nova, Sawed-Off

### Notes

- **Stability**: This update significantly improves hot reload reliability
- **Development**: Much better experience with `cs2.exe -tools` mode

---

## [2025-10-01] - Major API Overhaul ⚠️ BREAKING CHANGES

> **⚠️ CRITICAL UPDATE**: This is the largest API update since scripting was introduced. Multiple breaking changes
> require immediate code modifications.

### Changed - 🔴 BREAKING

- **All Event Callbacks** - Changed to accept a **single object parameter** with named properties instead of individual
  parameters
  - **Impact**: EVERY event handler in existing code will break
  - **Migration Required**: Update all `On*` event registrations immediately
  - **Affected**: All 19 event handlers

  ```typescript
  // ❌ OLD (NO LONGER WORKS):
  Instance.OnPlayerConnect((player: CSPlayerController) => {
    console.log(player.GetName());
  });
  Instance.OnPlayerKill((victim, weapon, attacker, inflictor) => {
    // ...
  });

  // ✅ NEW (REQUIRED):
  Instance.OnPlayerConnect(({ player }: { player: CSPlayerController }) => {
    console.log(player.GetName());
  });
  Instance.OnPlayerKill(({ victim, weapon, attacker, inflictor }) => {
    // ...
  });
  ```

- **Debug Methods** - Added overload that accepts a single object holding all parameters
  - **Status**: Old overload still works but new object-based overload recommended
  - **Methods**: `DebugScreenText`, `DebugLine`, `DebugBox`, `DebugSphere`

```typescript
// ✅ OLD STILL WORKS:
Instance.DebugLine(start, end, duration, color);

// ✅ NEW (RECOMMENDED):
Instance.DebugLine({ start, end, duration, color });
```

- **Entity Fire Methods** - Added overload that accepts a single object holding all parameters
  - **Status**: Old overload still works but new object-based overload recommended
  - **Methods**: `EntFireAtName`, `EntFireAtTarget`

  ```typescript
  // ✅ OLD STILL WORKS:
  Instance.EntFireAtName("target", "Enable", undefined, 2.0);

  // ✅ NEW (RECOMMENDED):
  Instance.EntFireAtName({ name: "target", input: "Enable", delay: 2.0 });
  ```

- **Entity.Teleport** - Added overload that accepts a single object holding all parameters
  - **Status**: Old overload still works but new object-based overload recommended

  ```typescript
  // ✅ OLD STILL WORKS:
  entity.Teleport(position, angles, velocity);

  // ✅ NEW (RECOMMENDED):
  entity.Teleport({ position, angles, velocity });
  ```

- **Color Values** - RGBA values now clamped to maximum of 255
  - **Impact**: Values > 255 will be clamped instead of wrapping
  - **Behavior**: More predictable color handling

### Added

- **Hot Reload API** - `Instance.OnScriptReload({ save, load })`
  - **Purpose**: Unified API for state preservation during hot reload
  - **Replaces**: `OnBeforeReload` and `OnReload` (now deprecated)

```typescript
Instance.OnScriptReload(({ save, load }) => {
  save(() => {
    // Clear think loops before reload
    Instance.SetNextThink(-1);
    // Return state to preserve
    return { scores, playerData, customState };
  });

  load((memory) => {
    if (memory) {
      scores = memory.scores;
      playerData = memory.playerData;
      customState = memory.customState;
    }
  });
});
```

- **Trace System** - Four new trace methods with better type safety
  - `Instance.TraceLine({ start, end, ignoreEnt?, interacts? })` - Line trace
  - `Instance.TraceSphere({ start, end, radius, ignoreEnt?, interacts? })` - Sphere trace
  - `Instance.TraceBox({ start, end, mins, maxs, ignoreEnt?, interacts? })` - Box trace
  - `Instance.TraceBullet({ start, end, ignoreEnt? })` - Bullet-specific trace
  - **Returns**: `TraceResult` with `{ didHit, end, normal, hitEnt?, fraction }`
  - **Performance**: Improved over deprecated `GetTraceHit`

- **Event Handlers** - Eight new gameplay events
  - `Instance.OnPlayerReset({ player })` - Player state reset
  - `Instance.OnBeforePlayerDamage({ player, damage, attacker?, inflictor? })` - Before damage applied (can modify)
  - `Instance.OnPlayerDamage({ player, damage, attacker?, inflictor? })` - After damage applied
  - `Instance.OnPlayerJump({ player })` - Player jumped
  - `Instance.OnPlayerLand({ player })` - Player landed
  - `Instance.OnGunReload({ weapon })` - Weapon reload started
  - `Instance.OnBulletImpact({ player, position })` - Bullet hit surface
  - `Instance.OnPlayerPing({ player, position })` - Player pinged location
  - `Instance.OnGrenadeBounce({ projectile })` - Grenade bounced
  - `Instance.OnKnifeAttack({ weapon })` - Knife attack performed

- **Game State Methods**
  - `Instance.IsFreezePeriod()` - Check if in freeze period

- **Entity Relationship Methods**
  - `Entity.GetOwner()` - Get entity owner
  - `Entity.SetOwner(owner: Entity)` - Set entity owner
  - `Entity.GetParent()` - Get parent entity
  - `Entity.SetParent(parent: Entity)` - Set parent entity
  - `Entity.IsAlive()` - Check if entity is alive
  - `Entity.IsWorld()` - Check if entity is world
  - `Entity.TakeDamage({ damage, attacker?, inflictor? })` - Apply damage to entity

- **Weapon Methods**
  - `CSPlayerPawn.DropWeapon(weapon: CSWeaponBase)` - Force player to drop weapon
  - `CSWeaponData.GetDamage()` - Get weapon base damage
  - `CSWeaponData.GetRange()` - Get weapon effective range
  - `CSWeaponData.GetRangeModifier()` - Get weapon range modifier
  - `CSWeaponData.GetPenetration()` - Get weapon penetration value

### Deprecated

- `Instance.GetTraceHit()` - Use new `TraceLine()`, `TraceSphere()`, `TraceBox()`, or `TraceBullet()` instead
  - **Reason**: New methods provide better type safety, performance, and flexibility
  - **Status**: Still functional but not recommended for new code
- `Instance.OnBeforeReload()` - Use `OnScriptReload({ save, load })` instead
  - **Reason**: Unified hot reload API with better state management
  - **Status**: May be removed in future update
- `Instance.OnReload()` - Use `OnScriptReload({ save, load })` instead
  - **Reason**: Unified hot reload API with better state management
  - **Status**: May be removed in future update

### Performance

- **Vector/QAngle/Color Handling** - Improved performance of handling these types as arguments and return values
  - **Impact**: Faster method calls involving geometric and color data
  - **Benchmark**: Noticeable improvement in tight loops

### Error Handling

- **Method Invocation** - Updated general error handling for methods
  - **Exception Thrown**: When method invoked with incorrect 'this' value
  - **Error Logged**: When method invoked with unsupported arguments
  - **Return Value**: Default value matching declared return type on error
  - **Impact**: Better debugging and more predictable behavior

### Migration Guide

1. **Update ALL event handlers** (most critical):

   ```typescript
   // Pattern: Add object destructuring to ALL event callbacks

   // Player Events
   OnPlayerConnect((player) => {})              → OnPlayerConnect(({ player }) => {})
   OnPlayerActivate((player) => {})             → OnPlayerActivate(({ player }) => {})
   OnPlayerDisconnect((playerSlot) => {})       → OnPlayerDisconnect(({ playerSlot }) => {})
   OnPlayerReset((player) => {})                → OnPlayerReset(({ player }) => {})
   OnPlayerKill((v, w, a, i) => {})            → OnPlayerKill(({ victim, weapon, attacker, inflictor }) => {})
   OnPlayerChat((speaker, team, text) => {})    → OnPlayerChat(({ speaker, team, text }) => {})

   // Weapon Events
   OnGunFire((weapon) => {})                    → OnGunFire(({ weapon }) => {})
   OnGunReload((weapon) => {})                  → OnGunReload(({ weapon }) => {})
   OnBulletImpact((player, pos) => {})         → OnBulletImpact(({ player, position }) => {})
   OnKnifeAttack((weapon) => {})                → OnKnifeAttack(({ weapon }) => {})

   // Grenade Events
   OnGrenadeThrow((weapon, projectile) => {})   → OnGrenadeThrow(({ weapon, projectile }) => {})
   OnGrenadeBounce((projectile) => {})          → OnGrenadeBounce(({ projectile }) => {})

   // Bomb Events
   OnBombPlant((c4, planter) => {})            → OnBombPlant(({ c4, planter }) => {})
   OnBombDefuse((c4, defuser) => {})           → OnBombDefuse(({ c4, defuser }) => {})

   // Round Events
   OnRoundStart(() => {})                       → OnRoundStart(({}) => {})
   OnRoundEnd((winningTeam) => {})             → OnRoundEnd(({ winningTeam }) => {})
   ```

2. **Migrate to OnScriptReload**:

   ```typescript
   // ❌ OLD:
   let state = {};
   Instance.OnBeforeReload(() => {
     Instance.SetNextThink(-1);
     return state;
   });
   Instance.OnReload((memory) => {
     if (memory) state = memory;
   });

   // ✅ NEW:
   let state = {};
   Instance.OnScriptReload(({ save, load }) => {
     save(() => {
       Instance.SetNextThink(-1);
       return state;
     });
     load((memory) => {
       if (memory) state = memory;
     });
   });
   ```

3. **Update trace calls** (optional but recommended):

   ```typescript
   // ❌ OLD (still works but deprecated):
   const result = Instance.GetTraceHit(start, end);

   // ✅ NEW (recommended):
   const result = Instance.TraceLine({ start, end });
   if (result.didHit) {
     const hitPos = result.end;
     const hitNormal = result.normal;
     const hitEntity = result.hitEnt;
   }
   ```

4. **Adopt object parameter style** (optional but recommended):

   ```typescript
   // Debug methods now support object parameters
   Instance.DebugLine({
     start: { x: 0, y: 0, z: 0 },
     end: { x: 100, y: 100, z: 100 },
     duration: 5.0,
     color: { r: 255, g: 0, b: 0 },
   });

   // Entity fire with named parameters
   Instance.EntFireAtName({
     name: "trigger_relay",
     input: "Enable",
     value: undefined,
     delay: 2.0,
   });
   ```

### Verification Checklist

After migration:

- [ ] All event handlers updated to object parameter destructuring
- [ ] Hot reload uses `OnScriptReload({ save, load })`
- [ ] Code compiles without TypeScript errors
- [ ] Tested in CS2 with `-tools` flag
- [ ] Verified hot reload preserves state correctly
- [ ] Tested all event handlers fire correctly
- [ ] No console errors during gameplay

### Notes

- **Breaking Change Severity**: HIGH - All scripts must be updated
- **Migration Time**: ~15-30 minutes for typical script
- **Benefits**: Better type safety, clearer API, improved performance
- **Support**: Old overloads maintained where possible for gradual migration

---

## [2025-09-24] - Early Feature Additions & Stability

### Added

- **Debug Visualization**
  - `Instance.DebugLine(start, end, duration, color)` - Draw debug line
  - `Instance.DebugBox(mins, maxs, duration, color)` - Draw debug box

- **Core Event Handlers** - First wave of specific event handlers
  - `Instance.OnPlayerConnect({ player })` - Player connected
  - `Instance.OnPlayerActivate({ player })` - Player spawned
  - `Instance.OnPlayerDisconnect({ playerSlot })` - Player disconnected
  - `Instance.OnRoundStart({})` - Round started
  - `Instance.OnRoundEnd({ winningTeam })` - Round ended
  - `Instance.OnBombPlant({ c4, planter })` - C4 planted
  - `Instance.OnBombDefuse({ c4, defuser })` - C4 defused
  - `Instance.OnPlayerKill({ victim, weapon, attacker, inflictor })` - Player killed
  - `Instance.OnPlayerChat({ speaker, team, text })` - Player sent chat
  - `Instance.OnGunFire({ weapon })` - Gun fired
  - `Instance.OnGrenadeThrow({ weapon, projectile })` - Grenade thrown

- **Entity Fire Enhancements**
  - `Instance.EntFireAtName(name, input, value, delay, caller?, activator?)` - Added caller/activator overload
  - `Instance.EntFireAtTarget(target, input, value, delay, caller?, activator?)` - Added caller/activator overload

- **Trace Improvements**
  - `Instance.GetTraceHit()` - Added normal vector to result

- **Entity Methods**
  - `Entity.GetGroundEntity()` - Get entity standing on
  - `CSWeaponBase.GetOwner()` - Get weapon owner
  - `CSPlayerController.GetName()` - Get player name (alternative to GetPlayerName)
  - `CSObserverPawn.GetOriginalPlayerController()` - Get original controller when observing
  - `CSPlayerPawn.GetOriginalPlayerController()` - Get original controller
  - `CSPlayerPawn.IsCrouching()` - Check if player is crouching
  - `CSPlayerPawn.IsCrouched()` - Check if player is fully crouched
  - `CSPlayerPawn.IsNoclipping()` - Check if player is in noclip mode

- **Example Content**
  - Added `train_zoo.vmap` with all de_train assets and examples for mapmakers

### Removed - 🔴 BREAKING

- **Instance.OnGameEvent** - Generic event handler removed
  - **Reason**: Replaced with specific typed event handlers for better type safety
  - **Migration**: Use specific handlers like `OnPlayerKill`, `OnRoundStart`, `OnBombPlant`, etc.
  - **Impact**: Code using `OnGameEvent` will no longer compile

```typescript
// ❌ OLD (NO LONGER WORKS):
Instance.OnGameEvent("player_death", (event) => {
  const userId = event.userid;
  const attackerId = event.attacker;
});

// ✅ NEW (REQUIRED):
Instance.OnPlayerKill(({ victim, attacker, weapon, inflictor }) => {
  // Direct access to typed entities
});
```

### Changed

- **point_script Entity Behavior**
  - No longer removes itself on failed script load during spawn
  - Remains in inactive state and listens for script changes in tools mode
  - **Impact**: Better development experience, easier debugging
- **point_script Hot Reload**
  - Fixed: No longer crashes after unsuccessful reload from invalid script in tools mode
  - Changed: Holds onto memory value from `OnBeforeReload` until next successful reload
  - **Impact**: State preserved even through failed reloads

- **String Argument Handling** - Methods expecting string arguments now error instead of calling `toString`
  - **Impact**: Stricter type checking, prevents bugs from implicit conversion
  - **Breaking**: Code passing non-string values will now error

- **Msg and DebugScreenText** - Now accept any type for text value
  - **Impact**: More flexible logging, no manual `toString()` needed

### Fixed

- **RunScriptInput** - Fixed crash when triggered with null caller or activator
  - **Impact**: Hammer I/O more stable

### Development

- **tsconfig.json** - Updated in script_zoo, setting target to "es2022"
  - **Impact**: More accurate type analysis in TypeScript

---

## [2025-09-17] - Type Fixes & Asset Support

### Added

- **Asset Type Support**
  - Added `javascript` to the list of asset types
  - **Impact**: `.js` files now properly recognized in asset system

### Fixed

- **Entity.Teleport** - Fixed type declaration for `newAngles` parameter
  - **Impact**: Correct TypeScript types for teleport method
- **Instance.GetTraceHit** - Fixed crash when config parameter was not specified
  - **Impact**: Method now works correctly with default parameters

---

## How to Use This Changelog

### For Developers

1. **Check date of last CS2 update** against this changelog
2. **Review breaking changes** marked with 🔴 before updating CS2
3. **Follow migration guides** for major version changes
4. **Test your scripts** after CS2 updates in `-tools` mode
5. **Cross-reference** with `dev/src/types/cs_script.d.ts` for exact signatures

### For Maintainers

When CS2 updates:

1. **Monitor Official Sources**:
   - https://www.counter-strike.net/news/updates
   - Check "[MAP SCRIPTING]" sections
   - Note date and all changes

2. **Compare Type Definitions**:

   ```bash
   cd dev
   bun run sync-types  # Get latest from CS2 install
   git diff src/types/cs_script.d.ts  # See what changed
   ```

3. **Document Changes Using This Format**:

   ```markdown
   ## [YYYY-MM-DD] - Update Title

   ### Added

   - New feature with description and example

   ### Changed

   - Modified feature with before/after examples

   ### Deprecated

   - Old feature with replacement recommendation

   ### Removed

   - Deleted feature with migration path

   ### Fixed

   - Bug fix with impact description

   ### Security

   - Security-related update
   ```

4. **Update Related Files**:
   - [ ] `dev/docs/LAST_API_CHECK.md` - Update timestamp
   - [ ] `.cursor/rules/cs2-dev.mdc` - Update API reference if needed
   - [ ] `dev/src/scripts/` - Fix example scripts

5. **Test Changes**:

   ```bash
   cd dev
   bun run build
   bun run deploy
   # Test in CS2 with: cs2.exe -tools +map your_map
   ```

---

## Version History Summary

| Date       | Type             | Description                                                          | Breaking   |
| ---------- | ---------------- | -------------------------------------------------------------------- | ---------- |
| 2025-10-14 | Official Release | Enum exports, damage types/flags, hitbox traces (official stable)    | No\*       |
| 2025-10-13 | Major Update     | ⚠️ Enum exports, damage types/flags, hitbox traces (pre-release RC1) | Partial ⚠️ |
| 2025-10-03 | Bugfix           | Fixed OnPlayerPing position parameter                                | No         |
| 2025-10-02 | Bugfix           | Hot reload fixes, IsFreezePeriod implementation, shotgun events      | No         |
| 2025-10-01 | Major Update     | ⚠️ Event parameter overhaul, trace system, 10 new events, damage API | Yes ⚠️     |
| 2025-09-24 | Feature Addition | Removed OnGameEvent, added 11 event handlers, debug methods          | Yes ⚠️     |
| 2025-09-17 | Bugfix           | Asset type support, type fixes, crash fixes                          | No         |

\*Same features as 2025-10-13, now in stable release

---

## Resources

- **Official Updates**: https://www.counter-strike.net/news/updates
- **Valve Developer Wiki**: https://developer.valvesoftware.com/wiki/Counter-Strike_2_Workshop_Tools/Scripting_API
- **Type Definitions** (Source of Truth): `dev/src/types/cs_script.d.ts`
- **Workspace Rules**: `.cursor/rules/cs2-dev.mdc`
- **Last API Check**: `dev/docs/LAST_API_CHECK.md`
- **Update Protocol**: `dev/docs/API_UPDATE_PROTOCOL.md`

---

_This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format and is based on official CS2 update
notes._
