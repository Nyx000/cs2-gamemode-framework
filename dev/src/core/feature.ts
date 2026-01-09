/**
 * Generic Feature Interface
 *
 * All features in the gamemode framework must implement this interface.
 * This provides a consistent contract for the orchestrator to manage feature lifecycle,
 * event handling, and hot reload state preservation.
 *
 * Usage:
 *   export function createMyFeature(instance: typeof Instance): Feature {
 *     return {
 *       init() { ... },
 *       cleanup() { ... },
 *       // ... implement other methods
 *     };
 *   }
 */

import { CSPlayerController, Domain } from "cs_script/point_script";

/**
 * Represents serializable feature state for hot reload preservation.
 * Each feature defines its own state shape - this base type ensures it's always an object.
 * Features should define their own specific state interfaces that extend this.
 */
export type FeatureState = object;

/**
 * Base Feature interface that all features must implement.
 * Generic TState allows features to define their own typed state for hot reload.
 */
export interface Feature<TState extends FeatureState = FeatureState> {
  /**
   * Initialize the feature
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
   * Think loop update
   * Called periodically by the orchestrator's main think loop
   * Features should implement their own internal timing as needed
   */
  onThink?(): void;

  /**
   * Handle hot reload completion (DEVELOPMENT ONLY)
   * Called after all features have been restored and initialized
   *
   * Use this to reinitialize per-player resources that depend on entity references:
   * - Preview entities (entity references don't survive hot reload)
   * - Held/grabbed entities (need to be refetched or released)
   * - Any other runtime state tied to specific entities
   *
   * Note: onPlayerActivate is NOT called for existing players after hot reload.
   * This hook allows features to reinitialize state for already-connected players.
   */
  onHotReloadComplete?(): void;
}

/**
 * Feature factory function type
 * All feature create functions must match this signature
 */
export type FeatureFactory = (instance: Domain) => Feature;

/**
 * Feature metadata for registration
 */
export interface FeatureDescriptor {
  /** Unique name for this feature */
  name: string;
  /** Factory function to create the feature instance */
  create: FeatureFactory;
}
