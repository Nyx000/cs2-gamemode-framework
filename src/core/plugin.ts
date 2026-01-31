/**
 * Plugin Interface
 *
 * All plugins in the gamemode framework must implement this interface.
 * This provides a consistent contract for the orchestrator to manage plugin lifecycle,
 * event handling, and hot reload state preservation.
 *
 * Usage:
 *   export function createMyPlugin(instance: typeof Instance): Plugin {
 *     return {
 *       init() { ... },
 *       cleanup() { ... },
 *       // ... implement other methods
 *     };
 *   }
 *
 * NOTE ON ASYNC: CS2's V8 scripting environment does NOT support async/await or Promises.
 * All code runs synchronously. Do not attempt to use async patterns - they will fail silently
 * or cause undefined behavior. Use think loops for deferred/timed operations instead.
 */

import type {
  CSPlayerController,
  CSPlayerPawn,
  CSRoundEndReason,
  CSWeaponAttackType,
  CSWeaponBase,
  BeforePlayerDamageEvent,
  BeforePlayerDamageModify,
  PlayerDamageEvent,
  Entity,
  Vector,
  Domain,
} from "cs_script/point_script";
import type { EventBus } from "./event-bus";

/**
 * Represents serializable plugin state for hot reload preservation.
 * Each plugin defines its own state shape - this base type ensures it's always an object.
 * Plugins should define their own specific state interfaces that extend this.
 */
export type PluginState = object;

/**
 * Base Plugin interface that all plugins must implement.
 * Generic TState allows plugins to define their own typed state for hot reload.
 */
export interface Plugin<TState extends PluginState = PluginState> {
  /**
   * Initialize the plugin
   * Called once when the gamemode starts or after hot reload
   * Register event handlers, initialize state, etc.
   */
  init(): void;

  /**
   * Cleanup before hot reload (DEVELOPMENT ONLY)
   * Called before hot reload to stop think loops and prepare for state save
   * Note: This is NOT called in production - it's a development-only feature
   */
  cleanup(): void;

  /**
   * Get current state for hot reload preservation (DEVELOPMENT ONLY)
   * Return any data that should survive a hot reload
   * Note: Entity references don't survive - store entity names as strings
   */
  getState(): TState;

  /**
   * Restore state after hot reload (DEVELOPMENT ONLY)
   * Called after hot reload with the state returned from getState()
   */
  restoreState(state: TState): void;

  /**
   * Handle player connection event
   * Called when a player connects to the server
   * @param player - The player controller that connected
   */
  onPlayerConnect?(player: CSPlayerController): void;

  /**
   * Handle player activation event
   * Called when a player fully joins and spawns
   * @param player - The player controller that activated
   */
  onPlayerActivate?(player: CSPlayerController): void;

  /**
   * Handle player disconnection event
   * Called when a player disconnects from the server
   * @param playerSlot - The slot number of the player who disconnected
   */
  onPlayerDisconnect?(playerSlot: number): void;

  /**
   * Handle gun reload event
   * Called when a player reloads their weapon
   * @param weaponClassName - The class name of the weapon (e.g., "weapon_ak47")
   * @param ownerSlot - The player slot who owns the weapon
   */
  onGunReload?(weaponClassName: string, ownerSlot: number): void;

  /**
   * Handle round start event
   * Called when a new round begins
   */
  onRoundStart?(): void;

  /**
   * Handle round end event
   * Called when a round ends
   * @param winningTeam - The team number that won
   * @param reason - The reason the round ended (CSRoundEndReason enum)
   */
  onRoundEnd?(winningTeam: number, reason: CSRoundEndReason): void;

  /**
   * Handle player reset event
   * Called when a player respawns, changes team, or is placed back at spawn due to round restart
   * @param player - The player pawn that was reset
   */
  onPlayerReset?(player: CSPlayerPawn): void;

  /**
   * Handle bomb plant event
   * Called when a player plants the C4
   * @param plantedC4 - The planted C4 entity
   * @param planter - The player pawn who planted it
   */
  onBombPlant?(plantedC4: Entity, planter: CSPlayerPawn): void;

  /**
   * Handle bomb defuse event
   * Called when a player defuses the C4
   * @param plantedC4 - The planted C4 entity
   * @param defuser - The player pawn who defused it
   */
  onBombDefuse?(plantedC4: Entity, defuser: CSPlayerPawn): void;

  /**
   * Handle before player damage event
   * Called BEFORE damage is applied - can modify or cancel damage
   * @param event - The damage event with all details
   * @returns Optionally return { damage: N } to modify damage, { abort: true } to cancel, or void
   *
   * IMPORTANT: If multiple plugins return modifications, only the FIRST non-void return is used.
   * Plugins with higher priority (lower number) are checked first.
   */
  onBeforePlayerDamage?(
    event: BeforePlayerDamageEvent
  ): BeforePlayerDamageModify | { abort: true } | void;

  /**
   * Handle player damage event
   * Called AFTER damage has been applied
   * @param event - The damage event with final damage values
   */
  onPlayerDamage?(event: PlayerDamageEvent): void;

  /**
   * Handle player kill event
   * Called when a player dies
   * @param player - The player pawn that died
   * @param inflictor - The entity that applied the damage (optional)
   * @param attacker - The entity credited with the kill (optional)
   * @param weapon - The weapon used (optional)
   */
  onPlayerKill?(
    player: CSPlayerPawn,
    inflictor?: Entity,
    attacker?: Entity,
    weapon?: CSWeaponBase
  ): void;

  /**
   * Handle player jump event
   * Called when a player jumps off the ground
   * @param player - The player pawn that jumped
   */
  onPlayerJump?(player: CSPlayerPawn): void;

  /**
   * Handle player land event
   * Called when a player hits the ground while falling
   * @param player - The player pawn that landed
   */
  onPlayerLand?(player: CSPlayerPawn): void;

  /**
   * Handle player chat event
   * Called when a player sends a chat message
   * @param player - The player controller who sent the message (may be undefined)
   * @param text - The chat message text
   * @param team - The team number (matches player's team if team chat)
   */
  onPlayerChat?(player: CSPlayerController | undefined, text: string, team: number): void;

  /**
   * Handle player ping event
   * Called when a player pings a location
   * @param player - The player controller who pinged
   * @param position - The world position that was pinged
   */
  onPlayerPing?(player: CSPlayerController, position: Vector): void;

  /**
   * Handle gun fire event
   * Called when a gun fires bullets (shotguns trigger once for all pellets)
   * @param weapon - The weapon that fired
   * @param ownerSlot - The player slot of the weapon owner
   */
  onGunFire?(weapon: CSWeaponBase, ownerSlot: number): void;

  /**
   * Handle bullet impact event
   * Called when a bullet hits a surface (triggers for each impact, including penetrations)
   * @param weapon - The weapon that fired the bullet
   * @param position - The world position of the impact
   */
  onBulletImpact?(weapon: CSWeaponBase, position: Vector): void;

  /**
   * Handle grenade throw event
   * Called when a grenade is thrown
   * @param weapon - The grenade weapon
   * @param projectile - The newly created grenade projectile entity
   */
  onGrenadeThrow?(weapon: CSWeaponBase, projectile: Entity): void;

  /**
   * Handle grenade bounce event
   * Called when a grenade bounces off a surface
   * @param projectile - The grenade projectile entity
   * @param bounces - The number of bounces so far
   */
  onGrenadeBounce?(projectile: Entity, bounces: number): void;

  /**
   * Handle knife attack event
   * Called when a knife attacks (even if it misses)
   * @param weapon - The knife weapon
   * @param attackType - PRIMARY (left click) or SECONDARY (right click)
   */
  onKnifeAttack?(weapon: CSWeaponBase, attackType: CSWeaponAttackType): void;

  /**
   * Think loop update
   * Called periodically by the orchestrator's main think loop
   * Plugins should implement their own internal timing as needed
   */
  onThink?(): void;

  /**
   * Handle hot reload completion (DEVELOPMENT ONLY)
   * Called after all plugins have been restored and initialized
   *
   * Use this to reinitialize per-player resources that depend on entity references:
   * - Preview entities (entity references don't survive hot reload)
   * - Held/grabbed entities (need to be refetched or released)
   * - Any other runtime state tied to specific entities
   *
   * Note: onPlayerActivate is NOT called for existing players after hot reload.
   * This hook allows plugins to reinitialize state for already-connected players.
   */
  onHotReloadComplete?(): void;
}

/**
 * Context object passed to plugin factory functions
 * Contains everything a plugin needs to interact with the game and other plugins
 */
export interface PluginContext {
  /** The CS2 scripting instance (point_script Domain) */
  instance: Domain;
  /**
   * Event bus for inter-plugin communication
   * Use this to publish/subscribe to custom events between plugins
   *
   * IMPORTANT: Event subscriptions are cleared on hot reload.
   * Re-subscribe to events in your plugin's init() method.
   */
  eventBus: EventBus;
}

/**
 * Plugin factory function type
 * All plugin create functions must match this signature
 *
 * @example
 * export function createMyPlugin({ instance, eventBus }: PluginContext): Plugin {
 *   return {
 *     init() {
 *       eventBus.on("some-event", (data) => { ... });
 *     },
 *     // ... other methods
 *   };
 * }
 */
export type PluginFactory = (context: PluginContext) => Plugin;

/**
 * Plugin metadata for registration
 */
export interface PluginDescriptor {
  /** Unique name for this plugin */
  name: string;
  /** Factory function to create the plugin instance */
  create: PluginFactory;
  /**
   * Priority for event handling order (lower numbers = higher priority)
   * Default is 100. Use lower numbers (0-99) for plugins that need to run first,
   * higher numbers (101+) for plugins that should run after others.
   *
   * Priority affects:
   * - Order of init() calls
   * - Order of event dispatch (e.g., onPlayerConnect)
   * - Order of onThink() calls
   * - CRITICAL for onBeforePlayerDamage: first non-void return wins
   */
  priority?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Backwards Compatibility Aliases (deprecated - use Plugin* names instead)
// ═══════════════════════════════════════════════════════════════════════════

/** @deprecated Use Plugin instead */
export type Feature<TState extends PluginState = PluginState> = Plugin<TState>;
/** @deprecated Use PluginState instead */
export type FeatureState = PluginState;
/** @deprecated Use PluginContext instead */
export type FeatureContext = PluginContext;
/** @deprecated Use PluginFactory instead */
export type FeatureFactory = PluginFactory;
/** @deprecated Use PluginDescriptor instead */
export type FeatureDescriptor = PluginDescriptor;
