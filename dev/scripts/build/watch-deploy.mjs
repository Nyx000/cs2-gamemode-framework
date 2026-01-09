#!/usr/bin/env bun
/**
 * Watch and deploy script files to game directory
 * This script watches the ../scripts/ directory and copies files to the game directory
 * Supports both watch mode and one-time deployment
 */

import { copyFile, mkdir, readdir, stat, unlink } from "fs/promises";
import { join, dirname, basename, relative, sep } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { writePid, clearPid } from "../utils/pid-manager.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = join(__dirname, "..", "..", "..", "scripts");
const destDir = join(__dirname, "..", "..", "..", "..", "..", "..", "game", "csgo_addons", "workbench", "scripts");

// Parse CLI arguments
const args = process.argv.slice(2);
const runOnce = args.includes("--once");

// File patterns to include (case-insensitive)
const includePatterns = [/\.vjs$/i, /\.js$/i];

// Patterns to ignore
const ignorePatterns = [/node_modules/i, /\.d\.ts$/i, /\.test\.js$/i, /\.spec\.js$/i];

/**
 * Check if a file should be copied based on patterns
 */
function shouldCopyFile(filename) {
  // Check ignore patterns first
  if (ignorePatterns.some((pattern) => pattern.test(filename))) {
    return false;
  }

  // Check if file matches include patterns
  return includePatterns.some((pattern) => pattern.test(filename));
}

/**
 * Recursively get all files from a directory
 * Returns array of { src, dest, relativePath }
 */
async function getAllFiles(dir, baseDir = dir) {
  const files = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        const subFiles = await getAllFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile() && shouldCopyFile(entry.name)) {
        const relativePath = relative(baseDir, fullPath);
        const destPath = join(destDir, relativePath);

        files.push({
          src: fullPath,
          dest: destPath,
          relativePath: relativePath.split(sep).join("/"), // Normalize path separators
        });
      }
    }
  } catch (error) {
    // Directory might not exist or be inaccessible
    console.error(`❌ Error reading directory ${dir}:`, error.message);
  }

  return files;
}

/**
 * Copy a single file with directory creation
 */
async function copyFileWithDirs(src, dest, relativePath) {
  try {
    // Ensure destination directory exists
    const destDirPath = dirname(dest);
    if (!existsSync(destDirPath)) {
      await mkdir(destDirPath, { recursive: true });
    }

    await copyFile(src, dest);
    console.log(`✅ Copied: ${relativePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error copying ${relativePath}:`, error.message);
    return false;
  }
}

/**
 * Clear CS2's compiled cache files (.vjs_c) to force recompilation
 * This prevents stale cached bytecode from being used after hot reload
 */
async function clearCache() {
  try {
    if (!existsSync(destDir)) {
      return; // Destination doesn't exist yet, nothing to clear
    }

    const files = await readdir(destDir);
    let clearedCount = 0;

    for (const file of files) {
      if (file.endsWith(".vjs_c")) {
        const cachePath = join(destDir, file);
        await unlink(cachePath);
        console.log(`🧹 Cleared cache: ${file}`);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      console.log(`✅ Cleared ${clearedCount} cache file(s)`);
    }
  } catch (error) {
    console.warn(`⚠️  Cache clear warning: ${error.message}`);
  }
}

/**
 * Copy all files from source to destination
 */
async function copyAllFiles() {
  console.log(`📦 Scanning ${srcDir}...`);

  const files = await getAllFiles(srcDir);

  if (files.length === 0) {
    console.log("⚠️  No files found to copy");
    return files;
  }

  console.log(`📦 Found ${files.length} file(s) to copy...`);

  let successCount = 0;
  for (const file of files) {
    const success = await copyFileWithDirs(file.src, file.dest, file.relativePath);
    if (success) successCount++;
  }

  console.log(`✅ Copied ${successCount} of ${files.length} file(s)`);
  return files;
}

// Ensure destination directory exists
if (!existsSync(destDir)) {
  await mkdir(destDir, { recursive: true });
  console.log("✅ Created destination directory");
}

console.log(`📂 Source: ${srcDir}`);
console.log(`📂 Destination: ${destDir}`);
console.log(`📂 Mode: ${runOnce ? "One-time copy" : "Watch mode"}\n`);

// Clear CS2 cache before deployment
await clearCache();

// Initial copy of all files
const initialFiles = await copyAllFiles();

// Exit if running in one-time mode
if (runOnce) {
  console.log("\n✅ Deployment complete");
  process.exit(0);
}

// Watch mode: Poll for changes
console.log("\n👀 Watching for changes... (Press Ctrl+C to stop)\n");

// Write PID file for this deploy process
writePid("deploy", process.pid);

const fileTimestamps = new Map();

// Initialize timestamps
for (const file of initialFiles) {
  try {
    const fileStat = await stat(file.src);
    fileTimestamps.set(file.relativePath, fileStat.mtimeMs);
  } catch (error) {
    // File might have been deleted
  }
}

// Poll for changes every 2 seconds
const pollInterval = setInterval(async () => {
  try {
    const currentFiles = await getAllFiles(srcDir);

    for (const file of currentFiles) {
      try {
        const fileStat = await stat(file.src);
        const lastMtime = fileTimestamps.get(file.relativePath);

        if (!lastMtime || fileStat.mtimeMs > lastMtime) {
          console.log(`🔄 Change detected: ${file.relativePath}`);

          // Clear cache before deploying updated file to force recompilation
          await clearCache();

          await copyFileWithDirs(file.src, file.dest, file.relativePath);
          fileTimestamps.set(file.relativePath, fileStat.mtimeMs);
        }
      } catch (error) {
        // File might have been deleted
      }
    }
  } catch (error) {
    console.error("Error polling for changes:", error.message);
  }
}, 2000);

// Handle cleanup
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping watcher...");
  clearInterval(pollInterval);
  clearPid("deploy");
  console.log("✅ Clean shutdown");
  process.exit(0);
});
