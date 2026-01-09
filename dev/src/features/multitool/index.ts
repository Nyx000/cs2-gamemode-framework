/**
 * Multitool Feature - Public API
 *
 * This module exports a clean interface for the multitool prop placement system.
 * It can be imported into any gamemode script to add multitool functionality.
 *
 * Usage:
 *   import { createMultitool } from "../features/multitool";
 *
 *   const multitool = createMultitool(Instance);
 *   multitool.init();
 */

import { CSPlayerController, Instance as PointScriptInstance } from "cs_script/point_script";
import { setupChatHandlers } from "./chat-commands";
import { checkAllPropHealth, setupDamageTracking } from "./damage-handler";
import { ensureHumanPlayersHaveZeus, giveZeusToPlayer, setupTaserDamageBlocking } from "./player-equipment";
import {
  clearStaleEntityNames,
  cycleMode,
  getPlayerState,
  getSerializableState as getPlayerStateData,
  initPlayerState,
  removePlayerState,
  restoreState as restorePlayerState,
} from "./player-state";
import {
  createPreviewForPlayer,
  hidePreview,
  removePreviewForPlayer,
  showPreview,
  updatePreviewPosition,
} from "./preview-manager";
import {
  cleanupInvalidProps,
  getSerializableState as getPropData,
  removeAllPlayerProps,
  restoreState as restorePropState,
  updateHeldPropPosition,
} from "./prop-manager";
import { MultitoolMode, MultitoolState } from "./types";
import { performRaycast, setupWeaponHandlers } from "./weapon-handler";

/**
 * Public API for the Multitool feature
 */
export interface MultitoolFeature {
  /**
   * Initialize the multitool system
   * Registers all event handlers and starts the think loop
   */
  init(): void;

  /**
   * Cleanup before hot reload
   * Stops think loops and prepares for state preservation
   */
  cleanup(): void;

  /**
   * Get current state for hot reload preservation
   */
  getState(): MultitoolState;

  /**
   * Restore state after hot reload
   */
  restoreState(state: MultitoolState): void;

  /**
   * Handle player connection
   */
  onPlayerConnect(player: CSPlayerController): void;

  /**
   * Handle player activation
   */
  onPlayerActivate(player: CSPlayerController): void;

  /**
   * Handle player disconnection
   */
  onPlayerDisconnect(playerSlot: number): void;

  /**
   * Handle round start event
   */
  onRoundStart(): void;

  /**
   * Handle reload button press for mode cycling
   */
  onGunReload(weaponClassName: string, ownerSlot: number): void;

  /**
   * Think loop update (called every tick by orchestrator)
   * Handles all periodic tasks with internal timing
   */
  onThink(): void;

  /**
   * Handle hot reload completion
   * Reinitializes per-player resources (previews) after hot reload
   */
  onHotReloadComplete(): void;
}

/**
 * Create a new multitool feature instance
 *
 * @param instance - The PointScript Instance object
 * @returns MultitoolFeature interface
 */
export function createMultitool(instance: typeof PointScriptInstance): MultitoolFeature {
  let thinkCounter = 0;

  return {
    init() {
      instance.Msg("[Multitool] Initializing multitool feature...");

      // Setup event handlers
      setupWeaponHandlers();
      setupChatHandlers();
      setupDamageTracking();
      setupTaserDamageBlocking();

      instance.Msg("[Multitool] Feature initialized and ready");
    },

    cleanup() {
      instance.Msg("[Multitool] Cleaning up before hot reload...");
      // Note: Think loop is managed by gamemode, not individual features
    },

    getState(): MultitoolState {
      return {
        playerStates: getPlayerStateData(),
        placedProps: getPropData(),
      };
    },

    restoreState(state: MultitoolState) {
      if (state) {
        instance.Msg(
          `[Multitool] Restoring state - ${state.playerStates.length} players, ${state.placedProps.length} props`
        );
        restorePlayerState(state.playerStates);
        restorePropState(state.placedProps);
      }
    },

    onPlayerConnect(player: CSPlayerController) {
      if (!player || !player.IsValid()) {
        instance.Msg("[Multitool] Player connected but invalid - skipping init");
        return;
      }

      const playerSlot = player.GetPlayerSlot();
      initPlayerState(playerSlot);
      instance.Msg(`[Multitool] Player ${player.GetPlayerName()} connected (slot ${playerSlot})`);
    },

    onPlayerActivate(player: CSPlayerController) {
      const playerSlot = player.GetPlayerSlot();

      // Ensure state exists
      initPlayerState(playerSlot);

      // Give zeus (multitool weapon)
      giveZeusToPlayer(player);

      // ONLY create preview for human players (not bots)
      if (!player.IsBot()) {
        createPreviewForPlayer(playerSlot);
      }

      instance.Msg(`[Multitool] Player ${player.GetPlayerName()} activated (slot ${playerSlot})`);
    },

    onPlayerDisconnect(playerSlot: number) {
      instance.Msg(`[Multitool] Player ${playerSlot} disconnecting - cleaning up`);

      // Remove all their props
      removeAllPlayerProps(playerSlot);

      // Remove preview entity
      removePreviewForPlayer(playerSlot);

      // Remove state
      removePlayerState(playerSlot);
    },

    onRoundStart() {
      instance.Msg("[Multitool] Round started - re-equipping players with zeus");

      // Re-give zeus to all human players on round start
      for (let slot = 0; slot < 64; slot++) {
        const player = instance.GetPlayerController(slot);
        if (player && player.IsValid() && !player.IsBot()) {
          giveZeusToPlayer(player);
        }
      }
    },

    onGunReload(weaponClassName: string, ownerSlot: number) {
      // Only respond to taser reloads
      if (weaponClassName !== "weapon_taser") {
        return;
      }

      // Cycle to next mode
      cycleMode(ownerSlot);

      const controller = instance.GetPlayerController(ownerSlot);
      if (controller && controller.IsValid()) {
        instance.Msg(`[Multitool] Player ${controller.GetPlayerName()} cycled mode with reload`);
      }
    },

    onThink() {
      // Internal think counter for timing different update rates
      thinkCounter++;

      // ONLY update previews for HUMAN players (not bots)
      for (let slot = 0; slot < 64; slot++) {
        const controller = instance.GetPlayerController(slot);
        if (!controller || controller.IsBot()) continue; // Skip bots!

        const state = getPlayerState(slot);
        if (!state) continue;

        const pawn = controller.GetPlayerPawn();
        if (!pawn || !pawn.IsValid()) continue;

        // Check if player is holding a prop
        const heldPropName = state.heldPropName;
        if (heldPropName) {
          // Check if player switched weapons (not holding Zeus)
          const activeWeapon = pawn.GetActiveWeapon();
          if (!activeWeapon || !activeWeapon.IsValid() || activeWeapon.GetClassName() !== "weapon_taser") {
            // Player switched weapons - auto-release prop
            state.heldPropName = null;
            instance.ClientCommand(slot, 'echo "Released prop (weapon switched)"');
            continue; // Skip updating prop position this tick
          }

          // Update held prop position (physgun-style following)
          updateHeldPropPosition(slot, pawn);
        }

        // Only show preview in placement mode
        if (state.mode !== MultitoolMode.PLACE) {
          hidePreview(slot); // Hide preview when not in place mode
          continue;
        }

        // ONLY show preview when holding the zeus (weapon_taser)
        const activeWeapon = pawn.GetActiveWeapon();
        if (!activeWeapon || !activeWeapon.IsValid() || activeWeapon.GetClassName() !== "weapon_taser") {
          // Not holding zeus - hide preview
          hidePreview(slot);
          continue;
        }

        // Perform raycast to get placement position
        const trace = performRaycast(pawn);

        if (trace.didHit) {
          // Debug - log occasionally to verify it's working
          if (thinkCounter % 100 === 0) {
            instance.Msg(
              `[Multitool:Preview] Player ${slot} (${controller.GetPlayerName()}) raycast HIT at (${trace.end.x.toFixed(1)}, ${trace.end.y.toFixed(1)}, ${trace.end.z.toFixed(1)})`
            );
          }

          // Show preview and update position
          showPreview(slot);
          updatePreviewPosition(slot, trace.end, { pitch: 0, yaw: 0, roll: 0 });
        } else {
          // Hide preview when not aiming at anything
          hidePreview(slot);
        }
      }

      // Check prop health every 2 ticks (~0.1 seconds)
      if (thinkCounter % 2 === 0) {
        checkAllPropHealth();
      }

      // Cleanup invalid props every 200 ticks (~10 seconds)
      if (thinkCounter % 200 === 0) {
        cleanupInvalidProps();
      }

      // Ensure players have zeus every 200 ticks (~10 seconds)
      if (thinkCounter % 200 === 0) {
        ensureHumanPlayersHaveZeus();
      }
    },

    onHotReloadComplete() {
      instance.Msg("[Multitool] Hot reload complete - reinitializing per-player resources");

      // Clear all stale entity references first
      // (previewEntityName and heldPropName point to entities that no longer exist)
      clearStaleEntityNames();

      // Recreate preview entities for all connected human players
      let reinitializedCount = 0;
      for (let slot = 0; slot < 64; slot++) {
        const controller = instance.GetPlayerController(slot);
        if (!controller || !controller.IsValid() || controller.IsBot()) {
          continue; // Skip invalid/bot players
        }

        // Ensure player state exists
        const state = getPlayerState(slot);
        if (!state) {
          initPlayerState(slot);
        }

        // Recreate preview entity
        createPreviewForPlayer(slot);
        reinitializedCount++;

        instance.Msg(
          `[Multitool] Recreated preview for player ${controller.GetPlayerName()} (slot ${slot})`
        );
      }

      instance.Msg(
        `[Multitool] Reinitialized ${reinitializedCount} player(s) after hot reload`
      );
    },
  };
}

// Re-export types for convenience
export { MultitoolMode, MultitoolState } from "./types";
