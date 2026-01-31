/**
 * Debug Plugin - Event Logger
 *
 * Logs all game events to the console for debugging purposes.
 * Useful during development to understand event timing and data.
 *
 * Enable/disable via the ENABLED constant or by removing "debug" from enabledPlugins.
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
} from "cs_script/point_script";
import { Plugin, PluginContext } from "../../core/plugin";

/** Set to false to disable all debug logging */
const ENABLED = true;

/** Prefix for all debug messages */
const PREFIX = "[Debug]";

/**
 * Create the debug plugin
 */
export function createDebug({ instance }: PluginContext): Plugin {
  function log(event: string, details?: string) {
    if (!ENABLED) return;
    const msg = details ? `${PREFIX} ${event}: ${details}` : `${PREFIX} ${event}`;
    instance.Msg(msg);
  }

  return {
    // ─────────────────────────────────────────────────────────────────────────
    // Required Lifecycle Methods
    // ─────────────────────────────────────────────────────────────────────────

    init() {
      log("Plugin initialized", `logging ${ENABLED ? "enabled" : "disabled"}`);
    },

    cleanup() {
      log("Cleanup");
    },

    getState() {
      return {};
    },

    restoreState() {
      log("State restored");
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Player Events
    // ─────────────────────────────────────────────────────────────────────────

    onPlayerConnect(player: CSPlayerController) {
      log("PlayerConnect", `${player.GetPlayerName()} (slot ${player.GetPlayerSlot()})`);
    },

    onPlayerActivate(player: CSPlayerController) {
      log("PlayerActivate", `${player.GetPlayerName()} (slot ${player.GetPlayerSlot()})`);
    },

    onPlayerDisconnect(playerSlot: number) {
      log("PlayerDisconnect", `slot ${playerSlot}`);
    },

    onPlayerReset(player: CSPlayerPawn) {
      const controller = player.GetPlayerController();
      const name = controller?.IsValid() ? controller.GetPlayerName() : "unknown";
      log("PlayerReset", name);
    },

    onPlayerJump(player: CSPlayerPawn) {
      const controller = player.GetPlayerController();
      const name = controller?.IsValid() ? controller.GetPlayerName() : "unknown";
      log("PlayerJump", name);
    },

    onPlayerLand(player: CSPlayerPawn) {
      const controller = player.GetPlayerController();
      const name = controller?.IsValid() ? controller.GetPlayerName() : "unknown";
      log("PlayerLand", name);
    },

    onPlayerChat(player: CSPlayerController | undefined, text: string, team: number) {
      const name = player?.IsValid() ? player.GetPlayerName() : "server";
      log("PlayerChat", `[${name}] (team ${team}): ${text}`);
    },

    onPlayerPing(player: CSPlayerController, position: Vector) {
      log("PlayerPing", `${player.GetPlayerName()} at (${position.x.toFixed(0)}, ${position.y.toFixed(0)}, ${position.z.toFixed(0)})`);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Round Events
    // ─────────────────────────────────────────────────────────────────────────

    onRoundStart() {
      log("RoundStart");
    },

    onRoundEnd(winningTeam: number, reason: CSRoundEndReason) {
      log("RoundEnd", `team ${winningTeam} won (reason: ${reason})`);
    },

    onBombPlant(_plantedC4: Entity, planter: CSPlayerPawn) {
      const controller = planter.GetPlayerController();
      const name = controller?.IsValid() ? controller.GetPlayerName() : "unknown";
      log("BombPlant", `${name} planted C4`);
    },

    onBombDefuse(_plantedC4: Entity, defuser: CSPlayerPawn) {
      const controller = defuser.GetPlayerController();
      const name = controller?.IsValid() ? controller.GetPlayerName() : "unknown";
      log("BombDefuse", `${name} defused C4`);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Damage Events
    // ─────────────────────────────────────────────────────────────────────────

    onBeforePlayerDamage(event: BeforePlayerDamageEvent) {
      log("BeforePlayerDamage", `${event.damage} damage`);
      return undefined; // Don't modify damage
    },

    onPlayerDamage(event: PlayerDamageEvent) {
      log("PlayerDamage", `${event.damage} damage dealt`);
    },

    onPlayerKill(player: CSPlayerPawn, _inflictor?: Entity, _attacker?: Entity, weapon?: CSWeaponBase) {
      const victimController = player.GetPlayerController();
      const victimName = victimController?.IsValid() ? victimController.GetPlayerName() : "unknown";
      const weaponName = weapon?.IsValid() ? weapon.GetClassName() : "unknown";
      log("PlayerKill", `${victimName} killed with ${weaponName}`);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Weapon Events
    // ─────────────────────────────────────────────────────────────────────────

    onGunReload(weaponClassName: string, ownerSlot: number) {
      log("GunReload", `${weaponClassName} (slot ${ownerSlot})`);
    },

    onGunFire(weapon: CSWeaponBase, ownerSlot: number) {
      log("GunFire", `${weapon.GetClassName()} (slot ${ownerSlot})`);
    },

    onBulletImpact(weapon: CSWeaponBase, position: Vector) {
      log("BulletImpact", `${weapon.GetClassName()} at (${position.x.toFixed(0)}, ${position.y.toFixed(0)}, ${position.z.toFixed(0)})`);
    },

    onGrenadeThrow(weapon: CSWeaponBase, _projectile: Entity) {
      log("GrenadeThrow", weapon.GetClassName());
    },

    onGrenadeBounce(projectile: Entity, bounces: number) {
      log("GrenadeBounce", `${projectile.GetClassName()} bounce #${bounces}`);
    },

    onKnifeAttack(weapon: CSWeaponBase, attackType: CSWeaponAttackType) {
      const type = attackType === 0 ? "PRIMARY" : "SECONDARY";
      log("KnifeAttack", `${weapon.GetClassName()} ${type}`);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Think Loop (disabled by default - too spammy)
    // ─────────────────────────────────────────────────────────────────────────

    // onThink() {
    //   log("Think");
    // },
  };
}
