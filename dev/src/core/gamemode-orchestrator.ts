/**
 * Generic Gamemode Orchestrator
 *
 * A reusable framework for CS2 feature-based gamemodes.
 * Handles feature lifecycle, event dispatching, hot reload, and think loop coordination.
 *
 * Usage:
 *   import { createGamemodeOrchestrator } from "../core/gamemode-orchestrator";
 *   import { features } from "../features";
 *
 *   const orchestrator = createGamemodeOrchestrator(Instance, {
 *     gamemodeName: "My Custom Gamemode",
 *     features: features,
 *     serverCommands: ["sv_cheats 1", "mp_roundtime 60"],
 *     welcomeMessages: ["Welcome to my gamemode!", "Type !help for commands"],
 *     disabledFeatures: ["feature-to-disable"],
 *     thinkInterval: 0.05,
 *   });
 *
 *   orchestrator.initialize();
 */

import { CSPlayerController, CSWeaponBase, Domain } from "cs_script/point_script";
import { Feature, FeatureDescriptor, FeatureState } from "./feature";
import { safeGetState, safeRestoreState, safeHotReloadComplete } from "./state-utils";

/**
 * Configuration options for the gamemode orchestrator
 */
export interface GamemodeConfig {
  /** Name of the gamemode (for logging and display) */
  gamemodeName?: string;

  /** Array of feature descriptors to load */
  features: readonly FeatureDescriptor[];

  /** Server console commands to execute on initialization */
  serverCommands?: string[];

  /** Welcome messages to send to player console on activation */
  welcomeMessages?: string[];

  /** Feature names to disable (won't be loaded) */
  disabledFeatures?: string[];

  /** Think loop interval in seconds (default: 0.05 = 20 ticks/sec) */
  thinkInterval?: number;

  /** Custom initialization logic (runs after server commands) */
  onInitialize?(): void;

  /** Custom player activation logic (runs after welcome messages) */
  onPlayerActivate?(player: CSPlayerController): void;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<GamemodeConfig> = {
  gamemodeName: "Generic Gamemode",
  serverCommands: [
    "mp_warmup_offline_enabled 0",
    "mp_warmuptime 0",
    "mp_warmup_end",
    "mp_roundtime_override 60",
  ],
  welcomeMessages: ["Gamemode active!", "Have fun!"],
  disabledFeatures: [],
  thinkInterval: 0.05,
};

/**
 * Gamemode orchestrator instance
 */
export interface GamemodeOrchestrator {
  /** Initialize the gamemode (call this once on map load) */
  initialize(): void;

  /** Get a feature instance by name */
  getFeature(name: string): Feature | undefined;

  /** Get all active feature instances */
  getActiveFeatures(): Map<string, Feature>;
}

/**
 * Create a new gamemode orchestrator
 *
 * @param instance - The PointScript Instance object
 * @param config - Configuration options
 * @returns GamemodeOrchestrator instance
 */
export function createGamemodeOrchestrator(
  instance: Domain,
  config: GamemodeConfig
): GamemodeOrchestrator {
  // Merge config with defaults
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Map to store all active feature instances by name
  const activeFeatures = new Map<string, Feature>();

  // ═════════════════════════════════════════════════════════════════════════
  // Server Configuration
  // ═════════════════════════════════════════════════════════════════════════

  function setupServerCommands(): void {
    instance.Msg(`[${cfg.gamemodeName}] Configuring server...`);

    cfg.serverCommands?.forEach((cmd) => {
      instance.ServerCommand(cmd);
    });

    instance.Msg(`[${cfg.gamemodeName}] Server configuration complete`);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Feature Management
  // ═════════════════════════════════════════════════════════════════════════

  function initializeFeatures(): void {
    const enabledFeatures = cfg.features.filter(
      ({ name }) => !cfg.disabledFeatures?.includes(name)
    );

    instance.Msg(`[${cfg.gamemodeName}] Initializing ${enabledFeatures.length} feature(s)...`);

    enabledFeatures.forEach(({ name, create }) => {
      instance.Msg(`[${cfg.gamemodeName}] Loading feature: ${name}`);
      const featureInstance = create(instance);
      featureInstance.init();
      activeFeatures.set(name, featureInstance);
    });

    if (cfg.disabledFeatures && cfg.disabledFeatures.length > 0) {
      instance.Msg(`[${cfg.gamemodeName}] Disabled features: ${cfg.disabledFeatures.join(", ")}`);
    }

    instance.Msg(`[${cfg.gamemodeName}] All ${enabledFeatures.length} features initialized`);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Think Loop
  // ═════════════════════════════════════════════════════════════════════════

  function setupMainThinkLoop(): void {
    instance.SetThink(() => {
      // Call onThink on all features every tick
      activeFeatures.forEach((feature) => {
        if (typeof feature.onThink === "function") {
          feature.onThink();
        }
      });

      instance.SetNextThink(instance.GetGameTime() + (cfg.thinkInterval || 0.05));
    });

    instance.SetNextThink(instance.GetGameTime());
    instance.Msg(
      `[${cfg.gamemodeName}] Main think loop started (${1 / (cfg.thinkInterval || 0.05)} ticks/sec)`
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Hot Reload Support (DEVELOPMENT ONLY - requires -tools flag)
  // ═════════════════════════════════════════════════════════════════════════
  // This preserves state during script_reload commands in development.
  // NOT for production crash recovery - state is in-memory only.

  function setupHotReload(): void {
    instance.OnScriptReload({
      before: () => {
        instance.Msg(`[${cfg.gamemodeName}] Hot reload detected - saving state...`);

        // Clear think loop FIRST (critical!)
        instance.SetNextThink(-1);

        // Cleanup all features
        activeFeatures.forEach((feature) => {
          if (typeof feature.cleanup === "function") {
            feature.cleanup();
          }
        });

        // Aggregate all feature states with error handling
        const state: Record<string, FeatureState> = {};
        let savedCount = 0;
        let errorCount = 0;

        activeFeatures.forEach((feature, name) => {
          const result = safeGetState(feature, name, instance);
          if (result.success) {
            state[name] = result.data;
            savedCount++;
          } else {
            errorCount++;
          }
        });

        if (errorCount > 0) {
          instance.Msg(
            `[${cfg.gamemodeName}] WARNING: ${errorCount} feature(s) failed to save state`
          );
        }
        instance.Msg(
          `[${cfg.gamemodeName}] State saved for hot reload (${savedCount}/${activeFeatures.size} features)`
        );
        return state;
      },

      after: (state: Record<string, FeatureState>) => {
        instance.Msg(`[${cfg.gamemodeName}] Restoring from hot reload...`);

        // Clear the map before recreating
        activeFeatures.clear();

        // RECREATE all feature instances (they're undefined after reload)
        const enabledFeatures = cfg.features.filter(
          ({ name }) => !cfg.disabledFeatures?.includes(name)
        );

        enabledFeatures.forEach(({ name, create }) => {
          const featureInstance = create(instance);
          activeFeatures.set(name, featureInstance);
        });

        // THEN restore state with error handling
        let restoredCount = 0;
        if (state) {
          activeFeatures.forEach((feature, name) => {
            if (state[name]) {
              const success = safeRestoreState(feature, state[name], name, instance);
              if (success) {
                restoredCount++;
              }
            }
          });
        }
        instance.Msg(
          `[${cfg.gamemodeName}] State restored for ${restoredCount}/${activeFeatures.size} features`
        );

        // Then initialize all features
        activeFeatures.forEach((feature) => {
          feature.init();
        });

        // Restart think loop
        setupMainThinkLoop();

        // NEW: Call onHotReloadComplete for per-player reinitialization
        // This is needed because onPlayerActivate is NOT called for already-connected players
        let connectedPlayerCount = 0;
        for (let slot = 0; slot < 64; slot++) {
          const player = instance.GetPlayerController(slot);
          if (player && player.IsValid()) {
            connectedPlayerCount++;
          }
        }

        if (connectedPlayerCount > 0) {
          instance.Msg(
            `[${cfg.gamemodeName}] Reinitializing ${connectedPlayerCount} connected player(s)...`
          );
          activeFeatures.forEach((feature, name) => {
            safeHotReloadComplete(feature, name, instance);
          });
        }

        instance.Msg(`[${cfg.gamemodeName}] Hot reload complete - all features restored`);
      },
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Player Lifecycle Events
  // ═════════════════════════════════════════════════════════════════════════

  function setupPlayerEvents(): void {
    instance.OnPlayerConnect(({ player }: { player: CSPlayerController }) => {
      // Defensive check - sometimes player can be null/invalid on connect
      if (!player || !player.IsValid()) {
        instance.Msg(`[${cfg.gamemodeName}] Player connected but invalid - skipping`);
        return;
      }

      const playerSlot = player.GetPlayerSlot();
      instance.Msg(
        `[${cfg.gamemodeName}] Player ${player.GetPlayerName()} connected (slot ${playerSlot})`
      );

      // Notify all features
      activeFeatures.forEach((feature) => {
        if (typeof feature.onPlayerConnect === "function") {
          feature.onPlayerConnect(player);
        }
      });
    });

    instance.OnPlayerActivate(({ player }: { player: CSPlayerController }) => {
      const playerSlot = player.GetPlayerSlot();

      // Send welcome messages to player's console
      cfg.welcomeMessages?.forEach((msg) => {
        instance.ClientCommand(playerSlot, `echo "${msg}"`);
      });

      // Call custom activation logic if provided
      if (cfg.onPlayerActivate) {
        cfg.onPlayerActivate(player);
      }

      // Notify features
      activeFeatures.forEach((feature) => {
        if (typeof feature.onPlayerActivate === "function") {
          feature.onPlayerActivate(player);
        }
      });

      instance.Msg(
        `[${cfg.gamemodeName}] Player ${player.GetPlayerName()} activated (slot ${playerSlot})`
      );
    });

    instance.OnPlayerDisconnect(({ playerSlot }: { playerSlot: number }) => {
      instance.Msg(`[${cfg.gamemodeName}] Player ${playerSlot} disconnecting`);

      // Notify all features
      activeFeatures.forEach((feature) => {
        if (typeof feature.onPlayerDisconnect === "function") {
          feature.onPlayerDisconnect(playerSlot);
        }
      });
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Gun Reload Event Dispatcher
  // ═════════════════════════════════════════════════════════════════════════

  function setupWeaponEvents(): void {
    instance.OnGunReload(({ weapon }: { weapon: CSWeaponBase }) => {
      if (!weapon || !weapon.IsValid()) {
        return;
      }

      const weaponClassName = weapon.GetClassName();

      // Get the player who owns this weapon
      const owner = weapon.GetOwner();
      if (!owner || !owner.IsValid()) {
        return;
      }

      // Get the controller to find player slot
      const controller = owner.GetPlayerController();
      if (!controller || !controller.IsValid()) {
        return;
      }

      const playerSlot = controller.GetPlayerSlot();

      // Dispatch to all features that want reload events
      activeFeatures.forEach((feature) => {
        if (typeof feature.onGunReload === "function") {
          feature.onGunReload(weaponClassName, playerSlot);
        }
      });
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Round Events
  // ═════════════════════════════════════════════════════════════════════════

  function setupRoundEvents(): void {
    instance.OnRoundStart(() => {
      instance.Msg(`[${cfg.gamemodeName}] Round started`);

      // Notify features of round start
      activeFeatures.forEach((feature) => {
        if (typeof feature.onRoundStart === "function") {
          feature.onRoundStart();
        }
      });
    });

    instance.OnRoundEnd(({ winningTeam, reason }: { winningTeam: number; reason: number }) => {
      instance.Msg(
        `[${cfg.gamemodeName}] Round ended - Team ${winningTeam} won (Reason: ${reason})`
      );
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Public API
  // ═════════════════════════════════════════════════════════════════════════

  return {
    initialize() {
      instance.Msg("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      instance.Msg(`  ${cfg.gamemodeName?.toUpperCase()} INITIALIZATION`);
      instance.Msg("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Configure server
      setupServerCommands();

      // Custom initialization logic
      if (cfg.onInitialize) {
        cfg.onInitialize();
      }

      // Initialize features
      initializeFeatures();

      // Setup event handlers
      setupPlayerEvents();
      setupWeaponEvents();
      setupRoundEvents();

      // Setup hot reload
      setupHotReload();

      // Start main think loop
      setupMainThinkLoop();

      instance.Msg("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    },

    getFeature(name: string): Feature | undefined {
      return activeFeatures.get(name);
    },

    getActiveFeatures(): Map<string, Feature> {
      return activeFeatures;
    },
  };
}
