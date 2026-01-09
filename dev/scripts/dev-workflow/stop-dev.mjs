#!/usr/bin/env bun
import {
  getAllPids,
  isProcessRunning,
  killProcess,
  forceKillProcess,
  clearPid,
} from "../utils/pid-manager.mjs";
import { colorize } from "../utils/colors.mjs";

async function stopAllProcesses() {
  console.log(colorize("🛑 Stopping development processes...", "yellow"));

  const pids = getAllPids();
  const processNames = Object.keys(pids);

  if (processNames.length === 0) {
    console.log(colorize("(No processes were running)", "ansi"));
    process.exit(0);
  }

  let stoppedCount = 0;
  const failedProcesses = [];

  // Stop each tracked process
  for (const name of processNames) {
    const pid = pids[name];

    // Check if process is actually running
    if (!isProcessRunning(pid)) {
      console.log(`⏭️  ${name} (PID ${pid}): not running, cleaning up`);
      clearPid(name);
      stoppedCount++;
      continue;
    }

    console.log(`Stopping ${name} (PID ${pid})...`);

    // Try graceful termination first
    if (killProcess(pid)) {
      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if still running
      if (isProcessRunning(pid)) {
        console.log(`  ⚠️  Process still running, forcing kill...`);
        if (forceKillProcess(pid)) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        } else {
          failedProcesses.push(`${name} (PID ${pid})`);
          continue;
        }
      }

      // Verify process is gone
      if (!isProcessRunning(pid)) {
        console.log(`  ✅ ${name} stopped`);
        clearPid(name);
        stoppedCount++;
      } else {
        failedProcesses.push(`${name} (PID ${pid})`);
      }
    } else {
      failedProcesses.push(`${name} (PID ${pid})`);
    }
  }

  // Report results
  console.log("");
  if (failedProcesses.length === 0) {
    console.log(colorize("✅ All processes stopped successfully", "green"));
    if (stoppedCount > 0) {
      console.log(colorize(`Stopped ${stoppedCount} process(es)`, "ansi"));
    }
    process.exit(0);
  } else {
    console.log(colorize("⚠️  Some processes could not be stopped:", "yellow"));
    failedProcesses.forEach((proc) => console.log(`  - ${proc}`));
    process.exit(1);
  }
}

stopAllProcesses().catch((err) => {
  console.error(colorize("❌ Error stopping processes:", "red"), err.message);
  process.exit(1);
});
