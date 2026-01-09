/**
 * Player Equipment Management
 * Handles zeus/taser distribution and maintenance for the multitool system
 */

import { CSPlayerController, Instance } from "cs_script/point_script";

/**
 * Give zeus (taser) to a player
 * This is the multitool "weapon" for interacting with the world
 */
export function giveZeusToPlayer(player: CSPlayerController): void {
  const pawn = player.GetPlayerPawn();
  if (!pawn || !pawn.IsValid()) return;

  // Strip all weapons first
  pawn.DestroyWeapons();

  // Give taser (multitool)
  pawn.GiveNamedItem("weapon_taser", true); // Auto-equip

  // For human players only - give full health/armor
  if (!player.IsBot()) {
    pawn.SetHealth(100);
    pawn.SetArmor(100);

    Instance.Msg(`[Multitool:Equipment] Zeus given to ${player.GetPlayerName()} - Ready for building!`);
  }
}

/**
 * Ensure all human players have zeus
 * Called periodically to maintain equipment state
 */
export function ensureHumanPlayersHaveZeus(): void {
  for (let slot = 0; slot < 64; slot++) {
    const controller = Instance.GetPlayerController(slot);
    if (!controller || controller.IsBot()) continue;

    const pawn = controller.GetPlayerPawn();
    if (!pawn || !pawn.IsValid()) continue;

    // Check if they have zeus
    const zeus = pawn.FindWeapon("weapon_taser");
    if (!zeus || !zeus.IsValid()) {
      // Give them zeus
      pawn.GiveNamedItem("weapon_taser", true);
      Instance.Msg(`[Multitool:Equipment] Re-giving zeus to ${controller.GetPlayerName()}`);
    }
  }
}

/**
 * Setup damage handler to block taser damage
 * The taser is our multitool, not an actual weapon
 */
export function setupTaserDamageBlocking(): void {
  Instance.OnBeforePlayerDamage(({ weapon }) => {
    // Block taser damage to ALL players (taser is multitool, not a weapon)
    if (weapon && weapon.IsValid() && weapon.GetClassName() === "weapon_taser") {
      return { abort: true };
    }

    // Allow all other damage
    return undefined;
  });

  Instance.Msg("[Multitool:Equipment] Taser damage blocking registered");
}
