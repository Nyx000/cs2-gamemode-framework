/**
 * State Management Utilities for Hot Reload
 *
 * Provides safe state operations with error handling and validation.
 * Used by the orchestrator to prevent one feature's state bug from breaking
 * the entire hot reload cycle.
 *
 * This is a DEVELOPMENT-ONLY utility - hot reload requires the -tools flag.
 */

import { Domain } from "cs_script/point_script";
import { Feature, FeatureState } from "./feature";

/**
 * Result of a safe state operation
 */
export interface SafeStateResult<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Default state factory - creates empty state when serialization fails
 */
function createEmptyState(): FeatureState {
  return {};
}

/**
 * Safely get state from a feature with error handling
 *
 * If getState() throws, logs the error and returns empty state.
 * This prevents one buggy feature from breaking the entire hot reload.
 *
 * @param feature - The feature to get state from
 * @param featureName - Name for error logging
 * @param instance - Domain instance for logging
 * @returns SafeStateResult with the state or empty object on failure
 */
export function safeGetState(
  feature: Feature,
  featureName: string,
  instance: Domain
): SafeStateResult<FeatureState> {
  try {
    if (typeof feature.getState !== "function") {
      return {
        success: false,
        data: createEmptyState(),
        error: `Feature '${featureName}' has no getState method`,
      };
    }

    const state = feature.getState();

    // Basic validation - state should be an object
    if (state === null || state === undefined) {
      instance.Msg(`[StateUtils] WARNING: Feature '${featureName}' returned null/undefined state`);
      return {
        success: true,
        data: createEmptyState(),
      };
    }

    if (typeof state !== "object") {
      instance.Msg(
        `[StateUtils] WARNING: Feature '${featureName}' returned non-object state: ${typeof state}`
      );
      return {
        success: false,
        data: createEmptyState(),
        error: `State must be an object, got ${typeof state}`,
      };
    }

    return {
      success: true,
      data: state,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    instance.Msg(`[StateUtils] ERROR: Failed to get state for feature '${featureName}': ${errorMsg}`);
    return {
      success: false,
      data: createEmptyState(),
      error: errorMsg,
    };
  }
}

/**
 * Safely restore state to a feature with error handling
 *
 * If restoreState() throws, logs the error and continues.
 * The feature will start with default state instead of restored state.
 *
 * @param feature - The feature to restore state to
 * @param state - The state to restore
 * @param featureName - Name for error logging
 * @param instance - Domain instance for logging
 * @returns true if restoration succeeded, false otherwise
 */
export function safeRestoreState(
  feature: Feature,
  state: FeatureState | undefined,
  featureName: string,
  instance: Domain
): boolean {
  try {
    if (typeof feature.restoreState !== "function") {
      instance.Msg(`[StateUtils] WARNING: Feature '${featureName}' has no restoreState method`);
      return false;
    }

    if (state === undefined || state === null) {
      instance.Msg(`[StateUtils] WARNING: No state to restore for feature '${featureName}'`);
      return false;
    }

    // Validate state shape before restoring
    const validation = validateStateShape(state, featureName);
    if (!validation.valid) {
      instance.Msg(`[StateUtils] WARNING: Invalid state shape for '${featureName}': ${validation.error}`);
      // Still try to restore - feature might handle partial state gracefully
    }

    feature.restoreState(state);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    instance.Msg(
      `[StateUtils] ERROR: Failed to restore state for feature '${featureName}': ${errorMsg}`
    );
    return false;
  }
}

/**
 * Validation result for state shape checking
 */
interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that state has a valid shape for serialization
 *
 * Checks for common serialization issues:
 * - Functions (can't be serialized)
 * - Circular references (would cause infinite loops)
 * - Entity references (break on hot reload)
 *
 * @param state - The state object to validate
 * @param _featureName - Name for error context (reserved for future use)
 * @returns ValidationResult indicating if state is valid
 */
export function validateStateShape(state: FeatureState, _featureName: string): ValidationResult {
  // Check if state is an object
  if (typeof state !== "object" || state === null) {
    return {
      valid: false,
      error: `State must be an object, got ${typeof state}`,
    };
  }

  // Check for common serialization issues
  const issues: string[] = [];
  const seen = new WeakSet();

  function checkValue(value: unknown, path: string): void {
    if (value === null || value === undefined) {
      return; // null/undefined are valid
    }

    // Check for functions
    if (typeof value === "function") {
      issues.push(`Function at ${path} - functions cannot be serialized`);
      return;
    }

    // Check for objects (including arrays)
    if (typeof value === "object") {
      // Check for circular references
      if (seen.has(value as object)) {
        issues.push(`Circular reference at ${path}`);
        return;
      }
      seen.add(value as object);

      // Check for entity-like objects (have IsValid method)
      if ("IsValid" in value && typeof (value as { IsValid: unknown }).IsValid === "function") {
        issues.push(
          `Entity reference at ${path} - store entity names as strings instead`
        );
        return;
      }

      // Recursively check object properties
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          checkValue(item, `${path}[${index}]`);
        });
      } else {
        Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
          checkValue(val, `${path}.${key}`);
        });
      }
    }
  }

  checkValue(state, "state");

  if (issues.length > 0) {
    return {
      valid: false,
      error: issues.join("; "),
    };
  }

  return { valid: true };
}

/**
 * Safely call onHotReloadComplete on a feature
 *
 * @param feature - The feature to call the hook on
 * @param featureName - Name for error logging
 * @param instance - Domain instance for logging
 * @returns true if hook executed successfully or doesn't exist, false on error
 */
export function safeHotReloadComplete(
  feature: Feature,
  featureName: string,
  instance: Domain
): boolean {
  try {
    if (typeof feature.onHotReloadComplete === "function") {
      feature.onHotReloadComplete();
      return true;
    }
    return true; // No hook to call is not an error
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    instance.Msg(
      `[StateUtils] ERROR: onHotReloadComplete failed for feature '${featureName}': ${errorMsg}`
    );
    return false;
  }
}

/**
 * Merge saved state with default state
 *
 * Useful for handling schema changes - missing fields get default values.
 *
 * @param savedState - The state from hot reload
 * @param defaultState - Default state with all required fields
 * @returns Merged state with defaults for missing fields
 */
export function mergeWithDefaults<T extends FeatureState>(
  savedState: Partial<T> | undefined,
  defaultState: T
): T {
  if (!savedState) {
    return { ...defaultState };
  }

  return {
    ...defaultState,
    ...savedState,
  };
}

/**
 * Convert a Map to an array of tuples for serialization
 *
 * Maps cannot be directly serialized - convert to array format.
 *
 * @param map - The Map to serialize
 * @returns Array of [key, value] tuples
 */
export function serializeMap<K, V>(map: Map<K, V>): Array<[K, V]> {
  return Array.from(map.entries());
}

/**
 * Convert an array of tuples back to a Map
 *
 * @param entries - Array of [key, value] tuples
 * @returns Reconstructed Map
 */
export function deserializeMap<K, V>(entries: Array<[K, V]> | undefined): Map<K, V> {
  if (!entries || !Array.isArray(entries)) {
    return new Map();
  }
  return new Map(entries);
}

/**
 * Convert a Set to an array for serialization
 *
 * @param set - The Set to serialize
 * @returns Array of values
 */
export function serializeSet<T>(set: Set<T>): T[] {
  return Array.from(set);
}

/**
 * Convert an array back to a Set
 *
 * @param values - Array of values
 * @returns Reconstructed Set
 */
export function deserializeSet<T>(values: T[] | undefined): Set<T> {
  if (!values || !Array.isArray(values)) {
    return new Set();
  }
  return new Set(values);
}
