/**
 * Weapon interaction handler - taser fire detection and raycasting
 */

import { CSPlayerPawn, Instance, QAngle, TraceResult, Vector } from "cs_script/point_script";
import {
  MAX_SCALE,
  MIN_SCALE,
  PLACEABLE_PROPS,
  RAYCAST_DISTANCE,
  ROTATION_INCREMENT,
  SCALE_MULTIPLIER,
} from "./config";
import { getHeldProp, getPlayerState, setHeldProp } from "./player-state";
import { hidePreview } from "./preview-manager";
import {
  canPlayerManipulateProp,
  findPropByEntity,
  removeProp,
  spawnProp,
  updatePropRotation,
  updatePropScale,
} from "./prop-manager";
import { MultitoolMode } from "./types";

/**
 * Setup weapon event handlers
 */
export function setupWeaponHandlers(): void {
  Instance.OnGunFire(({ weapon }) => {
    // Get weapon data safely
    const weaponData = weapon.GetData();
    if (!weaponData) return;

    const weaponName = weaponData.GetName();

    // Only handle taser
    if (weaponName !== "weapon_taser") return;

    const owner = weapon.GetOwner();
    if (!owner || !owner.IsValid()) return;

    const controller = owner.GetPlayerController();
    if (!controller) return;

    const playerSlot = controller.GetPlayerSlot();
    handleMultitoolFire(playerSlot, owner);
  });

  Instance.Msg("[MT:WeaponHandler] Weapon handlers initialized");
}

/**
 * Handle multitool (taser) fire
 */
function handleMultitoolFire(playerSlot: number, pawn: CSPlayerPawn): void {
  const state = getPlayerState(playerSlot);
  if (!state) return;

  const trace = performRaycast(pawn);

  // Route to appropriate handler based on mode
  switch (state.mode) {
    case MultitoolMode.PLACE:
      handlePlacementFire(playerSlot, pawn, trace);
      break;
    case MultitoolMode.MOVE:
      handleMoveFire(playerSlot, pawn, trace);
      break;
    case MultitoolMode.ROTATE:
      handleRotateFire(playerSlot, pawn, trace);
      break;
    case MultitoolMode.SCALE:
      handleScaleFire(playerSlot, pawn, trace);
      break;
    case MultitoolMode.DELETE:
      handleDeleteFire(playerSlot, pawn, trace);
      break;
  }
}

/**
 * Handle placement mode fire
 */
function handlePlacementFire(playerSlot: number, _pawn: CSPlayerPawn, trace: TraceResult): void {
  if (!trace.didHit) return;

  const state = getPlayerState(playerSlot);
  if (!state) return;

  const propDef = PLACEABLE_PROPS[state.selectedPropIndex];

  // Calculate placement angles based on surface normal
  const angles = calculateAnglesFromNormal(trace.normal);

  // Spawn the prop
  const prop = spawnProp(playerSlot, propDef, state.selectedPropIndex, trace.end, angles);

  if (prop) {
    Instance.ClientCommand(playerSlot, `echo "Placed ${propDef.name} (HP: ${propDef.maxHealth})"`);
    hidePreview(playerSlot);
  }
}

/**
 * Handle move mode fire (physgun-style grab/release)
 */
function handleMoveFire(playerSlot: number, _pawn: CSPlayerPawn, trace: TraceResult): void {
  const currentlyHeld = getHeldProp(playerSlot);

  // If already holding a prop, release it
  if (currentlyHeld) {
    setHeldProp(playerSlot, null);
    Instance.ClientCommand(playerSlot, 'echo "Released prop"');
    return;
  }

  // Try to grab a prop
  if (!trace.didHit || !trace.hitEntity) {
    Instance.ClientCommand(playerSlot, 'echo "No prop to grab"');
    return;
  }

  const prop = findPropByEntity(trace.hitEntity);
  if (!prop) {
    Instance.ClientCommand(playerSlot, 'echo "Not a prop"');
    return;
  }

  if (!canPlayerManipulateProp(playerSlot, prop)) {
    Instance.ClientCommand(playerSlot, 'echo "Cannot grab - not your prop"');
    return;
  }

  // Grab the prop
  setHeldProp(playerSlot, prop.entityName);
  Instance.ClientCommand(playerSlot, 'echo "Grabbed prop (click to release)"');
}

/**
 * Handle rotate mode fire
 */
function handleRotateFire(playerSlot: number, _pawn: CSPlayerPawn, trace: TraceResult): void {
  if (!trace.didHit || !trace.hitEntity) return;

  const prop = findPropByEntity(trace.hitEntity);
  if (!prop) return;

  if (!canPlayerManipulateProp(playerSlot, prop)) {
    Instance.ClientCommand(playerSlot, `echo "Cannot rotate - not your prop"`);
    return;
  }

  // Increment yaw rotation
  const newAngles = {
    ...prop.angles,
    yaw: (prop.angles.yaw + ROTATION_INCREMENT) % 360,
  };

  updatePropRotation(prop, newAngles);
  Instance.ClientCommand(playerSlot, `echo "Rotated prop (yaw: ${newAngles.yaw.toFixed(1)}°)"`);
}

/**
 * Handle scale mode fire
 */
function handleScaleFire(playerSlot: number, _pawn: CSPlayerPawn, trace: TraceResult): void {
  if (!trace.didHit || !trace.hitEntity) return;

  const prop = findPropByEntity(trace.hitEntity);
  if (!prop) return;

  if (!canPlayerManipulateProp(playerSlot, prop)) {
    Instance.ClientCommand(playerSlot, `echo "Cannot scale - not your prop"`);
    return;
  }

  // Check if crouching (scale down) or standing (scale up)
  const pawnEntity = Instance.GetPlayerController(playerSlot)?.GetPlayerPawn();
  const isCrouching = pawnEntity?.IsCrouching() || false;

  let newScale: number;
  if (isCrouching) {
    newScale = Math.max(MIN_SCALE, prop.scale / SCALE_MULTIPLIER);
  } else {
    newScale = Math.min(MAX_SCALE, prop.scale * SCALE_MULTIPLIER);
  }

  updatePropScale(prop, newScale);
  Instance.ClientCommand(playerSlot, `echo "Scaled prop (${newScale.toFixed(2)}x)"`);
}

/**
 * Handle delete mode fire
 */
function handleDeleteFire(playerSlot: number, _pawn: CSPlayerPawn, trace: TraceResult): void {
  if (!trace.didHit || !trace.hitEntity) return;

  const prop = findPropByEntity(trace.hitEntity);
  if (!prop) return;

  if (!canPlayerManipulateProp(playerSlot, prop)) {
    Instance.ClientCommand(playerSlot, `echo "Cannot delete - not your prop"`);
    return;
  }

  removeProp(prop);
  Instance.ClientCommand(playerSlot, `echo "Deleted prop"`);
}

/**
 * Perform raycast from player's eye position
 */
export function performRaycast(pawn: CSPlayerPawn): TraceResult {
  const eyePos = pawn.GetEyePosition();
  const eyeAngles = pawn.GetEyeAngles();
  const forward = anglesToForward(eyeAngles);

  const traceEnd = {
    x: eyePos.x + forward.x * RAYCAST_DISTANCE,
    y: eyePos.y + forward.y * RAYCAST_DISTANCE,
    z: eyePos.z + forward.z * RAYCAST_DISTANCE,
  };

  return Instance.TraceLine({
    start: eyePos,
    end: traceEnd,
    ignoreEntity: pawn,
  });
}

/**
 * Convert angles to forward vector
 */
export function anglesToForward(angles: QAngle): Vector {
  const yaw = (angles.yaw * Math.PI) / 180;
  const pitch = (angles.pitch * Math.PI) / 180;

  return {
    x: Math.cos(pitch) * Math.cos(yaw),
    y: Math.cos(pitch) * Math.sin(yaw),
    z: -Math.sin(pitch),
  };
}

/**
 * Calculate placement angles from surface normal
 * TODO: Could be enhanced to align props with surface normal for realistic placement
 */
function calculateAnglesFromNormal(_normal: Vector): QAngle {
  // For now, just use default angles
  // Could be enhanced to align with surface normal
  return { pitch: 0, yaw: 0, roll: 0 };
}
