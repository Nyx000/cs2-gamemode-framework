#!/usr/bin/env bun
import readline from "readline";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { isProcessByNameRunning, writePid } from "../utils/pid-manager.mjs";
import { colorize, header } from "../utils/colors.mjs";

const execAsync = promisify(exec);
const PROJECT_ROOT = process.env.npm_package_json_dir || process.cwd();

// Simple readline interface
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Prompt for user input
function prompt(question) {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Check if dev processes are running
async function checkDevRunning() {
  try {
    const compileRunning = isProcessByNameRunning("compile");
    const deployRunning = isProcessByNameRunning("deploy");
    return compileRunning || deployRunning;
  } catch {
    return false;
  }
}

// Run npm script
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

// Run node script directly
function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [scriptPath], {
      stdio: "inherit",
      shell: true,
      cwd: PROJECT_ROOT,
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

// Show the menu
async function showMenu() {
  console.clear();

  // Header
  console.log(colorize("━".repeat(70), "blue"));
  console.log(colorize("  CS2 Script Development Helper", "blue"));
  console.log(colorize("━".repeat(70), "blue"));
  console.log("");

  // Menu options - organized by functional groups
  const groups = [
    {
      name: "Development Workflow",
      options: [
        { num: 1, name: "🚀 Start Dev Mode - Watch, compile & deploy on changes", value: "start" },
        { num: 2, name: "🛑 Stop Dev Mode", value: "stop" },
        { num: 3, name: "♻️  Restart Dev Mode", value: "restart" },
      ],
    },
    {
      name: "Build & Deploy",
      options: [
        { num: 4, name: "⚡ Quick Reload - Cached rebuild (fast)", value: "quick-reload" },
        { num: 5, name: "🔥 Fresh Deploy - Clean rebuild (fixes cache issues)", value: "fresh" },
        { num: 6, name: "🔨 Build & Deploy - One-time compile", value: "deploy" },
      ],
    },
    {
      name: "Code Quality",
      options: [
        { num: 7, name: "✅ Check Code - Lint & type-check", value: "check" },
        { num: 8, name: "💅 Format Code - Prettier", value: "format" },
        { num: 9, name: "🔄 Sync Types", value: "sync-types" },
      ],
    },
    {
      name: "Utilities",
      options: [
        { num: 10, name: "🧹 Clear Cache", value: "clear-cache" },
        { num: 11, name: "📋 View Logs (last 200 lines)", value: "logs" },
        { num: 12, name: "📋 Follow Logs (live, Ctrl+C to stop)", value: "logs-follow" },
        { num: 13, name: "👋 Exit", value: "exit" },
      ],
    },
  ];

  console.log(colorize("Select option:", "cyan"));

  groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) console.log("");
    console.log(colorize(`${group.name}:`, "cyan"));

    group.options.forEach((opt) => {
      console.log(`  ${colorize(String(opt.num), "cyan")}. ${opt.name}`);
    });
  });
  console.log("");

  // Get user selection
  let selectedNum = null;
  const allOptions = groups.flatMap((g) => g.options);

  while (selectedNum === null) {
    const input = await prompt(colorize("Enter number: ", "cyan"));
    const num = parseInt(input, 10);

    if (num >= 1 && num <= allOptions.length) {
      selectedNum = num;
    } else {
      console.log(
        colorize("Invalid option. Please enter a number between 1 and " + allOptions.length, "red")
      );
    }
  }

  const selected = allOptions[selectedNum - 1];
  return selected.value;
}

// Handle menu action
async function handleAction(action) {
  console.log("");

  try {
    switch (action) {
      case "start": {
        const isRunning = await checkDevRunning();
        if (isRunning) {
          console.log(colorize("⚠️  Dev mode is already running!", "yellow"));
          break;
        }

        process.stdout.write(colorize("Starting dev mode...", "gray"));

        // Create log file and redirect output
        const fs = await import("fs");
        const logFile = fs.openSync("/tmp/cs2-dev.log", "a");

        // Start in background with logging
        const proc = spawn("npm", ["run", "dev:watch"], {
          detached: true,
          stdio: ["ignore", logFile, logFile],
          shell: true,
          cwd: PROJECT_ROOT,
        });

        // Write PID file for the background process
        if (proc.pid) {
          writePid("compile", proc.pid);
          writePid("deploy", proc.pid);
        }

        proc.unref();

        // Wait for it to start
        let started = false;
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (await checkDevRunning()) {
            started = true;
            break;
          }
        }

        if (started) {
          console.log(colorize(" done\n✅ Dev mode started successfully!", "green"));
          console.log(colorize("Logs: /tmp/cs2-dev.log", "gray"));
        } else {
          console.log(
            colorize(" done\n", "green") + colorize("❌ Failed to start dev mode", "red")
          );
          console.log(colorize("Check logs: /tmp/cs2-dev.log", "yellow"));
        }
        break;
      }

      case "stop":
        await runNodeScript("scripts/dev-workflow/stop-dev.mjs");
        break;

      case "restart": {
        await runNodeScript("scripts/dev-workflow/stop-dev.mjs");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        process.stdout.write(colorize("Restarting dev mode...", "gray"));

        // Create log file and redirect output
        const fs = await import("fs");
        const logFile = fs.openSync("/tmp/cs2-dev.log", "a");

        const proc = spawn("npm", ["run", "dev:watch"], {
          detached: true,
          stdio: ["ignore", logFile, logFile],
          shell: true,
          cwd: PROJECT_ROOT,
        });

        // Write PID file for the background process
        if (proc.pid) {
          writePid("compile", proc.pid);
          writePid("deploy", proc.pid);
        }

        proc.unref();

        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (await checkDevRunning()) {
          console.log(colorize(" done\n✅ Dev mode restarted!", "green"));
        }
        break;
      }

      case "clear-cache":
        await runNpmScript("clear-cache");
        break;

      case "fresh":
        await runNpmScript("fresh");
        break;

      case "quick-reload":
        await runNpmScript("quick-reload");
        break;

      case "deploy":
        await runNpmScript("deploy");
        break;

      case "check":
        await runNpmScript("check");
        break;

      case "sync-types":
        await runNpmScript("sync-types");
        break;

      case "format":
        await runNpmScript("format");
        break;

      case "logs":
        console.log(colorize("📋 Viewing last 200 log lines...", "blue"));
        console.log("");
        await runNpmScript("logs");
        break;

      case "logs-follow":
        console.log(colorize("📋 Following dev logs (Ctrl+C to exit)", "blue"));
        console.log("");
        // Use logs command with --follow flag
        const proc = spawn("bun", ["run", "logs", "--follow"], {
          stdio: "inherit",
          shell: true,
          cwd: PROJECT_ROOT,
        });
        await new Promise((resolve) => {
          proc.on("close", resolve);
        });
        break;

      case "exit":
        console.log("");
        console.log(colorize("👋 Happy coding!", "green"));
        process.exit(0);
    }
  } catch (err) {
    console.log(colorize("❌ Error:", "red"), err.message);
  }

  console.log("");

  // Wait for user to press enter
  await prompt(colorize("Press Enter to continue...", "cyan"));
}

// Main loop
async function main() {
  while (true) {
    const action = await showMenu();
    await handleAction(action);
  }
}

main().catch((err) => {
  console.error(colorize("❌ Fatal error:", "red"), err.message);
  process.exit(1);
});
