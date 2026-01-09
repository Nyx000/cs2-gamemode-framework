#!/usr/bin/env bun
/**
 * PID File Manager
 * Manages process IDs using persistent PID files stored in /tmp
 * Provides reliable cross-platform process tracking without pattern matching
 */

import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

const PID_DIR = "/tmp";

/**
 * Get the full path to a PID file
 */
function getPidFilePath(name) {
  return join(PID_DIR, `cs2-dev-${name}.pid`);
}

/**
 * Write a PID to a file
 * @param {string} name - Name of the process (e.g., "compile", "deploy")
 * @param {number} pid - Process ID to write
 */
export function writePid(name, pid) {
  try {
    const pidFile = getPidFilePath(name);
    writeFileSync(pidFile, String(pid), "utf8");
    return true;
  } catch (error) {
    console.error(`Failed to write PID file for ${name}:`, error.message);
    return false;
  }
}

/**
 * Read a PID from a file
 * @param {string} name - Name of the process
 * @returns {number|null} Process ID or null if file doesn't exist
 */
export function readPid(name) {
  try {
    const pidFile = getPidFilePath(name);
    if (!existsSync(pidFile)) {
      return null;
    }
    const pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a process is currently running
 * Uses signal 0 (doesn't actually send a signal, just checks if process exists)
 * @param {number} pid - Process ID to check
 * @returns {boolean} True if process is running
 */
export function isProcessRunning(pid) {
  try {
    // Signal 0 doesn't actually kill the process, just checks if it exists
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // ESRCH = process not found
    // EPERM = no permission (but process exists)
    return error.code === "EPERM";
  }
}

/**
 * Kill a process gracefully
 * @param {number} pid - Process ID to kill
 * @returns {boolean} True if successful
 */
export function killProcess(pid) {
  try {
    // Try graceful termination first (SIGTERM)
    process.kill(pid, "SIGTERM");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Force kill a process
 * @param {number} pid - Process ID to force kill
 * @returns {boolean} True if successful
 */
export function forceKillProcess(pid) {
  try {
    process.kill(pid, "SIGKILL");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Remove a PID file
 * @param {string} name - Name of the process
 * @returns {boolean} True if successful
 */
export function clearPid(name) {
  try {
    const pidFile = getPidFilePath(name);
    if (existsSync(pidFile)) {
      unlinkSync(pidFile);
    }
    return true;
  } catch (error) {
    console.error(`Failed to clear PID file for ${name}:`, error.message);
    return false;
  }
}

/**
 * Get all tracked PIDs
 * @returns {Object} Map of process names to PIDs
 */
export function getAllPids() {
  const pids = {};
  const processNames = ["compile", "deploy"];

  for (const name of processNames) {
    const pid = readPid(name);
    if (pid !== null) {
      pids[name] = pid;
    }
  }

  return pids;
}

/**
 * Check if any tracked process is running
 * @returns {Object} Status object with process running states
 */
export function getProcessStatus() {
  const status = {
    isRunning: false,
    processes: {},
  };

  const pids = getAllPids();

  for (const [name, pid] of Object.entries(pids)) {
    const running = isProcessRunning(pid);
    status.processes[name] = { pid, running };
    if (running) {
      status.isRunning = true;
    }
  }

  return status;
}

/**
 * Check if a specific process is running by name
 * @param {string} name - Process name
 * @returns {boolean} True if process is running
 */
export function isProcessByNameRunning(name) {
  const pid = readPid(name);
  if (pid === null) {
    return false;
  }
  return isProcessRunning(pid);
}

/**
 * Stop a tracked process by name
 * @param {string} name - Process name
 * @param {boolean} force - Force kill if graceful termination doesn't work
 * @returns {boolean} True if successful
 */
export function stopProcessByName(name, force = false) {
  const pid = readPid(name);
  if (pid === null) {
    return true; // No process to stop
  }

  if (!isProcessRunning(pid)) {
    // Process not running, clean up the PID file
    clearPid(name);
    return true;
  }

  // Try to kill the process
  const success = force ? forceKillProcess(pid) : killProcess(pid);

  if (success) {
    // Give it time to die
    return new Promise((resolve) => {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (!isProcessRunning(pid) || attempts > 10) {
          clearInterval(checkInterval);
          clearPid(name);
          resolve(true);
        }
      }, 100);
    });
  }

  return false;
}
