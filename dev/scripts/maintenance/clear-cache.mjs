#!/usr/bin/env bun
import { unlink } from "fs/promises";
import { resolve, join } from "path";
import { colorize } from "../utils/colors.mjs";

const PROJECT_ROOT = process.env.npm_package_json_dir || process.cwd();
const GAME_SCRIPTS_DIR = resolve(PROJECT_ROOT, "../../../game/csgo_addons/workbench/scripts");

async function clearCache() {
  console.log(colorize("🧹 Clearing CS2 script cache...", "yellow"));
  console.log("");

  try {
    // Find all .vjs_c cache files
    const pattern = "**/*.vjs_c";
    const glob = new Bun.Glob(pattern);
    const cacheFiles = Array.from(
      glob.scanSync({ cwd: GAME_SCRIPTS_DIR, absolute: true, onlyFiles: true })
    );

    if (cacheFiles.length === 0) {
      console.log(colorize("✅ No cache files found - already clean!", "green"));
      console.log("");
      process.exit(0);
    }

    // Delete all cache files
    let deletedCount = 0;
    for (const file of cacheFiles) {
      try {
        await unlink(file);
        deletedCount++;
      } catch (err) {
        console.error(colorize(`Failed to delete ${file}:`, "red"), err.message);
      }
    }

    console.log(colorize(`✅ Cleared ${deletedCount} cached file(s)`, "green"));
    console.log("");
    console.log(colorize("💡 Next steps:", "cyan"));
    console.log("   - Reload your map in CS2: map <your_map_name>");
    console.log("   - Or use hot reload: script_reload (requires -tools flag)");
    console.log("");
  } catch (err) {
    console.error(colorize("❌ Error clearing cache:", "red"), err.message);
    process.exit(1);
  }
}

clearCache();
