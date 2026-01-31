/**
 * Gamemode Entry Point
 *
 * This is the script referenced in Hammer's point_script entity.
 * It creates the orchestrator and initializes all plugins.
 *
 * To use:
 * 1. In Hammer, create a point_script entity
 * 2. Set vscript_name: "scripts/gamemode.vjs"
 * 3. Launch with Custom mode: game_type 3; game_mode 0; map <your_map>
 *
 * Customize:
 * - gamemodeName: Display name for console logs
 * - plugins: Auto-imported from src/plugins/index.ts
 * - serverCommands: Console commands run on map load
 * - welcomeMessages: Sent to player console on join
 * - enabledPlugins: Plugins to load (empty = all)
 * - teamConfig: Team assignment and damage rules
 * - onInitialize/onPlayerActivate/etc: Custom callbacks
 */

import { Instance } from "cs_script/point_script";
import { createGamemodeOrchestrator, Teams } from "./core/gamemode-orchestrator";
import { plugins } from "./plugins";

// =============================================================================
// Create and Initialize Orchestrator
// =============================================================================

const orchestrator = createGamemodeOrchestrator(Instance, {
  // Display name for console logs
  gamemodeName: "My Gamemode",

  // All plugins from src/plugins/ (auto-generated)
  plugins: plugins,

  // Server commands to run on map load
  serverCommands: [
    "mp_warmup_end",
    "mp_roundtime 60",
  ],

  // Messages sent to player console on join
  welcomeMessages: [
    "Welcome to My Gamemode!",
  ],

  // Plugins to enable (by name from plugins/index.ts)
  // If empty or undefined, ALL plugins are loaded.
  // Available: "debug", "examplePlugin"
  enabledPlugins: [
    "examplePlugin",  // Minimal template plugin
    // "debug",        // Uncomment to enable event logging
  ],

  // Team configuration (default: sandbox mode - everyone on CT, can damage all)
  teamConfig: {
    autoAssign: true,           // Skip team selection
    defaultTeam: Teams.CT,      // Auto-join CT
    teamDamage: "all",          // Everyone can damage everyone
  },

  // Optional: Custom initialization logic
  // onInitialize: () => {
  //   Instance.Msg("[MyGamemode] Custom init logic here");
  // },

  // Optional: Custom per-player logic when they spawn
  // onPlayerActivate: (player) => {
  //   Instance.Msg(`[MyGamemode] ${player.GetPlayerName()} spawned`);
  // },
});

// =============================================================================
// Initialize on Map Load
// =============================================================================

Instance.OnActivate(() => {
  orchestrator.initialize();
});
