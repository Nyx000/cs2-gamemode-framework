/**
 * Player state management for the Multitool system
 */

import { Instance } from "cs_script/point_script";
import { PLACEABLE_PROPS } from "./config";
import { MultitoolMode, PlayerState } from "./types";

/**
 * Map of player slot to their state
 */
export const playerStates = new Map<number, PlayerState>();

/**
 * Initialize state for a new player
 */
export function initPlayerState(playerSlot: number): void {
  if (!playerStates.has(playerSlot)) {
    playerStates.set(playerSlot, {
      mode: MultitoolMode.PLACE,
      selectedPropIndex: 0,
      previewEntityName: null,
      previewActive: false,
      heldPropName: null,
      grabDistance: 250,
    });
    Instance.Msg(`[MT:PlayerState] Initialized state for player ${playerSlot}`);
  }
}

/**
 * Get player state (returns undefined if not initialized)
 */
export function getPlayerState(playerSlot: number): PlayerState | undefined {
  return playerStates.get(playerSlot);
}

/**
 * Set the current mode for a player
 */
export function setPlayerMode(playerSlot: number, mode: MultitoolMode): void {
  const state = playerStates.get(playerSlot);
  if (state) {
    // Release held prop when changing modes
    if (state.heldPropName) {
      state.heldPropName = null;
      Instance.ClientCommand(playerSlot, 'echo "Released prop (mode changed)"');
    }

    state.mode = mode;
    Instance.Msg(`[MT:PlayerState] Player ${playerSlot} mode: ${mode}`);
  }
}

/**
 * Set the held prop for a player (physgun grab)
 */
export function setHeldProp(playerSlot: number, propName: string | null): void {
  const state = getPlayerState(playerSlot);
  if (state) {
    state.heldPropName = propName;
  }
}

/**
 * Get the name of the prop currently held by a player
 */
export function getHeldProp(playerSlot: number): string | null {
  const state = getPlayerState(playerSlot);
  return state?.heldPropName ?? null;
}

/**
 * Check if a player is currently holding a prop
 */
export function isHoldingProp(playerSlot: number): boolean {
  const state = getPlayerState(playerSlot);
  return state?.heldPropName !== null;
}

/**
 * Cycle to the next prop in the catalog
 */
export function cycleNextProp(playerSlot: number): void {
  const state = playerStates.get(playerSlot);
  if (state) {
    state.selectedPropIndex = (state.selectedPropIndex + 1) % PLACEABLE_PROPS.length;
    const prop = PLACEABLE_PROPS[state.selectedPropIndex];
    Instance.Msg(
      `[MT:PlayerState] Player ${playerSlot} selected: ${prop.name} (${state.selectedPropIndex + 1}/${PLACEABLE_PROPS.length})`
    );
  }
}

/**
 * Cycle to the previous prop in the catalog
 */
export function cyclePrevProp(playerSlot: number): void {
  const state = playerStates.get(playerSlot);
  if (state) {
    state.selectedPropIndex = (state.selectedPropIndex - 1 + PLACEABLE_PROPS.length) % PLACEABLE_PROPS.length;
    const prop = PLACEABLE_PROPS[state.selectedPropIndex];
    Instance.Msg(
      `[MT:PlayerState] Player ${playerSlot} selected: ${prop.name} (${state.selectedPropIndex + 1}/${PLACEABLE_PROPS.length})`
    );
  }
}

/**
 * Cycle through modes (place -> move -> rotate -> scale -> delete -> place)
 */
export function cycleMode(playerSlot: number): void {
  const state = getPlayerState(playerSlot);
  if (!state) return;

  // Cycle: place -> move -> rotate -> scale -> delete -> place
  const modes = [
    MultitoolMode.PLACE,
    MultitoolMode.MOVE,
    MultitoolMode.ROTATE,
    MultitoolMode.SCALE,
    MultitoolMode.DELETE,
  ];

  const currentIndex = modes.indexOf(state.mode);
  const nextIndex = (currentIndex + 1) % modes.length;
  const nextMode = modes[nextIndex];

  setPlayerMode(playerSlot, nextMode);

  // Show feedback
  Instance.ClientCommand(playerSlot, `echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"`);
  Instance.ClientCommand(playerSlot, `echo "Mode: ${nextMode.toUpperCase()}"`);
  Instance.ClientCommand(playerSlot, `echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"`);
}

/**
 * Remove player state (on disconnect)
 */
export function removePlayerState(playerSlot: number): void {
  playerStates.delete(playerSlot);
  Instance.Msg(`[MT:PlayerState] Removed state for player ${playerSlot}`);
}

/**
 * Get serializable state for hot reload
 */
export function getSerializableState(): Array<[number, PlayerState]> {
  return Array.from(playerStates.entries());
}

/**
 * Restore state from hot reload
 */
export function restoreState(savedStates: Array<[number, PlayerState]>): void {
  playerStates.clear();
  for (const [slot, state] of savedStates) {
    playerStates.set(slot, state);
  }
  Instance.Msg(`[MT:PlayerState] Restored state for ${playerStates.size} players`);
}

/**
 * Clear stale entity names after hot reload
 *
 * Entity references (stored as names) don't point to valid entities after hot reload.
 * This clears the references so they can be recreated.
 *
 * @param playerSlot - Optional specific player slot to clear, clears all if not provided
 */
export function clearStaleEntityNames(playerSlot?: number): void {
  if (playerSlot !== undefined) {
    // Clear specific player
    const state = playerStates.get(playerSlot);
    if (state) {
      state.previewEntityName = null;
      state.heldPropName = null;
      state.previewActive = false;
      Instance.Msg(`[MT:PlayerState] Cleared stale entity names for player ${playerSlot}`);
    }
  } else {
    // Clear all players
    let clearedCount = 0;
    playerStates.forEach((state) => {
      state.previewEntityName = null;
      state.heldPropName = null;
      state.previewActive = false;
      clearedCount++;
    });
    Instance.Msg(`[MT:PlayerState] Cleared stale entity names for ${clearedCount} players`);
  }
}
