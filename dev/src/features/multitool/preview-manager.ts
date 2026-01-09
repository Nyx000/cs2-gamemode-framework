/**
 * Preview hologram system for prop placement
 */

import { BaseModelEntity, Instance, PointTemplate, QAngle, Vector } from "cs_script/point_script";
import { PLACEABLE_PROPS, PLAYER_PREVIEW_COLORS, PREVIEW_ALPHA, PREVIEW_TEMPLATE_NAME } from "./config";
import { getPlayerState } from "./player-state";

/**
 * Create a preview entity for a player
 */
export function createPreviewForPlayer(playerSlot: number): void {
  const state = getPlayerState(playerSlot);
  if (!state) return;

  // If preview already exists, don't create another
  if (state.previewEntityName) {
    const existing = Instance.FindEntityByName(state.previewEntityName);
    if (existing && existing.IsValid()) {
      return;
    }
  }

  // Find template
  const template = Instance.FindEntityByName(PREVIEW_TEMPLATE_NAME);
  if (!template) {
    Instance.Msg(`[MT:Preview] ERROR: Template '${PREVIEW_TEMPLATE_NAME}' not found!`);
    return;
  }

  // Spawn preview at origin (will be moved immediately)
  Instance.Msg(`[MT:Preview] Attempting to spawn from '${PREVIEW_TEMPLATE_NAME}'...`);
  const spawned = (template as PointTemplate).ForceSpawn(
    { x: 0, y: 0, z: 100 }, // Spawn at 100z so we can see it if it spawns
    { pitch: 0, yaw: 0, roll: 0 }
  );

  if (!spawned || spawned.length === 0) {
    Instance.Msg("[MT:Preview] ERROR: Failed to spawn preview - ForceSpawn returned nothing");
    return;
  }

  Instance.Msg(`[MT:Preview] Spawned ${spawned.length} preview entities`);

  const entity = spawned[0];
  if (!entity || !entity.IsValid()) {
    Instance.Msg("[MT:Preview] ERROR: Preview entity is null or invalid");
    return;
  }

  Instance.Msg(`[MT:Preview] Preview entity valid! Class: ${entity.GetClassName()}`);

  // Set unique name
  const entityName = `preview_player_${playerSlot}`;
  entity.SetEntityName(entityName);

  // Get player color
  const colorIndex = playerSlot % PLAYER_PREVIEW_COLORS.length;
  const color = PLAYER_PREVIEW_COLORS[colorIndex];

  // Configure preview appearance
  const modelEntity = entity as BaseModelEntity;

  // Set initial model FIRST
  const prop = PLACEABLE_PROPS[state.selectedPropIndex];
  modelEntity.SetModel(prop.modelPath);
  modelEntity.SetModelScale(prop.defaultScale);

  // Set color and glow for visibility
  modelEntity.SetColor({ ...color, a: PREVIEW_ALPHA });
  modelEntity.Glow({ ...color, a: 255 });

  // Disable collision so preview doesn't block
  Instance.EntFireAtTarget(entity, "DisableCollision");

  state.previewEntityName = entityName;
  Instance.Msg(
    `[MT:Preview] Created preview for player ${playerSlot}: ${entityName} with glow color (${color.r}, ${color.g}, ${color.b})`
  );
}

/**
 * Update preview position based on raycast
 */
export function updatePreviewPosition(playerSlot: number, position: Vector, angles: QAngle): void {
  const state = getPlayerState(playerSlot);
  if (!state || !state.previewEntityName) return;

  const entity = Instance.FindEntityByName(state.previewEntityName);
  if (!entity || !entity.IsValid()) {
    // Silently skip - entity might not be spawned yet
    // If it persists, showPreview() will be called again to recreate
    return;
  }

  // Teleport and ensure it's visible
  entity.Teleport(position, angles, null);

  // Re-apply glow in case it got lost
  const colorIndex = playerSlot % PLAYER_PREVIEW_COLORS.length;
  const color = PLAYER_PREVIEW_COLORS[colorIndex];
  (entity as BaseModelEntity).Glow({ ...color, a: 255 });
}

// Track last error time to avoid spam
let lastPreviewErrorTime = 0;

/**
 * Show preview (make visible)
 */
export function showPreview(playerSlot: number): void {
  const state = getPlayerState(playerSlot);
  if (!state) return;

  // Check if preview entity exists and is valid
  if (!state.previewEntityName) {
    createPreviewForPlayer(playerSlot);
  } else {
    // Verify entity still exists
    const entity = Instance.FindEntityByName(state.previewEntityName);
    if (!entity || !entity.IsValid()) {
      // Entity was destroyed - recreate it
      const now = Instance.GetGameTime();
      if (now - lastPreviewErrorTime > 5.0) {
        Instance.Msg(`[MT:Preview] Preview destroyed for player ${playerSlot} - recreating...`);
        lastPreviewErrorTime = now;
      }
      createPreviewForPlayer(playerSlot);
    }
  }

  state.previewActive = true;
}

/**
 * Hide preview (make invisible)
 */
export function hidePreview(playerSlot: number): void {
  const state = getPlayerState(playerSlot);
  if (!state || !state.previewEntityName) return;

  const entity = Instance.FindEntityByName(state.previewEntityName);
  if (entity && entity.IsValid()) {
    // Move far away to "hide" it (since we can't make it invisible per-player)
    entity.Teleport({ x: 0, y: 0, z: -10000 }, null, null);
  }

  state.previewActive = false;
}

/**
 * Update preview model when player changes selection
 */
export function setPreviewModel(playerSlot: number): void {
  const state = getPlayerState(playerSlot);
  if (!state || !state.previewEntityName) return;

  const entity = Instance.FindEntityByName(state.previewEntityName);
  if (!entity || !entity.IsValid()) return;

  const prop = PLACEABLE_PROPS[state.selectedPropIndex];
  const modelEntity = entity as BaseModelEntity;

  // Use direct method instead of EntFire
  modelEntity.SetModel(prop.modelPath);
  modelEntity.SetModelScale(prop.defaultScale);

  Instance.Msg(`[MT:Preview] Updated preview model to ${prop.name}`);
}

/**
 * Remove preview entity for a player
 */
export function removePreviewForPlayer(playerSlot: number): void {
  const state = getPlayerState(playerSlot);
  if (!state || !state.previewEntityName) return;

  const entity = Instance.FindEntityByName(state.previewEntityName);
  if (entity && entity.IsValid()) {
    entity.Remove();
  }

  state.previewEntityName = null;
  state.previewActive = false;
  Instance.Msg(`[MT:Preview] Removed preview for player ${playerSlot}`);
}
