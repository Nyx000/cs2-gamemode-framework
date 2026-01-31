/**
 * Gamemode Orchestrator
 *
 * A reusable framework for CS2 plugin-based gamemodes.
 * Handles plugin lifecycle, event dispatching, hot reload, and think loop coordination.
 *
 * Usage:
 *   import { createGamemodeOrchestrator } from "../core/gamemode-orchestrator";
 *   import { plugins } from "../plugins";
 *
 *   const orchestrator = createGamemodeOrchestrator(Instance, {
 *     gamemodeName: "My Custom Gamemode",
 *     plugins: plugins,
 *     serverCommands: ["sv_cheats 1", "mp_roundtime 60"],
 *     welcomeMessages: ["Welcome to my gamemode!", "Type !help for commands"],
 *     enabledPlugins: ["debug", "myPlugin"],  // Only load these plugins
 *     thinkInterval: 0.05,
 *   });
 *
 *   orchestrator.initialize();
 */

import {
  CSPlayerController,
  CSPlayerPawn,
  CSRoundEndReason,
  CSWeaponAttackType,
  CSWeaponBase,
  BeforePlayerDamageEvent,
  PlayerDamageEvent,
  Entity,
  Vector,
  Domain,
} from "cs_script/point_script";
import { Plugin, PluginContext, PluginDescriptor, PluginState } from "./plugin";
import { safeGetState, safeRestoreState, safeHotReloadComplete } from "./state-utils";
import { createEventBus, EventBus } from "./event-bus";

/** Default priority for plugins that don't specify one */
const DEFAULT_PRIORITY = 100;

/** Maximum number of player slots in CS2 */
const MAX_PLAYER_SLOTS = 64;

/**
 * CS2 Team Numbers
 * Use these constants when configuring team settings
 */
export const Teams = {
  UNASSIGNED: 0,
  SPECTATOR: 1,
  TERRORIST: 2,
  CT: 3,
} as const;

/**
 * Team configuration for the gamemode
 *
 * CS2 is fundamentally team-based and cannot fully disable teams.
 * However, these settings let you make teams invisible/irrelevant (sandbox mode)
 * or configure traditional team-based gameplay.
 *
 * SANDBOX MODE (default):
 *   autoAssign: true, defaultTeam: Teams.CT, teamDamage: "all"
 *   - Players auto-join CT, skip team selection
 *   - Everyone can damage everyone (teammates_are_enemies)
 *   - Teams are effectively invisible
 *
 * TEAM DEATHMATCH:
 *   autoAssign: false, teamDamage: "enemies"
 *   - Players choose T or CT
 *   - Can only damage enemy team
 *
 * FREE-FOR-ALL:
 *   autoAssign: true, defaultTeam: Teams.CT, teamDamage: "all"
 *   - Same as sandbox, optimized for FFA gameplay
 */
export interface TeamConfig {
  /**
   * Automatically assign players to a team on connect
   * true = skip team selection screen (sandbox/FFA style)
   * false = show team selection menu (competitive/casual style)
   * @default true
   */
  autoAssign?: boolean;

  /**
   * Team to assign players to when autoAssign is true
   * Use Teams.CT (3) or Teams.TERRORIST (2)
   * @default Teams.CT (3)
   */
  defaultTeam?: number;

  /**
   * Who can damage whom
   * "all" = everyone damages everyone (mp_teammates_are_enemies 1)
   * "enemies" = only damage enemy team (traditional CS)
   * "none" = no player damage (peaceful mode)
   * @default "all"
   */
  teamDamage?: "all" | "enemies" | "none";

  /**
   * Allow friendly fire when teamDamage is "enemies"
   * Only applies when teamDamage is "enemies"
   * @default false
   */
  friendlyFire?: boolean;
}

/**
 * Configuration options for the gamemode orchestrator
 */
export interface GamemodeConfig {
  /** Name of the gamemode (for logging and display) */
  gamemodeName?: string;

  /** Array of plugin descriptors to load */
  plugins: readonly PluginDescriptor[];

  /** Server console commands to execute on initialization */
  serverCommands?: string[];

  /** Welcome messages to send to player console on activation */
  welcomeMessages?: string[];

  /**
   * Plugin names to enable (only these will be loaded)
   * If undefined or empty, ALL plugins are loaded.
   * Use plugin names as they appear in plugins/index.ts (camelCase)
   */
  enabledPlugins?: string[];

  /** Think loop interval in seconds (default: 0.05 = 20 ticks/sec) */
  thinkInterval?: number;

  /**
   * Team configuration - controls team selection and damage rules
   * Default is sandbox mode: auto-assign to CT, everyone can damage everyone
   * @see TeamConfig for detailed options and presets
   */
  teamConfig?: TeamConfig;

  /** Custom initialization logic (runs after server commands) */
  onInitialize?(): void;

  /** Custom player activation logic (runs after welcome messages) */
  onPlayerActivate?(player: CSPlayerController): void;

  /** Custom round start logic (runs after plugins' onRoundStart) */
  onRoundStart?(): void;

  /** Custom round end logic (runs after plugins' onRoundEnd) */
  onRoundEnd?(winningTeam: number, reason: CSRoundEndReason): void;
}

/**
 * Default team configuration - Sandbox mode (like Garry's Mod)
 */
const DEFAULT_TEAM_CONFIG: TeamConfig = {
  autoAssign: true,
  defaultTeam: Teams.CT,
  teamDamage: "all",
  friendlyFire: false,
};

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
  enabledPlugins: undefined,  // undefined = load all plugins
  thinkInterval: 0.05,
  teamConfig: DEFAULT_TEAM_CONFIG,
};

/**
 * Gamemode orchestrator instance
 */
export interface GamemodeOrchestrator {
  /** Initialize the gamemode (call this once on map load) */
  initialize(): void;

  /** Get a plugin instance by name */
  getPlugin(name: string): Plugin | undefined;

  /** Get all active plugin instances */
  getActivePlugins(): Map<string, Plugin>;

  /**
   * Get the event bus for inter-plugin communication
   * Can be used by gamemode-level code to emit/subscribe to events
   */
  getEventBus(): EventBus;
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

  // Map to store all active plugin instances by name
  const activePlugins = new Map<string, Plugin>();

  // Create the event bus for inter-plugin communication
  const eventBus = createEventBus(instance, false); // Set to true for debug logging

  // Plugin context passed to all plugin factories
  const pluginContext: PluginContext = {
    instance,
    eventBus,
  };

  // Merge team config with defaults
  const teamCfg: TeamConfig = { ...DEFAULT_TEAM_CONFIG, ...cfg.teamConfig };

  // ═════════════════════════════════════════════════════════════════════════
  // Server Configuration
  // ═════════════════════════════════════════════════════════════════════════

  function setupServerCommands(): void {
    instance.Msg(`[${cfg.gamemodeName}] Configuring server...`);

    // Apply user-provided server commands first
    cfg.serverCommands?.forEach((cmd) => {
      instance.ServerCommand(cmd);
    });

    // Apply team configuration commands
    setupTeamCommands();

    instance.Msg(`[${cfg.gamemodeName}] Server configuration complete`);
  }

  /**
   * Apply server commands based on team configuration
   */
  function setupTeamCommands(): void {
    // Always disable auto team balance (framework manages teams)
    instance.ServerCommand("mp_autoteambalance 0");
    instance.ServerCommand("mp_limitteams 0");

    // Skip team selection timer if auto-assigning
    if (teamCfg.autoAssign) {
      instance.ServerCommand("mp_force_pick_time 0");
    }

    // Configure damage rules
    switch (teamCfg.teamDamage) {
      case "all":
        // Everyone can damage everyone (sandbox/FFA mode)
        instance.ServerCommand("mp_teammates_are_enemies 1");
        instance.ServerCommand("mp_friendlyfire 0");
        instance.ServerCommand("mp_solid_teammates 0");
        break;
      case "enemies":
        // Traditional team damage
        instance.ServerCommand("mp_teammates_are_enemies 0");
        instance.ServerCommand(`mp_friendlyfire ${teamCfg.friendlyFire ? 1 : 0}`);
        instance.ServerCommand("mp_solid_teammates 1");
        break;
      case "none":
        // Peaceful mode - no player damage
        instance.ServerCommand("mp_teammates_are_enemies 0");
        instance.ServerCommand("mp_friendlyfire 0");
        instance.ServerCommand("mp_solid_teammates 0");
        break;
    }

    const teamName = teamCfg.defaultTeam === Teams.CT ? "CT" : "T";
    instance.Msg(
      `[${cfg.gamemodeName}] Team config: autoAssign=${teamCfg.autoAssign} (${teamName}), damage=${teamCfg.teamDamage}`
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Plugin Management
  // ═════════════════════════════════════════════════════════════════════════

  // Ordered list of plugin descriptors (sorted by priority)
  let orderedPlugins: PluginDescriptor[] = [];

  /**
   * Filter and sort plugins based on enabledPlugins config.
   * Returns plugins sorted by priority (lower = higher priority).
   */
  function getOrderedPlugins(): PluginDescriptor[] {
    const hasEnabledList = cfg.enabledPlugins && cfg.enabledPlugins.length > 0;
    const pluginsToLoad = hasEnabledList
      ? cfg.plugins.filter(({ name }) => cfg.enabledPlugins!.includes(name))
      : [...cfg.plugins];

    // Sort by priority (lower = higher priority, runs first)
    return pluginsToLoad.sort((a, b) => {
      const priorityA = a.priority ?? DEFAULT_PRIORITY;
      const priorityB = b.priority ?? DEFAULT_PRIORITY;
      return priorityA - priorityB;
    });
  }

  /**
   * Create plugin instances from ordered descriptors.
   * Does NOT call init() - caller must do that separately.
   */
  function createPluginInstances(): void {
    activePlugins.clear();
    orderedPlugins.forEach(({ name, create }) => {
      const pluginInstance = create(pluginContext);
      activePlugins.set(name, pluginInstance);
    });
  }

  function initializePlugins(): void {
    orderedPlugins = getOrderedPlugins();

    instance.Msg(`[${cfg.gamemodeName}] Initializing ${orderedPlugins.length} plugin(s)...`);

    orderedPlugins.forEach(({ name, create, priority }) => {
      const p = priority ?? DEFAULT_PRIORITY;
      instance.Msg(`[${cfg.gamemodeName}] Loading plugin: ${name} (priority: ${p})`);
      const pluginInstance = create(pluginContext);
      pluginInstance.init();
      activePlugins.set(name, pluginInstance);
    });

    const hasEnabledList = cfg.enabledPlugins && cfg.enabledPlugins.length > 0;
    if (hasEnabledList) {
      instance.Msg(`[${cfg.gamemodeName}] Enabled plugins: ${cfg.enabledPlugins!.join(", ")}`);
    } else {
      instance.Msg(`[${cfg.gamemodeName}] All ${orderedPlugins.length} plugins loaded (no filter)`);
    }
  }

  /**
   * Iterate over plugins in priority order.
   * This ensures consistent ordering for all event dispatches.
   */
  function forEachPluginInOrder(callback: (plugin: Plugin, name: string) => void): void {
    for (const { name } of orderedPlugins) {
      const plugin = activePlugins.get(name);
      if (plugin) {
        callback(plugin, name);
      }
    }
  }

  /**
   * Event dispatch helper.
   * Dispatches an event to all plugins that implement the handler in priority order.
   *
   * @param hookName - The plugin hook method name (e.g., "onPlayerConnect")
   * @param args - Arguments to pass to the hook
   */
  function dispatchEvent(hookName: keyof Plugin, ...args: unknown[]): void {
    forEachPluginInOrder((plugin) => {
      const hook = plugin[hookName];
      if (typeof hook === "function") {
        (hook as (...a: unknown[]) => void).apply(plugin, args);
      }
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Think Loop
  // ═════════════════════════════════════════════════════════════════════════

  function setupMainThinkLoop(): void {
    instance.SetThink(() => {
      // Call onThink on all plugins every tick (in priority order)
      dispatchEvent("onThink");
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

        // Clear event bus subscriptions (handlers don't survive reload)
        eventBus.clearAll();

        // Cleanup all plugins (in priority order)
        forEachPluginInOrder((plugin) => {
          if (typeof plugin.cleanup === "function") {
            plugin.cleanup();
          }
        });

        // Aggregate all plugin states with error handling
        const state: Record<string, PluginState> = {};
        let savedCount = 0;
        let errorCount = 0;

        forEachPluginInOrder((plugin, name) => {
          const result = safeGetState(plugin, name, instance);
          if (result.success) {
            state[name] = result.data;
            savedCount++;
          } else {
            errorCount++;
          }
        });

        if (errorCount > 0) {
          instance.Msg(
            `[${cfg.gamemodeName}] WARNING: ${errorCount} plugin(s) failed to save state`
          );
        }
        instance.Msg(
          `[${cfg.gamemodeName}] State saved for hot reload (${savedCount}/${activePlugins.size} plugins)`
        );
        return state;
      },

      after: (state: Record<string, PluginState>) => {
        instance.Msg(`[${cfg.gamemodeName}] Restoring from hot reload...`);

        // Recreate all plugin instances in priority order
        // Re-sort in case priorities changed during hot reload
        orderedPlugins = getOrderedPlugins();
        createPluginInstances();

        // THEN restore state with error handling (in priority order)
        let restoredCount = 0;
        if (state) {
          forEachPluginInOrder((plugin, name) => {
            if (state[name]) {
              const success = safeRestoreState(plugin, state[name], name, instance);
              if (success) {
                restoredCount++;
              }
            }
          });
        }
        instance.Msg(
          `[${cfg.gamemodeName}] State restored for ${restoredCount}/${activePlugins.size} plugins`
        );

        // Then initialize all plugins (in priority order)
        forEachPluginInOrder((plugin) => {
          plugin.init();
        });

        // Restart think loop
        setupMainThinkLoop();

        // Call onHotReloadComplete for per-player reinitialization
        // This is needed because onPlayerActivate is NOT called for already-connected players
        let connectedPlayerCount = 0;
        for (let slot = 0; slot < MAX_PLAYER_SLOTS; slot++) {
          const player = instance.GetPlayerController(slot);
          if (player && player.IsValid()) {
            connectedPlayerCount++;
          }
        }

        if (connectedPlayerCount > 0) {
          instance.Msg(
            `[${cfg.gamemodeName}] Reinitializing ${connectedPlayerCount} connected player(s)...`
          );
          forEachPluginInOrder((plugin, name) => {
            safeHotReloadComplete(plugin, name, instance);
          });
        }

        instance.Msg(`[${cfg.gamemodeName}] Hot reload complete - all plugins restored`);
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

      // Auto-assign to team if enabled (skips team selection screen)
      if (teamCfg.autoAssign && teamCfg.defaultTeam !== undefined) {
        player.JoinTeam(teamCfg.defaultTeam);
      }

      // Notify all plugins (in priority order)
      dispatchEvent("onPlayerConnect", player);
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

      // Notify plugins (in priority order)
      dispatchEvent("onPlayerActivate", player);

      instance.Msg(
        `[${cfg.gamemodeName}] Player ${player.GetPlayerName()} activated (slot ${playerSlot})`
      );
    });

    instance.OnPlayerDisconnect(({ playerSlot }: { playerSlot: number }) => {
      instance.Msg(`[${cfg.gamemodeName}] Player ${playerSlot} disconnecting`);
      dispatchEvent("onPlayerDisconnect", playerSlot);
    });

    instance.OnPlayerReset(({ player }: { player: CSPlayerPawn }) => {
      if (!player || !player.IsValid()) return;
      dispatchEvent("onPlayerReset", player);
    });

    instance.OnPlayerJump(({ player }: { player: CSPlayerPawn }) => {
      if (!player || !player.IsValid()) return;
      dispatchEvent("onPlayerJump", player);
    });

    instance.OnPlayerLand(({ player }: { player: CSPlayerPawn }) => {
      if (!player || !player.IsValid()) return;
      dispatchEvent("onPlayerLand", player);
    });

    instance.OnPlayerChat(
      ({ player, text, team }: { player: CSPlayerController | undefined; text: string; team: number }) => {
        dispatchEvent("onPlayerChat", player, text, team);
      }
    );

    instance.OnPlayerPing(({ player, position }: { player: CSPlayerController; position: Vector }) => {
      if (!player || !player.IsValid()) return;
      dispatchEvent("onPlayerPing", player, position);
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Weapon Event Dispatchers
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Helper to get player slot from a weapon
   */
  function getWeaponOwnerSlot(weapon: CSWeaponBase): number | undefined {
    const owner = weapon.GetOwner();
    if (!owner || !owner.IsValid()) return undefined;

    const controller = owner.GetPlayerController();
    if (!controller || !controller.IsValid()) return undefined;

    return controller.GetPlayerSlot();
  }

  function setupWeaponEvents(): void {
    instance.OnGunReload(({ weapon }: { weapon: CSWeaponBase }) => {
      if (!weapon || !weapon.IsValid()) return;

      const weaponClassName = weapon.GetClassName();
      const ownerSlot = getWeaponOwnerSlot(weapon);
      if (ownerSlot === undefined) return;

      dispatchEvent("onGunReload", weaponClassName, ownerSlot);
    });

    instance.OnGunFire(({ weapon }: { weapon: CSWeaponBase }) => {
      if (!weapon || !weapon.IsValid()) return;

      const ownerSlot = getWeaponOwnerSlot(weapon);
      if (ownerSlot === undefined) return;

      dispatchEvent("onGunFire", weapon, ownerSlot);
    });

    instance.OnBulletImpact(({ weapon, position }: { weapon: CSWeaponBase; position: Vector }) => {
      if (!weapon || !weapon.IsValid()) return;
      dispatchEvent("onBulletImpact", weapon, position);
    });

    instance.OnGrenadeThrow(({ weapon, projectile }: { weapon: CSWeaponBase; projectile: Entity }) => {
      if (!weapon || !weapon.IsValid()) return;
      dispatchEvent("onGrenadeThrow", weapon, projectile);
    });

    instance.OnGrenadeBounce(({ projectile, bounces }: { projectile: Entity; bounces: number }) => {
      if (!projectile || !projectile.IsValid()) return;
      dispatchEvent("onGrenadeBounce", projectile, bounces);
    });

    instance.OnKnifeAttack(({ weapon, attackType }: { weapon: CSWeaponBase; attackType: CSWeaponAttackType }) => {
      if (!weapon || !weapon.IsValid()) return;
      dispatchEvent("onKnifeAttack", weapon, attackType);
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Round & Game Events
  // ═════════════════════════════════════════════════════════════════════════

  function setupRoundEvents(): void {
    instance.OnRoundStart(() => {
      instance.Msg(`[${cfg.gamemodeName}] Round started`);
      dispatchEvent("onRoundStart");

      // Call custom round start callback if provided
      if (cfg.onRoundStart) {
        cfg.onRoundStart();
      }
    });

    instance.OnRoundEnd(({ winningTeam, reason }: { winningTeam: number; reason: CSRoundEndReason }) => {
      instance.Msg(
        `[${cfg.gamemodeName}] Round ended - Team ${winningTeam} won (Reason: ${reason})`
      );

      dispatchEvent("onRoundEnd", winningTeam, reason);

      // Call custom round end callback if provided
      if (cfg.onRoundEnd) {
        cfg.onRoundEnd(winningTeam, reason);
      }
    });

    instance.OnBombPlant(({ plantedC4, planter }: { plantedC4: Entity; planter: CSPlayerPawn }) => {
      dispatchEvent("onBombPlant", plantedC4, planter);
    });

    instance.OnBombDefuse(({ plantedC4, defuser }: { plantedC4: Entity; defuser: CSPlayerPawn }) => {
      dispatchEvent("onBombDefuse", plantedC4, defuser);
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Damage Events
  // ═════════════════════════════════════════════════════════════════════════

  function setupDamageEvents(): void {
    /**
     * OnBeforePlayerDamage - SPECIAL HANDLING
     * Plugins are called in priority order. The FIRST plugin to return
     * a non-void value (either damage modification or abort) wins.
     * This allows high-priority plugins (like god mode) to override others.
     */
    instance.OnBeforePlayerDamage((event: BeforePlayerDamageEvent) => {
      for (const { name } of orderedPlugins) {
        const plugin = activePlugins.get(name);
        if (plugin && typeof plugin.onBeforePlayerDamage === "function") {
          const result = plugin.onBeforePlayerDamage(event);
          if (result !== undefined) {
            // First non-void return wins
            return result;
          }
        }
      }
      // No plugin modified/aborted - let damage proceed normally
      return undefined;
    });

    instance.OnPlayerDamage((event: PlayerDamageEvent) => {
      dispatchEvent("onPlayerDamage", event);
    });

    instance.OnPlayerKill(
      ({
        player,
        inflictor,
        attacker,
        weapon,
      }: {
        player: CSPlayerPawn;
        inflictor?: Entity;
        attacker?: Entity;
        weapon?: CSWeaponBase;
      }) => {
        if (!player || !player.IsValid()) return;
        dispatchEvent("onPlayerKill", player, inflictor, attacker, weapon);
      }
    );
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

      // Initialize plugins
      initializePlugins();

      // Setup event handlers
      setupPlayerEvents();
      setupWeaponEvents();
      setupRoundEvents();
      setupDamageEvents();

      // Setup hot reload
      setupHotReload();

      // Start main think loop
      setupMainThinkLoop();

      instance.Msg("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    },

    getPlugin(name: string): Plugin | undefined {
      return activePlugins.get(name);
    },

    getActivePlugins(): Map<string, Plugin> {
      return activePlugins;
    },

    getEventBus(): EventBus {
      return eventBus;
    },
  };
}
