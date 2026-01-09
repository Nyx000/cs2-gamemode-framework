/**
 * Chat command handlers for mode switching and prop selection
 */

import { CSPlayerController, Instance } from "cs_script/point_script";
import { PLACEABLE_PROPS } from "./config";
import {
  cycleMode,
  cycleNextProp,
  cyclePrevProp,
  getHeldProp,
  getPlayerState,
  setHeldProp,
  setPlayerMode,
} from "./player-state";
import { setPreviewModel } from "./preview-manager";
import { cleanupInvalidProps, placedProps, removeAllPlayerProps } from "./prop-manager";
import { MultitoolMode } from "./types";

/**
 * Find a player by name or slot ID
 */
function findPlayerByIdentifier(identifier: string): CSPlayerController | undefined {
  // Try to parse as slot number first
  const slotNumber = parseInt(identifier);
  if (!isNaN(slotNumber)) {
    return Instance.GetPlayerController(slotNumber);
  }

  // Search by name (case-insensitive)
  const searchName = identifier.toLowerCase();
  for (let slot = 0; slot < 64; slot++) {
    // CS2 supports up to 64 players
    const player = Instance.GetPlayerController(slot);
    if (player && player.IsValid()) {
      const playerName = player.GetPlayerName().toLowerCase();
      if (playerName.includes(searchName)) {
        return player;
      }
    }
  }

  return undefined;
}

/**
 * Setup chat command handlers
 */
export function setupChatHandlers(): void {
  Instance.OnPlayerChat(({ player, text }) => {
    // Defensive check
    if (!player || !player.IsValid()) {
      Instance.Msg(`[MT:ChatHandler] Invalid player received`);
      return;
    }

    const playerSlot = player.GetPlayerSlot();
    const command = text.toLowerCase().trim();

    // Debug log
    Instance.Msg(`[MT:ChatHandler] Player ${playerSlot} said: "${command}"`);

    // Mode switching commands
    if (command === "!nextmode" || command === "!cyclemode") {
      cycleMode(playerSlot);
    } else if (command === "!place" || command === "!p") {
      setPlayerMode(playerSlot, MultitoolMode.PLACE);
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
      Instance.ClientCommand(playerSlot, 'echo "Mode: PLACE"');
      Instance.ClientCommand(playerSlot, 'echo "Fire to place the selected prop"');
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
    } else if (command === "!move" || command === "!m") {
      setPlayerMode(playerSlot, MultitoolMode.MOVE);
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
      Instance.ClientCommand(playerSlot, 'echo "Mode: MOVE"');
      Instance.ClientCommand(playerSlot, 'echo "Fire at a prop to move it to aim point"');
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
    } else if (command === "!rotate" || command === "!r") {
      setPlayerMode(playerSlot, MultitoolMode.ROTATE);
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
      Instance.ClientCommand(playerSlot, 'echo "Mode: ROTATE"');
      Instance.ClientCommand(playerSlot, 'echo "Fire at a prop to rotate it 15°"');
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
    } else if (command === "!scale" || command === "!s") {
      setPlayerMode(playerSlot, MultitoolMode.SCALE);
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
      Instance.ClientCommand(playerSlot, 'echo "Mode: SCALE"');
      Instance.ClientCommand(playerSlot, 'echo "Fire at prop to scale up"');
      Instance.ClientCommand(playerSlot, 'echo "Crouch + Fire to scale down"');
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
    } else if (command === "!delete" || command === "!d") {
      setPlayerMode(playerSlot, MultitoolMode.DELETE);
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
      Instance.ClientCommand(playerSlot, 'echo "Mode: DELETE"');
      Instance.ClientCommand(playerSlot, 'echo "Fire at a prop to delete it"');
      Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
    }
    // Prop selection commands
    else if (command === "!next" || command === "!n") {
      cycleNextProp(playerSlot);
      setPreviewModel(playerSlot);
      const state = getPlayerState(playerSlot);
      if (state) {
        const prop = PLACEABLE_PROPS[state.selectedPropIndex];
        Instance.ClientCommand(playerSlot, `echo "Selected: ${prop.name} (HP: ${prop.maxHealth})"`);
      }
    } else if (command === "!prev") {
      cyclePrevProp(playerSlot);
      setPreviewModel(playerSlot);
      const state = getPlayerState(playerSlot);
      if (state) {
        const prop = PLACEABLE_PROPS[state.selectedPropIndex];
        Instance.ClientCommand(playerSlot, `echo "Selected: ${prop.name} (HP: ${prop.maxHealth})"`);
      }
    }
    // Utility commands
    else if (command === "!give") {
      const pawn = player.GetPlayerPawn();
      if (pawn) {
        pawn.GiveNamedItem("weapon_taser", true);
        Instance.ClientCommand(playerSlot, 'echo "Given multitool (taser)"');
      }
    } else if (command === "!help" || command === "!h") {
      displayHelp(playerSlot);
    } else if (command === "!info" || command === "!i") {
      displayInfo(playerSlot);
    } else if (command === "!fix") {
      cleanupInvalidProps();
      Instance.ClientCommand(playerSlot, 'echo "Cleaned up invalid prop references"');
    } else if (command === "!list" || command === "!props") {
      displayAvailableProps(playerSlot);
    } else if (command === "!placed" || command === "!spawned" || command === "!listents") {
      displayPlacedProps(playerSlot);
    } else if (command === "!release") {
      const heldProp = getHeldProp(playerSlot);
      if (heldProp) {
        setHeldProp(playerSlot, null);
        Instance.ClientCommand(playerSlot, 'echo "Released prop"');
      } else {
        Instance.ClientCommand(playerSlot, 'echo "Not holding any prop"');
      }
    }
    // Cleanup command - supports arguments
    else if (command.startsWith("!cleanup") || command.startsWith("!clear")) {
      handleCleanupCommand(playerSlot, text);
    }
  });

  Instance.Msg("[MT:ChatHandler] Chat handlers initialized");
}

/**
 * Handle cleanup command with optional player argument
 */
function handleCleanupCommand(requesterSlot: number, fullText: string): void {
  const parts = fullText.split(" ");

  // If no argument provided, cleanup requester's props
  if (parts.length === 1) {
    removeAllPlayerProps(requesterSlot);
    Instance.ClientCommand(requesterSlot, 'echo "Cleaned up your props"');
    return;
  }

  // Parse argument (player name or ID)
  const targetIdentifier = parts.slice(1).join(" "); // Join in case name has spaces
  const targetPlayer = findPlayerByIdentifier(targetIdentifier);

  if (!targetPlayer || !targetPlayer.IsValid()) {
    Instance.ClientCommand(requesterSlot, `echo "Player '${targetIdentifier}' not found"`);
    return;
  }

  const targetSlot = targetPlayer.GetPlayerSlot();
  const targetName = targetPlayer.GetPlayerName();

  // Check if requester is trying to cleanup someone else's props
  if (targetSlot !== requesterSlot) {
    Instance.ClientCommand(requesterSlot, `echo "Cleaned up ${targetName}'s props"`);
    Instance.ClientCommand(targetSlot, `echo "Your props were cleaned up by another player"`);
  } else {
    Instance.ClientCommand(requesterSlot, 'echo "Cleaned up your props"');
  }

  removeAllPlayerProps(targetSlot);
}

/**
 * Display help information
 */
function displayHelp(playerSlot: number): void {
  Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━ WORKBENCH HELP ━━━━━━━━━━"');
  Instance.ClientCommand(playerSlot, 'echo "MODE SWITCHING:"');
  Instance.ClientCommand(playerSlot, 'echo "  !nextmode - Cycle modes"');
  Instance.ClientCommand(playerSlot, 'echo "  !place or !p - Place props"');
  Instance.ClientCommand(playerSlot, 'echo "  !move or !m - Grab and move props (physgun)"');
  Instance.ClientCommand(playerSlot, 'echo "  !rotate or !r - Rotate props"');
  Instance.ClientCommand(playerSlot, 'echo "  !scale or !s - Scale props"');
  Instance.ClientCommand(playerSlot, 'echo "  !delete or !d - Delete props"');
  Instance.ClientCommand(playerSlot, 'echo ""');
  Instance.ClientCommand(playerSlot, 'echo "MOVE MODE:"');
  Instance.ClientCommand(playerSlot, 'echo "  Click prop - Grab it"');
  Instance.ClientCommand(playerSlot, 'echo "  Aim crosshair - Prop follows your aim"');
  Instance.ClientCommand(playerSlot, 'echo "  Click again - Release prop"');
  Instance.ClientCommand(playerSlot, 'echo "  !release - Release held prop"');
  Instance.ClientCommand(playerSlot, 'echo ""');
  Instance.ClientCommand(playerSlot, 'echo "PROP SELECTION:"');
  Instance.ClientCommand(playerSlot, 'echo "  !props or !list - Show available props"');
  Instance.ClientCommand(playerSlot, 'echo "  !next or !n - Next prop"');
  Instance.ClientCommand(playerSlot, 'echo "  !prev - Previous prop"');
  Instance.ClientCommand(playerSlot, 'echo ""');
  Instance.ClientCommand(playerSlot, 'echo "UTILITY:"');
  Instance.ClientCommand(playerSlot, 'echo "  !give - Get multitool"');
  Instance.ClientCommand(playerSlot, 'echo "  !info or !i - Current status"');
  Instance.ClientCommand(playerSlot, 'echo "  !fix - Clean up invalid prop references"');
  Instance.ClientCommand(playerSlot, 'echo "  !placed or !spawned - Show placed props"');
  Instance.ClientCommand(playerSlot, 'echo "  !cleanup or !clear - Clean up your props"');
  Instance.ClientCommand(playerSlot, 'echo "  !cleanup <player> - Clean up player\'s props"');
  Instance.ClientCommand(playerSlot, 'echo "  !help or !h - This help"');
  Instance.ClientCommand(playerSlot, 'echo ""');
  Instance.ClientCommand(playerSlot, 'echo "LIMITS:"');
  Instance.ClientCommand(playerSlot, 'echo "  Max props per player: 30"');
  Instance.ClientCommand(playerSlot, 'echo "  No time limits - Free roam!"');
  Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
}

/**
 * Display current player info
 */
function displayInfo(playerSlot: number): void {
  const state = getPlayerState(playerSlot);
  if (!state) {
    Instance.ClientCommand(playerSlot, 'echo "No state found"');
    return;
  }

  const prop = PLACEABLE_PROPS[state.selectedPropIndex];

  Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━ MULTITOOL INFO ━━━━━━━━━━"');
  Instance.ClientCommand(playerSlot, `echo "Mode: ${state.mode.toUpperCase()}"`);
  Instance.ClientCommand(
    playerSlot,
    `echo "Selected: ${prop.name} (${state.selectedPropIndex + 1}/${PLACEABLE_PROPS.length})"`
  );
  Instance.ClientCommand(playerSlot, `echo "Health: ${prop.maxHealth} HP"`);
  Instance.ClientCommand(playerSlot, `echo "Scale: ${prop.defaultScale}x"`);
  Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
}

/**
 * Display list of available prop types
 */
function displayAvailableProps(playerSlot: number): void {
  const state = getPlayerState(playerSlot);
  const currentIndex = state?.selectedPropIndex ?? 0;

  Instance.ClientCommand(playerSlot, 'echo "━━━━ AVAILABLE PROPS ━━━━"');

  for (let i = 0; i < PLACEABLE_PROPS.length; i++) {
    const prop = PLACEABLE_PROPS[i];
    const marker = i === currentIndex ? ">>>" : "   ";
    Instance.ClientCommand(playerSlot, `echo "${marker} ${i + 1}. ${prop.name} (HP: ${prop.maxHealth})"`);
  }

  Instance.ClientCommand(playerSlot, 'echo ""');
  Instance.ClientCommand(playerSlot, 'echo "Use !next or !prev to select"');
  Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
}

/**
 * Display list of all placed props in the world
 */
function displayPlacedProps(playerSlot: number): void {
  if (placedProps.length === 0) {
    Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
    Instance.ClientCommand(playerSlot, 'echo "No props placed yet"');
    Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
    return;
  }

  // Group props by owner
  const propsByOwner = new Map<number, typeof placedProps>();
  for (const prop of placedProps) {
    if (!propsByOwner.has(prop.ownerSlot)) {
      propsByOwner.set(prop.ownerSlot, []);
    }
    const ownerProps = propsByOwner.get(prop.ownerSlot);
    if (ownerProps) {
      ownerProps.push(prop);
    }
  }

  Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
  Instance.ClientCommand(playerSlot, `echo "Total Props: ${placedProps.length}"`);
  Instance.ClientCommand(playerSlot, 'echo ""');

  // Display props grouped by owner
  for (const [ownerSlot, ownerProps] of propsByOwner) {
    const owner = Instance.GetPlayerController(ownerSlot);
    const ownerName = owner?.GetPlayerName() || `Player ${ownerSlot}`;

    Instance.ClientCommand(playerSlot, `echo "${ownerName} (${ownerProps.length} props):"`);

    for (let i = 0; i < ownerProps.length; i++) {
      const prop = ownerProps[i];
      const propDef = PLACEABLE_PROPS[prop.propDefIndex];
      const healthPercent = Math.round((prop.health / prop.maxHealth) * 100);

      Instance.ClientCommand(
        playerSlot,
        `echo "  ${i + 1}. ${propDef.name} - HP: ${prop.health}/${prop.maxHealth} (${healthPercent}%) - Scale: ${prop.scale.toFixed(1)}x"`
      );
      Instance.ClientCommand(
        playerSlot,
        `echo "     Pos: (${prop.position.x.toFixed(1)}, ${prop.position.y.toFixed(1)}, ${prop.position.z.toFixed(1)})"`
      );
    }

    if (propsByOwner.size > 1) {
      Instance.ClientCommand(playerSlot, 'echo ""');
    }
  }

  Instance.ClientCommand(playerSlot, 'echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"');
}
