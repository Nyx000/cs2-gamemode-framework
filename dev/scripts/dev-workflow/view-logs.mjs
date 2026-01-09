#!/usr/bin/env bun
import { spawn } from "child_process";
import { colorize } from "../utils/colors.mjs";

const LOG_FILE = "/tmp/cs2-dev.log";
const DEFAULT_LINES = 200;

function viewLogs(follow = false) {
  const args = follow
    ? ["-n", String(DEFAULT_LINES), "-f", LOG_FILE]
    : ["-n", String(DEFAULT_LINES), LOG_FILE];

  const title = follow
    ? `📋 Following dev logs (last ${DEFAULT_LINES} lines, Ctrl+C to exit)`
    : `📋 Viewing last ${DEFAULT_LINES} log lines`;

  console.log(colorize(title, "blue"));
  console.log("");

  const proc = spawn("tail", args, {
    stdio: "inherit",
    shell: false,
  });

  proc.on("error", (err) => {
    console.error(colorize("❌ Error viewing logs:", "red"), err.message);
    console.log(colorize(`💡 Log file: ${LOG_FILE}`, "cyan"));
    process.exit(1);
  });

  proc.on("close", (code) => {
    if (code !== 0 && code !== null) {
      console.error(colorize(`❌ tail exited with code ${code}`, "red"));
      process.exit(code);
    }
  });
}

// Check for --follow flag
const args = process.argv.slice(2);
const follow = args.includes("--follow") || args.includes("-f");

viewLogs(follow);
