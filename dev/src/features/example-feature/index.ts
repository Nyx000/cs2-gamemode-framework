/**
 * Example Feature - Public API
 *
 * This is a minimal, working example showing how to structure a CS2 feature module.
 * Copy this entire folder to create new features!
 *
 * Key Concepts:
 * - Export a createFeature() function that returns a feature interface
 * - Implement init(), cleanup(), getState(), and restoreState() methods
 * - Use lifecycle hooks (onPlayerConnect, etc.) to respond to game events
 * - Keep all feature logic self-contained and portable
 *
 * Usage in any gamemode (e.g., workbench-gamemode.ts):
 *   import { createExampleFeature } from "../features/example-feature";
 *
 *   const exampleFeature = createExampleFeature(Instance);
 *   exampleFeature.init();
 */

import { CSPlayerController, Instance as PointScriptInstance } from "cs_script/point_script";
import { serializeMap, deserializeMap } from "../../core/state-utils";
import { DEBUG_MODE, MESSAGE_PREFIX, THINK_INTERVAL } from "./config";
import { ExampleMode, ExamplePlayerData, ExampleState } from "./types";

/**
 * Public API for the Example Feature
 */
export interface ExampleFeature {
  /** Initialize the feature (register event handlers, start systems) */
  init(): void;

  /** Cleanup before hot reload (stop think loops, etc.) */
  cleanup(): void;

  /** Get current state for hot reload preservation */
  getState(): ExampleState;

  /** Restore state after hot reload */
  restoreState(state: ExampleState): void;

  /** Handle player connection events */
  onPlayerConnect(player: CSPlayerController): void;

  /** Handle player disconnection events */
  onPlayerDisconnect(playerSlot: number): void;

  /** Think loop update (called periodically by gamemode) */
  onThink(): void;
}

/**
 * Create a new example feature instance
 *
 * @param instance - The PointScript Instance object
 * @returns ExampleFeature interface
 */
export function createExampleFeature(instance: typeof PointScriptInstance): ExampleFeature {
  // ══════════════════════════════════════════════════════════════════════════
  // Feature State (private to this feature)
  // ══════════════════════════════════════════════════════════════════════════

  // All serializable state is in one object for proper hot reload
  let state: ExampleState = {
    thinkCount: 0,
    initTimestamp: Date.now(),
    playerConnectionCount: 0,
    currentMode: ExampleMode.ACTIVE,
    playerData: [], // Serialized form of the Map
  };

  // Runtime Map view for efficient lookups
  // Synced TO state.playerData on getState() and FROM it on restoreState()
  const playerDataMap = new Map<number, ExamplePlayerData>();

  // ══════════════════════════════════════════════════════════════════════════
  // Private Helper Functions
  // ══════════════════════════════════════════════════════════════════════════

  function log(message: string): void {
    instance.Msg(`${MESSAGE_PREFIX} ${message}`);
  }

  function debug(message: string): void {
    if (DEBUG_MODE) {
      instance.Msg(`${MESSAGE_PREFIX}[DEBUG] ${message}`);
    }
  }

  function handlePlayerJoined(player: CSPlayerController): void {
    const playerSlot = player.GetPlayerSlot();
    const playerName = player.GetPlayerName();

    playerDataMap.set(playerSlot, {
      playerSlot,
      connectionTime: Date.now(),
      messagesSent: 0,
    });

    state.playerConnectionCount++;

    log(
      `Player ${playerName} (slot ${playerSlot}) joined! Total connections: ${state.playerConnectionCount}`
    );

    // Send welcome message to player's console
    instance.ClientCommand(playerSlot, `echo "${MESSAGE_PREFIX} Welcome to the example feature!"`);
  }

  function handlePlayerLeft(playerSlot: number): void {
    const data = playerDataMap.get(playerSlot);
    if (data) {
      const sessionDuration = Date.now() - data.connectionTime;
      debug(`Player ${playerSlot} session lasted ${(sessionDuration / 1000).toFixed(1)}s`);
      playerDataMap.delete(playerSlot);
    }
  }

  function thinkLoop(): void {
    if (state.currentMode === ExampleMode.PAUSED) {
      return;
    }

    state.thinkCount++;

    // Called every tick (50ms / 20 times per second)
    // Use modulo to run tasks at different intervals:

    // Log every 5 ticks (~0.25 seconds)
    if (state.thinkCount % 5 === 0) {
      const uptime = (Date.now() - state.initTimestamp) / 1000;
      log(
        `Think #${state.thinkCount} | Uptime: ${uptime.toFixed(1)}s | Players: ${playerDataMap.size}`
      );
    }

    // Example: List all connected player names every 10 ticks (~0.5 seconds)
    if (state.thinkCount % 10 === 0 && playerDataMap.size > 0) {
      const playerNames: string[] = [];
      for (let slot = 0; slot < 64; slot++) {
        const player = instance.GetPlayerController(slot);
        if (player && player.IsValid() && !player.IsBot()) {
          playerNames.push(player.GetPlayerName());
        }
      }
      if (playerNames.length > 0) {
        log(`Active players: ${playerNames.join(", ")}`);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Public API Implementation
  // ══════════════════════════════════════════════════════════════════════════

  return {
    init() {
      log("Initializing example feature...");

      // Register event handlers (if your feature needs them)
      // Example: Listen for player chat
      instance.OnPlayerChat(({ player }) => {
        if (!player || !player.IsValid()) return;

        const playerSlot = player.GetPlayerSlot();
        const data = playerDataMap.get(playerSlot);
        if (data) {
          data.messagesSent++;
          debug(`Player ${player.GetPlayerName()} has sent ${data.messagesSent} messages`);
        }
      });

      log("Example feature initialized successfully!");
      log(`Think interval: ${THINK_INTERVAL}s | Debug mode: ${DEBUG_MODE ? "ON" : "OFF"}`);
    },

    cleanup() {
      log("Cleaning up before hot reload...");
      // Stop think loops, clear timers, etc.
      // Note: Think loop is managed by gamemode in this architecture
    },

    getState(): ExampleState {
      // Sync the Map to array format before serialization
      state.playerData = serializeMap(playerDataMap);

      debug(
        `Saving state: thinkCount=${state.thinkCount}, mode=${state.currentMode}, players=${playerDataMap.size}`
      );
      return { ...state }; // Return a shallow copy
    },

    restoreState(savedState: ExampleState) {
      if (savedState) {
        state = savedState;

        // Restore the Map from the serialized array
        playerDataMap.clear();
        const restoredMap = deserializeMap(savedState.playerData);
        restoredMap.forEach((value, key) => {
          playerDataMap.set(key, value);
        });

        log(
          `State restored! thinkCount=${state.thinkCount}, mode=${state.currentMode}, totalConnections=${state.playerConnectionCount}, activePlayers=${playerDataMap.size}`
        );
      }
    },

    onPlayerConnect(player: CSPlayerController) {
      if (player && player.IsValid()) {
        handlePlayerJoined(player);
      }
    },

    onPlayerDisconnect(playerSlot: number) {
      handlePlayerLeft(playerSlot);
    },

    onThink() {
      thinkLoop();
    },
  };
}

// Re-export types for convenience
export { ExampleMode, ExampleState } from "./types";
