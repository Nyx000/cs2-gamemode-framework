#!/usr/bin/env bun
import { spawn } from "child_process";
import { colorize } from "../utils/colors.mjs";

const PROJECT_ROOT = process.env.npm_package_json_dir || process.cwd();

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    const proc = spawn("npm", ["run", scriptName], {
      stdio: "inherit",
      shell: true,
      cwd: PROJECT_ROOT,
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

async function quickReload() {
  console.log(colorize("⚡ Quick Reload - Forcing fresh compilation...", "yellow"));
  console.log("");

  try {
    // Step 1: Clear cache
    console.log(colorize("1️⃣  Clearing cache...", "blue"));
    await runNpmScript("clear-cache");
    console.log("");

    // Step 2: Recompile
    console.log(colorize("2️⃣  Recompiling scripts...", "blue"));
    await runNpmScript("compile");
    console.log("");

    // Step 3: Deploy
    console.log(colorize("3️⃣  Deploying to game directory...", "blue"));
    await runNpmScript("deploy");
    console.log("");

    console.log(colorize("✅ Quick reload complete!", "green"));
    console.log("");
    console.log(colorize("💡 Now in CS2 console, run:", "cyan"));
    console.log("   map <your_map_name>");
    console.log("   OR");
    console.log("   script_reload (if using -tools flag)");
    console.log("");
  } catch (err) {
    console.error(colorize("❌ Quick reload failed:", "red"), err.message);
    process.exit(1);
  }
}

quickReload();
