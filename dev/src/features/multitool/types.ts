/**
 * Shared types and interfaces for the Multitool prop placement system
 */

import { QAngle, Vector } from "cs_script/point_script";

/**
 * Modes for the multitool weapon
 */
export enum MultitoolMode {
  PLACE = "place",
  MOVE = "move",
  ROTATE = "rotate",
  SCALE = "scale",
  DELETE = "delete",
}

/**
 * Definition of a placeable prop type
 */
export interface PlaceableProp {
  name: string;
  modelPath: string;
  maxHealth: number;
  defaultScale: number;
}

/**
 * Instance of a placed prop in the world
 */
export interface PropInstance {
  ownerSlot: number;
  entityName: string;
  propDefIndex: number;
  health: number;
  maxHealth: number;
  position: Vector;
  angles: QAngle;
  scale: number;
}

/**
 * Per-player state for multitool system
 */
export interface PlayerState {
  mode: MultitoolMode;
  selectedPropIndex: number;
  previewEntityName: string | null;
  previewActive: boolean;
  heldPropName: string | null; // Name of prop being held (for physgun-style grab)
  grabDistance: number; // Distance to maintain from player (for future use)
}

/**
 * Serializable state for hot reload
 */
export interface MultitoolState {
  playerStates: Array<[number, PlayerState]>;
  placedProps: PropInstance[];
}
