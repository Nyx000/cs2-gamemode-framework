/**
 * Constants and prop definitions for the Multitool system
 *
 * CS2 ENUM IMPORTS (New in 1.41.1.3-rc1):
 * Enums are now exported from cs_script/point_script and can be imported directly!
 *
 * Available enums:
 * - CSWeaponType (KNIFE, PISTOL, RIFLE, etc.)
 * - CSGearSlot (RIFLE, PISTOL, KNIFE, GRENADES, C4, BOOSTS)
 * - CSRoundEndReason (TARGET_BOMBED, BOMB_DEFUSED, etc.)
 * - CSHitGroup (HEAD, CHEST, STOMACH, etc.)
 * - CSDamageTypes (BULLET, SLASH, BURN, FALL, etc.)
 * - CSDamageFlags (PREVENT_DEATH, FORCE_DEATH, etc.)
 * - CSWeaponAttackType (PRIMARY, SECONDARY)
 * - CSLoadoutSlot (MELEE, SECONDARY0-4, RIFLE0-4, etc.)
 *
 * Example usage:
 *   import { CSWeaponType, CSRoundEndReason } from "cs_script/point_script";
 *
 *   if (weaponType === CSWeaponType.PISTOL) { ... }
 *   if (reason === CSRoundEndReason.TARGET_BOMBED) { ... }
 *
 *   // Reverse lookup (number to string):
 *   Instance.Msg(`Weapon: ${CSWeaponType[weaponType]}`);
 */

import { PlaceableProp } from "./types";

/**
 * Maximum number of props a single player can place
 */
export const MAX_PROPS_PER_PLAYER = 30;

/**
 * Distance for raycasting (units)
 */
export const RAYCAST_DISTANCE = 2000;

/**
 * Rotation increment in degrees
 */
export const ROTATION_INCREMENT = 15;

/**
 * Scale multiplier for scaling operations
 */
export const SCALE_MULTIPLIER = 1.2;

/**
 * Scale divider for scaling down operations
 */
export const SCALE_DIVIDER = 1.2;

/**
 * Minimum scale allowed
 */
export const MIN_SCALE = 0.2;

/**
 * Maximum scale allowed
 */
export const MAX_SCALE = 5.0;

/**
 * Preview transparency (0-255)
 */
export const PREVIEW_ALPHA = 128;

/**
 * Health percentage thresholds for visual feedback
 */
export const HEALTH_WARNING_THRESHOLD = 0.5; // 50%
export const HEALTH_CRITICAL_THRESHOLD = 0.25; // 25%

/**
 * Available props that can be placed
 * Using VALID CS2 prop models from official examples and common maps
 */
export const PLACEABLE_PROPS: PlaceableProp[] = [
  {
    name: "Terrace Chair",
    modelPath: "models/generic/terrace_set_01/terrace_chair_01.vmdl",
    maxHealth: 100,
    defaultScale: 1.0,
  },
  {
    name: "Bike",
    modelPath: "models/de_overpass/overpass_bike/bike_01.vmdl",
    maxHealth: 150,
    defaultScale: 1.0,
  },
  {
    name: "Small Wood Crate",
    modelPath: "models/props/crates/crate_wood_small.vmdl",
    maxHealth: 100,
    defaultScale: 1.0,
  },
  {
    name: "Medium Wood Crate",
    modelPath: "models/props/crates/crate_wood_medium.vmdl",
    maxHealth: 150,
    defaultScale: 1.0,
  },
  {
    name: "Large Wood Crate",
    modelPath: "models/props/crates/crate_wood_large.vmdl",
    maxHealth: 200,
    defaultScale: 1.0,
  },
  {
    name: "Traffic Cone",
    modelPath: "models/props/hr_vertigo/vertigo_traffic_cone/traffic_cone.vmdl",
    maxHealth: 50,
    defaultScale: 1.0,
  },
  {
    name: "Grey Barrel",
    modelPath: "models/props/de_nuke/hr_nuke/nuke_barrels/barrel_grey.vmdl",
    maxHealth: 250,
    defaultScale: 1.0,
  },
  {
    name: "Office Chair",
    modelPath: "models/props/cs_office/chair_office.vmdl",
    maxHealth: 100,
    defaultScale: 1.0,
  },
];

/**
 * Player-specific colors for preview holograms
 * Cycles through colors for different players
 */
export const PLAYER_PREVIEW_COLORS = [
  { r: 0, g: 255, b: 0 }, // Green - Player 0
  { r: 0, g: 150, b: 255 }, // Blue - Player 1
  { r: 255, g: 255, b: 0 }, // Yellow - Player 2
  { r: 255, g: 0, b: 255 }, // Magenta - Player 3
  { r: 0, g: 255, b: 255 }, // Cyan - Player 4
  { r: 255, g: 128, b: 0 }, // Orange - Player 5
  { r: 255, g: 255, b: 255 }, // White - Player 6+
];

/**
 * Template entity names (must exist in Hammer)
 */
export const PROP_TEMPLATE_NAME = "prop_template";
export const PREVIEW_TEMPLATE_NAME = "preview_template";
