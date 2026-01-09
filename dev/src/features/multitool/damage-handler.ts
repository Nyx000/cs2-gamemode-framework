/**
 * Damage detection and health tracking for placed props
 */

import { BaseModelEntity, Entity, Instance } from "cs_script/point_script";
import { HEALTH_CRITICAL_THRESHOLD, HEALTH_WARNING_THRESHOLD } from "./config";
import { placedProps, removeProp } from "./prop-manager";
import { PropInstance } from "./types";

/**
 * Setup damage tracking system
 * NOTE: Does NOT register SetThink - called from main think loop instead
 */
export function setupDamageTracking(): void {
  Instance.Msg("[MT:DamageHandler] Damage tracking initialized (called from main loop)");
}

/**
 * Check health of all props (exported to be called from main think loop)
 */
export function checkAllPropHealth(): void {
  // Iterate backwards to safely remove destroyed props
  for (let i = placedProps.length - 1; i >= 0; i--) {
    const prop = placedProps[i];
    checkPropHealth(prop);
  }
}

/**
 * Check a single prop's health and apply visual feedback
 */
function checkPropHealth(prop: PropInstance): void {
  const entity = Instance.FindEntityByName(prop.entityName);
  if (!entity || !entity.IsValid()) {
    // Entity was destroyed externally, remove from tracking
    const index = placedProps.indexOf(prop);
    if (index !== -1) {
      placedProps.splice(index, 1);
    }
    return;
  }

  // Try to get health - might not be supported on all entities
  let currentHealth;
  try {
    currentHealth = entity.GetHealth();
  } catch (e) {
    // GetHealth not supported - skip damage tracking for this entity
    return;
  }

  // Check if health changed
  if (currentHealth !== prop.health) {
    applyDamage(prop, entity);
  }
}

/**
 * Apply damage to a prop and update visual feedback
 */
function applyDamage(prop: PropInstance, entity: Entity): void {
  let currentHealth;
  try {
    currentHealth = entity.GetHealth();
  } catch (e) {
    return; // GetHealth not supported
  }
  prop.health = currentHealth;

  // Calculate health percentage
  const healthPercent = currentHealth / prop.maxHealth;

  const modelEntity = entity as BaseModelEntity;

  // Update visual feedback based on health
  if (currentHealth <= 0) {
    // Prop destroyed
    Instance.Msg(`[MT:DamageHandler] Prop ${prop.entityName} destroyed (owner: ${prop.ownerSlot})`);
    destroyProp(prop, entity);
  } else if (healthPercent <= HEALTH_CRITICAL_THRESHOLD) {
    // Critical health - red
    modelEntity.SetColor({ r: 255, g: 0, b: 0, a: 255 });
    modelEntity.Glow({ r: 255, g: 0, b: 0, a: 200 });
  } else if (healthPercent <= HEALTH_WARNING_THRESHOLD) {
    // Warning health - orange
    modelEntity.SetColor({ r: 255, g: 128, b: 0, a: 255 });
    modelEntity.Glow({ r: 255, g: 128, b: 0, a: 150 });
  }
  // else: healthy - keep original color (white)
}

/**
 * Destroy a prop with visual effect
 */
function destroyProp(prop: PropInstance, entity: Entity): void {
  // Add brief destruction effect
  const modelEntity = entity as BaseModelEntity;
  modelEntity.SetColor({ r: 255, g: 0, b: 0, a: 255 });
  modelEntity.Glow({ r: 255, g: 0, b: 0, a: 255 });

  // Remove after brief delay
  Instance.EntFireAtTarget(entity, "Kill", undefined, 0.1);

  // Remove from tracking immediately
  removeProp(prop);
}

/**
 * Manually apply damage to a prop (for scripted damage)
 */
export function applyManualDamage(propEntityName: string, damageAmount: number): void {
  const entity = Instance.FindEntityByName(propEntityName);
  if (!entity || !entity.IsValid()) return;

  let currentHealth;
  try {
    currentHealth = entity.GetHealth();
  } catch (e) {
    return; // GetHealth not supported
  }

  const newHealth = Math.max(0, currentHealth - damageAmount);
  entity.SetHealth(newHealth);
}
