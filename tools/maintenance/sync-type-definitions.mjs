#!/usr/bin/env bun
/**
 * Sync CS2 Type Definitions
 *
 * Copies the latest point_script.d.ts from your CS2 installation
 * to the project's src/types/cs_script.d.ts
 *
 * Usage: bun run sync-types
 */

import { readFile, copyFile, chmod, access } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import {
  detectPlatform,
  getTypeDefinitionsPath,
  getSearchPaths,
  getSetupInstructions,
} from "../utils/cs2-path.mjs";

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "../..");
const TARGET = join(PROJECT_ROOT, "src/types/cs_script.d.ts");

// ============================================================================
// FILE UTILITIES
// ============================================================================

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function compareFiles(file1, file2) {
  try {
    const content1 = await readFile(file1, "utf8");
    const content2 = await readFile(file2, "utf8");
    return content1 === content2;
  } catch {
    return false;
  }
}

async function getDiff(oldFile, newFile) {
  try {
    const { stdout } = await execAsync(`diff -u "${oldFile}" "${newFile}"`);
    return stdout;
  } catch (err) {
    // diff returns non-zero when files differ
    return err.stdout || "";
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("");
  console.log("=".repeat(50));
  console.log("  CS2 Type Definitions Sync");
  console.log("=".repeat(50));
  console.log("");

  console.log("Platform:", detectPlatform().type);
  console.log("Target:", TARGET);
  console.log("");

  // Find CS2 type definitions
  let SOURCE;
  try {
    SOURCE = await getTypeDefinitionsPath();
  } catch (err) {
    console.error("ERROR:", err.message);
    console.log("");
    console.log(getSetupInstructions());
    process.exit(1);
  }

  if (!SOURCE) {
    console.error("ERROR: CS2 type definitions not found!");
    console.log("");
    console.log("Searched paths:");
    getSearchPaths().forEach((p) => console.log(`  - ${p}`));
    console.log("");
    console.log(getSetupInstructions());
    process.exit(1);
  }

  console.log("Source:", SOURCE);
  console.log("");

  // Check if files are identical
  if (await fileExists(TARGET)) {
    const identical = await compareFiles(TARGET, SOURCE);
    if (identical) {
      console.log("Type definitions are already up to date.");
      process.exit(0);
    }
    console.log("Changes detected between local and installed versions");
  } else {
    console.log("No existing type definitions (first sync)");
  }

  // Generate diff before copying
  let diffOutput = "";
  if (await fileExists(TARGET)) {
    diffOutput = await getDiff(TARGET, SOURCE);
  }

  // Copy the file
  console.log("");
  console.log("Copying type definitions...");

  // Remove read-only protection if present
  try {
    await chmod(TARGET, 0o644);
  } catch {
    // Ignore if file doesn't exist
  }

  await copyFile(SOURCE, TARGET);

  // Show diff summary
  if (diffOutput) {
    console.log("");
    console.log("Changes:");
    const lines = diffOutput.split("\n");
    console.log(lines.slice(0, 15).join("\n"));
    if (lines.length > 15) {
      console.log(`... (${lines.length - 15} more lines)`);
    }
  }

  // Restore read-only protection
  await chmod(TARGET, 0o444);

  // Summary
  const stats = await readFile(TARGET, "utf8");
  const lineCount = stats.split("\n").length;

  console.log("");
  console.log("Sync complete!");
  console.log(`  Lines: ${lineCount}`);
  console.log("");
}

main().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
