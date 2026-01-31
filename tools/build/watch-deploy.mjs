#!/usr/bin/env bun
/**
 * Deploy scripts to CS2 game directory
 *
 * Copies .vjs files from dist/ to CS2's addon scripts directories.
 * CS2 requires scripts in both content/ and game/ directories.
 *
 * Usage:
 *   bun tools/build/watch-deploy.mjs         # Watch mode
 *   bun tools/build/watch-deploy.mjs --once  # One-time deploy
 */

import { copyFile, mkdir, readdir, stat } from "fs/promises";
import { join, dirname, relative, sep } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { getAddonScriptsPaths, clearCache } from "../utils/cs2-path.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "../..", "dist");
const ADDON_NAME = "cs2_gamemode_framework";

const runOnce = process.argv.includes("--once");

// File patterns
const includePatterns = [/\.vjs$/i, /\.js$/i];
const ignorePatterns = [/node_modules/i, /\.d\.ts$/i, /\.test\.js$/i, /\.spec\.js$/i];

function shouldCopyFile(filename) {
  if (ignorePatterns.some((pattern) => pattern.test(filename))) {
    return false;
  }
  return includePatterns.some((pattern) => pattern.test(filename));
}

/**
 * Get all deployable files from a directory
 */
async function getAllFiles(dir, baseDir, destDirs) {
  const files = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await getAllFiles(fullPath, baseDir, destDirs);
        files.push(...subFiles);
      } else if (entry.isFile() && shouldCopyFile(entry.name)) {
        const relativePath = relative(baseDir, fullPath);
        files.push({
          src: fullPath,
          destContent: join(destDirs.content, relativePath),
          destGame: join(destDirs.game, relativePath),
          relativePath: relativePath.split(sep).join("/"),
        });
      }
    }
  } catch (error) {
    console.error(`Error reading ${dir}:`, error.message);
  }

  return files;
}

/**
 * Copy a file to both content and game directories
 */
async function copyFileToBoth(src, destContent, destGame, relativePath) {
  let success = 0;

  for (const [dest, label] of [[destContent, "content"], [destGame, "game"]]) {
    try {
      const destDir = dirname(dest);
      if (!existsSync(destDir)) {
        await mkdir(destDir, { recursive: true });
      }
      await copyFile(src, dest);
      success++;
    } catch (error) {
      console.error(`Error copying to ${label}: ${error.message}`);
    }
  }

  if (success === 2) {
    console.log(`Deployed: ${relativePath}`);
    return true;
  }
  return false;
}

/**
 * Deploy all files
 */
async function deployAll(srcDir, destDirs) {
  const files = await getAllFiles(srcDir, srcDir, destDirs);

  if (files.length === 0) {
    console.log("No files to deploy");
    return files;
  }

  console.log(`Deploying ${files.length} file(s)...`);

  let successCount = 0;
  for (const file of files) {
    if (await copyFileToBoth(file.src, file.destContent, file.destGame, file.relativePath)) {
      successCount++;
    }
  }

  console.log(`Deployed ${successCount}/${files.length} files`);
  return files;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Get destination directories
  let destDirs;
  try {
    destDirs = await getAddonScriptsPaths(ADDON_NAME);
  } catch (error) {
    console.error("Error:", error.message);
    console.error("\nSet CS2_INSTALL_PATH to your CS2 installation directory");
    process.exit(1);
  }

  // Ensure directories exist
  for (const destDir of Object.values(destDirs)) {
    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
    }
  }

  console.log(`Source: ${srcDir}`);
  console.log(`Mode: ${runOnce ? "One-time" : "Watch"}`);
  console.log("");

  // Clear cache before deployment
  await clearCache(ADDON_NAME, { quiet: true });

  // Initial deployment
  const initialFiles = await deployAll(srcDir, destDirs);

  if (runOnce) {
    console.log("\nDeploy complete");
    process.exit(0);
  }

  // Watch mode
  console.log("\nWatching for changes... (Ctrl+C to stop)\n");

  const fileTimestamps = new Map();

  // Initialize timestamps
  for (const file of initialFiles) {
    try {
      const fileStat = await stat(file.src);
      fileTimestamps.set(file.relativePath, fileStat.mtimeMs);
    } catch {
      // File may have been deleted
    }
  }

  // Poll for changes
  const pollInterval = setInterval(async () => {
    try {
      const currentFiles = await getAllFiles(srcDir, srcDir, destDirs);

      for (const file of currentFiles) {
        try {
          const fileStat = await stat(file.src);
          const lastMtime = fileTimestamps.get(file.relativePath);

          if (!lastMtime || fileStat.mtimeMs > lastMtime) {
            console.log(`Change: ${file.relativePath}`);
            await clearCache(ADDON_NAME, { quiet: true });
            await copyFileToBoth(file.src, file.destContent, file.destGame, file.relativePath);
            fileTimestamps.set(file.relativePath, fileStat.mtimeMs);
          }
        } catch {
          // File may have been deleted
        }
      }
    } catch (error) {
      console.error("Poll error:", error.message);
    }
  }, 2000);

  // Clean shutdown
  process.on("SIGINT", () => {
    console.log("\nStopping...");
    clearInterval(pollInterval);
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
