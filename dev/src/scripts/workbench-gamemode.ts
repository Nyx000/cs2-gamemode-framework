/**
 * Workbench Testbed Gamemode
 *
 * This is the ONLY script that should be referenced in Hammer (via point_script entity).
 * All features (multitool, custom guns, vehicles, etc.) are imported as modules.
 *
 * Workbench is a testbed/sandbox environment for developing and testing CS2 entities,
 * mechanics, and features in a controlled, cheats-enabled environment.
 *
 * In Hammer:
 * 1. Create point_script entity
 * 2. Set cs_script: "scripts/workbench-gamemode.vjs"
 *
 * OR use logic_auto:
 * 1. Create logic_auto entity
 * 2. Add Output: OnMapSpawn → point_script → RunScriptCode → workbench-gamemode.js
 *
 * Architecture:
 * - Uses the generic gamemode orchestrator from core/
 * - Extends it with Workbench-specific testbed features
 * - Features are self-contained modules managed by the orchestrator
 */

import { Instance } from "cs_script/point_script";
import { createGamemodeOrchestrator } from "../core/gamemode-orchestrator";
import { features } from "../features";

// ═══════════════════════════════════════════════════════════════════════════
// Workbench-Specific Configuration
// ═══════════════════════════════════════════════════════════════════════════

const WORKBENCH_SERVER_COMMANDS = [
  // Disable warmup (removes "Warmup" text from screen)
  "mp_warmup_offline_enabled 0",
  "mp_warmuptime 0",
  "mp_warmup_end",
  "mp_roundtime_override 999999",

  // Cheats and gameplay
  "sv_cheats 1",
  "sv_infinite_ammo 1",

  // Bot behavior
  "bot_stop 1",
  "bot_dont_shoot 1",

  // Team settings
  "mp_autoteambalance 0",
  "mp_limitteams 0",

  // Buy settings
  "mp_buy_anywhere 1",
  "mp_buytime 9999",

  // Communication
  "sv_alltalk 1",
];

const WORKBENCH_WELCOME_MESSAGES = [
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "Workbench Testbed Active",
  "God mode enabled!",
  "Type noclip to fly around",
  "Type !help for commands",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
];

// Features to disable (if any)
const DISABLED_FEATURES: string[] = ["multitool"];

// ═══════════════════════════════════════════════════════════════════════════
// Create Orchestrator with Workbench Configuration
// ═══════════════════════════════════════════════════════════════════════════

const orchestrator = createGamemodeOrchestrator(Instance, {
  gamemodeName: "Workbench Testbed",
  features: features,
  serverCommands: WORKBENCH_SERVER_COMMANDS,
  welcomeMessages: WORKBENCH_WELCOME_MESSAGES,
  disabledFeatures: DISABLED_FEATURES,
  thinkInterval: 0.05, // 20 ticks per second

  // Workbench-specific initialization
  onInitialize: () => {
    Instance.Msg("[Workbench] Testbed environment configured for development");
  },

  // Workbench-specific player activation
  onPlayerActivate: (player) => {
    // Join terrorist team for easier testing
    player.JoinTeam(2);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Initialize on Map Load
// ═══════════════════════════════════════════════════════════════════════════

Instance.OnActivate(() => {
  orchestrator.initialize();
  displayWorkbenchBanner();
});

// ═══════════════════════════════════════════════════════════════════════════
// Workbench-Specific Features
// ═══════════════════════════════════════════════════════════════════════════

// God Mode - Prevent Damage for Human Players
Instance.OnBeforePlayerDamage(({ player }) => {
  const controller = player.GetPlayerController();

  // Block all damage for human players (god mode for testbed)
  if (controller && !controller.IsBot()) {
    return { abort: true };
  }

  // Allow damage for bots
  return undefined;
});

// ═══════════════════════════════════════════════════════════════════════════
// Display Info Banner
// ═══════════════════════════════════════════════════════════════════════════

function displayWorkbenchBanner(): void {
  Instance.Msg("");
  Instance.Msg("╔════════════════════════════════════════════════╗");
  Instance.Msg("║        WORKBENCH GAMEMODE v1.0                 ║");
  Instance.Msg("║   CS2 Feature Development Framework            ║");
  Instance.Msg("║                                                ║");
  Instance.Msg(`║  Active Features: ${features.length.toString().padEnd(28)} ║`);

  features.forEach(({ name }) => {
    // Check if this feature is disabled
    const isDisabled = DISABLED_FEATURES.includes(name);
    const displayName = isDisabled ? `  - ${name} [DISABLED]` : `  - ${name}`;
    const paddedName = displayName.padEnd(46);
    Instance.Msg(`║${paddedName}║`);
  });

  Instance.Msg("║                                                ║");
  Instance.Msg("║  Server Configuration:                         ║");
  Instance.Msg("║  - Infinite warmup (no freeze time)           ║");
  Instance.Msg("║  - Cheats enabled (noclip, god mode, etc.)    ║");
  Instance.Msg("║  - Infinite ammo                              ║");
  Instance.Msg("║  - Bots frozen and passive                    ║");
  Instance.Msg("║  - God mode for human players                 ║");
  Instance.Msg("╚════════════════════════════════════════════════╝");
  Instance.Msg("");
}
