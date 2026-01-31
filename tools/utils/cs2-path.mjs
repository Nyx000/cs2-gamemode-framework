#!/usr/bin/env bun
/**
 * CS2 Installation Path Discovery & Utilities
 *
 * Shared utilities for:
 * - Finding CS2 installation directory
 * - Platform detection (Windows, WSL2, macOS, Linux)
 * - Cache management (.vjs_c files)
 */

import { access, readdir, unlink, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Detect the current platform, including WSL2 detection
 */
export function detectPlatform() {
  const platform = process.platform;

  if (platform === "linux") {
    try {
      const wslCheck = readFileSync("/proc/version", "utf8").toLowerCase();
      if (wslCheck.includes("microsoft")) {
        return { type: "wsl2", os: "linux" };
      }
    } catch {
      // Not WSL2
    }
  }

  return { type: platform, os: platform };
}

/**
 * Check if running in WSL2
 */
export function isWSL2() {
  return detectPlatform().type === "wsl2";
}

/**
 * Expand ~ to home directory
 */
export function expandHome(path) {
  if (path.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE;
    return path.replace("~", home);
  }
  return path;
}

// ============================================================================
// CS2 PATH DISCOVERY
// ============================================================================

const COMMON_STEAM_PATHS = {
  windows: [
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive",
    "C:\\Program Files\\Steam\\steamapps\\common\\Counter-Strike Global Offensive",
    "D:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive",
    "E:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive",
    "F:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive",
  ],
  wsl2: [
    "/mnt/c/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive",
    "/mnt/c/Program Files/Steam/steamapps/common/Counter-Strike Global Offensive",
    "/mnt/d/SteamLibrary/steamapps/common/Counter-Strike Global Offensive",
    "/mnt/e/SteamLibrary/steamapps/common/Counter-Strike Global Offensive",
    "/mnt/f/SteamLibrary/steamapps/common/Counter-Strike Global Offensive",
  ],
  macos: [
    "~/Library/Application Support/Steam/steamapps/common/Counter-Strike Global Offensive",
    "/Applications/Steam.app/Contents/MacOS/steamapps/common/Counter-Strike Global Offensive",
  ],
  linux: [
    "~/.steam/steam/steamapps/common/Counter-Strike Global Offensive",
    "~/.local/share/Steam/steamapps/common/Counter-Strike Global Offensive",
    "~/snap/steam/common/.steam/steam/steamapps/common/Counter-Strike Global Offensive",
  ],
};

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function validateCS2Path(basePath) {
  if (!basePath) return null;
  const gamePath = join(basePath, "game");
  if (await fileExists(gamePath)) {
    return basePath;
  }
  return null;
}

/**
 * Get search paths for the current platform
 */
export function getSearchPaths() {
  const platform = detectPlatform();
  let paths = [];

  if (platform.type === "wsl2") {
    paths = COMMON_STEAM_PATHS.wsl2;
  } else if (platform.type === "win32") {
    paths = COMMON_STEAM_PATHS.windows;
  } else if (platform.type === "darwin") {
    paths = COMMON_STEAM_PATHS.macos;
  } else if (platform.type === "linux") {
    paths = COMMON_STEAM_PATHS.linux;
  }

  return paths.map(expandHome);
}

/**
 * Find CS2 installation directory
 *
 * Priority:
 * 1. CS2_INSTALL_PATH environment variable
 * 2. Common Steam installation paths based on platform
 *
 * @returns {Promise<string|null>} CS2 installation directory path or null
 */
export async function findCS2Installation() {
  // Priority 1: Check environment variable
  if (process.env.CS2_INSTALL_PATH) {
    const envPath = expandHome(process.env.CS2_INSTALL_PATH);
    const validated = await validateCS2Path(envPath);
    if (validated) {
      return validated;
    }
    throw new Error(
      `CS2_INSTALL_PATH is set but invalid:\n` +
      `  Path: ${envPath}\n` +
      `  Expected 'game' directory not found`
    );
  }

  // Priority 2: Search common paths
  for (const path of getSearchPaths()) {
    const validated = await validateCS2Path(path);
    if (validated) {
      return path;
    }
  }

  return null;
}

/**
 * Get addon scripts paths for deployment
 *
 * CS2 requires scripts in both locations:
 * - content: For Workshop Tools development
 * - game: For runtime loading
 *
 * @param {string} addonName - Name of the addon
 * @returns {Promise<{content: string, game: string}>}
 */
export async function getAddonScriptsPaths(addonName) {
  const cs2Path = await findCS2Installation();
  if (!cs2Path) {
    throw new Error(
      "Could not find CS2 installation.\n" +
      "Set CS2_INSTALL_PATH environment variable to your CS2 directory."
    );
  }
  return {
    content: join(cs2Path, "content", "csgo_addons", addonName, "scripts"),
    game: join(cs2Path, "game", "csgo_addons", addonName, "scripts"),
  };
}

/**
 * Get path to CS2's type definitions file
 * @returns {Promise<string|null>}
 */
export async function getTypeDefinitionsPath() {
  const cs2Path = await findCS2Installation();
  if (!cs2Path) return null;

  const typePath = join(cs2Path, "content/csgo/maps/editor/zoo/scripts/point_script.d.ts");
  if (await fileExists(typePath)) {
    return typePath;
  }
  return null;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear .vjs_c cache files from addon directories
 *
 * @param {string} addonName - Name of the addon
 * @param {object} options - Options
 * @param {boolean} options.quiet - Suppress output
 * @returns {Promise<number>} Number of files cleared
 */
export async function clearCache(addonName, options = {}) {
  const { quiet = false } = options;
  let totalCleared = 0;

  let destDirs;
  try {
    destDirs = await getAddonScriptsPaths(addonName);
  } catch (error) {
    if (!quiet) console.error("Cannot clear cache:", error.message);
    return 0;
  }

  for (const [dirType, destDir] of Object.entries(destDirs)) {
    try {
      if (!existsSync(destDir)) continue;

      const files = await readdir(destDir);
      for (const file of files) {
        if (file.endsWith(".vjs_c")) {
          await unlink(join(destDir, file));
          if (!quiet) console.log(`Cleared: ${dirType}/${file}`);
          totalCleared++;
        }
      }
    } catch (error) {
      if (!quiet) console.warn(`Warning (${dirType}): ${error.message}`);
    }
  }

  return totalCleared;
}

/**
 * Touch .vjs files to update their timestamps (forces Workshop Tools recompile)
 *
 * @param {string} addonName - Name of the addon
 * @param {object} options - Options
 * @param {boolean} options.quiet - Suppress output
 * @returns {Promise<number>} Number of files touched
 */
export async function touchVjsFiles(addonName, options = {}) {
  const { quiet = false } = options;
  const buildId = Date.now();
  let touched = 0;

  let destDirs;
  try {
    destDirs = await getAddonScriptsPaths(addonName);
  } catch (error) {
    if (!quiet) console.error("Cannot touch files:", error.message);
    return 0;
  }

  for (const [dirType, destDir] of Object.entries(destDirs)) {
    try {
      if (!existsSync(destDir)) continue;

      const files = await readdir(destDir);
      for (const file of files) {
        if (file.endsWith(".vjs")) {
          const filePath = join(destDir, file);
          let content = await readFile(filePath, "utf-8");

          // Remove old build comment and add new one
          content = content.replace(/\/\/ __BUILD_ID__: \d+\n?/, "");
          content = content.trimEnd() + `\n// __BUILD_ID__: ${buildId}\n`;

          await writeFile(filePath, content);
          if (!quiet) console.log(`Updated: ${dirType}/${file}`);
          touched++;
        }
      }
    } catch (error) {
      if (!quiet) console.warn(`Warning (${dirType}): ${error.message}`);
    }
  }

  return touched;
}

// ============================================================================
// SETUP INSTRUCTIONS
// ============================================================================

/**
 * Get platform-specific setup instructions
 */
export function getSetupInstructions() {
  const platform = detectPlatform();
  const lines = [];

  lines.push("Set CS2_INSTALL_PATH to your CS2 installation directory:\n");

  if (platform.type === "wsl2") {
    lines.push('  export CS2_INSTALL_PATH="/mnt/c/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive"');
    lines.push("\n  Add to ~/.bashrc for persistence");
  } else if (platform.type === "win32") {
    lines.push('  set CS2_INSTALL_PATH=C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive');
  } else if (platform.type === "darwin") {
    lines.push('  export CS2_INSTALL_PATH="~/Library/Application Support/Steam/steamapps/common/Counter-Strike Global Offensive"');
    lines.push("\n  Add to ~/.zprofile for persistence");
  } else {
    lines.push('  export CS2_INSTALL_PATH="~/.steam/steam/steamapps/common/Counter-Strike Global Offensive"');
    lines.push("\n  Add to ~/.bashrc for persistence");
  }

  return lines.join("\n");
}
