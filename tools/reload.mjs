#!/usr/bin/env bun
/**
 * Reload Script - Fix cache issues and redeploy
 *
 * This is the go-to command when scripts aren't updating properly.
 *
 * Usage:
 *   bun run reload           # Clear cache + compile + deploy
 *   bun run reload --hammer  # Prepare for Hammer F9 map reload
 *
 * The --hammer flag is for when you need to reload the map from Hammer.
 * It updates file fingerprints to force Workshop Tools to recompile.
 */

import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { clearCache, touchVjsFiles } from "./utils/cs2-path.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const ADDON_NAME = "cs2_gamemode_framework";

// Parse arguments
const args = process.argv.slice(2);
const hammerMode = args.includes("--hammer");

/**
 * Run a bun script and wait for completion
 */
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", [scriptPath], {
      stdio: "inherit",
      cwd: PROJECT_ROOT,
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    proc.on("error", reject);
  });
}

async function main() {
  console.log("");
  console.log("=".repeat(50));
  console.log(hammerMode ? "  Preparing for Hammer Reload" : "  Reload - Fixing Cache Issues");
  console.log("=".repeat(50));
  console.log("");

  try {
    // Step 1: Clear cache
    console.log("1. Clearing cache...");
    const cleared = await clearCache(ADDON_NAME);
    console.log(`   Cleared ${cleared} cache file(s)`);
    console.log("");

    if (hammerMode) {
      // Hammer mode: just touch files to force recompile
      console.log("2. Updating file fingerprints...");
      const touched = await touchVjsFiles(ADDON_NAME);
      console.log(`   Updated ${touched} file(s)`);
      console.log("");

      console.log("Ready for Hammer reload!");
      console.log("  -> In Hammer: F9 -> Run (Skip Build)");
    } else {
      // Normal mode: compile + deploy
      console.log("2. Compiling...");
      await runScript(join(__dirname, "build/compile-all.mjs"));

      console.log("3. Deploying...");
      await runScript(join(__dirname, "build/watch-deploy.mjs") + " --once");

      console.log("");
      console.log("Reload complete!");
      console.log("");
      console.log("In CS2 console, run: script_reload");
    }
  } catch (error) {
    console.error("");
    console.error("Reload failed:", error.message);
    process.exit(1);
  }

  console.log("");
}

main();
