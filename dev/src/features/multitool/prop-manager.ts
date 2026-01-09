/**
 * Prop lifecycle management - spawning, tracking, and removal
 */

import { BaseModelEntity, CSPlayerPawn, Entity, Instance, PointTemplate, QAngle, Vector } from "cs_script/point_script";
import { MAX_PROPS_PER_PLAYER, PROP_TEMPLATE_NAME } from "./config";
import { getHeldProp, setHeldProp } from "./player-state";
import { PlaceableProp, PropInstance } from "./types";

/**
 * Array of all placed props in the world
 */
export const placedProps: PropInstance[] = [];

/**
 * Spawn a new prop in the world
 */
export function spawnProp(
  ownerSlot: number,
  propDef: PlaceableProp,
  propDefIndex: number,
  position: Vector,
  angles: QAngle
): PropInstance | null {
  // Check prop limit
  const playerPropCount = placedProps.filter((p) => p.ownerSlot === ownerSlot).length;
  if (playerPropCount >= MAX_PROPS_PER_PLAYER) {
    Instance.Msg(`[MT:PropManager] Player ${ownerSlot} has reached max props (${MAX_PROPS_PER_PLAYER})`);
    return null;
  }

  // Find template entity
  const template = Instance.FindEntityByName(PROP_TEMPLATE_NAME);
  if (!template) {
    Instance.Msg(`[MT:PropManager] ERROR: Template '${PROP_TEMPLATE_NAME}' not found in map!`);
    return null;
  }

  // Spawn entity from template
  Instance.Msg(`[MT:PropManager] DEBUG: Spawning from template '${PROP_TEMPLATE_NAME}'`);
  const spawned = (template as PointTemplate).ForceSpawn(position, angles);
  if (!spawned || spawned.length === 0) {
    Instance.Msg("[MT:PropManager] ERROR: Failed to spawn prop from template");
    return null;
  }

  Instance.Msg(`[MT:PropManager] DEBUG: Spawned ${spawned.length} entities from template`);

  const entity = spawned[0];
  if (!entity || !entity.IsValid()) {
    Instance.Msg("[MT:PropManager] ERROR: Spawned entity is invalid");
    return null;
  }

  Instance.Msg(`[MT:PropManager] DEBUG: Entity class: ${entity.GetClassName()}, valid: ${entity.IsValid()}`);

  // Set unique name
  const entityName = `prop_${ownerSlot}_${Date.now()}`;
  entity.SetEntityName(entityName);

  // Configure entity
  const modelEntity = entity as BaseModelEntity;

  // Set model directly (SetModel input might not work)
  modelEntity.SetModel(propDef.modelPath);

  // Set health
  entity.SetHealth(propDef.maxHealth);

  // Scale and color
  modelEntity.SetModelScale(propDef.defaultScale);
  modelEntity.SetColor({ r: 255, g: 255, b: 255, a: 255 });

  // Enable collision and visibility
  Instance.EntFireAtTarget(entity, "EnableCollision");
  Instance.EntFireAtTarget(entity, "EnableDraw");

  // NOTE: Props have full physics enabled - they will fall and collide naturally
  // No DisableMotion call - props can be knocked around and affected by physics

  // Debug: verify entity exists
  Instance.Msg(
    `[MT:PropManager] DEBUG: Entity ${entityName} spawned at (${position.x}, ${position.y}, ${position.z}) with model ${propDef.modelPath}`
  );

  // Create tracking instance
  const propInstance: PropInstance = {
    ownerSlot,
    entityName,
    propDefIndex,
    health: propDef.maxHealth,
    maxHealth: propDef.maxHealth,
    position: { ...position },
    angles: { ...angles },
    scale: propDef.defaultScale,
  };

  placedProps.push(propInstance);

  Instance.Msg(
    `[MT:PropManager] Player ${ownerSlot} placed ${propDef.name} at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`
  );

  return propInstance;
}

/**
 * Find prop instance by entity
 */
export function findPropByEntity(entity: Entity): PropInstance | undefined {
  if (!entity || !entity.IsValid()) {
    return undefined;
  }

  const entityName = entity.GetEntityName();
  return placedProps.find((p) => p.entityName === entityName);
}

/**
 * Find prop instance by entity name
 */
export function findPropByName(entityName: string): PropInstance | undefined {
  return placedProps.find((p) => p.entityName === entityName);
}

/**
 * Remove a prop from the world
 */
export function removeProp(propInstance: PropInstance): void {
  const entity = Instance.FindEntityByName(propInstance.entityName);
  if (entity && entity.IsValid()) {
    entity.Remove();
  }

  // Remove from tracking array
  const index = placedProps.indexOf(propInstance);
  if (index !== -1) {
    placedProps.splice(index, 1);
  }

  Instance.Msg(`[MT:PropManager] Removed prop ${propInstance.entityName} (owner: ${propInstance.ownerSlot})`);
}

/**
 * Check if a player can manipulate a specific prop
 */
export function canPlayerManipulateProp(playerSlot: number, prop: PropInstance): boolean {
  return prop.ownerSlot === playerSlot;
}

/**
 * Remove all props owned by a player
 */
export function removeAllPlayerProps(playerSlot: number): void {
  const playerProps = placedProps.filter((p) => p.ownerSlot === playerSlot);

  for (const prop of playerProps) {
    removeProp(prop);
  }

  Instance.Msg(`[MT:PropManager] Removed ${playerProps.length} props for player ${playerSlot}`);
}

/**
 * Update prop position (for move operations)
 */
export function updatePropPosition(prop: PropInstance, newPosition: Vector): void {
  const entity = Instance.FindEntityByName(prop.entityName);
  if (entity && entity.IsValid()) {
    entity.Teleport(newPosition, null, null);
    prop.position = { ...newPosition };
  }
}

/**
 * Update prop rotation (for rotate operations)
 */
export function updatePropRotation(prop: PropInstance, newAngles: QAngle): void {
  const entity = Instance.FindEntityByName(prop.entityName);
  if (entity && entity.IsValid()) {
    entity.Teleport(null, newAngles, null);
    prop.angles = { ...newAngles };
  }
}

/**
 * Update prop scale (for scale operations)
 */
export function updatePropScale(prop: PropInstance, newScale: number): void {
  const entity = Instance.FindEntityByName(prop.entityName);
  if (entity && entity.IsValid()) {
    (entity as BaseModelEntity).SetModelScale(newScale);
    prop.scale = newScale;
  }
}

/**
 * Clean up invalid props from tracking
 */
export function cleanupInvalidProps(): void {
  const validProps: PropInstance[] = [];
  let removedCount = 0;

  for (const prop of placedProps) {
    const entity = Instance.FindEntityByName(prop.entityName);
    if (entity && entity.IsValid()) {
      validProps.push(prop);
    } else {
      removedCount++;
      Instance.Msg(`[MT:PropManager] Cleaned up invalid prop ${prop.entityName}`);
    }
  }

  if (removedCount > 0) {
    placedProps.length = 0;
    placedProps.push(...validProps);
    Instance.Msg(`[MT:PropManager] Cleaned up ${removedCount} invalid props`);
  }
}

/**
 * Update held prop position to follow player's crosshair (physgun-style)
 */
export function updateHeldPropPosition(playerSlot: number, pawn: CSPlayerPawn): void {
  const heldPropName = getHeldProp(playerSlot);
  if (!heldPropName) return;

  // Find the held prop
  const prop = placedProps.find((p) => p.entityName === heldPropName);
  if (!prop) {
    // Prop was destroyed - release it
    setHeldProp(playerSlot, null);
    return;
  }

  // Perform raycast from player eye position
  const eyePos = pawn.GetEyePosition();
  const eyeAngles = pawn.GetEyeAngles();

  // Calculate forward vector
  const yaw = (eyeAngles.yaw * Math.PI) / 180;
  const pitch = (eyeAngles.pitch * Math.PI) / 180;
  const forward = {
    x: Math.cos(pitch) * Math.cos(yaw),
    y: Math.cos(pitch) * Math.sin(yaw),
    z: -Math.sin(pitch),
  };

  // Raycast to find aim point
  const maxDistance = 1000; // Max grab distance
  const traceEnd = {
    x: eyePos.x + forward.x * maxDistance,
    y: eyePos.y + forward.y * maxDistance,
    z: eyePos.z + forward.z * maxDistance,
  };

  const trace = Instance.TraceLine({
    start: eyePos,
    end: traceEnd,
    ignoreEntity: pawn,
  });

  // Determine target position
  let targetPos;
  if (trace.didHit) {
    // Follow the exact point where crosshair is aiming
    targetPos = trace.end;
  } else {
    // No hit - use max distance in look direction
    targetPos = traceEnd;
  }

  // Smooth interpolation for smooth following
  const smoothFactor = 0.2; // Lower = smoother/slower, higher = more responsive
  const newPos = {
    x: prop.position.x + (targetPos.x - prop.position.x) * (1 - smoothFactor),
    y: prop.position.y + (targetPos.y - prop.position.y) * (1 - smoothFactor),
    z: prop.position.z + (targetPos.z - prop.position.z) * (1 - smoothFactor),
  };

  // Update prop position
  updatePropPosition(prop, newPos);
}

/**
 * Get serializable state for hot reload
 */
export function getSerializableState(): PropInstance[] {
  return placedProps.map((p) => ({ ...p }));
}

/**
 * Restore state from hot reload
 */
export function restoreState(savedProps: PropInstance[]): void {
  placedProps.length = 0;

  // Validate each prop entity still exists after hot reload
  const validProps: PropInstance[] = [];
  for (const prop of savedProps) {
    const entity = Instance.FindEntityByName(prop.entityName);
    if (entity && entity.IsValid()) {
      validProps.push(prop);
      Instance.Msg(`[MT:PropManager] Restored prop ${prop.entityName} - entity still valid`);
    } else {
      Instance.Msg(
        `[MT:PropManager] WARNING: Prop ${prop.entityName} entity no longer exists after hot reload - skipping`
      );
    }
  }

  placedProps.push(...validProps);
  Instance.Msg(
    `[MT:PropManager] Restored ${validProps.length}/${savedProps.length} props (${savedProps.length - validProps.length} lost)`
  );
}
