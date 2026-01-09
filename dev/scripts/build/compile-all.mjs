#!/usr/bin/env bun
// @ts-nocheck
/**
 * Compile all top-level TypeScript files in src/scripts/ to .vjs files using Bun's native bundler
 * Each .ts file is bundled separately (with its imports from subdirectories)
 */

import { readdirSync, statSync, watch } from "fs";
import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { writePid, clearPid } from "../utils/pid-manager.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = join(__dirname, "../../src/scripts");
const outDir = join(__dirname, "../../..", "scripts");

// Get all top-level .ts files in src/scripts/ (not subdirectories)
function getTsFiles() {
  return readdirSync(srcDir)
    .filter((file) => {
      const fullPath = join(srcDir, file);
      return extname(file) === ".ts" && statSync(fullPath).isFile();
    })
    .map((file) => ({
      input: join(srcDir, file),
      output: join(outDir, basename(file, ".ts") + ".vjs"),
      name: basename(file, ".ts"),
    }));
}

const tsFiles = getTsFiles();

if (tsFiles.length === 0) {
  console.log("⚠️  No TypeScript files found in src/scripts/");
  process.exit(0);
}

console.log("📦 Found scripts to compile:");
tsFiles.forEach(({ name }) => {
  console.log(`  - ${name}.ts`);
});
console.log("");

// Watch mode flag
const isWatch = process.argv.includes("--watch");

// Shared build configuration for Bun.build
const buildOptions = {
  format: "esm",
  target: "browser",
  external: ["cs_script/point_script"],
};

/**
 * Build a single file using Bun's native bundler
 */
async function buildFile(input, output, name) {
  try {
    const result = await Bun.build({
      entrypoints: [input],
      outdir: dirname(output),
      naming: `${name}.vjs`,
      ...buildOptions,
    });

    if (!result.success) {
      console.error(`❌ Build failed for ${name}:`, result.logs);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Build error for ${name}:`, error);
    return false;
  }
}

async function buildAll() {
  try {
    if (isWatch) {
      // Watch mode using Bun's native file watcher
      console.log("👀 Watch mode enabled - monitoring for changes...\n");

      // Initial build
      const results = await Promise.all(
        tsFiles.map(({ input, output, name }) => {
          console.log(`🔨 Building: ${name}.ts -> ${name}.vjs`);
          return buildFile(input, output, name);
        })
      );

      if (results.every((r) => r)) {
        console.log("\n✅ Initial build complete!");
      }

      console.log("\n🔥 Watching for changes... Press Ctrl+C to stop\n");

      // Write PID file for this compile process
      writePid("compile", process.pid);

      // Watch the src directory for changes
      const watcher = watch(srcDir, { recursive: true }, async (event, filename) => {
        if (filename && filename.endsWith(".ts")) {
          console.log(`\n🔄 Change detected: ${filename}`);

          // Rebuild all files (simple approach, can optimize later)
          const currentFiles = getTsFiles();
          for (const { input, output, name } of currentFiles) {
            await buildFile(input, output, name);
            console.log(`✅ Rebuilt: ${name}.ts -> ${name}.vjs`);
          }
        }
      });

      // Keep process alive and handle cleanup
      process.on("SIGINT", async () => {
        console.log("\n🛑 Stopping watcher...");
        watcher.close();
        clearPid("compile");
        console.log("✅ Clean shutdown");
        process.exit(0);
      });
    } else {
      // One-time build
      const results = await Promise.all(
        tsFiles.map(({ input, output, name }) => {
          console.log(`🔨 Building: ${name}.ts -> ${name}.vjs`);
          return buildFile(input, output, name);
        })
      );

      if (results.every((r) => r)) {
        console.log("\n✅ All scripts compiled successfully!\n");
      } else {
        console.error("\n❌ Some builds failed\n");
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

buildAll();
