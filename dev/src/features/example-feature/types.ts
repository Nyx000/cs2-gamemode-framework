/**
 * Example Feature - Type Definitions
 *
 * Define all TypeScript types, interfaces, and enums for your feature here.
 */

/**
 * Example state that persists across hot reloads
 *
 * This demonstrates proper state serialization including:
 * - Simple primitive values (numbers, strings)
 * - Enum values (stored as strings)
 * - Map data (serialized as array of tuples)
 */
export interface ExampleState {
  /** How many times the think loop has executed */
  thinkCount: number;

  /** Timestamp when the feature was initialized */
  initTimestamp: number;

  /** Number of players that have connected */
  playerConnectionCount: number;

  /** Current operational mode (serialized as string) */
  currentMode: ExampleMode;

  /** Per-player data (Map serialized as array of [slot, data] tuples) */
  playerData: Array<[number, ExamplePlayerData]>;
}

/**
 * Example mode enum
 */
export enum ExampleMode {
  ACTIVE = "active",
  PAUSED = "paused",
}

/**
 * Example player data
 */
export interface ExamplePlayerData {
  playerSlot: number;
  connectionTime: number;
  messagesSent: number;
}

