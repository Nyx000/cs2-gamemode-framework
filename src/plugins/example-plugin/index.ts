/**
 * Example Plugin - Minimal Template
 *
 * Copy this file to create new plugins. Demonstrates:
 * - Plugin factory pattern with PluginContext
 * - Required lifecycle methods (init, cleanup, getState, restoreState)
 * - Optional event hooks (implement only what you need)
 * - EventBus for inter-plugin communication
 *
 * To create a new plugin:
 * 1. Create folder: src/plugins/my-plugin/
 * 2. Copy this file to src/plugins/my-plugin/index.ts
 * 3. Rename createExamplePlugin to createMyPlugin
 * 4. Run: bun run build (regenerates plugins/index.ts)
 */

import { CSPlayerController } from "cs_script/point_script";
import { Plugin, PluginContext } from "../../core/plugin";

/** State that survives hot reload - must be serializable (no functions, no entity refs) */
interface ExampleState {
  playerCount: number;
}

/**
 * Create the example plugin
 */
export function createExamplePlugin({ instance, eventBus }: PluginContext): Plugin {
  // Private state - will be saved/restored on hot reload
  let state: ExampleState = {
    playerCount: 0,
  };

  return {
    // ─────────────────────────────────────────────────────────────────────────
    // Required Lifecycle Methods
    // ─────────────────────────────────────────────────────────────────────────

    init() {
      instance.Msg("[Example] Plugin initialized");

      // Subscribe to events from other plugins
      eventBus.on("debug:event", (data) => {
        instance.Msg(`[Example] Received debug event: ${JSON.stringify(data)}`);
      });
    },

    cleanup() {
      // Called before hot reload - stop any think loops, clear timers
      instance.Msg("[Example] Cleanup before hot reload");
    },

    getState(): ExampleState {
      // Return serializable state for hot reload preservation
      return { ...state };
    },

    restoreState(savedState: ExampleState) {
      // Restore state after hot reload
      state = savedState;
      instance.Msg(`[Example] State restored: playerCount=${state.playerCount}`);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Optional Event Hooks - implement only what you need
    // ─────────────────────────────────────────────────────────────────────────

    onPlayerConnect(player: CSPlayerController) {
      state.playerCount++;
      instance.Msg(`[Example] Player ${player.GetPlayerName()} connected (total: ${state.playerCount})`);

      // Emit event for other plugins
      eventBus.emit("example:player-joined", { playerSlot: player.GetPlayerSlot() });
    },

    onPlayerDisconnect(playerSlot: number) {
      state.playerCount = Math.max(0, state.playerCount - 1);
      instance.Msg(`[Example] Player slot ${playerSlot} disconnected (total: ${state.playerCount})`);
    },

    // Uncomment hooks as needed:
    // onPlayerActivate(player) { },
    // onPlayerReset(player) { },
    // onPlayerKill(player, inflictor, attacker, weapon) { },
    // onPlayerChat(player, text, team) { },
    // onRoundStart() { },
    // onRoundEnd(winningTeam, reason) { },
    // onThink() { },
    // onBeforePlayerDamage(event) { return { damage: event.damage }; },
  };
}
